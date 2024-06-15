const mongoose = require("mongoose");
require("dotenv").config();

const dbConnect = () => {
  console.log("Welcome to database")
  mongoose
    .connect(
      // "mongodb+srv://aswinrajr07:yPXdXgF4ThtnerDz@cluster0.xf8fs26.mongodb.net/FindMyHome"
          "mongodb+srv://aswinrajr07:554nvlr8Bwc08DrQ@cluster0.xf8fs26.mongodb.net/FindMyHome?retryWrites=true&w=majority&appName=Cluster0"
      , {
      serverSelectionTimeoutMS: 30000, 
      socketTimeoutMS: 45000, 
    })
    .then(() => {
      console.log("Connected to the database Atlas");
    })
    .catch((err) => {
      console.error("Error in connecting the database", err);
    });
};

module.exports = dbConnect;
