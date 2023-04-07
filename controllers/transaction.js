const asyncHandler = require("express-async-handler");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const User = require("../models/bizModel")
const { v4: uuid } = require('uuid');
const cachingServices = require('../services/caching')
const {config} = require('../config/config')
const TransactionType = require("../common/enum");
const {startAtomicSession, connectDB} = require("../config/db");
const mongoose = require('mongoose');
const MongoClient = require('mongodb').MongoClient;


const paymentSession = asyncHandler(async (req, res) => {
    const {amount} = req.body;
    const {walletCode} = req.params
    const totalAmount = amount * (1 + config.SERVICE_FEE * 0.01)
    console.log('req----', amount, walletCode);
    const transactionTraceId = uuid();
    console.log('check trace', transactionTraceId);
    try {
        cachingServices.putData({
            body: {
                key: `paymentTrace-${transactionTraceId}`,
                data: {
                    createdAt: new Date().getTime(),
                    id: transactionTraceId
                },
                ttl: config.SESSION_TTL
            }
        });
        const wallet = await Wallet.findOne({code: walletCode});
        console.log('req----', amount, walletCode);
        const transaction = await Transaction.create({
            userID: wallet.userID,
            walletID: wallet._id,
            walletCode: walletCode,
            amount,
            transactionTraceId,
            totalAmount,
            serviceFee : config.SERVICE_FEE,
            type: TransactionType.CREDIT,
        });
        console.log('check-------------', amount * (1 + config.SERVICE_FEE * 0.01));
    } catch (e) {
        console.log('check err===========', e, e.stack);
    }
    const check = await cachingServices.getData(`paymentTrace-${transactionTraceId}`);
    console.log('check again', check);
    return res.status(200).json({
        totalAmount,
        transactionTraceId: transactionTraceId,
        'session-time': await cachingServices.getTTL(`paymentTrace-${transactionTraceId}`)
    });
});


const acceptPayment = asyncHandler(async (req, res) => {
    const { fromWalletCode, totalAmount,pin } = req.body;
    const {transactionTraceId} = req.params
    const fromWallet = await Wallet.findOne({ code: fromWalletCode });
    const transactionRecord = await Transaction.findOne({transactionTraceId})
    const toWallet = await Wallet.findOne({ _id: transactionRecord.walletID });

    console.log(toWallet, fromWallet, transactionRecord, fromWallet.code)
    if(!fromWallet.isDefault){
        res.status(400).json({message:"Please ensure this is your primary wallet"})
    }
    if(fromWallet.pin !== pin){
        return res.status(400).json({ error: "Wrong PIN, Please Enter correct PIN " });

    }
    if(transactionRecord.totalAmount !== totalAmount){
        res.status(400).json({message:"Invalid amount, please make sure amount is sent correctly"})
    }

    // Check if payment session is still valid
    const paymentSessionValidity = await cachingServices.getTTL(`paymentTrace-${transactionTraceId}`);
    if (paymentSessionValidity === -2) {
        return res.status(400).json({ error: `Payment session expired for trace ID ${transactionTraceId}` });
    }
    const session = await mongoose.startSession();
    session.startTransaction();

    // Check if fromWallet has enough balance
    const currentBalance = await Wallet.findOne({ _id: fromWallet._id }, { balance: 1, _id: 0 }, { session });

    if (currentBalance.balance < totalAmount) {
        await session.abortTransaction();
        await session.endSession();
        return res.status(400).json({ error: "Insufficient balance" });
    }

    const transactionSession = await startAtomicSession();
    try {
        // Deduct amount from fromWallet
        const deductionResult = await Wallet.updateOne({ _id: fromWallet._id }, { $inc: { balance: -totalAmount } }, { session: transactionSession });
        const updatedBalance = await Wallet.findOne({ _id: fromWallet._id }, { balance: 1, _id: 0 }, { session });
        console.log('check decduct-----------', updatedBalance)
        if (deductionResult.nModified === 0) {
            await transactionSession.abortTransaction();
            await transactionSession.endSession();
            // await cachingServices.delData(`paymentTrace-${req.params.traceId}`);
            return res.status(500).json({ error: "Error occurred while deducting amount from the wallet" });
        }

        // Credit amount to toWallet
        const creditResult = await Wallet.updateOne({ _id: toWallet._id }, { $inc: { balance: totalAmount } }, { session: transactionSession });
        if (creditResult.nModified === 0) {
            await transactionSession.abortTransaction();
            await transactionSession.endSession();
            // await cachingServices.delData(`paymentTrace-${req.params.traceId}`);
            return res.status(500).json({ error: "Error occurred while crediting amount to the wallet" });
        }

        // Create transaction record
        const transaction = new Transaction({
            userID: fromWallet.userID,
            walletID: fromWallet._id,
            walletCode: fromWallet.code,
            amount: transactionRecord.amount,
            totalAmount: transactionRecord.totalAmount,
            serviceFee: config.SERVICE_FEE,
            transactionTraceId: transactionTraceId,
            type: TransactionType.DEBIT,
        });
        await transaction.save({ session: transactionSession });
        await Transaction.updateOne(
            { transactionTraceId: transactionTraceId },
            { code: transaction.code },
            { session: transactionSession }
        );


        // Delete payment session from cache
        // await cachingServices.delData(`paymentTrace-${req.params.traceId}`);

        // Commit transaction
        await transactionSession.commitTransaction();
        await transactionSession.endSession();

        return res.status(200).json({ message: "Payment successful" ,transaction});
    } catch (err) {
        console.log('err=================', err)
        await transactionSession.abortTransaction();
        await transactionSession.endSession();
        // await cachingServices.delData(`paymentTrace-${req.params.traceId}`);
        return res.status(500).json({ error: err.message });
    }
});




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


module.exports = { paymentSession,withdraw, acceptPayment}