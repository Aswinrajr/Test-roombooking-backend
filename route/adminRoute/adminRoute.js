const express = require("express");
const adminRoute = express();
const multer = require("multer");

const adminController = require("../../controller/adminController/adminController");
const authMiddleware = require("../../middleware/authMiddleware");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

adminRoute.get("/", adminController.adminLogin);
adminRoute.post("/login", adminController.adminVerifyLogin);
adminRoute.post("/reqotp", adminController.reqForOtp);

adminRoute.post("/verifyotp", adminController.verifyOtp);
adminRoute.get("/adminimage", adminController.getAdminImage);

adminRoute.get("/getdashboarddata", authMiddleware, adminController.getAdminDashboard);
adminRoute.get("/getgraphdata/:period", authMiddleware, adminController.getGraphData);

adminRoute.get("/users", authMiddleware, adminController.getUsersData);
adminRoute.post("/users/action", authMiddleware, adminController.userAction);
adminRoute.get("/providers", authMiddleware, adminController.getProviderData);
adminRoute.get(
  "/providers/action/:id",
  authMiddleware,
  adminController.providerAction
);

adminRoute.get(
  "/getallbookingdata",
  authMiddleware,
  adminController.getAdminBookingData
);

adminRoute.get("/confirmuser", authMiddleware, adminController.confirmUser);
adminRoute.post("/action", authMiddleware, adminController.userRoleChange);
adminRoute.post("/adminprofile", authMiddleware, adminController.adminProfile);
adminRoute.post(
  "/changepassword",
  authMiddleware,

  adminController.adminChangePassword
);

adminRoute.post(
  "/uploadimage",

  adminController.uploadProfileImage
);


adminRoute.get("/singlebookingdetails/:id",authMiddleware,adminController.singleBookingDetails)

adminRoute.get("/getallprovider",authMiddleware,adminController.getProviderDetails)
adminRoute.delete("/deleteoffer/:id",authMiddleware,adminController.deleteOffer)

//offers
adminRoute.get("/getalloffers",authMiddleware,adminController.getAllOffers)
adminRoute.post("/saveofferdata",authMiddleware,adminController.saveAllOffers)



adminRoute.get("/*", (req, res) => {
  res.status(404).send("Invalid Route");
});
module.exports = adminRoute;
