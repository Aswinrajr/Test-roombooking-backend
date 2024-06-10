const Razorpay = require("razorpay");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const fast2sms = require("fast2sms");
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
require("dotenv").config();
const qr = require("qr-image");

const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const fs = require("fs");

const User = require("../../model/userModel");
const Provider = require("../../model/providerModel");
const Rooms = require("../../model/roomModel");
const Order = require("../../model/orderModel");
const Room = require("../../model/roomModel");
const Cart = require("../../model/cartModel");
const chatModel = require("../../model/chatModel");
const messageModel = require("../../model/messageModel");
const Offer = require("../../model/offerModel");

const KEY_ID = process.env.RAZORPAY_ID;
const SECRET_KEY = process.env.RAZORPAY_SECRET_ID;
const fast_sms_api_key = process.env.FAST_TO_SMS_KEY;
const SECRET_KEYS = process.env.JWT_ADMIN_SECRET_KEY;

function generate_OTP() {
  console.log("in generate OTP");
  const digit = "0123456789";
  let OTP = "";

  for (i = 0; i < 5; i++) {
    OTP += digit[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

async function generateQRCode(data) {
  try {
    console.log("Data to encode:", data);
    const jsonData = JSON.stringify(data);
    const qrCode = qr.imageSync(jsonData, { type: "png" });
    const qrCodeDataURL = `data:image/png;base64,${qrCode.toString("base64")}`;
    return qrCodeDataURL;
  } catch (error) {
    console.error("Error generating QR code:", error);
    return null;
  }
}

function generateRandomCode(length) {
  const characters = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function generateBookingId() {
  const code = generateRandomCode(6);
  return "bkId" + code;
}

function generateTransactionId() {
  const number = generateRandomCode(7);
  return "transId" + number;
}

const generatePDF = async (order, data) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const fileName = `invoice-${order._id}.pdf`;
    const stream = fs.createWriteStream(fileName);
    doc.pipe(stream);

    const headerTop = 57;
    const invoiceTop = headerTop + 30;
    const dateTop = invoiceTop + 15;
    const billingTop = 130;
    const shippingTop = 130;
    const tableTop = 200;
    const tableWidths = {
      description: 200,
      adults: 100,
      children: 100,
      checkIn: 100,
      checkOut: 100,
    };
    const footerTop = doc.page.height - 100;

    const billing = {
      name: "FindMyHome",
      address: "5/11 street 3 Ashok nagar Delhi",
      phone: "0123456789",
      email: "findmyhome@gmail.com",
    };
    const shipping = {
      name: data.userName || data.providerName,
      address: order.Adress,
    };

    doc.fontSize(18).text("INVOICE", 200, headerTop, { align: "right" });
    doc
      .fontSize(10)
      .text(`Invoice No: ${order._id}`, 200, invoiceTop, { align: "right" });
    doc
      .fontSize(10)
      .text(`Date: ${new Date().toLocaleDateString()}`, 200, dateTop, {
        align: "right",
      });

    doc.fontSize(10).text("Bill To:", 50, billingTop);
    doc
      .fontSize(10)
      .text(
        `${billing.name}\n${billing.address}\n${billing.phone}\n${billing.email}`,
        50,
        billingTop + 15
      );

    doc.fontSize(10).text("Ship To:", 300, shippingTop);
    doc
      .fontSize(10)
      .text(`${shipping.name}\n${shipping.address}`, 300, shippingTop + 15);

    doc.moveDown();
    doc.fontSize(10).text("Order Details", 50, tableTop - 20);

    const headers = [
      "Room Type",
      "Adults",
      "Children",
      "Check In",
      "Check Out",
    ];
    let tableHeight = tableTop;
    headers.forEach((header, i) => {
      const startX =
        i === 0
          ? 50
          : 50 +
            Object.values(tableWidths)
              .slice(0, i)
              .reduce((a, b) => a + b, 0);
      doc.fontSize(10).text(header, startX, tableHeight);
    });
    tableHeight += 15;

    doc.fontSize(10);
    doc.text(order.roomType, 50, tableHeight);
    doc.text(order.adults, 50 + tableWidths.description, tableHeight);
    doc.text(
      order.children,
      50 + tableWidths.description + tableWidths.adults,
      tableHeight
    );
    doc.text(
      order.checkInDate,
      50 + tableWidths.description + tableWidths.adults + tableWidths.children,
      tableHeight
    );
    doc.text(
      order.checkOutDate,
      50 +
        tableWidths.description +
        tableWidths.adults +
        tableWidths.children +
        tableWidths.checkIn,
      tableHeight
    );

    tableHeight += 30;
    doc
      .fontSize(10)
      .text("Total Amount:", 400, tableHeight, { continued: true })
      .font("Helvetica-Bold")
      .text(` $${order.totalAmounttoPay}`);

    doc.fontSize(10).text(`Status: ${order.status}`, 50, footerTop);
    doc
      .moveDown()
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();
    doc.fontSize(8).text("Thank you for your business", { align: "center" });

    doc.end();

    stream.on("finish", () => {
      resolve(fileName);
    });
    stream.on("error", (err) => {
      reject(err);
    });
  });
};

async function sendMail(
  userToken,
  savedOrder,
  bookingDetails,
  adress,
  qrCodeDataURL,
  invoiceFilePath
) {
  const providerEmail = process.env.ADMIN_EMAIL;
  const providerPassword = process.env.EMAIL_PASSWORD;
  console.log(providerEmail, providerPassword);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: providerEmail,
      pass: providerPassword,
    },
  });

  const mailOptions = {
    from: providerEmail,
    to: userToken,
    subject: "Room Booking Details",
    html: `
      <p>Thank you for booking a room with us!</p>
      <p>Here are your booking details:</p>
      <ul>
        <li>Booking ID: ${savedOrder._id}</li>
        <li>Check-in Date: ${savedOrder.checkInDate}</li>
        <li>Check-out Date: ${bookingDetails.checkOutDate}</li>
        <li>Provider Address: ${adress.providerAddress}</li>
      </ul>
      <p>Scan the QR code below for quick access to your booking details:</p>
      <img src="cid:qrCodeImage" style="width:200px;height:200px;" alt="Booking QR Code">
    `,
    attachments: [
      {
        filename: "qrCode.png",
        content: qrCodeDataURL.split(";base64,").pop(),
        encoding: "base64",
        cid: "qrCodeImage",
      },
      {
        filename: "invoice.pdf",
        path: invoiceFilePath,
      },
    ],
  };

  console.log("Mail optiond", mailOptions);

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
}

