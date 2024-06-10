const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Provider",
    required: true,
  },
  roomType: {
    type: String,
    required: true,
  },
  adults: {
    type: Number,
    required: true,
  },
  children: {
    type: Number,
    required: true,
  },
  numberOfDays: {
    type: Number,
    required: true,
  },
  checkInDate: {
    type: String,
    required: true,
  },
  checkOutDate: {
    type: String,
    required: true,
  },
  bookingDate: {
    type: String,
  },
  amount: {
    type: Number,
    required: true,
  },
  totalAmounttoPay: {
    type: Number,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  image: {
    type: [String],
  },
  status: {
    type: String,
    default: "Booked",
  },
  paymentMethod: {
    type: String,
  },
  Adress: {
    type: String,
  },
  reviews: [
    {
      userName: {
        type: String,
      },
      description: {
        type: String,
      },
      rating: {
        type: Number,
      },
    },
  ],
  bookingId:{
    type:String
  },
  transactionId:{
    type:String
  },
  

},
{
  timestamps: true,
}

);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
