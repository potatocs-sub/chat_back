const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chat_warehouse_Schema = new Schema({
    company: {
        type: String
    },
    qustion: {
        type: String
    },
    answer: {
        type: String,
    }
})

chat_warehouse_Schema.set('timestamps', true);


module.exports = mongoose.model('Chat_warehouse', chat_warehouse_Schema);