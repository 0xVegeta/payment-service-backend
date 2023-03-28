const mongoose = require("mongoose");

const transactionSchema = mongoose.Schema(
  {
    userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    walletID: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true },
    amount: {
        type: Number,
        required: true,
        validate: {
          validator: function(v) {
            return v >= 0;
          },
          message: props => `${props.value} must be a non-negative number!`
        }
      },
    type: { type: String, required: true, enum: ["credit", "debit"] },
    customerID: { type: String, required: false},
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;