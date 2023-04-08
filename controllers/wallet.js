const asyncHandler = require("express-async-handler");
const Wallet = require("../models/walletModel");

const createWallet = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    const newWallet = new Wallet({
        userID: _id,
        balance: 0,
        isDefault: false,
    });
    await newWallet.save();
    res.status(200);
    res.json({
        newWallet,
    });
});

const getWallets = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    const wallets = await Wallet.find({ userID: _id.toString() });

    res.status(200);
    res.json({
        wallets,
    });
});

module.exports = { createWallet, getWallets };