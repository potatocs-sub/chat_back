const router = require('express').Router();
const chatController = require('./controller');
const multer = require('multer');
const path = require('path')
const storage = multer.diskStorage({
    // 저장할 파일 경로
    destination: (req, file, cb) => {
        cb(null, './uploads/'); // 이미지 파일 저장 경로 설정
    },
    // 저장할 파일 이름
    filename: (req, file, cb) => {
        /* 현재시간 구하기 yyyy-MM-dd-Thh-mm-ss-fff */
        const today = new Date(); // 현재시간
        const year = today.getFullYear(); // 년 (yyyy)
        const month = today.getMonth() + 1;  // 월 (MM)
        const date = today.getDate();  // 일 (dd)
        const hours = today.getHours(); // 시 (hh)
        const minutes = today.getMinutes();  // 분 (mm)
        const seconds = today.getSeconds();  // 초 (ss)
        const milliseconds = today.getMilliseconds(); // 밀리초 (fff)

        // 현재시간으로 파일 이름 설정
        const now = year + "-" + month + "-" + date + "-T" + hours + "-" + minutes + "-" + seconds + "-" + milliseconds;
        const extension = path.extname(file.originalname); // 파일 확장자
        const filename = `${now}${extension}`; // 파일 이름 생성
        cb(null, filename); // 파일 이름 설정
    }
});




const upload = multer({ storage });

router.post('/add', upload.array('files'), chatController.addVector);

router.post('/', chatController.chatGPT);

module.exports = router;