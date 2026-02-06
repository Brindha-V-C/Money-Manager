const express = require("express");
const router = express.Router();
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");

// Create new account
router.post("/", async (req, res) => {
  try {
    const { accountName, openingBalance } = req.body;

    const newAccount = new Account({
      accountName,
      currentBalance: openingBalance || 0
    });

    await newAccount.save();
    res.status(201).json(newAccount);
  } catch (error) {
    res.status(500).json({ message: "Unable to create account" });
  }
});

// Get all accounts
router.get("/", async (req, res) => {
  try {
    const accounts = await Account.find();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch accounts" });
  }
});

// Transfer between accounts
router.post("/transfer", async (req, res) => {
  try {
    const { fromAccountId, toAccountId, transferAmount, note, date } = req.body;

    const sourceAccount = await Account.findById(fromAccountId);
    const destinationAccount = await Account.findById(toAccountId);

    if (!sourceAccount || !destinationAccount) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (sourceAccount.currentBalance < transferAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    sourceAccount.currentBalance -= transferAmount;
    destinationAccount.currentBalance += transferAmount;

    await sourceAccount.save();
    await destinationAccount.save();

    const transferRecord = new Transaction({
      transactionType: "transfer",
      amount: transferAmount,
      categoryName: "transfer",
      divisionType: "personal",
      descriptionText: note,
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      transactionDate: new Date(date)
    });

    await transferRecord.save();

    res.status(201).json(transferRecord);

  } catch (error) {
    res.status(500).json({ message: "Transfer failed" });
  }
});

module.exports = router;
