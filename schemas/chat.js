const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chat_Schema = new Schema({
    company: {
        type: String
    }
})

chat_Schema.set('timestamps', true);


module.exports = mongoose.model('Chat', chat_Schema);