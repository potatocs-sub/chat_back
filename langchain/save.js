
const { OpenAIEmbeddings } = require("@langchain/openai");
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { MongoDBAtlasVectorSearch } = require("@langchain/mongodb");
const { MongoClient } = require("mongodb");

// mongodb 세팅
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


exports.save_vector = async (file, company) => {

    const client = new MongoClient(process.env.MONGODB_URI || "");

    const collection = client.db("langchain").collection("test");


    const loader = new PDFLoader(file);

    const pages = await loader.load();

    for (let page of pages) {
        page.metadata['company'] = company
    }


    const text_splitter = new RecursiveCharacterTextSplitter(
        {
            chunkSize: 200,
            chunkOverlap: 20,
        }
    )
    const texts = await text_splitter.splitDocuments(pages);

    // console.log(texts)

    const embedding = new OpenAIEmbeddings({ openAIApiKey: OPENAI_API_KEY })


    // 정리 1 : 
    const vectorstore = await MongoDBAtlasVectorSearch.fromDocuments(
        texts, embedding, {
        collection,
        indexName: "vector_index", // The name of the Atlas search index. Defaults to "default"
        textKey: "text", // The name of the collection field containing the raw content. Defaults to "text"
        embeddingKey: "embedding", // The name of the collection field containing the embedded text. Defaults to "embedding"
    }
    )

    await client.close();
}
