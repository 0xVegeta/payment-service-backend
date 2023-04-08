const asyncHandler = require("express-async-handler");
const cachingServices = require("../caching");
const Wallet = require("../../models/walletModel");
const Transaction = require("../../models/transactionModel");
const {startAtomicSession} = require("../../config/db");
const {config} = require("../../config/config");
const {TransactionType, TransactionStatus} = require("../../common/enum");


const processPayment = asyncHandler(async ({fromWalletCode, totalAmount, pin, transactionTraceId}) => {
    const paymentSessionValidity = await cachingServices.getTTL(`paymentTrace-${transactionTraceId}`);
    if (paymentSessionValidity === -2) {
        throw { message: `Payment session expired for trace ID ${transactionTraceId}`, status: 400 };
    }
    const fromWallet = await Wallet.findOne({ code: fromWalletCode });
    const transactionRecord = await Transaction.findOneAndUpdate({transactionTraceId},{ counterparty: fromWallet.userCode })
    const toWallet = await Wallet.findOne({ _id: transactionRecord.walletID });
    if(fromWalletCode === toWallet){
        throw { message: "Invalid wallet! Payer and payee can't be same entity", status: 400 };
    }

    console.log(toWallet, fromWallet, transactionRecord, fromWallet.code)
    if(!fromWallet.isDefault){
        throw { message: "Please ensure this is your primary wallet", status: 400 };
    }
    if(fromWallet.pin !== pin){
        throw { message: "Wrong PIN, Please Enter correct PIN", status: 400 };

    }
    if(transactionRecord.totalAmount !== totalAmount){
        throw { message: "Invalid amount, please make sure amount is sent correctly", status: 400 };
    }

    const transactionSession = await startAtomicSession();

    // Check if fromWallet has enough balance
    const currentBalance = await Wallet.findOne({ _id: fromWallet._id }, { balance: 1, _id: 0 }, { transactionSession });

    if (currentBalance.balance < totalAmount) {
        await transactionSession.abortTransaction();
        await transactionSession.endSession();
        await cachingServices.expireKey(`paymentTrace-${transactionTraceId}`);
        throw { message: "Insufficient balance", status: 400 };
    }

    try {
        // Deduct amount from fromWallet
        const deductionResult = await Wallet.updateOne({ _id: fromWallet._id }, { $inc: { balance: -totalAmount } }, { session: transactionSession });
        const updatedBalance = await Wallet.findOne({ _id: fromWallet._id }, { balance: 1, _id: 0 }, { session:transactionSession });
        if (deductionResult.nModified === 0) {
            await transactionSession.abortTransaction();
            await transactionSession.endSession();
            await cachingServices.expireKey(`paymentTrace-${transactionTraceId}`);
            throw { message: "Error occurred while deducting amount from the wallet", status: 500 };
        }

        // Credit amount to toWallet
        const creditResult = await Wallet.updateOne({ _id: toWallet._id }, { $inc: { balance: totalAmount } }, { session: transactionSession });
        if (creditResult.nModified === 0) {
            await transactionSession.abortTransaction();
            await transactionSession.endSession();
            await cachingServices.expireKey(`paymentTrace-${transactionTraceId}`);
            throw { message: "Error occurred while crediting amount to the wallet", status: 500 };
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
        throw err;
    }
})




module.exports = {
    processPayment
}