const reqLoginOtp = async (req, res) => {
  try {
    console.log("Welcome to rel orp login", req.body);
    const { mobile } = req.body;
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
          .status(500)
          .json({ error: "Failed to send OTP. Please try again later." });
      });
  } catch (err) {
    console.log("Error in Req for otp login", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const userRegistration = async (req, res) => {
  try {
    console.log("Welcome to user sign up", req.body);
    const { userName, email, mobile, password, confirmPassword } = req.body;
    console.log(userName, email, mobile, password, confirmPassword);

    let phone = mobile.replace("+91", "");

    const user = await User.findOne({ userEmail: email });
    console.log(user);

    if (user) {
      console.log("User is already registered, please login");
      return res
        .status(400)
        .json({ message: "User is already registered, please login" });
    } else {
      if (password === confirmPassword) {
        const hashPassword = await bcrypt.hash(password, 10);
        console.log("Password hashed", hashPassword);
        const newUser = new User({
          userName: userName,
          userEmail: email,
          userMobile: phone,
          userPassword: hashPassword,
        });
        await newUser.save();

        console.log("Sign Up successful");
        return res.status(201).json({ message: "Sign Up successful" });
      } else {
        console.log("Passwords do not match");
        return res.status(400).json({ message: "Passwords do not match" });
      }
    }
  } catch (err) {
    console.log("Error in user Registration", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const userLogin = async (req, res) => {
  console.log("Welcome to user Login");
  try {
    const { email, password } = req.body;
    console.log(email, password);

    const user = await User.findOne({ userEmail: email });
    console.log("User", user);

    if (user) {
      console.log(user.status);
      if (user.status == "Active") {
        const matchPassword = await bcrypt.compare(password, user.userPassword);
        if (matchPassword) {
          const secretKey = process.env.JWT_ADMIN_SECRET_KEY;

          const token = jwt.sign(
            { userToken: user.userEmail, role: "user", userId: user._id },
            secretKey,
            {
              expiresIn: "24h",
            }
          );
          console.log("Token created", token);

          console.log("user login successful");
          res
            .status(200)
            .json({ msg: "user login successful", user: user, token: token });
        } else {
          console.log("Password is incorrect");
          res.status(401).json({ msg: "Incorrect password" });
        }
      } else {
        console.log("User is blocked");
        res
          .status(401)
          .json({ msg: "Something went wrong please contact admin" });
      }
    } else {
      console.log("user is not registered, please sign up");
      res.status(404).json({ msg: "user not registered, please sign up" });
    }
  } catch (err) {
    console.log("Error in user verification", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};
const reqForOtp = async (req, res) => {
  try {
    console.log("Welcome to otp", req.body);
    let { mobile } = req.body;
    mobile = parseInt(mobile);
    console.log(typeof mobile);

    const user = await User.findOne({ userMobile: mobile });
    console.log(user);

    if (user) {
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
            .status(500)
            .json({ error: "Failed to send OTP. Please try again later." });
        });
    } else {
      console.log("No user found");
      res.status(404).json({ msg: "User not found" });
    }
  } catch (err) {
    console.log("Error in req for otp", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const confirmOtp = async (req, res) => {
  try {
    console.log("Welcome to confirm otp", req.body);
    const OTP = req.body.otp;
    const mobile = req.body.mobile;
    console.log("Mobile", mobile, "Otp", OTP);

    if (req.app.locals.sOTP === OTP) {
      console.log("OTP VERIFIED");
      res.status(200).json({ msg: "OTP verified successfully" });
    } else {
      console.log("Otp incorrect");
      res.status(401).json({ msg: "Incorrect OTP" });
    }
  } catch (err) {
    console.log("Error in confirm otp", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    console.log("Welcome to verify otp");
    const OTP = req.body.otp;
    const secretKey = process.env.JWT_ADMIN_SECRET_KEY;
    const mobile = req.app.locals.smobile;

    if (req.app.locals.sOTP === OTP) {
      const user = await User.findOne({ userMobile: mobile });
      if (user) {
        const token = jwt.sign(
          { userToken: user.userEmail, role: "user", userId: user._id },
          secretKey,
          {
            expiresIn: "24h",
          }
        );
        console.log("Token", token);
        res
          .status(200)
          .json({ msg: "OTP verified successfully", user: user, token: token });
      } else {
        res.status(404).json({ msg: "user not found" });
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

const searchRooms = async (req, res) => {
  try {
    console.log("Haii");
    console.log(req.body);
    const { city, latitude, longitude, checkIn, checkOut, adults, children } =
      req.body;
    if (
      !city ||
      !latitude ||
      !longitude ||
      !checkIn ||
      !checkOut ||
      !adults ||
      !children
    ) {
      res.status(503).json({ message: "All field are required" });
    }

    console.log(
      "in srearch data",
      city,
      latitude,
      longitude,
      checkIn,
      checkOut,
      adults,
      children
    );

    const nearbyProviders = await Provider.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          spherical: true,
          key: "coordinates",
          maxDistance: 1000000000,
          distanceMultiplier: 0.001,
        },
      },
    ]);

    const nearbyUser = await User.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          spherical: true,
          key: "coordinates",
          maxDistance: 1000000000,
          distanceMultiplier: 0.001,
        },
      },
    ]);

    console.log(
      "++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"
    );
    console.log("Provider searched", nearbyProviders);

    console.log(
      "++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"
    );

    console.log(
      "//////////////////////////////////////////////////////////////////"
    );
    console.log("user searched", nearbyUser);

    console.log(
      "//////////////////////////////////////////////////////////////////"
    );

    console.log("Available rooms", nearbyProviders);
    const data = {
      nearbyUser,
      nearbyProviders,
    };

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error(" Error in serching data ", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getCombinedData = async (req, res) => {
  try {
    console.log("Welcome to combined data", req.body);
    const { userToken, role } = req.decoded;
    console.log("UserToken", userToken, "role", role);
    const { formData, nearbyProviders, nearbyUser } = req.body;
    console.log("===========================================");
    console.log("Formdata", formData);
    console.log("===============================================");

    const alreadyBookedRooms = await Order.find(
      {},
      {
        _id: 0,
        roomId: 1,
        checkInDate: 1,
        checkOutDate: 1,
        city: 1,
      }
    );

    console.log("Already booked rooms:", alreadyBookedRooms);

    const checkIn = new Date(formData.checkIn).getTime();
    const checkOut = new Date(formData.checkOut).getTime();

    const unavailableRoomIds = new Set(
      alreadyBookedRooms
        .filter((item) => {
          const bookedCheckIn = new Date(item.checkInDate).getTime();
          const bookedCheckOut = new Date(item.checkOutDate).getTime();

          return (
            (bookedCheckIn <= checkOut && bookedCheckIn >= checkIn) ||
            (bookedCheckOut >= checkIn && bookedCheckOut <= checkOut) ||
            (bookedCheckIn <= checkIn && bookedCheckOut >= checkOut)
          );
        })
        .map((item) => item.roomId.toString())
    );

    console.log("Unavailable room IDs:", unavailableRoomIds);

    const roomData = await Room.find({ status: "Available" });
    console.log("Available room data:", roomData);
    const currentDate = new Date();
    console.log("Today", currentDate);
    const offers = await Offer.find({
      validFrom: { $lte: checkOut },
      validTo: { $gte: checkIn },
    });
    console.log("Offers -->:", offers);

    const combinedData = [];

    const processProviders = (providers) => {
      providers?.forEach((provider) => {
        roomData?.forEach((room) => {
          if (
            String(provider._id) === String(room.providerId) &&
            !unavailableRoomIds.has(String(room._id))
          ) {
            const offer = offers.find(
              (offer) => String(offer.providerId) === String(provider._id)
            );

            combinedData.push({
              room: room,
              distance: provider.distance,
              offerAmount: offer ? offer.amount : 0,
            });
          }
        });
      });
    };

    processProviders(nearbyProviders);
    processProviders(nearbyUser);

    console.log("Combined data:", combinedData);
    res.status(200).json(combinedData);
  } catch (error) {
    console.error("Error in getCombinedData:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const bookRoom = async (req, res) => {
  try {
    console.log("Welcome to room booking", req.body);
    const { formData } = req.body.data;
    const { userToken, role } = req.decoded;
    console.log("userToken", userToken, "role", role);

    const { id } = req.params;
    console.log("Room id", id);
    console.log("==>", formData.city);

    const roomData = await Rooms.findOne({ _id: id, status: "Available" });
    const providerData =
      (await Provider.findOne({ _id: roomData.providerId })) ||
      (await User.findOne({ _id: roomData.providerId }));
    const userData = await User.findOne({ userEmail: userToken });

    console.log("Room data", roomData);
    console.log("providerData", providerData);
    console.log("userData", userData);
    console.log("formData", formData);

    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const today = new Date();

    const timeDifference = Math.abs(
      checkOutDate.getTime() - checkInDate.getTime()
    );
    const numberOfDays = Math.ceil(timeDifference / (1000 * 3600 * 24));
    const adress = providerData.providerAddress || providerData.userAdress[0];
    console.log("Adress====>", adress);

    const offer = await Offer.findOne(
      {
        providerId: providerData._id,
        validFrom: { $lte: checkOutDate },
        validTo: { $gte: checkInDate },
      },
      { _id: 0, amount: 1 }
    );

    let amount = offer?.amount
      ? roomData.amount - offer.amount
      : roomData.amount;

    let totalAmount = offer?.amount
      ? numberOfDays * (roomData.amount - offer.amount)
      : numberOfDays * roomData.amount;

    const bookingDetails = {
      userId: userData._id,
      roomId: roomData._id,
      providerId: providerData._id,
      roomType: roomData.roomType,
      adults: formData.adults,
      children: formData.children,
      numberOfDays,
      checkInDate: formData.checkIn,
      checkOutDate: formData.checkOut,
      bookingDate: today.toISOString().split("T")[0],
      amount: amount,
      image: [...roomData.images],
      totalAmounttoPay: totalAmount,
      city: formData.city,
      Adress: adress,
    };

    console.log(bookingDetails);

    res.status(200).json({
      success: true,
      message: "Room booked successfully",
      bookingDetails,
    });
  } catch (err) {
    console.log("Error in room booking", err);

    res.status(500).json({
      success: false,
      message: "Error in room booking",
      error: err.message,
    });
  }
};
const bookRooms = async (req, res) => {
  try {
    console.log("Welcome to users booking", req.body);

    const { formData } = req.body;
    const { userToken, role } = req.decoded;
    console.log("userToken", userToken, "role", role);

    const { id } = req.params;
    console.log("Room id", id);
    console.log("Form data", formData);
    const { checkInDate, checkOutDate } = formData;
    console.log(checkInDate, checkOutDate);

    const roomData = await Rooms.findOne({ _id: id, status: "Available" });
    const providerData = await Provider.findOne({ _id: roomData.providerId });
    const userData = await User.findOne({ userEmail: userToken });

    console.log("Room data", roomData);
    console.log("providerData", providerData);
    console.log("userData", userData);

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();

    console.log("Checked in", checkIn, "Checked out ", checkOut);

    const timeDifference = Math.abs(checkOut - checkIn);
    const numberOfDays = Math.ceil(timeDifference / (1000 * 3600 * 24));
    console.log("Number of days", numberOfDays);

    const offer = await Offer.findOne(
      { providerId: providerData._id },
      { _id: 0, amount: 1 }
    );
    let amount = offer?.amount
      ? roomData.amount - offer.amount
      : roomData.amount;
    console.log("Amount===>", amount);

    let totalAmount = offer?.amount
      ? numberOfDays * (roomData.amount - offer.amount)
      : numberOfDays * roomData.amount;

    console.log("Total amount = ", totalAmount);

    const bookingDetails = {
      userId: userData._id,
      roomId: roomData._id,
      providerId: providerData._id,
      roomType: roomData.roomType,
      adults: formData.adults,
      children: formData.children,
      numberOfDays: numberOfDays,
      bookingDate: today.toISOString().split("T")[0],
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      amount: amount,
      image: [...roomData.images, ...providerData.providerImage],
      totalAmounttoPay: totalAmount,
      city: "Thiruvanathapuram",
    };

    console.log(bookingDetails);

    res.status(200).json({
      success: true,
      message: "Room booked successfully",
      bookingDetails,
    });
  } catch (err) {
    console.log("Error in room booking", err);
    res.status(500).json({
      success: false,
      message: "Error in room booking",
      error: err.message,
    });
  }
};

const placeOrder = async (req, res) => {
  try {
    console.log("Welcome to place order", req.body);
    const bookingId = generateBookingId();
    const transactionId = generateTransactionId();

    console.log("Booking ID:", bookingId);
    console.log("Transaction ID:", transactionId);

    const bookingDetails = req.body?.bookingDetails
      ? req.body.bookingDetails
      : req.body;
    const mode = req.body.mode;
    const { userToken, role } = req.decoded;
    console.log("userToken", userToken, "role", role, bookingDetails);

    const newOrder = new Order(bookingDetails);
    console.log(newOrder);

    const savedOrder = await newOrder.save();
    savedOrder.paymentMethod = mode;
    if (mode === "by Online") {
      savedOrder.status = "Booked";
    }
    savedOrder.bookingId = bookingId;
    savedOrder.transactionId = transactionId;
    console.log("Saved order", savedOrder);
    await savedOrder.save();

    const adress =
      (await Provider.findOne(
        { _id: savedOrder.providerId },
        { _id: 0, providerAddress: 1 }
      )) ||
      (await User.findOne(
        { _id: savedOrder.providerId },
        { _id: 0, userAdress: 1 }
      ));

    const data =
      (await Provider.findOne({ _id: savedOrder.providerId })) ||
      (await User.findOne({ _id: savedOrder.providerId }));

    console.log("UserAdress******", adress);

    const qrCodeDataURL = await generateQRCode(newOrder);
    console.log("Qr code", qrCodeDataURL);

    const invoiceFilePath = await generatePDF(savedOrder, data);
    console.log("Invoice generated at", invoiceFilePath);

    const sendingMail = await sendMail(
      userToken,
      savedOrder,
      bookingDetails,
      adress,
      qrCodeDataURL,
      invoiceFilePath
    );

    console.log("Order saved successfully:", savedOrder, bookingDetails.cartId);

    const deleteCart = await User.findOne({
      "cart.cartId": bookingDetails.cartId,
    });
    console.log("Delete cart====>", deleteCart);
    if (deleteCart) {
      const cartIndex = deleteCart.cart.findIndex(
        (item) => item.cartId === bookingDetails.cartId
      );
      if (cartIndex !== -1) {
        await User.updateOne(
          { _id: deleteCart._id },
          { $pull: { cart: { cartId: bookingDetails.cartId } } }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      order: savedOrder,
      adress: adress?.providerAddress,
    });
  } catch (err) {
    console.log("Error in placing the order:", err);

    res.status(500).json({
      success: false,
      message: "Error in placing the order",
      error: err.message,
    });
  }
};

//Razorpay
const verifybooking = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    console.log("Room id in full details", roomId);
    console.log("Welcome to razorpay booking", req.body);

    const instance = new Razorpay({
      key_id: KEY_ID,
      key_secret: SECRET_KEY,
    });

    const options = {
      amount: 100 * 100,
      currency: "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
    };

    instance.orders.create(options, (error, order) => {
      if (error) {
        console.log("Error in booking room", error);
        return res.status(500).json({ msg: "Something went wrong" });
      }
      console.log("orders", order);
      res.status(200).json({ data: order });
    });
  } catch (err) {
    console.log("Error in verify the razorpay booking", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

const confirmRazorpayBooking = async (req, res) => {
  try {
    console.log("Welcome to confirm razorpay booking");
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      return res.status(200).json({ msg: "Payment verified successfully" });
    } else {
      return res.status(400).json({ msg: "Invalid Signeture Sent" });
    }
  } catch (err) {
    console.log("Eror in confirm razorpay", err);
    res.status(500).json({ msg: "Internal server Error" });
  }
};

const userChangePassword = async (req, res) => {
  try {
    console.log("Welcome to change password", req.body);

    const { oldPassword, newPassword, confirmPassword, user } = req.body;
    console.log(oldPassword, newPassword, confirmPassword);

    const { userToken, role } = req.decoded;
    console.log("userToken", userToken, "role", role);

    const userData = await User.findOne({
      userEmail: userToken,
      status: "Active",
    });
    console.log(userData);

    const samePassword = await bcrypt.compare(
      newPassword,
      userData.userPassword
    );
    if (samePassword) {
      console.log("samepassword");
      return res.status(400).json({
        message: "New password cannot be the same as the old password",
      });
    }

    if (userData) {
      const matchPassword = await bcrypt.compare(
        oldPassword,
        userData.userPassword
      );
      console.log("Matchpassword", matchPassword);
      if (matchPassword) {
        const hashPassword = await bcrypt.hash(newPassword, 10);
        console.log("Password hashed", hashPassword);
        userData.userPassword = hashPassword;
        await userData.save();
        console.log("Password updated");
        res.status(200).json({ message: "Password updated successfully" });
      } else {
        console.log("Password is not matched");
        res.status(400).json({ message: "Current password is incorrect" });
      }
    } else {
      console.log("User is not registered");
      res.status(404).json({ message: "User not found or inactive" });
    }
  } catch (err) {
    console.log("Error in update password", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUserData = async (req, res) => {
  try {
    console.log("Welcome to get user data", req.body);

    const { userToken, role } = req.decoded;
    console.log("userToken", userToken, "role", role);

    if (!userToken) {
      return res.status(400).json({ error: "User email is required" });
    }

    const userData = await User.findOne(
      { userEmail: userToken },
      { userPassword: 0 }
    );
    console.log(userData);

    if (!userData) {
      return res.status(404).json({ error: "User not found or inactive" });
    }

    console.log("UserData", userData);
    return res.status(200).json({ data: userData, msg: "user data collected" });
  } catch (err) {
    console.log("Error in getting the user data", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const updateUserData = async (req, res) => {
  try {
    console.log("Welcome to update the user", req.body);
    const { name, email, mobile, gender, address, city, image, coordinates } =
      req.body;

    const { userToken, role } = req.decoded;
    console.log("userToken", userToken, "role", role);

    let imagePath = image;
    const [latitudeStr, longitudeStr] = coordinates.split(",");

    const latitude = parseFloat(latitudeStr);
    const longitude = parseFloat(longitudeStr);

    console.log("Latitude:", latitude);
    console.log("Longitude:", longitude);

    if (req.file) {
      imagePath = req.file.path;
      console.log("Uploaded image path:", imagePath);
    }

    const updatedUser = await User.updateOne(
      { userEmail: userToken, status: "Active" },
      {
        $set: {
          userName: name,
          userEmail: email,
          userMobile: mobile,
          gender,
          userAdress: address,
          image: imagePath,
          city,
          coordinates: [longitude, latitude],
        },
      },
      { new: true }
    );
    console.log("Updated");

    res.status(200).json({
      success: true,
      message: "User data updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    console.log("Error in updating the data", err);
    res.status(500).json({
      success: false,
      message: "Error updating user data",
      error: err.message,
    });
  }
};

const getAllBookingData = async (req, res) => {
  try {
    console.log("Welcome to booking data user", req.body);

    const { userToken } = req.decoded;
    let { sortOrder } = req.body;
    console.log("userToken", userToken);

 

    const foundUser = await User.findOne({ userEmail: userToken }, { _id: 1 });

    if (foundUser) {
      const userId = foundUser._id;

      let query = { userId };

      let sortingField = "createdAt";
      let sortValue = -1;

      if (sortOrder === "asc") {
        sortingField = "totalAmounttoPay";
        sortValue = 1;
      } else if (sortOrder === "desc") {
        sortingField = "totalAmounttoPay";
        sortValue = -1;
      }
      else{
        sortingField = "createdAt"
        sortValue = -1;

      }

      const bookingData = await Order.find(query).sort({ createdAt: -1 });

      console.log("BookingData",bookingData)
      const totalCount = await Order.countDocuments(query);

      res.status(200).json({
        success: true,
        message: "Booking data retrieved successfully",
        data: bookingData,
        totalCount: totalCount
      });
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (err) {
    console.log("Error in getting booking data", err);
    res.status(500).json({
      success: false,
      message: "Error getting booking data",
      error: err.message,
    });
  }
};


const userProviderRegistration = async (req, res) => {
  try {
    console.log("Welcome to user requested provider", req.body);

    const { userToken, role } = req.decoded;
    console.log("userToken", userToken, "role", role);

    if (!userToken) {
      return res
        .status(400)
        .json({ error: "Invalid request body or missing user data" });
    }

    const userData = await User.findOneAndUpdate(
      { userEmail: userToken, status: "Active" },
      { $set: { role: "Render" } },
      { new: true }
    );

    if (!userData) {
      return res
        .status(404)
        .json({ error: "User not found or status is not active" });
    }

    console.log("UserData", userData);
    res
      .status(200)
      .json({ message: "User role updated successfully", userData });
  } catch (err) {
    console.log("Error in user requested for provider", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getUserRoomData = async (req, res) => {
  try {
    const { userToken, role } = req.decoded;
    console.log("userToken", userToken, "role", role);

    const userData = await User.findOne({ userEmail: userToken });
    console.log(userData);

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userData._id;

    const roomsData = await Room.find({
      providerId: userId,
      status: "Available",
    });

    console.log("roomsData", roomsData);
    res.status(200).json(roomsData);
  } catch (err) {
    console.log("Error in getting the room data", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const userAddRooms = async (req, res) => {
  console.log("Req.body", req.body);
  const roomData = req.body.roomData;
  const { roomType, adults, children, amount, status, amenities } = roomData;

  const { userToken, role } = req.decoded;
  const allLink = req.body.files;

  try {
    const userData = await User.findOne({ userEmail: userToken });
    console.log("User Add room", userData);
    const newRoom = new Room({
      providerId: userData._id,
      roomType,
      adults,
      children,
      amount,
      status,
      amenities: amenities,
      images: allLink,
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

    const { userToken, role } = req.decoded;
    console.log("userToken", userToken, "role", role);

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
  console.log("update room data");
  console.log("Req.body", req.body);

  const { userToken, role } = req.decoded;
  console.log("userToken", userToken, "role", role);
  const { id } = req.params;
  const { roomType, adults, children, amount, status, amenities } =
    req.body.roomData;
  const { files } = req.body;

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
        images: files,
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

const validateUser = async (req, res) => {
  try {
    console.log("Validate user", req.body);
    const { userToken, role } = req.decoded;

    console.log("User email in navbar", userToken, role);

    const userData = await User.findOne({ userEmail: userToken });

    if (role !== "user") {
      console.log("Not Authorized");
      return res.status(401).json({ message: "You are not authorized" });
    }

    if (!userData) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    if (userData.status !== "Active") {
      console.log("User is blocked, please contact admin");
      return res
        .status(403)
        .json({ message: "User is blocked, please contact admin" });
    }
    const cartNo = userData.cart.length;

    return res.status(200).json({ userData: userData, count: cartNo });
  } catch (err) {
    console.log("Error in validate user", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const previewRoom = async (req, res) => {
  try {
    console.log("Welcome to room preview", req.body);

    const { userToken, role } = req.decoded;
    console.log("userToken", userToken, "role", role);

    const id = req.params.id;
    console.log("id", id);
    const userAdress = await User.findOne(
      { userEmail: userToken },
      { _id: 0, userAdress: 1 }
    );
    console.log(userAdress.userAdress[0]);

    if (!id) {
      return res.status(400).json({ error: "Room ID is required" });
    }

    const roomData = await Room.findOne({ _id: id });
    const offer = await Offer.findOne(
      { providerId: roomData.providerId },
      { _id: 0, amount: 1 }
    );
    const amount = offer?.amount;
    console.log(roomData);

    if (!roomData) {
      return res.status(404).json({ error: "Room not found" });
    }
    roomData.status = userAdress.userAdress[0];

    res.json({ roomData, amount });
  } catch (err) {
    console.error("Error in room preview:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const cancelBooking = async (req, res) => {
  try {
    console.log("Welcome to user cancel booking", req.params.bookingId);
    const { userToken, role } = req.decoded;
    console.log("userToken", userToken, "role", role);
    const userData = await User.findOne({ userEmail: userToken });

    const orderData = await Order.findOne({ _id: req.params.bookingId });
    if (!orderData) {
      return res.status(404).json({ error: "Order not found" });
    }
    console.log(orderData);
    orderData.status = "cancel";
    await orderData.save();
    userData.wallet = userData.wallet + orderData.totalAmounttoPay;
    userData.save();
    return res.status(200).json({ message: "Order canceled successfully" });
  } catch (err) {
    console.log("Error in userCancel booking", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const userWalletBalance = async (req, res) => {
  try {
    console.log("Welcome to user wallet balance");
    const { userToken, role } = req.decoded;
    const userData = await User.findOne(
      { userEmail: userToken },
      { _id: 0, wallet: 1 }
    );

    if (userData) {
      const walletBalance = userData.wallet;
      res.status(200).json({
        success: true,
        message: "User wallet balance retrieved successfully",
        walletBalance,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "User not found or wallet balance not available",
      });
    }
  } catch (err) {
    console.error("Error in fetching the user balance", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const userReview = async (req, res) => {
  try {
    console.log("Welcome to user review", req.params, req.body);
    const { description, rating } = req.body.data;
    const { roomId } = req.params;
    const { userToken, role } = req.decoded;
    const userName = await User.findOne({ userEmail: userToken });

    const roomData = await Room.findById({ _id: roomId });

    if (!roomData) {
      return res.status(404).json({ error: "Room not found" });
    }

    const newReview = {
      userName: userName.userName,
      description,
      rating,
    };

    roomData.reviews.push(newReview);

    await roomData.save();

    return res
      .status(200)
      .json({ message: "Review submitted successfully", review: newReview });
  } catch (err) {
    console.log("Error in user REVIEW", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getAllReviews = async (req, res) => {
  try {
    console.log("Welcome to get all reviews");
    const { roomId } = req.params;
    console.log(roomId);

    const reviews = await Room.findOne({ _id: roomId }, { _id: 0, reviews: 1 });
    console.log("Reviews", reviews);

    if (!reviews) {
      return res
        .status(404)
        .json({ error: "Reviews not found for the given room ID" });
    }

    return res.status(200).json({ reviews });
  } catch (err) {
    console.log("Error in fetching the reviews", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const saveToCart = async (req, res) => {
  try {
    const bookingDetails = req.body;
    const { userToken, role } = req.decoded;
    const userData = await User.findOne({ userEmail: userToken });
    const adress =
      (await Provider.findOne(
        { _id: bookingDetails.providerId },
        { _id: 0, providerAddress: 1 }
      )) ||
      (await User.findOne(
        { _id: bookingDetails.providerId },
        { _id: 0, userAdress: 1 }
      ));

    const cartId = await generate_OTP();
    console.log("Cart id", cartId);

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }
    bookingDetails.cartId = cartId;
    bookingDetails.adress = adress.providerAddress || adress.userAdress;

    console.log(bookingDetails);

    userData.cart.push(bookingDetails);
    await userData.save();

    return res.status(200).json({
      message: "Booking details saved to cart successfully",
      userData,
      adress: adress.providerAddress || adress.userAdress,
    });
  } catch (err) {
    console.log("Error in cart", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getCartData = async (req, res) => {
  try {
    console.log("Welcome to get cart data");
    const { userToken, role } = req.decoded;
    const userCart = await User.findOne(
      { userEmail: userToken },
      { _id: 0, cart: 1 }
    );
    console.log("Usercart", userCart);

    if (!userCart) {
      return res.status(404).json({ error: "Cart data not found" });
    }

    return res.status(200).json({ userCart });
  } catch (err) {
    console.log("Error in get cart data", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getUserDashboard = async (req, res) => {
  try {
    console.log("Welcome to user's dashboard");
    const { userToken, role } = req.decoded;
    console.log("...", userToken);

    const userData = await User.findOne({ userEmail: userToken });
    console.log("==>", userData);

    const bookedOrders = await Order.find({
      providerId: userData._id,
      status: "Booked",
    });
    console.log("Booked Orders", bookedOrders);
    const totalBooking = bookedOrders.length;

    let totalBookingAmount = 0;
    bookedOrders.forEach((booking) => {
      totalBookingAmount += booking.totalAmounttoPay;
    });

    console.log("Total Booking Amount:", totalBookingAmount);

    const cancelledOrders = await Order.find({
      providerId: userData._id,
      status: "Cancelled",
    });
    const totalCancelledBookings = cancelledOrders.length;
    console.log("Cancelled Orders", cancelledOrders);

    console.log("Total Cancelled Bookings:", totalCancelledBookings);

    res.status(200).json({
      totalBookingAmount,
      totalBooking,
      totalCancelledBookings,
    });
  } catch (err) {
    console.log("Error in user's dashboard", err);
    res.status(500).json({ error: "Error fetching user's dashboard data" });
  }
};

const getSalesChart = async (req, res) => {
  try {
    console.log("Welcome to sales chart");
    const { period } = req.params;
    console.log("Period", period);
    const { userId } = req.decoded;
    console.log("userId", userId);

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
      providerId: userId,
      bookingDate: { $gte: startDateString, $lte: endDateString },
    });

    const totalBooking = bookings.length;
    const totalBookingAmount = bookings.reduce(
      (sum, booking) => sum + booking.totalAmounttoPay,
      0
    );
    const totalCancelledBookings = bookings.filter(
      (booking) => booking.status === "cancel"
    ).length;

    console.log("totalBookings", totalBooking);

    console.log("totalIncome", totalBookingAmount);

    console.log("totalCancellations", totalCancelledBookings);

    res.json({
      totalBooking,
      totalBookingAmount,
      totalCancelledBookings,
    });
  } catch (err) {
    console.log("Error in sales chart", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//Chat

// const createChat = async (req, res) => {
//   try {
//     console.log("Welcome to create chat ");
//     const newChat = new chatModel({
//       members: [req.body.senderId, req.body.receiverId],
//     });
//     const result = await newChat.save();
//     console.log("Result", result);
//     res.status(200).json({ msg: "chat created successfully", result: result });
//   } catch (err) {
//     console.log("Error in create chat ", err);
//     res.status(500).json({ msg: "Error in create chat" });
//   }
// };

const userChat = async (req, res) => {
  try {
    console.log("Welcome to userchat");
    const chat = await chatModel.find({
      members: { $in: [req.params.userId] },
    });
    res.status(200).json(chat);
  } catch (err) {
    console.log("Error in create chat ", err);
    res.status(500).json({ msg: "Error in user chat" });
  }
};

const findChat = async (req, res) => {
  try {
    const chat = await chatModel.findOne({
      members: { $all: [req.params.firstId, req.params.secondId] },
    });
    res.status(200).json(chat);
  } catch (err) {
    console.log("Error in find chat", err);
    res.status(500).json({ msg: "Error in findChat chat" });
  }
};

const sendMessage = async (req, res) => {
  try {
    console.log("Welcome to send Message");
    const { senderId, receiverId, text } = req.body;
    const message = new messageModel({
      senderId,
      receiverId,

      text,
    });
    const result = await message.save();
    res.status(200).json(result);
  } catch (err) {
    console.log("Error in send Message", err);
    res.status(500).json({ msg: "Error in send Message" });
  }
};

const getMessage = async (req, res) => {
  try {
    console.log("Welcome to get message", req.params.providerId, req.body);
    // const {roomId,bookingId} = req.body
    // console.log("RoomId",roomId)
    // console.log("BookinId",bookingId)
    const { providerId } = req.params;
    const { userToken, role, userId } = req.decoded;
    console.log(userToken, role);
    const chat = await messageModel.find({
      senderId: userId,
      receiverId: providerId,
    });
    console.log(chat);
    res.status(200).json(chat);
  } catch (err) {
    console.log("Error in gett message", err);
    res.status(500).json({ msg: "Error in get message" });
  }
};

const walletPayment = async (req, res) => {
  try {
    console.log("Welcome to wallet payments", req.body);
    const { bookingDetails, mode } = req.body;
    const { userToken } = req.decoded;
    console.log("UserToken", userToken);
    console.log("Booking details", bookingDetails);
    console.log("Mode", mode);
    const bookingId = generateBookingId();
    const transactionId = generateTransactionId();

    console.log("Booking ID:", bookingId);
    console.log("Transaction ID:", transactionId);

    const { wallet } = await User.findOne(
      { userEmail: userToken },
      { _id: 0, wallet: 1 }
    );
    console.log("Wallet amount", wallet);

    if (wallet < bookingDetails.totalAmounttoPay) {
      return res.status(400).json({
        success: false,
        message: "Insufficient funds in wallet",
      });
    }

    const newOrder = new Order(bookingDetails);
    newOrder.paymentMethod = mode;
    newOrder.status = "Booked";
    newOrder.bookingId = bookingId;
    newOrder.transactionId = transactionId;
    const savedOrder = await newOrder.save();
    console.log("New Order:", savedOrder);

    const providerAddress =
      (await Provider.findOne(
        { _id: savedOrder.providerId },
        { _id: 0, providerAddress: 1 }
      )) ||
      (await User.findOne(
        { _id: savedOrder.providerId },
        { _id: 0, userAddress: 1 }
      ));

    const data =
      (await Provider.findOne({ _id: savedOrder.providerId })) ||
      (await User.findOne({ _id: savedOrder.providerId }));

    console.log("Provider/User Address:", providerAddress);

    const qrCodeDataURL = await generateQRCode(savedOrder);
    console.log("QR code generated");

    const invoiceFilePath = await generatePDF(savedOrder, data);
    console.log("Invoice generated at", invoiceFilePath);

    const sendingMail = await sendMail(
      userToken,
      savedOrder,
      bookingDetails,
      providerAddress,
      qrCodeDataURL,
      invoiceFilePath
    );

    console.log("Email sent successfully");

    const deleteCart = await User.findOne({
      "cart.cartId": bookingDetails.cartId,
    });
    console.log("Delete cart:", deleteCart);
    if (deleteCart) {
      const cartIndex = deleteCart.cart.findIndex(
        (item) => item.cartId === bookingDetails.cartId
      );
      if (cartIndex !== -1) {
        await User.updateOne(
          { _id: deleteCart._id },
          { $pull: { cart: { cartId: bookingDetails.cartId } } }
        );
      }
    }

    const newAmount = wallet - bookingDetails.totalAmounttoPay;

    await User.updateOne(
      { userEmail: userToken },
      { $set: { wallet: newAmount } }
    );

    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      order: savedOrder,
      address: providerAddress?.providerAddress || providerAddress?.userAddress,
      newWalletAmount: newAmount,
    });
  } catch (error) {
    console.log("Error in wallet payments", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing the payment",
      error: error.message,
    });
  }
};

const walletTransactions = async (req, res) => {
  try {
    console.log("Welcome to transaction filter", req.query);
    const { userToken } = req.decoded;
    const userId = await User.findOne({ userEmail: userToken }, { _id: 1 });
    const {
      searchTerm,
      statusFilter,
      page = 1,
      limit = 10,
      sortOrder,
    } = req.query;
    let query = { userId: userId._id };
    console.log("searchTerm", searchTerm);
    console.log("page", page);
    console.log("limit", limit);
    console.log("sortOrder", sortOrder);

    let sortingOption = "createdAt";
    let sortingValue = -1;

    if (sortOrder === "asc") {
      sortingOption = "totalAmounttoPay";
      sortingValue = 1;
    } else if (sortOrder === "desc") {
      console.log("in desc ");
      sortingOption = "totalAmounttoPay";
      sortingValue = -1;
    }

    if (searchTerm) {
      query.$or = [
        { bookingId: { $regex: searchTerm, $options: "i" } },
        { transactionId: { $regex: searchTerm, $options: "i" } },
        { status: { $regex: searchTerm, $options: "i" } },
      ];
    }

    if (statusFilter) {
      query.status = statusFilter;
    }

    const totalTransactions = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalTransactions / limit);

    console.log("Sorting Option==>", sortingOption);
    console.log("Sorting Value", sortingValue);

    const transactionList = await Order.find(query)
      .sort({ [sortingOption]: sortingValue })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    console.log("transaction list: ", transactionList);

    res.status(200).json({
      success: true,
      message: "Wallet transaction list fetched successfully",
      transactions: transactionList,
      totalPages,
    });
  } catch (err) {
    console.log("Err", err);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching wallet transactions",
      error: err.message,
    });
  }
};

const getFilteredData = async (req, res) => {
  try {
    const { roomType, sortBy, rating } = req.body.filterdata;
    console.log("roomType", roomType);
    console.log("sortBy", sortBy);
    console.log("rating", rating);
    const roomData = req.body.roomData;

    let filteredData = roomData;

    if (roomType.length > 0) {
      filteredData = filteredData.filter((item) =>
        roomType.includes(item.room.roomType)
      );
    }

    filteredData = filteredData.map((item) => {
      const reviews = item.room.reviews || [];
      const totalRatings = reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      const averageRating =
        reviews.length > 0 ? totalRatings / reviews.length : 0;
      return {
        ...item,
        room: {
          ...item.room,
          averageRating,
        },
      };
    });

    let sortOptions = {};
    if (sortBy === "amount_asc") {
      sortOptions = { "room.amount": 1 };
    } else if (sortBy === "amount_desc") {
      sortOptions = { "room.amount": -1 };
    } else {
      sortOptions = { "room.amount": 1 };
    }
    filteredData.sort((a, b) => {
      const amountA = a.room.amount;
      const amountB = b.room.amount;
      if (amountA < amountB) return sortOptions["room.amount"] * -1;
      if (amountA > amountB) return sortOptions["room.amount"];
      return 0;
    });

    if (rating) {
      filteredData = filteredData.filter(
        (item) => item.room.averageRating >= parseInt(rating)
      );
    }

    console.log("Filtered and sorted data: ", filteredData);
    res.status(200).json(filteredData);
  } catch (err) {
    console.error("Error in filter data", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getBookingRoomData = async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log("Welcome getBookingRoomData", roomId);

    const bookingData = await Order.findOne({ _id: roomId });
    if (!bookingData) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const roomData = await Room.findOne({ _id: bookingData.roomId });
    if (!roomData) {
      return res.status(404).json({ message: "Room not found" });
    }

    console.log("Room Data", roomData);
    return res.status(200).json({ bookingData, roomData });
  } catch (err) {
    console.log("Error in getBookingRoomData", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  userRegistration,
  userLogin,
  reqForOtp,
  verifyOtp,
  searchRooms,
  getCombinedData,
  bookRoom,
  placeOrder,
  verifybooking,
  confirmRazorpayBooking,
  userChangePassword,
  getUserData,
  updateUserData,
  getAllBookingData,
  userProviderRegistration,
  getUserRoomData,
  userAddRooms,
  roomDataId,
  updateRooms,
  validateUser,
  previewRoom,
  bookRooms,
  cancelBooking,
  reqLoginOtp,
  confirmOtp,
  userWalletBalance,
  userReview,
  getAllReviews,
  saveToCart,
  getCartData,
  getUserDashboard,
  userChat,

  findChat,
  sendMessage,
  getMessage,
  walletPayment,
  walletTransactions,
  getSalesChart,

  getFilteredData,
  getBookingRoomData,
};
