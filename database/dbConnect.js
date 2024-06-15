const mongoose = require("mongoose");
require("dotenv").config();

const dbConnect = () => {
  console.log("Welcome to database");
  console.log("Attempting to connect to MongoDB with URI:", process.env.DATABASE_CONNECTION);
  
  mongoose
    .connect(process.env.DATABASE_CONNECTION, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Connected to the database Atlas");
    })
    .catch((err) => {
      console.error("Error in connecting the database", err);
    });

  mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
  });
};

module.exports = dbConnect;
