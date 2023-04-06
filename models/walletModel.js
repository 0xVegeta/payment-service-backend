const mongoose = require("mongoose");
const {generateMaskedCode} = require("../common/libraries");

const walletSchema = mongoose.Schema({
  userID: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
  balance: {type: Number, required: true},
  code: {type: String, required: false},
  updatedAt: {type: Date},
  pin: {
    type: Number, required: function () {
      return this.isDefault === true;
    }, validate: {
      validator: function (v) {
        return /^[0-9]{6}$/.test(v.toString());
      }, message: props => `${props.value} is not a valid 6-digit number!`
    }
  },
  isDefault: {type: Boolean, required: true, default: false},

}, {timestamps: true});

walletSchema.pre("save", async function (next) {
  // Check if the code field has already been updated
  if (this.isNew && !this.code) {
    try {
      const maskedCode = generateMaskedCode({
        identifier: this._id,
        className: 'Wallet'
      });
      console.log('walletcode', maskedCode)
      this.code = maskedCode
      next()
    } catch (error) {
      console.error(error)
      next(error)
    }
  } else {
    next()
  }
});
const Wallet = mongoose.model("Wallet", walletSchema);
module.exports = Wallet;