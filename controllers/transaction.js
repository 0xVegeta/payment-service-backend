const asyncHandler = require("express-async-handler");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const User = require("../models/bizModel")
const { v4: uuid } = require('uuid');
const cachingServices = require('../services/caching')
const {config} = require('../config/config')
const {TransactionType,TransactionStatus} = require("../common/enum");
const {startAtomicSession, connectDB} = require("../config/db");
const {createSession} = require('../services/transaction/payment')
const {processPayment} = require('../services/transaction/processPayment')



const paymentSessionController = asyncHandler(async (req, res) => {
    const {amount} = req.body;
    const {walletCode} = req.params;
    try {
        const sessionData = await createSession(amount, walletCode);
        return res.status(200).json(sessionData);
    } catch (e) {
        return res.status(500).json({ error: e.message, message: "Unable to create session" });
    }
});


const acceptPayment = async (req, res) => {
    const { fromWalletCode, totalAmount, pin } = req.body;
    const { transactionTraceId } = req.params;

    try {
        const paymentResult = await processPayment({fromWalletCode, totalAmount, pin, transactionTraceId});
        return res.status(200).json(paymentResult);
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
    }
};







const withdraw = asyncHandler(async (req, res) => {
    const { email, walletID, amount } = req.body;

    const user = await User.findOne({ email });
    if(user){

        const userID = user._id
        const wallet = await Wallet.findById(walletID);

        if (wallet.userID.toString() !== userID.toString()) {
            console.log('check=======>',wallet.userID.toString(), userID.toString());
            res.status(403);
            throw new Error('Unauthorized');
        }

        if (wallet.balance < amount) {
            res.status(400);
            throw new Error('Insufficient balance');
        }

        wallet.balance -= amount;
        await wallet.save();

        const transaction = await Transaction.create({
            userID,
            walletID,
            amount,
            type: TransactionType.DEBIT,
        });

        res.status(200).json({
            message: 'Payment successful',
            transaction,
        });

    }
    else{
        res.status(401).json({
            message: 'Unauthorized',
        });
    }
  });


const getTransaction = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    const transactions = await Transaction.find({ userID: _id.toString() });

    res.status(200);
    res.json({
        transactions,
    });
});


module.exports = { paymentSession : paymentSessionController, withdraw, acceptPayment, getTransaction}