const axios = require("axios");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fast2sms = require("fast2sms");
const path = require("path");
require("dotenv").config();

const Provider = require("../../model/providerModel");
const User = require("../../model/userModel");
const Room = require("../../model/roomModel");
const Order = require("../../model/orderModel");

const fast_sms_api_key = process.env.FAST_TO_SMS_KEY;
const SECRET_KEY = process.env.JWT_ADMIN_SECRET_KEY;

function generate_OTP() {
  console.log("in generate OTP");
  const digit = "0123456789";
  let OTP = "";

  for (i = 0; i < 5; i++) {
    OTP += digit[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

//Provider Registration
const providerLogin = async (req, res) => {
  console.log("Welcome to provider Login");
  try {
    const { email, password } = req.body;
    console.log(email, password);

    const provider = await Provider.findOne({
      providerEmail: email,
    });
    console.log("Provider", provider);

    if (provider) {
      if (provider.status === "Active") {
        const matchPassword = await bcrypt.compare(
          password,
          provider.providerPassword
        );
        if (matchPassword) {
          const secretKey = process.env.JWT_ADMIN_SECRET_KEY;

          const token = jwt.sign(
            {
              providerToken: provider.providerEmail,
              role: "provider",
              providerId: provider._id,
            },
            secretKey,
            { expiresIn: "24h" }
          );
          console.log("Token created", token);

          console.log("Provider login successful");
          res
            .status(200)
            .json({ msg: "Provider login successful", token: token });
        } else {
          console.log("Password is incorrect");
          res.status(401).json({ msg: "Incorrect password" });
        }
      } else {
        console.log("provider is blocked ");
        res
          .status(401)
          .json({ msg: "Something went wrong please contact admin" });
      }
    } else {
      console.log("Provider is not registered, please sign up");
      res.status(404).json({ msg: "Provider not registered, please sign up" });
    }
  } catch (err) {
    console.log("Error in provider verification", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

const providerSignUp = async (req, res) => {
  try {
    const { residenceName, email, mobile, password, confirmPassword } =
      req.body;
    console.log(residenceName, email, mobile, password, confirmPassword);
    outputNumber = mobile.replace(/\D/g, "").slice(2);

    const existingProvider = await Provider.findOne({ providerEmail: email });

    if (existingProvider) {
      console.log("Provider is already registered. Please login.");
      res
        .status(400)
        .json({ message: "Provider is already registered. Please login." });
    } else {
      if (password === confirmPassword) {
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("Password hashed:", hashedPassword);

        const provider = new Provider({
          providerName: residenceName,
          providerEmail: email,
          providerMobile: outputNumber,
          providerPassword: hashedPassword,
        });

        await provider.save();
        console.log("Sign up successful.");

        res.status(201).json({ message: "Sign up successful." });
      } else {
        console.log("Passwords do not match.");
        res.status(400).json({ message: "Passwords do not match." });
      }
    }
  } catch (err) {
    console.log("Error in provider registration:", err);
    res.status(500).json({
      message: "Provider is already registered . Please try again later.",
    });
  }
};

const providerReqOtp = async (req, res) => {
  try {
    console.log("Welcome to otp", req.body);
    let { mobile } = req.body;
    mobile = parseInt(mobile);
    console.log(typeof mobile);

    const provider = await Provider.findOne({ providerMobile: mobile });
    console.log(provider);

    if (provider) {
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
      console.log("No provider found");
      res.status(404).json({ message: "Provider not found" });
    }
  } catch (err) {
    console.log("Error in req for otp", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

const providerVerifyOtp = async (req, res) => {
  try {
    console.log("Welcome to verify otp");
    const OTP = req.body.otp;
    const secretKey = process.env.JWT_ADMIN_SECRET_KEY;
    const mobile = req.app.locals.smobile;

    if (req.app.locals.sOTP === OTP) {
      const provider = await Provider.findOne({
        providerMobile: mobile,
        status: "Active",
      });
      if (provider) {
        const token = jwt.sign(
          {
            providerToken: provider.providerEmail,
            role: "provider",
            providerId: provider._id,
          },
          secretKey,
          {
            expiresIn: "24h",
          }
        );
        console.log("Token", token);
        res.status(200).json({
          msg: "OTP verified successfully",
          provider: provider,
          token: token,
          role: "provider",
        });
      } else {
        res.status(404).json({ msg: "Provider not found" });
      }
    } else {
      console.log("Otp incorrect");
      res.status(401).json({ msg: "Incorrect OTP" });
    }
  } catch (err) {
    console.log("Error in verify the otp", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

const getRoomData = async (req, res) => {
  try {
    const { providerToken, role } = req.decoded;
    console.log("welcome to get room data", providerToken);

    if (role != "provider") {
      return res.status(401).json({ msg: "Unauthorized " });
    }

    const provider = await Provider.findOne({
      providerEmail: providerToken,
      status: "Active",
    });
    console.log(provider);

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const providerId = provider._id;
    console.log("Provider id", providerId);

    const roomsData = await Room.find({ providerId, status: "Available" });

    console.log("roomsData", roomsData);
    res.status(200).json(roomsData);
  } catch (err) {
    console.log("Error in getting the room data", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const providerAddrooms = async (req, res) => {
  console.log("Req.body", req.body);

  const newRoomData = req.body.roomData;
  const imageUrl = req.body.files;

  const { roomType, adults, children, amount, status, amenities } = newRoomData;
  const { providerToken, role } = req.decoded;

  if (role != "provider") {
    return res.status(401).json({ msg: "Unauthorized " });
  }

  try {
    const providerId = await Provider.findOne({
      providerEmail: providerToken,
      status: "Active",
    });
    console.log("Provider Add room", providerId);
    const newRoom = new Room({
      providerId: providerId._id,
      roomType,
      adults,
      children,
      amount,
      status,
      amenities: amenities,
      images: imageUrl,
    });

    const savedRoom = await newRoom.save();

    res
      .status(200)
      .json({ message: "Room added successfully", room: savedRoom });
  } catch (error) {
    console.error("Error adding room:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const roomDataId = async (req, res) => {
  try {
    console.log("Welcome to doom data", req.params.id);

    const { role } = req.decoded;

    if (role != "provider") {
      return res.status(401).json({ msg: "Unauthorized " });
    }
    const room = await Room.findOne({ _id: req.params.id });
    console.log(room);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateRooms = async (req, res) => {
  console.log("Req.body", req.body);
  const newRoomData = req.body.roomData;
  const imageUrl = req.body.files;

  const { role } = req.decoded;

  if (role != "provider") {
    return res.status(401).json({ msg: "Unauthorized " });
  }

  const { id } = req.params;
  const { roomType, adults, children, amount, status, amenities } = newRoomData;
  const images = req.files ? req.files.map((file) => file.path) : [];
  console.log(images);
  console.log(req.params);

  try {
    const updatedRoom = await Room.findByIdAndUpdate(
      { _id: id },
      {
        roomType,
        adults,
        children,
        amount,
        status,
        amenities: amenities,
        images: imageUrl,
      },
      { new: true }
    );

    res
      .status(200)
      .json({ message: "Room updated successfully", room: updatedRoom });
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const completeProviderData = async (req, res) => {
  try {
    console.log("Welcome to complete provider profile");
    console.log("Decoded...........", req.decoded);
    const { providerToken } = req.decoded;

    const providerData = await Provider.findOne({
      providerEmail: providerToken,
      status: "Active",
    });
    console.log(providerData);
    if (providerData.Profile === "Not Completed") {
      res.json({ msg: "Complete your profile Data" });
    } else {
      res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error("Error completing provider data:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const saveProviderData = async (req, res) => {
  try {
    console.log("welcome to save provider data======>", req.body);
    const newData = req.body.providerDetails;
    console.log("ProviderDetails=======>", newData);
    const {
      providerName,
      providerRooms,
      providerAddress,
      facilities,
      ProviderCity,
    } = newData;
    const latitude = req.body.lat;
    const longitude = req.body.lng;
    const allLinks = req.body.files;
    const { providerToken, role } = req.decoded;

    if (role != "provider") {
      return res.status(401).json({ msg: "Unauthorized " });
    }

    console.log("room", providerRooms);
    console.log("location", providerAddress);
    console.log("facilities", facilities);

    console.log("city", ProviderCity);

    console.log("Latitude:", latitude, typeof latitude);
    console.log("Longitude:", longitude, typeof longitude);

    const updateProvider = await Provider.findOneAndUpdate(
      { providerEmail: providerToken, status: "Active" },
      {
        $set: {
          providerAddress: providerAddress,
          ProviderCity,
          providerImage: allLinks,
          providerRooms: parseInt(providerRooms),
          Profile: "Completed",
          coordinates: [longitude, latitude],
          facilities: facilities,
        },
      },
      { new: true }
    );

    console.log("ProviderSaved successfully", updateProvider);

    res.json({ success: true, message: "Provider data saved successfully" });
  } catch (err) {
    console.log("error in saving the data", err);

    res
      .status(500)
      .json({ success: false, message: "Failed to save provider data" });
  }
};

const getBookingData = async (req, res) => {
  try {
    console.log("Welcome to PROVIDER booking data");

    const { role, providerToken } = req.decoded;

    if (role != "provider" && !providerToken) {
      return res.status(401).json({ msg: "Unauthorized " });
    }
    const providerNewData = await Provider.findOne({
      providerEmail: providerToken,
    });

    const orderData = await Order.find({ providerId: providerNewData._id }).sort({createdAt:-1});
    const userIds = orderData.map((order) => order.userId);
    const providerIds = orderData.map((order) => order.providerId);

    const userData = await User.find({ _id: { $in: userIds } });

    // const providerData = await Provider.find({ _id: { $in: providerIds } });

    const providerData = await Provider.find({ _id: providerNewData._id });

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

const getProviderData = async (req, res) => {
  try {
    console.log("Welcome to provider profile====>");
    console.log("Decoded...........", req.decoded);
    const { providerToken, role } = req.decoded;
    console.log("providerToken", providerToken);

    if (role != "provider") {
      return res.status(401).json({ msg: "Unauthorized " });
    }

    const providerData = await Provider.findOne(
      { providerEmail: providerToken, status: "Active" },
      { providerPassword: 0 }
    );
    console.log(providerData);

    if (!providerData) {
      console.log("ERROR");
      return res.status(404).json({ message: "provider not found" });
    }

    res
      .status(200)
      .json({ message: "Got provider", providerData: providerData });
  } catch (err) {
    console.log("Error in provider profile", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const changePassoword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    const { providerToken, role } = req.decoded;

    if (role != "provider") {
      return res.status(401).json({ msg: "Unauthorized " });
    }

    if (newPassword !== confirmPassword) {
      console.log("Passowrd not match");
      return res.status(400).json({ message: "Passwords do not match" });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updatedProvider = await Provider.findOneAndUpdate(
      { providerEmail: providerToken, status: "Active" },
      { providerPassword: passwordHash },
      { new: true }
    );

    if (!updatedProvider) {
      return res.status(404).json({ message: "provider not found" });
    }
    console.log("provider password updated");

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.log("Error provider change password", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const singleBookings = async (req, res) => {
  try {
    console.log("Welcome to single bookings", req.params);
    const { id } = req.params;
    const bookingData = await Order.findOne({ _id: id });
    if (bookingData) {
      const userData = await User.findOne(
        { _id: bookingData.userId },
        { userPassword: 0 }
      );
      const providerAdress = await Provider.findOne(
        { _id: bookingData.providerId },
        { providerAddress: 1 }
      );
      const combinedData = [userData, bookingData, providerAdress];
      console.log(combinedData);
      res.status(200).json({ success: true, data: combinedData });
    } else {
      console.log("No booking data");
      res
        .status(404)
        .json({ success: false, message: "No booking data found" });
    }
  } catch (err) {
    console.log("Error in seeing single bookings", err);
  }
};

const providerDashboard = async (req, res) => {
  try {
    console.log("Welcome to provider dashboard");
    const { providerToken, role } = req.decoded;
    const providerData = await Provider.findOne({
      providerEmail: providerToken,
    });
    const orderData = await Order.find({ providerId: providerData._id });
    const orderNo = orderData.length;

    let totalSales = 0;
    orderData.forEach((order) => {
      totalSales += order.amount;
    });
    const cancelledOrders = orderData.filter(
      (order) => order.status === "cancelled"
    ).length;

    const salesData = {
      orderNo,
      totalSales,
      cancelledOrders,
      totalBooked: orderNo - cancelledOrders,
    };
    res.status(200).json({ success: true, salesData });
  } catch (err) {
    console.log("Error in provider dashboatrd");
    res.status(500).json({ error: "Internal server error" });
  }
};

const providerChartData = async (req, res) => {
  try {
    console.log("Welcome to sales chart");
    const { period } = req.params;
    console.log("Period", period);
    const { providerId } = req.decoded;
    console.log("userId", providerId);

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
      providerId: providerId,
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

module.exports = {
  providerLogin,
  providerSignUp,
  providerReqOtp,
  providerVerifyOtp,
  providerAddrooms,
  getRoomData,
  roomDataId,
  updateRooms,
  completeProviderData,
  saveProviderData,
  getBookingData,
  getProviderData,
  changePassoword,
  singleBookings,
  providerDashboard,
  providerChartData,
};
