const router = require('express').Router();
const chatController = require('./controller');
const path = require('path')

const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
// const storage = multer.diskStorage({
//     // 저장할 파일 경로
//     destination: (req, file, cb) => {
//         cb(null, './uploads/'); // 이미지 파일 저장 경로 설정
//     },
//     // 저장할 파일 이름
//     filename: (req, file, cb) => {
//         /* 현재시간 구하기 yyyy-MM-dd-Thh-mm-ss-fff */
//         const today = new Date(); // 현재시간
//         const year = today.getFullYear(); // 년 (yyyy)
//         const month = today.getMonth() + 1;  // 월 (MM)
//         const date = today.getDate();  // 일 (dd)
//         const hours = today.getHours(); // 시 (hh)
//         const minutes = today.getMinutes();  // 분 (mm)
//         const seconds = today.getSeconds();  // 초 (ss)
//         const milliseconds = today.getMilliseconds(); // 밀리초 (fff)

//         // 현재시간으로 파일 이름 설정
//         const now = year + "-" + month + "-" + date + "-T" + hours + "-" + minutes + "-" + seconds + "-" + milliseconds;
//         const extension = path.extname(file.originalname); // 파일 확장자
//         const filename = `${now}${extension}`; // 파일 이름 생성
//         cb(null, filename); // 파일 이름 설정
//     }
// });

// S3 클라이언트 생성: AWS S3에 접근하기 위한 설정
const s3Client = new S3Client({
    region: process.env.AWS_REGION, // AWS 지역 설정
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY, // AWS 접근 키 ID
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // AWS 비밀 접근 키
    },
});

// multer를 사용하여 S3에 파일 업로드 설정
const upload = multer({
    storage: multerS3({
        s3: s3Client, // 생성한 S3 클라이언트 사용
        bucket: process.env.AWS_S3_BUCKET, // 업로드할 S3 버킷 설정
        metadata: function (req, file, cb) {
            // 파일 메타데이터 설정
            cb(null, { fieldName: file.fieldName });
        },
        key: function (req, file, cb) {
            // 파일 이름을 UTF-8로 변환하고 고유한 키 생성
            file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");
            cb(null, `chat-file/${Date.now().toString()}.${file.originalname}`); // 파일 키 설정
        },
    }),
});

// const upload = multer({ storage });

// 문서 등록
router.post('/add', upload.array('files'), chatController.addVector);

// 채팅
router.post('/', chatController.chatGPT);

// 문서 반환
router.post('/doc', chatController.getDoc);

// 등록된 문서 리스트 출력
router.get('/list', chatController.getList);

// 저장된 문서 삭제
router.delete('/delete/:_id', chatController.deleteDoc)


module.exports = router;