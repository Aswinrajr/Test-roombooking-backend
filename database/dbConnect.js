const mongoose = require("mongoose");
require("dotenv").config();

const dbConnect = () => {
  console.log("Welcome to database");

  mongoose
    .connect(
      // "mongodb+srv://findmyhomeadmin:admin123@cluster0.xf8fs26.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/FindMyHome",
      "mongodb+srv://findmyhomeadmin:admin123@cluster0.xf8fs26.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/FindMyHome"
    )
    .then(() => {
      console.log("Connected to the database Atlas");
    })
    .catch((err) => {
      console.error("Error in connecting the database", err);
    });
};

module.exports = dbConnect;
