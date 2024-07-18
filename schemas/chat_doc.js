const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chat_doc_Schema = new Schema({
    originalFileName: {
        type: String,
    },

    company: {
        type: mongoose.Schema.Types.ObjectId,
    },
    saveKey: {
        type: String,
    },
    fileSize: {
        type: String
    },
    uploadUser: {
        type: mongoose.Schema.Types.ObjectId,
    }
})

chat_doc_Schema.set('timestamps', true);


module.exports = mongoose.model('Chat_doc', chat_doc_Schema);