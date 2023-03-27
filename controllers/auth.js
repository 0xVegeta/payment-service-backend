const { v4: uuidv4 } = require('uuid');

const login = (req,res)=>{
    return res.status(200).json({"login":"done"})

}

const register = (req,res)=>{

    return res.status(200).json({"register":"done"})

    
}


module.exports = {
    login,
    register
}
