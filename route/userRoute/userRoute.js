const express = require("express");
const userRoute = express();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const userController = require("../../controller/userController/userController");
const authMiddleware = require("../../middleware/userAuthMiddleware");
const chatController = require("../../controller/chat/ChatController.js");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

userRoute.get("/validateuser", authMiddleware, userController.validateUser);
userRoute.get("/wallettransactions",authMiddleware,userController.walletTransactions);
userRoute.get("/room", authMiddleware, userController.getUserRoomData);
userRoute.get("/editrooms/:id", authMiddleware, userController.roomDataId);
userRoute.get("/roompreview/:id", authMiddleware, userController.previewRoom);
userRoute.get("/getcartdata", authMiddleware, userController.getCartData);
userRoute.get("/getuserdashboard",authMiddleware,userController.getUserDashboard);
userRoute.get("/getrecepientdata/:recId", chatController.recipientData);
userRoute.get("/getsaleschart/:period",authMiddleware,userController.getSalesChart);
userRoute.get("/getuserwallet",authMiddleware,userController.userWalletBalance);
userRoute.get("/getallreview/:roomId",authMiddleware,userController.getAllReviews);
userRoute.get("/getfilterdata/:roomId",authMiddleware,userController.getBookingRoomData);

//Pagination
userRoute.post("/getfilterdata",authMiddleware,userController.getFilteredData);


userRoute.post("/reqloginotp", userController.reqLoginOtp);
userRoute.post("/confirmotp", userController.confirmOtp);
userRoute.post("/signup", userController.userRegistration);
userRoute.post("/login", userController.userLogin);
userRoute.post("/reqotp", userController.reqForOtp);
userRoute.post("/verifyotp", userController.verifyOtp);
userRoute.post("/searchrooms", userController.searchRooms);

userRoute.post("/addroom",authMiddleware,upload.array("images", 5),userController.userAddRooms);
userRoute.post("/fetchdata", authMiddleware, userController.getCombinedData);
userRoute.post("/bookroom/:id", authMiddleware, userController.bookRoom);
userRoute.post("/bookrooms/:id", authMiddleware, userController.bookRooms);
userRoute.post("/placeorder", authMiddleware, userController.placeOrder);
userRoute.post("/cancelbooking/:bookingId",authMiddleware,userController.cancelBooking);
userRoute.post("/walletpayment", authMiddleware, userController.walletPayment);
userRoute.post("/getuserdata", authMiddleware, userController.getUserData);
userRoute.post( "/getuserbookings",authMiddleware,userController.getAllBookingData);
userRoute.post("/userrequested",authMiddleware,userController.userProviderRegistration);
userRoute.post("/savetocart", authMiddleware, userController.saveToCart);
userRoute.post("/userreview/:roomId",authMiddleware,userController.userReview);
userRoute.post("/updaterooms/:id",authMiddleware,userController.updateRooms);

//razorpay
userRoute.post("/verifybooking/:roomId",authMiddleware, userController.verifybooking);
userRoute.post("/confirmbooking/:id",authMiddleware, userController.confirmRazorpayBooking);


userRoute.put("/changepassword",authMiddleware,userController.userChangePassword);
userRoute.put("/updateuserdata",authMiddleware,upload.single("image"),userController.updateUserData);


//Chats
userRoute.post("/chat", authMiddleware ,chatController.createChat);
userRoute.get("/chat/:userId",authMiddleware, chatController.userChat);
userRoute.get("/find/:firstId/:secondId",authMiddleware, chatController.findChat);



//Message
userRoute.post("/message",chatController.sendMessage);
userRoute.get("/message/:chatId",chatController.getMessage);


userRoute.get("*", (req, res) => {
  res.status(404).send("Item not found");
});

module.exports = userRoute;
