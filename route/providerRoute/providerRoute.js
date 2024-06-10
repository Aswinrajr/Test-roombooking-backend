const express = require("express");
const providerRoute = express();
const providerController = require("../../controller/providerController/providerController");
// const upload = require('../../multer/multer')
const multer = require("multer");

const authMiddleware = require("../../middleware/authMiddleware");
const chatController = require("../../controller/chat/ChatController");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });




providerRoute.post("/login", providerController.providerLogin);
providerRoute.post("/signup", providerController.providerSignUp);
providerRoute.post("/reqotp", providerController.providerReqOtp);
providerRoute.post("/verifyotp", providerController.providerVerifyOtp);


providerRoute.get("/getprovider",authMiddleware,providerController.getProviderData);
providerRoute.get("/rooms", authMiddleware, providerController.getRoomData);
providerRoute.get("/getbookingdata",authMiddleware,providerController.getBookingData)
providerRoute.get("/singlebooking/:id",authMiddleware,providerController.singleBookings);
providerRoute.get("/providerdashboard",authMiddleware,providerController.providerDashboard);
providerRoute.get("/providerchartdata/:period",authMiddleware,providerController.providerChartData);
providerRoute.get("/rooms/editrooms/:id",authMiddleware,providerController.roomDataId);


providerRoute.post("/rooms/updaterooms/:id",authMiddleware,upload.array("images", 5),providerController.updateRooms);
providerRoute.post("/completedata",authMiddleware,providerController.completeProviderData);
providerRoute.post("/savedata",authMiddleware,providerController.saveProviderData);
providerRoute.post("/rooms/addrooms",authMiddleware,providerController.providerAddrooms)
providerRoute.post("/changepassword",authMiddleware,providerController.changePassoword);

// providerRoute.post("/savedata",authMiddleware,upload.array("images", 5),providerController.saveProviderData)

//Chats
providerRoute.get("/chat/:userId", chatController.providerChat);
providerRoute.get("/find/:firstId/:secondId", chatController.findChat);
providerRoute.post("/chat", chatController.createChat);

//getrecepinet data
providerRoute.get("/getrecepientdata/:recId", chatController.recipientData);
providerRoute.get("/lastmessage/:recId", chatController.getLastMessage);

//Message
providerRoute.post("/message", chatController.sendMessage);
providerRoute.get("/message/:chatId",chatController.getMessage);

module.exports = providerRoute;
