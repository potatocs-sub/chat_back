const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const mongoApp = {};
mongoApp.appSetObjectId = function (app) {
    app.set('objectId', mongoose.Types.ObjectId);
    console.log('complete to set mongoose ObjectId');
}

async function main() {
    await mongoose.connect(process.env.MONGODB_URI).then(() => {
        createSchema();
        console.log('Database Connected')
    })
}
main().catch((err) => console.log(err));

/** 스키마 정의 */
function createSchema() {
    const dbModels = {};
    dbModels.chat_warehouse = require('../schemas/chat_warehouse');
    dbModels.chat_doc = require('../schemas/chat_doc');

    global.DB_MODELS = dbModels;
}

module.exports = mongoApp;