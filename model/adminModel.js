const mongoose = require("mongoose")

const adminSchema = new mongoose.Schema({
    userName: {
        type:String,
        default:"Admin"
    },
    adminEmail:{
        type:String,
        required:true,
        unique:true

    },
    adminMobile:{
        type:Number,
       
        unique:true

    },
    adminPassword:{
        type:String,
        required:true,

    },

    image:{
        type:String,
      
    },
    role : {
        type:String,
        default:"admin"
    }

})
module.exports = mongoose.model("admin",adminSchema)