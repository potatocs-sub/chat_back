const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chat_warehouse_Schema = new Schema({
    // 누가 검색 했는지
    user: {
        type: mongoose.Schema.Types.ObjectId,
    },
    // 뭐라 했는지
    qustion: {
        type: String
    },
    // 어떤 응답을 받았는지
    answer: {
        type: String,
    }
})

chat_warehouse_Schema.set('timestamps', true);


module.exports = mongoose.model('Chat_warehouse', chat_warehouse_Schema);