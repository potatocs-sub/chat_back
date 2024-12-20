//https://js.langchain.com/docs/expression_language/cookbook/retrieval#conversational-retrieval-chain
const { formatDocumentsAsString } = require("langchain/util/document");
const { PromptTemplate } = require("@langchain/core/prompts");
const { MongoDBAtlasVectorSearch } = require("@langchain/mongodb");
const { ChatOpenAI, OpenAIEmbeddings } = require("@langchain/openai");
const {
    RunnableSequence,
    RunnablePassthrough,
} = require("@langchain/core/runnables");
const { MongoClient, ObjectId } = require("mongodb");
const { StringOutputParser } = require("@langchain/core/output_parsers");


const client = new MongoClient(process.env.MONGODB_URI || "");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const namespace = "langchain.test";
const [dbName, collectionName] = namespace.split(".");
const collection = client.db(dbName).collection(collectionName);
const model = new ChatOpenAI({ openAIApiKey: OPENAI_API_KEY, temperature: 0.1, request_timeout: 3, modelName: "gpt-4o-mini" });

const condenseQuestionTemplate = `
주어진 대화 기록과 질문을 바탕으로 현재 질문의 문장을 일부 수정하여 새로운 질문을 생성해 주세요.
대화 기록은 시간순서로 정렬되어 있으며 현재 질문과 연관이 있을수도 있습니다.

다음 규칙을 반드시 준수하세요:
1. 모호한 표현은 과거 대화 기록을 기반으로 명시적으로 변경하세요.
2. 이전 대화 기록과 연관이 없다고 판단하는 경우 현재 질문만 활용하여 재구성하십시오.
3. 질문에 답변하거나 정보를 제공하지 마세요.
4. 이전 대화 기록과 연관이 있다고 판단하는 경우 현재 질문 만으로 이전 대화 내용을 이해할 수 있도록 연관 단어를 반드시 포함 하세요.

# 예시:
대화 기록: 
"Human: 시스템 담당자는 누구입니까?"
"AI: 해당 업무는 홍길동이 담당하고 있습니다,"
현재 질문: "그의 업무는 어떤게 있지?"

"홍길동의 업무는 어떤게 있지?"

# 대화 기록 
{chat_history}

# 현재 질문
{question}
`;

const CONDENSE_QUESTION_PROMPT = PromptTemplate.fromTemplate(
    condenseQuestionTemplate
);

const answerTemplate = `
# system
당신은 사용자의 질문의 핵심과 의도를 이해하고, 주어진 컨텍스트에서 사용자의 요구나 질문에 가장 적합한 전문가를 찾아서 제공하는 뛰어난 담당자 매칭 전문가로 이름은 POTATOCS봇입니다.

# Instruction
당신의 임무는 다음의 컨텍스트를 검색하고 이를 기반으로 사용자의 질문을 해결할 수 있는 전문가를 추천하는 것입니다.

# 컨텍스트:
{context}

# 필수 규칙
1. 컨텍스트에 없는 내용을 절대로 지어서 답변하지는 마세요. 
2. 질문과 동일한 언어로 응답하십시오.
3. 제공되지 않은 정보에 대한 답변은 하지 않습니다.

# 질문:
{question}
`;
const ANSWER_PROMPT = PromptTemplate.fromTemplate(answerTemplate);

const formatChatHistory = (chatHistory) => {
    const formattedDialogueTurns = chatHistory.map(
        (dialogueTurn) => `Human: ${dialogueTurn[0]}\nAI: ${dialogueTurn[1]}`
    );
    return formattedDialogueTurns.join("\n");
};

const vectorStore = new MongoDBAtlasVectorSearch(new OpenAIEmbeddings({ openAIApiKey: OPENAI_API_KEY }), {
    collection,
    indexName: "vector_index", // The name of the Atlas search index. Defaults to "default"
    textKey: "text", // The name of the collection field containing the raw content. Defaults to "text"
    embeddingKey: "embedding", // The name of the collection field containing the embedded text. Defaults to "embedding"
});

// const standaloneQuestionChain = RunnableSequence.from([
//     {
//         question: (input) => input.question,
//         chat_history: (input) =>
//             formatChatHistory(input.chat_history),
//     },
//     CONDENSE_QUESTION_PROMPT,
//     model,
//     new StringOutputParser(),
// ]);

exports.chatGPT = async (question, history, company) => {

    const retriever = vectorStore.asRetriever({
        searchType: "mmr",
        filter: { preFilter: { "company": { "$eq": company } } },
        searchKwargs: {
            fetchK: 20,
            lambda: 0.8,
        },
        k: 20
    });

    // const temp = await standaloneQuestionChain.invoke({
    //     question: question,
    //     chat_history: history,
    // })

    const retriever_answer = await retriever.invoke(question)

    let temp_retriever = '';

    retriever_answer.map((answer) => {
        temp_retriever += answer.pageContent + '\n'
    })
    const answerChain = RunnableSequence.from([
        {
            context: (input) => input.context,
            question: (input) => input.question,
        },
        ANSWER_PROMPT,
        model,
    ]);

    const result = await answerChain.invoke({ context: temp_retriever, question })

    return result;

    // const conversationalRetrievalQAChain =
    //     standaloneQuestionChain.pipe(answerChain);

    // return await conversationalRetrievalQAChain.invoke({
    //     question: question,
    //     chat_history: history,
    // });
}

