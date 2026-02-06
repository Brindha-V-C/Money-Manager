const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  accountName: {
    type: String,
    required: true
  },
  currentBalance: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model("Account", accountSchema);
