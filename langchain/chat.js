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
const model = new ChatOpenAI({ openAIApiKey: OPENAI_API_KEY, temperature: 0, request_timeout: 40, model_name: "gpt-3.5-turbo-0125" });

const condenseQuestionTemplate = `


단계별로 생각합니다.
대화 내역과 후속 질문을 분석합니다.
후속 질문에 필요한 핵심 내용을 추출합니다.
후속 질문을 독립된 질문으로 재구성합니다.
없는 내용을 억지로 만들려 하지 않습니다.
대화 내역과 관련이 없는 후속 질문은 재구성 하지 않습니다.

예시 대화:
예시 사용자: 오늘 날씨가 어때요?
예시 챗봇: 오늘 서울의 날씨는 맑고 온도는 약 25도입니다.

예시 후속 질문: 비가 올 가능성은 있나요?

예시 재구성 질문: 서울의 날씨가 맑고 온도가 25도인 오늘, 비가 올 가능성이 있나요?

대화 내역: {chat_history}

후속 질문: {question}

재구성 질문:
`;
const CONDENSE_QUESTION_PROMPT = PromptTemplate.fromTemplate(
    condenseQuestionTemplate
);

const answerTemplate = `
context: {context}

question: {question}

context와 question을 참고하세요.
당신은 사용자에게 정확한 정보를 전달해주는 전문가 추천 안내자 입니다.
"context"에 주어진 내용을 분석하여 "question"의 내용이 가장 필요로 하는 사람을 추천해주세요.
천천히 "context"의 내용을 꼼꼼히 모두 검토하고 논리적인 추론에 의해서 답변을 유도합니다.
"context"에 없는 내용은 설명하지 않습니다.
"context"에 있는 내용은 빠짐없이 설명하려 노력합니다.
"context"의 내용을 모두 검토합니다.
인원수 정보는 대답할 수 없습니다.
직급은 사원 < 대리 < 과장 < 차장 < 부장 < 이사부장 < 이사 < 상무 < 전무 < 부사장 < 사장 < 부회장 < 회장 순으로 이어지는 서열입니다.
담당자를 지정할 때 질문에 직급이 포함되어 있지 않다면 낮은 서열부터 추천합니다.
정보 제공시 직책과 연락처 정보를 반드시 함께 제공합니다.
인원수 정보를 물어본다면 "해당 정보는 답변드릴 수 없어요. 다른 내용으로 질문재 보시겠어요?" 라고 응답해야 합니다.
적절한 내용을 찾을 수 없다면 "저에게 주어진 정보에서 질문자 님이 원하는 답변을 찾을 수 없었습니다. 다른 내용으로 질문해 보시겠어요?" 라고 응답해야 합니다.


밝고 활발한 말투로 안내해 주세요.
답변은 1~3개의 문장으로 제한합니다.
`;
const ANSWER_PROMPT = PromptTemplate.fromTemplate(answerTemplate);

const formatChatHistory = (chatHistory) => {
    const formattedDialogueTurns = chatHistory.map(
        (dialogueTurn) => `Human: ${dialogueTurn[0]}\nAssistant: ${dialogueTurn[1]}`
    );
    return formattedDialogueTurns.join("\n");
};

const vectorStore = new MongoDBAtlasVectorSearch(new OpenAIEmbeddings({ openAIApiKey: OPENAI_API_KEY }), {
    collection,
    indexName: "vector_index", // The name of the Atlas search index. Defaults to "default"
    textKey: "text", // The name of the collection field containing the raw content. Defaults to "text"
    embeddingKey: "embedding", // The name of the collection field containing the embedded text. Defaults to "embedding"
});




const standaloneQuestionChain = RunnableSequence.from([
    {
        question: (input) => input.question,
        chat_history: (input) =>
            formatChatHistory(input.chat_history),
    },
    CONDENSE_QUESTION_PROMPT,
    model,
    new StringOutputParser(),
]);


exports.chatGPT = async (question, history, company) => {
    console.log(history)
    const retriever = vectorStore.asRetriever({
        searchType: "mmr",
        filter: { preFilter: { "company": { "$eq": company } } },
        searchKwargs: {
            k: 50,
            fetchK: 100,
            lambda: 0.25,
        },
    });
    const temp = await standaloneQuestionChain.invoke({
        question: question,
        chat_history: history,
    })
    console.log(temp)
    const retriever_answer = await retriever.invoke(temp)

    let temp_retriever = '';
    // console.log(retriever_answer)
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

    const result = await answerChain.invoke({ context: temp_retriever, question: temp })

    return result;

    // const conversationalRetrievalQAChain =
    //     standaloneQuestionChain.pipe(answerChain);



    // return await conversationalRetrievalQAChain.invoke({
    //     question: question,
    //     chat_history: history,
    // });




}

