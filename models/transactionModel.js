const mongoose = require("mongoose");
const {generateMaskedCode} = require("../common/libraries");
const Wallet = require("./walletModel");
const TransactionType = require("../common/enum");

const transactionSchema = mongoose.Schema(
  {
    userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    walletID: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true },
    transactionTraceId: { type: String, required: true },
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
    serviceFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    code: { type: String, required: false},
    customerID: { type: String, required: false},
  },
  { timestamps: true }
);

transactionSchema.pre("save", async function (next) {
    if (this.isNew && !this.code && this.type ===TransactionType.DEBIT) {
        try {
            const maskedCode = generateMaskedCode({
                identifier: this._id,
                className: "Transaction",
            });
            console.log("check------------", maskedCode);
            this.code = maskedCode

            next();
        } catch (error) {
            console.error(error);
            next(error);
        }
    } else {
        next();
    }
});

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;