const { save_vector } = require('../../../../langchain/save');

exports.addVector = async (req, res) => {
    console.log(`
    --------------------------------------------------
      User : 
      API  : add
      router.post('/chat/add', chatController.addVector);
    --------------------------------------------------
        `)
    console.log(req.body.company, req.files);
    try {
        save_vector(req.files[0], req.body.company);
    } catch (err) {
        console.error("[ ERROR ]", err);
        return res.status(500).send({
            message: "An error occured while adding vector"
        })
    }
}