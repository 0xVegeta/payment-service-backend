const mongoose = require("mongoose");

const walletSchema = mongoose.Schema({
  userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  balance: { type: Number, required: true },
});

const Wallet = mongoose.model("Wallet", walletSchema);
module.exports = Wallet;