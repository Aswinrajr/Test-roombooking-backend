const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: "Provider" },
  roomType: { type: String },
  adults: { type: Number },
  children: { type: Number },
  numberOfDays: { type: Number },
  checkInDate: { type: Date },
  checkOutDate: { type: Date },
  bookingDate: { type: Date },
  amount: { type: Number },
  image: [{ type: String }],
  totalAmounttoPay: { type: Number },
  city: { type: String },
  address: { type: String },
});

const CartItem = mongoose.model("CartItem", cartItemSchema);

module.exports = CartItem;
