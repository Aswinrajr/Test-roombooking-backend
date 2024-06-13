const Admin = require("../../model/adminModel");
const User = require("../../model/userModel");
const Provider = require("../../model/providerModel");
const Order = require("../../model/orderModel");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config();

const fast2sms = require("fast2sms");

const axios = require("axios");
const { response } = require("express");
const { checkout } = require("../../route/providerRoute/providerRoute");
const Offer = require("../../model/offerModel");
const fast_sms_api_key = process.env.FAST_TO_SMS_KEY;
const SECRET_KEY = process.env.JWT_ADMIN_SECRET_KEY;

//Generate OTP
function generate_OTP() {
  console.log("in generate OTP");
  const digit = "0123456789";
  let OTP = "";

  for (i = 0; i < 5; i++) {
    OTP += digit[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

//ADMIN REGISTRATION
const adminLogin = async (req, res) => {
  console.log("Welcome to admin login page");
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminMobile = process.env.ADMIN_MOBILE;

  const admin = await Admin.findOne();
  console.log("Admin", admin);
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    console.log("Password hashed", passwordHash);
    const admin = new Admin({
      adminEmail,
      adminMobile,

      adminPassword: passwordHash,
    });
    await admin.save();
    console.log("Admin registered ");
    res.status(201).json({ status: "Admin Created successfully" });
  } else {
    console.log("else");
    res.status(201).json({ status: "Admin exist" });
  }
};

//ADMIN VERIFICATION
const adminVerifyLogin = async (req, res) => {
  console.log("Welcome to admin login");
  const { email, password } = req.body;
  console.log("Req.body", req.body);
  const admin = await Admin.findOne({ adminEmail: email });
  const SECRET_KEY = process.env.JWT_ADMIN_SECRET_KEY;
  try {
    console.log(admin);

    if (admin) {
      const matchPassword = await bcrypt.compare(password, admin.adminPassword);

      if (matchPassword) {
        const token = jwt.sign(
          { adminToken: admin.adminEmail, role: "admin", adminId: admin._id },
          SECRET_KEY,
          {
            expiresIn: "24h",
          }
        );

        console.log("Token created and dashboard", token);

        res.status(200).json({
          msg: "Login successful",
          admin: admin,
          token: token,
          role: "Admin",
        });
      } else {
        console.log("Password incorrect");
        res.status(401).json({ msg: "Incorrect password" });
      }
    } else {
      console.log("Admin not found");
      res.status(404).json({ msg: "Admin not found" });
    }
  } catch (err) {
    console.log("Error in verify admin", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};
const reqForOtp = async (req, res) => {
  try {
    console.log("Welcome to otp");
    const { mobile } = req.body;
    console.log(mobile);

    const admin = await Admin.findOne({ adminMobile: mobile });
    console.log(admin);

    if (admin) {
      const OTP = generate_OTP();
      req.app.locals.sOTP = OTP;
      req.app.locals.smobile = mobile;
      console.log("OTP: ", OTP, "Mobile: ", mobile);
      console.log(
        "sOTP: ",
        req.app.locals.sOTP,
        "sMobile: ",
        req.app.locals.smobile
      );
      console.log(OTP);
      console.log(fast_sms_api_key);

      const message = `Welcome to find My Home Your OTP is ${OTP} `;
      const mobileNumber = mobile;

      const smsData = {
        // sender_id:'FSTSMS',
        message: message,
        language: "english",
        route: "q",
        numbers: mobileNumber,
      };
      await axios
        .post("https://www.fast2sms.com/dev/bulkV2", smsData, {
          headers: {
            Authorization: fast_sms_api_key,
          },
        })
        .then((response) => {
          console.log("otp send", response.data);
          res.status(200).json({ msg: "OTP Sent Successfully" });
        })
        .catch((error) => {
          console.log("Error in sending sms", error);
          res
            .status(400)
            .json({ msg: "Failed to send OTP. Please try again later." });
        });
    } else {
      console.log("No admin found");
      res.status(404).json({ msg: "Admin not found" });
    }
  } catch (err) {
    console.log("Error in sending OTP:", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

//Verify otp
const verifyOtp = async (req, res) => {
  try {
    console.log("Admin find");
    console.log(req.body);
    console.log(req.app.locals.sOTP);

    let otp = parseInt(req.body.otp);
    let local = parseInt(req.app.locals.sOTP);

    console.log(typeof otp, "==>", otp);
    console.log(typeof local, "==>", local);

    if (parseInt(otp) === local) {
      console.log(otp === local);
      const admin = await Admin.findOne({});
      if (admin) {
        console.log("In admin");

        const token = jwt.sign(
          { adminToken: admin.adminEmail, role: "admin", adminId: admin._id },
          SECRET_KEY,
          {
            expiresIn: "24h",
          }
        );
        console.log(token);

        res.status(200).json({
          msg: "OTP verified successfully",
          admin: admin,
          token: token,
          role: "Admin",
        });
        console.log("Otp verified");
      } else {
        res.status(401).json({ msg: "OTP verification failed" });
      }
    } else {
      console.log("invalid otp");
      res.status(400).json({ msg: "Invalid OTP" });
    }
  } catch (err) {
    console.log("Err");
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

const getUsersData = async (req, res) => {
  try {
    const { adminToken, role } = req.decoded;

    if (role != "admin" && !adminToken) {
      return res.status(401).json({ msg: "Unauthorized " });
    }
    console.log("Welcome to users data");
    const usersData = await User.find();
    // console.log(usersData);
    res.status(200).json(usersData);
  } catch (err) {
    console.log("Error in getting the users data", err);
  }
};

const userAction = async (req, res) => {
  try {
    console.log("User action", req.body);
    const users = await User.findOne({ _id: req.body.userId });
    if (users.status === "Active") {
      users.status = "Blocked";
    } else {
      users.status = "Active";
    }
    await users.save();
    console.log(users);
    res
      .status(200)
      .json({ message: "User status updated successfully", users });
  } catch (error) {
    console.log("error in user actions", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getProviderData = async (req, res) => {
  try {
    const { adminToken, role } = req.decoded;

    if (role != "admin" && !adminToken) {
      return res.status(401).json({ msg: "Unauthorized " });
    }
    console.log("Welcome to Provider data");
    const providerData = await Provider.find();
    console.log(providerData);
    res.status(200).json(providerData);
  } catch (err) {
    console.log("Error in getting the provider data", err);
  }
};

const providerAction = async (req, res) => {
  try {
    console.log("Provider action", req.params);
    const provider = await Provider.findById({ _id: req.params.id });
    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }
    provider.status = provider.status === "Active" ? "Blocked" : "Active";
    await provider.save();
    console.log(provider);
    res
      .status(200)
      .json({ message: "Provider status updated successfully", provider });
  } catch (error) {
    console.log("Error in provider action:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getAdminBookingData = async (req, res) => {
  try {
    console.log("Welcome to admin booking data");

    const { role, adminToken } = req.decoded;

    if (role != "admin" && !adminToken) {
      return res.status(401).json({ msg: "Unauthorized " });
    }

    const orderData = await Order.find();
    const userIds = orderData.map((order) => order.userId);
    const providerIds = orderData.map((order) => order.providerId);

    const userData = await User.find({ _id: { $in: userIds } });

    const providerData = await Provider.find({ _id: { $in: providerIds } });

    const combinedData = orderData.map((order) => {
      const user = userData.find(
        (user) => user._id.toString() === order.userId.toString()
      );
      const provider = providerData.find(
        (provider) => provider._id.toString() === order.providerId.toString()
      );
      return { ...order._doc, user, provider };
    });

    console.log("Combined Data:", combinedData);

    res.status(200).json({ orders: combinedData });
  } catch (err) {
    console.log("Error in getting admin booking data", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const confirmUser = async (req, res) => {
  try {
    const { role, adminToken } = req.decoded;

    if (role != "admin" && !adminToken) {
      return res.status(401).json({ msg: "Unauthorized " });
    }

    const userData = await User.find({ role: "Render" });
    console.log(userData.length);
    console.log(userData);

    res
      .status(200)
      .json({ success: true, data: userData, count: userData.length });
  } catch (err) {
    console.log("Error in fetching rentify users", err);
    res
      .status(500)
      .json({ success: false, error: "Error fetching rentify users" });
  }
};

const userRoleChange = async (req, res) => {
  try {
    const { action, email } = req.body;
    console.log("Welcome to user role change", action, email);

    const { role, adminToken } = req.decoded;

    if (role != "admin" && !adminToken) {
      return res.status(401).json({ msg: "Unauthorized " });
    }

    let actionRequired;
    if (action === "accept") {
      actionRequired = "PG";
    } else {
      actionRequired = "user";
    }

    const userData = await User.findOneAndUpdate(
      { userEmail: email },
      { $set: { role: actionRequired } },
      { new: true }
    );

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Role changed successfully");
    res.status(200).json({
      success: true,
      message: "User role changed successfully",
      userData,
    });
  } catch (err) {
    console.log("Error in user role change", err);
    res
      .status(500)
      .json({ success: false, error: "Error in user role change" });
  }
};

const adminProfile = async (req, res) => {
  try {
    console.log("Welcome to admin profile", req.body);
    console.log("Decoded...........", req.decoded);
    const { adminToken, role } = req.decoded;

    if (role != "admin" && !adminToken) {
      return res.status(401).json({ msg: "Unauthorized " });
    }

    const adminData = await Admin.findOne(
      { adminEmail: adminToken },
      { adminPassword: 0 }
    );

    if (!adminData) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json(adminData);
  } catch (err) {
    console.log("Error in admin profile", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const adminChangePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    console.log("Decoded...........", req.decoded);
    const { adminToken, role } = req.decoded;
    const adminData = await Admin.findOne({ adminEmail: adminToken });

    if (role != "admin" && !adminToken) {
      return res.status(401).json({ msg: "Unauthorized " });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    const matchPassword = await bcrypt.compare(
      newPassword,
      adminData.adminPassword
    );
    console.log(matchPassword);
    if (matchPassword) {
      return res.status(400).json({
        message: "New password cannot be the same as the old password",
      });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updatedAdmin = await Admin.findOneAndUpdate(
      { adminEmail: adminToken },
      { adminPassword: passwordHash },
      { new: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    console.log("Admin password updated");

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.log("Error in admin change password", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
const uploadProfileImage = async (req, res) => {
  try {
    console.log("Welcome to admin update profile", req.body.imageUrl);

    const { imageUrl } = req.body;

    const adminData = await Admin.findOneAndUpdate(
      {},
      { $set: { image: imageUrl } }
    );

    return res
      .status(200)
      .json({ message: "Profile image uploaded successfully" });
  } catch (err) {
    console.log("Error in admin update profile", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAdminImage = async (req, res) => {
  try {
    console.log("Welcome to Admin Image", req.body);

    const adminData = await Admin.findOne(
      {},
      { _id: 0, image: 1, adminEmail: 1 }
    );
    console.log(adminData);

    if (adminData) {
      return res
        .status(200)
        .json({ imagePath: adminData.image, email: adminData.adminEmail });
    } else {
      return res.status(404).json({ message: "Admin image not found" });
    }
  } catch (err) {
    console.log("Error in admin image", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const singleBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Welcome to seeing booking details", id);
    const bookingData = await Order.findOne({ _id: id });

    if (bookingData) {
      console.log(bookingData);
      const userData = await User.findOne(
        { _id: bookingData.userId },
        { userPassword: 0 }
      );
      const providerData = await Provider.findOne(
        { _id: bookingData.providerId },
        { providerPassword: 0 }
      );
      const combinedData = [userData, providerData, bookingData];
      console.log(combinedData);

      res.status(200).json({ success: true, data: combinedData });
    } else {
      console.log("No booking data");
      res
        .status(404)
        .json({ success: false, message: "No booking data found" });
    }
  } catch (err) {
    console.log("Error in seeing the booking details", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
const getAdminDashboard = async (req, res) => {
  try {
    console.log("Welcome to admin dashboard get data");

    const userNo = await User.countDocuments();

    const providerNo = await Provider.countDocuments();

    const orderData = await Order.find();
    const orderNo = orderData.length;

    let totalSales = 0;
    orderData.forEach((order) => {
      totalSales += order.amount;
    });

    const cancelledOrders = orderData.filter(
      (order) => order.status === "cancel"
    ).length;

    console.log("User: ", userNo);
    console.log("providerNo: ", providerNo);
    console.log("orderNo: ", orderNo);
    console.log("totalSales: ", totalSales);
    console.log("cancelledOrders: ", cancelledOrders);

    const salesData = {
      userNo,
      providerNo,
      orderNo,
      totalSales,
      cancelledOrders,
      totalBooked: orderNo - cancelledOrders,
    };

    res.status(200).json({ success: true, salesData });
  } catch (err) {
    console.log("Error in Admin dashboard", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
const getGraphData = async (req, res) => {
  try {
    console.log("Welcome to sales chart");
    const { period } = req.params;
    console.log("Period", period);

    let startDateString;
    let endDateString = new Date().toISOString().split("T")[0];

    switch (period) {
      case "daily":
        startDateString = endDateString;
        break;
      case "monthly":
        startDateString = endDateString.substring(0, 7) + "-01";
        break;
      case "yearly":
        startDateString = endDateString.substring(0, 4) + "-01-01";
        break;
      default:
        return res.status(400).json({ message: "Invalid period specified" });
    }

    const bookings = await Order.find({
      bookingDate: { $gte: startDateString, $lte: endDateString },
    });

    const orderNo = bookings.length;
    const totalSales = bookings.reduce(
      (sum, booking) => sum + booking.totalAmounttoPay,
      0
    );
    const cancelledOrders = bookings.filter(
      (booking) => booking.status === "cancel"
    ).length;

    console.log("totalBookings", orderNo);

    console.log("totalIncome", totalSales);

    console.log("totalCancellations", cancelledOrders);

    res.json({
      orderNo,
      totalSales,
      cancelledOrders,
    });
  } catch (err) {
    console.log("Error in sales chart", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllOffers = async (req, res) => {
  try {
    console.log("Welcome to offers.");
    const offers = await Offer.find();
    console.log("Offers", offers);

    res.status(200).json({
      success: true,
      message: "Offers retrieved successfully",
      data: offers,
    });
  } catch (err) {
    console.log("Error in getting all the offers", err);
    res.status(500).json({
      success: false,
      message: "Error in getting all the offers",
      error: err.message,
    });
  }
};

const saveAllOffers = async (req, res) => {
  try {
    console.log("Welcome to offers.", req.body);
    const { providerId, providerName, validFrom, validTo, offerCode } =
      req.body;
    console.log(providerId, providerName, validFrom, validTo, offerCode);
    const amount = offerCode.match(/\d+/)[0];
    console.log(amount);

    const newOffer = new Offer({
      providerId,
      providerName,
      validFrom,
      validTo,
      offerCode,
      amount,
    });

    const savedOffer = await newOffer.save();

    res.status(201).json({
      success: true,
      message: "Offer saved successfully",
      data: savedOffer,
    });
  } catch (err) {
    console.log("Error in saving the offer", err);
    res.status(500).json({
      success: false,
      message: "Error in saving the offer",
      error: err.message,
    });
  }
};

const getProviderDetails = async (req, res) => {
  try {
    console.log("Welcome to get providers");
    const providerData = await Provider.find().select("providerName _id");
    console.log("providerData", providerData);
    res.status(200).json(providerData);
  } catch (err) {
    console.log("Error in provider data", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Welcome to delete offer", id);

    const result = await Offer.findOneAndDelete({ _id: id });

    if (!result) {
      return res.status(404).json({ message: "Offer not found" });
    }

    res
      .status(200)
      .json({ message: "Offer successfully deleted", offer: result });
  } catch (err) {
    console.error("Error in delete offer", err);
    res.status(500).json({ message: "Server error, please try again later" });
  }
};

module.exports = {
  adminLogin,
  adminVerifyLogin,
  reqForOtp,
  verifyOtp,
  getUsersData,
  userAction,
  providerAction,
  getProviderData,
  getAdminBookingData,
  confirmUser,
  userRoleChange,
  adminProfile,
  adminChangePassword,
  uploadProfileImage,
  getAdminImage,
  singleBookingDetails,
  getAdminDashboard,
  getGraphData,
  getAllOffers,
  saveAllOffers,
  getProviderDetails,
  deleteOffer,
};
