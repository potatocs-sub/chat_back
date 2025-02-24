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

// chatGPT 함수: 클라이언트의 질문을 처리하고 응답을 반환하는 비동기 함수
exports.chatGPT = async (req, res) => {
    console.log(`
    --------------------------------------------------
      User : 
      API  : 
      router.post('/chat', chatController.chatGPT);
    --------------------------------------------------
        `);

    const dbModels = global.DB_MODELS; // 데이터베이스 모델 가져오기
    const { question, history, company } = req.body; // 요청 본체에서 질문, 채팅 기록, 회사 정보 추출

    try {
        // chatGPT 함수 호출하여 답변 받기
        const answer = await chatGPT(question, history, company);
        // 데이터베이스에 질문과 답변 저장
        await dbModels.chat_warehouse({ company, question, answer: answer.content }).save();

        // 클라이언트에 성공적인 응답 반환
        return res.status(200).json({
            answer,
            status: true
        });
    } catch (err) {
        console.error("[ ERROR ]", err); // 에러 로그 출력
        // 에러 발생 시 클라이언트에 에러 메시지 반환
        return res.status(500).send({
            message: "An error occured while chating with GPT"
        });
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

    // 전역 데이터베이스 모델 가져오기
    const dbModels = global.DB_MODELS;

    // 요청 쿼리에서 회사와 사용자 정보 추출
    const { company, user } = req.query;

    // MongoDB 클라이언트 생성
    const client = new MongoClient(process.env.MONGODB_URI2 || "");

    // MongoDB에 연결
    await client.connect();

    // "test-potatocs" 데이터베이스의 "members" 컬렉션 선택
    const collection = client.db("test-potatocs").collection("members");



    try {
        // MongoDB에서 사용자와 회사 ID를 기준으로 문서 조회
        const result = await collection.findOne({ _id: new ObjectId(user), company_id: new ObjectId(company) });

        // 조회된 결과가 없으면 권한이 없다는 응답 반환
        if (!result) return res.status(401).json('권한 없음');

        // 회사 ID에 해당하는 채팅 문서 목록 조회
        const list = await dbModels.chat_doc.find({ company });

        // 성공적으로 문서 목록을 찾아서 클라이언트에 반환
        return res.status(200).send(list);

    } catch (err) {
        console.error("[ ERROR ]", err); // 에러 로그 출력
        // 에러 발생 시 클라이언트에 에러 메시지 반환
        return res.status(500).send({
            message: "An error occured while get doc list"
        });
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
        // 지정된 ID로 문서를 찾아서 삭제
        const result = await dbModels.chat_doc.findOneAndDelete({ _id });

        // 삭제하려는 문서가 존재하지 않으면 404 응답 반환
        if (!result) return res.status(404).send("server error");

        // MongoDB 클라이언트 생성 및 연결
        const client = new MongoClient(process.env.MONGODB_URI || "");
        const collection = client.db("langchain").collection("test");

        // 해당 문서의 source 키와 일치하는 모든 문서 삭제
        await collection.deleteMany({ source: result.saveKey });

        // S3에서 객체 삭제 명령 생성
        const command = new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: result.saveKey,
        });

        // S3에서 객체 삭제 실행
        const response = await s3Client.send(command);

        // 성공적으로 삭제되었음을 클라이언트에 응답
        return res.status(200).send({ message: 'success' });
    } catch (err) {
        console.error("[ ERROR ]", err); // 에러 로그 출력
        // 에러 발생 시 클라이언트에 에러 메시지 반환
        return res.status(500).send({
            message: "An error occurred while deleting doc."
        });
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
        // S3에서 객체를 가져오기 위한 명령 생성
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
        });

        // S3 클라이언트를 사용하여 객체 가져오기
        const response = await s3Client.send(command);

        // 응답 헤더에 콘텐츠 타입 설정 (PDF 파일)
        res.setHeader('Content-Type', 'application/pdf');

        // S3에서 가져온 PDF 데이터를 클라이언트에 스트리밍
        response.Body.pipe(res);
    } catch (err) {
        console.error("[ ERROR ]", err); // 에러 로그 출력
        // 에러 발생 시 클라이언트에 에러 메시지 반환
        return res.status(500).send({
            message: "An error occurred while getting pdf data"
        });
    }

}