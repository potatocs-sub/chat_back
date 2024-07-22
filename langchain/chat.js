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
const model = new ChatOpenAI({ openAIApiKey: OPENAI_API_KEY, temperature: 0, request_timeout: 40, model_name: "gpt-3.5-turbo-1106" });

const condenseQuestionTemplate = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question. 
At the end of standalone question add this 'Answer the question in Korean language.' 
If you do not know the answer reply with 'I am sorry'.
Standalone questions contain key words for subsequent questions.

Please refer to the chat history and convert it to an appropriate standalone question.
If you have a keyword that is too different from the current question in the chat history, please do not reflect it when converting the question
Lets's think step by step.

Example:
HumanMessage: '엘지 세탁기의 면 세탁 법에 대해서 설명해줘'
Standalone question: '엘지 세탁기의 면 세탁 법에 대해서 설명해줄 수 있나요? Answer the question in Korean language.'

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;
const CONDENSE_QUESTION_PROMPT = PromptTemplate.fromTemplate(
    condenseQuestionTemplate
);

const answerTemplate = `Write the final answer given the following extraction from long documents and questions.
If you don't know the answer, answer that you don't know. Don't make up the answer.
Respectfully answer that if the question is context-related, it is adjusted to answer only context-related questions.
Answer the question based on the context below, and say "I don't know" if you can't answer the question based on the context.


You have to answer in Korean only.

Examples:
Question: 현재 휴가 상태가 이상해요. 어디에 문의해야 할까요?
Answer: 휴가는 인사 담당자가 관리합니다. 현재 인사 담당자는 ooo부서의 ooo입니다. 

Question: 회계 담당자를 알려주세요
Answer: 회계 담당자는 ooo 입니다. 연락처는 010-xxxx-xxxx 입니다.

Question: 현재 개발팀은 모두 몇 명인가요?
Answer: 현재 개발팀은 모두 다섯명 입니다.

Question: 회계 담당자가 하는 일은 무엇인가요?
Answer: 회계 담장자는 주로 예산 수립, 월 분기 손익 추정 및 확정 보고, 서비스별 상세 손익 보고 등의 업무를 수행합니다. 현재 회계 담당자로는 이슬이와 임호균이 있습니다.

Let's think about it step by step.
If you don't have any context, you should say "관련된 정보가 없습니다".

Context: {context}

Question: {question}
Helpful answer in markdown:
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

    const retriever = vectorStore.asRetriever({
        searchType: "mmr",
        filter: { preFilter: { "company": { "$eq": company } } },
        searchKwargs: {
            k: 100,
            fetchK: 500,
            lambda: 0.25,
        },
    });
    const temp = await standaloneQuestionChain.invoke({
        question: question,
        chat_history: history,
    })

    const retriever_answer = await retriever.invoke(temp)

    let temp_retriever = '';
    console.log(retriever_answer)
    retriever_answer.map((answer) => {
        temp_retriever += answer.pageContent
    })
    console.log(temp_retriever)
    const answerChain = RunnableSequence.from([
        {
            context: (input) => input.context,
            question: (input) => input.question,
        },
        ANSWER_PROMPT,
        model,
    ]);

    const result = await answerChain.invoke({ context: temp_retriever, question: temp })
    console.log(result)
    return result;

    // const conversationalRetrievalQAChain =
    //     standaloneQuestionChain.pipe(answerChain);



    // return await conversationalRetrievalQAChain.invoke({
    //     question: question,
    //     chat_history: history,
    // });




}

