
const { OpenAIEmbeddings } = require("@langchain/openai");
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { MongoDBAtlasVectorSearch } = require("@langchain/mongodb");
const { MongoClient } = require("mongodb");

const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const path = require("path");
const fs = require('fs');

// mongodb 세팅
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// S3 클라이언트 설정
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

exports.save_vector = async (file, company) => {

    const client = new MongoClient(process.env.MONGODB_URI || "");
    const collection = client.db("langchain").collection("test");
    const filePath = await getFileFromS3(file.bucket, file.key, file.originalname)
    const loader = new PDFLoader(filePath);
    const pages = await loader.load();

    deleteFile(filePath)

    for (let page of pages) {
        page.metadata['company'] = company
    }

    const text_splitter = new RecursiveCharacterTextSplitter(
        {
            chunkSize: 500,
            chunkOverlap: 100,
        }
    )
    const texts = await text_splitter.splitDocuments(pages);



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


const getFileFromS3 = async (bucket, key, name) => {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(command);


    const filePath = path.join('./', key);
    const writeStream = fs.createWriteStream(filePath);



    return new Promise((resolve, reject) => {
        response.Body.pipe(writeStream);
        response.Body.on("error", reject);
        writeStream.on("close", () => {
            resolve(filePath);
        });
    })
}


const deleteFile = (filePath) => {
    fs.unlinkSync(filePath);
}