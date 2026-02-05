const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");


/*
  Create income or expense
*/
router.post("/", async (req, res) => {
  try {
    const {
      transactionType,
      amount,
      categoryName,
      divisionType,
      descriptionText,
      accountId,
      transactionDate
    } = req.body;

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const parsedAmount = Number(amount);

    if (transactionType === "expense" && account.currentBalance < parsedAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    if (transactionType === "income") {
      account.currentBalance += parsedAmount;
    } else {
      account.currentBalance -= parsedAmount;
    }

    await account.save();

    const newTransaction = new Transaction({
      transactionType,
      amount: parsedAmount,
      categoryName,
      divisionType,
      descriptionText,
      fromAccount: accountId,
      transactionDate: new Date(transactionDate)
    });

    await newTransaction.save();

    res.status(201).json(newTransaction);

  } catch (err) {
    res.status(500).json({ message: "Failed to create transaction" });
  }
});


/*
  Transfer between accounts
*/
router.post("/transfer", async (req, res) => {
  try {
    const {
      fromAccountId,
      toAccountId,
      transferAmount,
      note,
      transactionDate
    } = req.body;

    const sender = await Account.findById(fromAccountId);
    const receiver = await Account.findById(toAccountId);

    if (!sender || !receiver) {
      return res.status(404).json({ message: "One or both accounts not found" });
    }

    const parsedAmount = Number(transferAmount);

    if (sender.currentBalance < parsedAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    sender.currentBalance -= parsedAmount;
    receiver.currentBalance += parsedAmount;

    await sender.save();
    await receiver.save();

    const transferEntry = new Transaction({
      transactionType: "transfer",
      amount: parsedAmount,
      categoryName: "transfer",
      divisionType: "personal",
      descriptionText: note,
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      transactionDate: new Date(transactionDate)
    });

    await transferEntry.save();

    res.status(201).json(transferEntry);

  } catch (err) {
    res.status(500).json({ message: "Transfer failed" });
  }
});


/*
  Get all transactions
*/
router.get("/", async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("fromAccount toAccount")
      .sort({ transactionDate: -1 });

    res.json(transactions);

  } catch (err) {
    res.status(500).json({ message: "Unable to fetch transactions" });
  }
});


/*
  Filter transactions
  Supports: division, category, startDate, endDate
*/
router.get("/filter", async (req, res) => {
  try {
    const { division, category, startDate, endDate } = req.query;

    const filterQuery = {};

    if (division) {
      filterQuery.divisionType = division;
    }

    if (category) {
      filterQuery.categoryName = category;
    }

    if (startDate && endDate) {
      filterQuery.transactionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const results = await Transaction.find(filterQuery)
      .populate("fromAccount toAccount")
      .sort({ transactionDate: -1 });

    res.json(results);

  } catch (err) {
    res.status(500).json({ message: "Filtering failed" });
  }
});


/*
  Update transaction (within 12 hours only)
*/
router.put("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const hoursDifference =
      (Date.now() - new Date(transaction.createdAt).getTime()) /
      (1000 * 60 * 60);

    if (hoursDifference > 12) {
      return res.status(400).json({ message: "Edit window expired (12 hours)" });
    }

    const account = await Account.findById(transaction.fromAccount);
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const newAmount = Number(req.body.amount);
    const oldAmount = transaction.amount;

    if (transaction.transactionType === "income") {
      account.currentBalance = account.currentBalance - oldAmount + newAmount;
    } else if (transaction.transactionType === "expense") {
      account.currentBalance = account.currentBalance + oldAmount - newAmount;
    }

    await account.save();

    transaction.amount = newAmount;
    transaction.categoryName = req.body.categoryName;
    transaction.divisionType = req.body.divisionType;
    transaction.descriptionText = req.body.descriptionText;
    transaction.transactionDate = new Date(req.body.transactionDate);

    await transaction.save();

    res.json(transaction);

  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});


/*
  Delete transaction
*/
router.delete("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const account = await Account.findById(transaction.fromAccount);

    if (account) {
      if (transaction.transactionType === "income") {
        account.currentBalance -= transaction.amount;
      } else if (transaction.transactionType === "expense") {
        account.currentBalance += transaction.amount;
      }

      await account.save();
    }

    await transaction.deleteOne();

    res.json({ message: "Transaction deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: "Deletion failed" });
  }
});


module.exports = router;
