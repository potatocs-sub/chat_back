
import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { CohereEmbeddings } from "@langchain/cohere";
import { MongoClient } from "mongodb";

// mongodb 세팅

const namespace = "langchain.test";
const [dbName, collectionName] = namespace.split(".");
const collection = client.db(dbName).collection(collectionName);


const loader = new PDFLoader("./인천남동구행복주택예비입주자모집.pdf");
const pages = await loader.loadAndSplit();
// console.log(pages);
const text_splitter = new RecursiveCharacterTextSplitter(
    {
        chunkSize: 100,
        chunkOverlap: 90,
    }
)
const texts = await text_splitter.splitDocuments(pages);
// const embedding = new OpenAIEmbeddings({ openAIApiKey: OPENAI_API_KEY })
const embedding = new CohereEmbeddings({ apiKey: COHERE_API_KEY })


// 정리 1 : 
// const vectorstore = await MongoDBAtlasVectorSearch.fromDocuments(
//     texts, embedding, {
//     collection,
//     indexName: "vector_index", // The name of the Atlas search index. Defaults to "default"
//     textKey: "text", // The name of the collection field containing the raw content. Defaults to "text"
//     embeddingKey: "embedding", // The name of the collection field containing the embedded text. Defaults to "embedding"
// }
// )


const vectorStore = new MongoDBAtlasVectorSearch(embedding, {
    collection,
    indexName: "vector_index", // The name of the Atlas search index. Defaults to "default"
    textKey: "text", // The name of the collection field containing the raw content. Defaults to "text"
    embeddingKey: "embedding", // The name of the collection field containing the embedded text. Defaults to "embedding"
});
const resultOne = await vectorStore.similaritySearch("임대 문의", 20);
console.log(resultOne);


// console.log(vectorstore)
// const vectorStore = new MongoDBAtlasVectorSearch(new OpenAIEmbeddings({ openAIApiKey: OPENAI_API_KEY }), {
//     collection,
//     indexName: "vector_index", // The name of the Atlas search index. Defaults to "default"
//     textKey: "text", // The name of the collection field containing the raw content. Defaults to "text"
//     embeddingKey: "embedding", // The name of the collection field containing the embedded text. Defaults to "embedding"
// });



// const resultOne = await vectorStore.similaritySearch("Hello", 1);
// console.log(resultOne);

await client.close();