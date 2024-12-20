const { save_vector } = require('../../../../langchain/save');
const { chatGPT } = require('../../../../langchain/chat');

const { MongoClient, ObjectId } = require("mongodb");
const { GetObjectCommand, S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

exports.addVector = async (req, res) => {
    console.log(`
    --------------------------------------------------
      User : 
      API  : add
      router.post('/chat/add', chatController.addVector);
    --------------------------------------------------
        `)
    const dbModels = global.DB_MODELS;
    console.log(req.body)
    try {
        for (file of req.files) {
            await dbModels.chat_doc({
                company: new ObjectId(req.body.company),
                originalFileName: file.originalname,
                saveKey: file.key,
                fileSize: file.size,
            }).save()
            await save_vector(file, req.body.company);
        }
        return res.status(200).json({
            status: true
        })
    } catch (err) {
        console.error("[ ERROR ]", err);
        return res.status(500).send({
            message: "An error occured while adding vector"
        })
    }
}

exports.chatGPT = async (req, res) => {
    console.log(`
    --------------------------------------------------
      User : 
      API  : 
      router.post('/chat', chatController.chatGPT);
    --------------------------------------------------
        `)
    const dbModels = global.DB_MODELS;
    const { question, history, company } = req.body;

    try {
        const answer = await chatGPT(question, history, company);
        console.log(answer)
        await dbModels.chat_warehouse({ company, question, answer: answer.content }).save();
        return res.status(200).json({
            answer,
            status: true
        })
    } catch (err) {
        console.error("[ ERROR ]", err);
        return res.status(500).send({
            message: "An error occured while chating with GPT"
        })
    }
}


exports.getList = async (req, res) => {
    console.log(`
        --------------------------------------------------
          User : 
          API  : 
          router.post('/list', chatController.getList);
        --------------------------------------------------
            `)

    const dbModels = global.DB_MODELS;
    const { company, user } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI2 || "");
    await client.connect();
    const collection = client.db("test-potatocs").collection("members");


    try {
        const result = await collection.findOne({ _id: new ObjectId(user), company_id: new ObjectId(company) })

        // 조회할 수 없으면 권한이 없는거임
        if (!result) return res.status(401).json('권한 없음');

        //
        const list = await dbModels.chat_doc.find({ company });

        return res.status(200).send(list);

    } catch (err) {
        console.error("[ ERROR ]", err);
        return res.status(500).send({
            message: "An error occured while get doc list"
        })
    }
}


exports.deleteDoc = async (req, res) => {
    console.log(`
        --------------------------------------------------
          User : 
          API  : 
          router.delete('/delete/:_id', chatController.delete);
        --------------------------------------------------
            `)
    const dbModels = global.DB_MODELS;
    const _id = req.params._id;


    try {
        // 찾고 지우기
        const result = await dbModels.chat_doc.findOneAndDelete({ _id });

        // 삭제하려는 문서가 존재하지 않습니다.
        if (!result) return res.status(404).send("server error");

        const client = new MongoClient(process.env.MONGODB_URI || "");
        const collection = client.db("langchain").collection("test");
        await collection.deleteMany({ source: result.saveKey });

        const command = new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: result.saveKey,
        })
        const response = await s3Client.send(command);


        return res.status(200).send({ message: 'success' })
    } catch (err) {
        console.error("[ ERROR ]", err);
        return res.status(500).send({
            message: "An error occured white delete doc."
        })
    }
}

exports.getDoc = async (req, res) => {
    console.log(`
        --------------------------------------------------
          User : 
          API  : 
          router.post('/doc', chatController.getDoc);
        --------------------------------------------------
            `)

    const key = req.body.key;

    try {
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
        })

        const response = await s3Client.send(command);

        res.setHeader('Content-Type', 'application/pdf');
        response.Body.pipe(res);
    } catch (err) {
        console.error("[ ERROR ]", err);
        return res.status(500).send({
            message: "An error occured while get pdf data"
        })
    }
}