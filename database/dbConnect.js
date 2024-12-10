const mongoose = require("mongoose");
require("dotenv").config();
    
const dbConnect = () => {
  console.log("Welcome to database")
  mongoose
    .connect(
          "mongodb+srv://aswinrajr07:6ZNOuiYwUjPkYs7N@cluster0.xf8fs26.mongodb.net/FindMyHome"
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
