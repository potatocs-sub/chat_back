let express = require('express'); // express 모듈 가져오기
let router = express.Router(); // express 라우터 생성

let chat = require('./chat'); // chat 모듈 가져오기

// '/chat' 경로로 들어오는 요청을 chat 모듈로 위임
router.use('/chat', chat);

// 라우터를 모듈로 내보내기
module.exports = router;
