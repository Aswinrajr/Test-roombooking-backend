const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Provider",
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

  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  amenities: {
    food: {
      type: Boolean,
      default: false,
    },
    ac: {
      type: Boolean,
      default: false,
    },
    wifi: {
      type: Boolean,
      default: false,
    },
    tv: {
      type: Boolean,
      default: false,
    },
    hotWater: {
      type: Boolean,
      default: false,
    },
  },
  images: [
    {
      type: String,
    },
  ],
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

});

const Room = mongoose.model("Room", roomSchema);

module.exports = Room;
