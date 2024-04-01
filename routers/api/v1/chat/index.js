const router = require('express').Router();
const chatController = require('./controller');
const multer = require('multer');

const upload = multer();

router.post('/add', upload.array('files'), chatController.addVector);

module.exports = router;