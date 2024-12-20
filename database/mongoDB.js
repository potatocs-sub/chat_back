const mongoose = require('mongoose'); // mongoose 모듈 가져오기
mongoose.Promise = global.Promise; // mongoose에서 Promise를 전역 Promise로 설정

const mongoApp = {};

// Mongoose ObjectId를 앱에 설정하는 함수
mongoApp.appSetObjectId = function (app) {
    app.set('objectId', mongoose.Types.ObjectId); // 앱 설정에 ObjectId 추가
    console.log('complete to set mongoose ObjectId'); // 설정 완료 메시지 출력
}

// MongoDB에 연결하는 비동기 함수
async function main() {
    // MongoDB URI로 연결
    await mongoose.connect(process.env.MONGODB_URI).then(() => {
        createSchema(); // 스키마 생성 함수 호출
        console.log('Database Connected'); // 연결 성공 메시지 출력
    });
}

// main 함수를 호출하고 에러 발생 시 로그 출력
main().catch((err) => console.log(err));

/** 스키마 정의 함수 */
function createSchema() {
    const dbModels = {}; // 데이터베이스 모델 객체 생성
    dbModels.chat_warehouse = require('../schemas/chat_warehouse'); // chat_warehouse 스키마 가져오기
    dbModels.chat_doc = require('../schemas/chat_doc'); // chat_doc 스키마 가져오기

    global.DB_MODELS = dbModels; // 전역 변수에 데이터베이스 모델 저장
}

// mongoApp 객체를 모듈로 내보내기
module.exports = mongoApp;
