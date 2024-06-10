const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
  providerId: {
    type: String,
    required: true,
  },
  providerName: {
    type: String,
    required: true, 
  },
  validFrom: {
    type: Date,
    required: true, 
  },
  validTo: {
    type: Date,
    required: true, 
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  offerCode: {
    type: String,
    required: true, 
  },
  amount:{
    type:Number
  }
});

const Offer = mongoose.model("Offer", offerSchema);

module.exports = Offer;
