const mongoose = require('mongoose'); // mongoose 모듈 가져오기
const Schema = mongoose.Schema; // mongoose의 Schema 객체 가져오기

// chat_doc 스키마 정의
const chat_doc_Schema = new Schema({
    originalFileName: {
        type: String, // 원본 파일 이름
    },

    company: {
        type: mongoose.Schema.Types.ObjectId, // 회사 ID (ObjectId 형식)
    },
    saveKey: {
        type: String, // S3에 저장된 파일의 키
    },
    fileSize: {
        type: String // 파일 크기
    },
    uploadUser: {
        type: mongoose.Schema.Types.ObjectId, // 업로드한 사용자 ID (ObjectId 형식)
    }
});

// 생성 및 수정 시간을 자동으로 기록하는 옵션 설정
chat_doc_Schema.set('timestamps', true);

// chat_doc 스키마를 기반으로 모델 생성 및 내보내기
module.exports = mongoose.model('Chat_doc', chat_doc_Schema);
