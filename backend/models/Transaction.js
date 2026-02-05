const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  transactionType: {
    type: String,
    enum: ["income", "expense", "transfer"],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  categoryName: {
    type: String,
    required: true
  },
  divisionType: {
    type: String,
    enum: ["office", "personal"],
    required: true
  },
  descriptionText: {
    type: String
  },
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account"
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account"
  },
  transactionDate: {
    type: Date,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);
