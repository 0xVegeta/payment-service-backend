const asyncHandler = require("express-async-handler");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const User = require("../models/bizModel")
const { v4: uuid } = require('uuid');
const cachingServices = require('../services/caching')


const payment = asyncHandler(async (req, res) => {
    const paymentTraceId =  uuid()
    console.log('check trace', paymentTraceId);
    cachingServices.putData({
        body: {
            key: paymentTraceId,
            data: {
                createdAt: new Date().getTime(),
            },
            ttl: config.SESSION_TTL
        }
    })
    return res.status(200).json({'traceId': "paymentTraceId"})
    
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
            type: 'debit',
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


module.exports = { payment,withdraw}