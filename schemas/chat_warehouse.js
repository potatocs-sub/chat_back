const mongoose = require('mongoose'); // mongoose 모듈 가져오기
const Schema = mongoose.Schema; // mongoose의 Schema 객체 가져오기

// chat_warehouse 스키마 정의
const chat_warehouse_Schema = new Schema({
    // 누가 검색했는지 기록 (사용자 ID)
    user: {
        type: mongoose.Schema.Types.ObjectId, // ObjectId 형식
    },
    // 사용자가 질문한 내용
    question: {
        type: String // 질문 내용
    },
    // 어떤 응답을 받았는지
    answer: {
        type: String, // 응답 내용
    }
});

// 생성 및 수정 시간을 자동으로 기록하는 옵션 설정
chat_warehouse_Schema.set('timestamps', true);

// chat_warehouse 스키마를 기반으로 모델 생성 및 내보내기
module.exports = mongoose.model('Chat_warehouse', chat_warehouse_Schema);
