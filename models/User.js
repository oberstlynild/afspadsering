const mongoose = require('mongoose')

const usersSchema = new mongoose.Schema({
    username: {
        type:String, require:true
    },
    password: {
        type:String, require:true
    },
});

module.exports = mongoose.model('User', usersSchema)