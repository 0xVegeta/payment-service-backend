const express = require("express");
const walletRouter = express.Router();
const walletControllers = require("../controllers/wallet");
const { protect } = require("../middlewares/authentication");

walletRouter
    .route("/")
    .post(protect, walletControllers.createWallet)
    .get(protect, walletControllers.getWallets);

module.exports = walletRouter;