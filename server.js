const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');


// express 정의
const app = express();
const port = process.env.PORT || 3600;

// production, development
if (process.env.NODE_ENV.trim() === 'producetion') {
    require('dotenv').config({ path: path.join(__dirname, '/.env/prod.env') })
} else if (process.env.NODE_ENV.trim() === 'development') {
    require('dotenv').config({ path: path.join(__dirname, '/.env/dev.env') })
}


const allowedOrigins = [
    "http://localhost:4200",
    "http://192.168.0.5:4200"
]


// origin: cors 정책
// allowedHeaders : 허용할 헤더 지정
// credentials: 자격 증명을 포함하여 요청을 허용할지 여부를 결정 - 쿠키, http 인증 등...
// CORS 설정: 허용된 출처와 헤더, 자격 증명 사용 설정
app.use(cors({
    origin: allowedOrigins, // 허용된 출처
    allowedHeaders: ["Content-Type", "Authorization"], // 허용된 헤더
    credentials: true // 자격 증명 허용
}));

// URL 인코딩된 요청의 크기 제한 설정 및 확장
app.use(express.urlencoded({ limit: "400mb", extended: true }));

// JSON 요청의 크기 제한 설정
app.use(express.json({ limit: "400mb" }));

// 쿠키 파서 미들웨어 사용
app.use(cookieParser());

// MongoDB 관련 설정 가져오기
const mongoApp = require("./database/mongoDB");

// API 라우터 설정
app.use('/api/v1', require('./routers/api/v1'));

// HTTP 서버 생성 및 포트에 바인딩
const server = http.createServer(app).listen(port, '0.0.0.0', () => {
    console.log(`app listening on port ${port}`); // 서버가 실행 중임을 알리는 메시지
    mongoApp.appSetObjectId(app); // Mongoose ObjectId 설정
});
