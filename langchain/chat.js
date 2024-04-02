//https://js.langchain.com/docs/expression_language/cookbook/retrieval#conversational-retrieval-chain
const { formatDocumentsAsString } = require("langchain/util/document");
const { PromptTemplate } = require("@langchain/core/prompts");
const { MongoDBAtlasVectorSearch } = require("@langchain/mongodb");
const { ChatOpenAI, OpenAIEmbeddings } = require("@langchain/openai");
const {
    RunnableSequence,
    RunnablePassthrough,
} = require("@langchain/core/runnables");
const { MongoClient } = require("mongodb");
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
If you don't have any context, you should say "관련된 문서가 없습니다.".
If you don't know the answer, you should say "관련된 내용이 없습니다."
You have to answer in Korean only.

The document must contain <a class="document"></a>
The page_content must contain <a class="page" onclick='find(event)'></a>

The answer always includes <div></div>
And each sentence always includes <div></div>

Examples:
Question: ai 뷰가드 업데이트 방법에 대해서 알려주세요
Answer: <div><div>ai 뷰가드 업데이트 방법에 대해서 알려드리겠습니다.</div><div><a class="document">2202_프로형_NVR,_FVR_뷰가드_AI_적용방법.pdf</a> 문서의 <a class="page" onclick='find(event)'>1</a>페이지에서 조회가 가능하며, 뷰가드 AI 업데이트 방법은 다음과 같습니다.</div><div>먼저, 스마트 러닝사이트 공유자료실에서 Firmware 메뉴로 이동하여 81번 뷰가드 AI 2단계 NVR 매뉴얼 및 펌웨어를 다운로드해야 합니다.</div><div>그리고 업그레이드를 위해 펌웨어 파일명을 변경해야 하며, 업그레이드 완료 후 모델명이 NVA, FVA로 변경됩니다.</div><div>또한, 업그레이드 시 주의해야 할 사항으로는 펌웨어 파일명 변경('A'→'R')이 필요하고, 업그레이드 완료 후 모델명이 NVA, FVA로 변경된다는 점입니다.</div></div>

Let's think about it step by step.

{context}

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
            k: 10,
            fetchK: 50,
            lambda: 0.25,
        },
    });
    const answerChain = RunnableSequence.from([
        {
            context: retriever.pipe(formatDocumentsAsString),
            question: new RunnablePassthrough(),
        },
        ANSWER_PROMPT,
        model,
    ]);

    const conversationalRetrievalQAChain =
        standaloneQuestionChain.pipe(answerChain);

    return await conversationalRetrievalQAChain.invoke({
        question: question,
        chat_history: history,
    });


}

