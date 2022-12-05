const mongoose = require('mongoose')

const usedTime = new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    usedTime:{
        type:String,
        required:true
    }
})

module.exports = mongoose.model('usedTime', usedTime);