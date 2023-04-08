const asyncHandler = require("express-async-handler");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const User = require("../models/bizModel")
const { v4: uuid } = require('uuid');
const cachingServices = require('../services/caching')
const {config} = require('../config/config')
const {TransactionType,TransactionStatus} = require("../common/enum");
const {startAtomicSession, connectDB} = require("../config/db");
const paymentServices = require('../services/payment')


const paymentSessionController = asyncHandler(async (req, res) => {
    const {amount} = req.body;
    const {walletCode} = req.params;
    try {
        const sessionData = await paymentServices.createSession(amount, walletCode);
        return res.status(200).json(sessionData);
    } catch (e) {
        return res.status(500).json({ error: e.message, message: "Unable to create session" });
    }
});


const acceptPayment = asyncHandler(async (req, res) => {
    const { fromWalletCode, totalAmount,pin } = req.body;
    const {transactionTraceId} = req.params
    const paymentSessionValidity = await cachingServices.getTTL(`paymentTrace-${transactionTraceId}`);
    if (paymentSessionValidity === -2) {
        return res.status(400).json({ error: `Payment session expired for trace ID ${transactionTraceId}` });
    }
    const fromWallet = await Wallet.findOne({ code: fromWalletCode });
    const transactionRecord = await Transaction.findOneAndUpdate({transactionTraceId},{ counterparty: fromWallet.userCode })
    const toWallet = await Wallet.findOne({ _id: transactionRecord.walletID });
    if(fromWalletCode === toWallet){
        res.status(400).json({message:"Invalid wallet! Payer and payee can't be same entity"})
    }

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
    const transactionSession = await startAtomicSession();

    // Check if fromWallet has enough balance
    const currentBalance = await Wallet.findOne({ _id: fromWallet._id }, { balance: 1, _id: 0 }, { transactionSession });

    if (currentBalance.balance < totalAmount) {
        await transactionSession.abortTransaction();
        await transactionSession.endSession();
        await cachingServices.expireKey(`paymentTrace-${transactionTraceId}`);
        return res.status(400).json({ error: "Insufficient balance" });
    }

    try {
        // Deduct amount from fromWallet
        const deductionResult = await Wallet.updateOne({ _id: fromWallet._id }, { $inc: { balance: -totalAmount } }, { session: transactionSession });
        const updatedBalance = await Wallet.findOne({ _id: fromWallet._id }, { balance: 1, _id: 0 }, { session:transactionSession });
        if (deductionResult.nModified === 0) {
            await transactionSession.abortTransaction();
            await transactionSession.endSession();
            await cachingServices.expireKey(`paymentTrace-${transactionTraceId}`);
            return res.status(500).json({ error: "Error occurred while deducting amount from the wallet" });
        }

        // Credit amount to toWallet
        const creditResult = await Wallet.updateOne({ _id: toWallet._id }, { $inc: { balance: totalAmount } }, { session: transactionSession });
        if (creditResult.nModified === 0) {
            await transactionSession.abortTransaction();
            await transactionSession.endSession();
            await cachingServices.expireKey(`paymentTrace-${transactionTraceId}`);
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
            status: TransactionStatus.SUCCESS,
            counterparty: toWallet.userCode

        });
        await transaction.save({ session: transactionSession });
        await Transaction.updateOne(
            { transactionTraceId: transactionTraceId },
            { code: transaction.code, status: TransactionStatus.SUCCESS },
            { session: transactionSession }
        );
        // Delete payment session from cache
        await cachingServices.expireKey(`paymentTrace-${transactionTraceId}`);

        // Commit transaction
        await transactionSession.commitTransaction();
        await transactionSession.endSession();

        return res.status(200).json({
            message: "Payment successful" ,
            transactionDetails: {
                transactionTraceId: transaction.transactionTraceId,
                amount: transaction.amount,
                type: transaction.type,
                serviceFee: transaction.serviceFee,
                totalAmount: transaction.totalAmount,
                status: transaction.status,
                createdAt: transaction.createdAt,
                code: transaction.code,
                counterparty: transaction.counterparty
            },
            updatedBalance: updatedBalance.balance
        });
    } catch (err) {
        const transaction = new Transaction({
            userID: fromWallet.userID,
            walletID: fromWallet._id,
            walletCode: fromWallet.code,
            amount: transactionRecord.amount,
            totalAmount: transactionRecord.totalAmount,
            serviceFee: config.SERVICE_FEE,
            transactionTraceId: transactionTraceId,
            type: TransactionType.DEBIT,
            status: TransactionStatus.FAILED,
            counterparty: toWallet.userCode

        });
        await transaction.save({ session: transactionSession });
        await Transaction.updateOne(
            { transactionTraceId: transactionTraceId },
            { status: TransactionStatus.FAILED },
            { session: transactionSession }
        );
        await transactionSession.abortTransaction();
        await transactionSession.endSession();
        await cachingServices.expireKey(`paymentTrace-${transactionTraceId}`);
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


const getTransaction = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    const transactions = await Transaction.find({ userID: _id.toString() });

    res.status(200);
    res.json({
        transactions,
    });
});


module.exports = { paymentSession : paymentSessionController, withdraw, acceptPayment, getTransaction}