const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');


// express 정의
const app = express();
const port = process.env.PORT || 3000;

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
app.use(cors({ origin: allowedOrigins, allowedHeaders: ["Content-Type", "Authorization"], credentials: true }));
app.use(express.urlencoded({ limit: "400mb", extended: true }))
app.use(express.json({ limit: "400mb" }))
app.use(cookieParser());

const mongoApp = require("./database/mongoDB")

app.use('/api/v1', require('./routers/api/v1'));


const server = http.createServer(app).listen(port, '0.0.0.0', () => {
    console.log(`app listening on port ${port}`);
    mongoApp.appSetObjectId(app)
})