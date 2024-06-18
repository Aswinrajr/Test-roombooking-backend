const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const adminRoute = require("./route/adminRoute/adminRoute");
const providerRoute = require("./route/providerRoute/providerRoute");
const userRoute = require("./route/userRoute/userRoute");
const chatRoute = require("./route/chatRoute/chatRoute");
const dataBase = require("./database/dbConnect");
const logIp = require("./middleware/logIp");

const app = express();
const PORT = process.env.PORT || 1997;

app.set("trust proxy", true);

app.use(logIp);

dataBase();

app.use(cookieParser());
app.use(express.json());

const allowedOrigin = "http://localhost:5173";

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || origin === allowedOrigin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.disable("x-powered-by");

app.use("/uploads", express.static("uploads"));

app.use("/admin", adminRoute);
app.use("/provider", providerRoute);
app.use("/", userRoute);
// app.use("/chat", chatRoute);

app.listen(PORT, () => {
  console.log(`Application is running on port address: ${PORT}`);
});
