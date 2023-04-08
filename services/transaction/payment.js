const Wallet = require("../../models/walletModel");
const Transaction = require("../../models/transactionModel");
const User = require("../../models/bizModel")
const { v4: uuid } = require('uuid');
const cachingServices = require('../caching')
const {config} = require('../../config/config')
const {TransactionType,TransactionStatus} = require("../../common/enum");
const {startAtomicSession, connectDB} = require("../../config/db");
const paymentServices = require('./payment')
const createSession = async (amount, walletCode) => {
    const totalAmount = amount * (1 + config.SERVICE_FEE * 0.01)
    const transactionTraceId = uuid();
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
        const transaction = await Transaction.create({
            userID: wallet.userID,
            walletID: wallet._id,
            walletCode: walletCode,
            amount,
            transactionTraceId,
            totalAmount,
            serviceFee : config.SERVICE_FEE,
            type: TransactionType.CREDIT,
            status: TransactionStatus.INITIATED
        });
        return {
            serviceFee: config.SERVICE_FEE,
            totalAmount,
            transactionTraceId: transactionTraceId,
            'session-time': await cachingServices.getTTL(`paymentTrace-${transactionTraceId}`)
        };
    } catch (e) {
        await cachingServices.expireKey(`paymentTrace-${transactionTraceId}`);
        throw new Error("Unable to create session");
    }
}




module.exports = {
    createSession,
};