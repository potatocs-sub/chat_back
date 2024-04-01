const { save_vector } = require('../../../../langchain/save');

exports.addVector = async (req, res) => {
    console.log(`
    --------------------------------------------------
      User : 
      API  : add
      router.post('/chat/add', chatController.addVector);
    --------------------------------------------------
        `)

    try {
        for (file of req.files) {
            await save_vector(file.path, req.body.company);
        }
        return res.status(200).json({
            status: true
        })
    } catch (err) {
        console.error("[ ERROR ]", err);
        return res.status(500).send({
            message: "An error occured while adding vector"
        })
    }
}


exports.chatGPT = async (req, res) => {
    console.log(`
    --------------------------------------------------
      User : 
      API  : 
      router.post('/chat', chatController.chatGPT);
    --------------------------------------------------
        `)
    console.log(req.body);
    try {
        return res.status(200).json({
            status: true
        })
    } catch (err) {
        console.error("[ ERROR ]", err);
        return res.status(500).send({
            message: "An error occured while chating with GPT"
        })
    }
}