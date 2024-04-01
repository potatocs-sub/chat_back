let express = require('express');
let router = express.Router();

let chat = require('./chat');

router.use('/chat', chat)

module.exports = router;