const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Wallet = require("./walletModel");

const userSchema = mongoose.Schema(
	{
		organization: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		password: {
			type: String,
			required: true,
		},
        category : { type: String, required: false }
		
	},
	{ timestamps: true }
);

userSchema.post("save", async function (doc, next) {
    try {
      // Check if the user already has a wallet
      const wallet = await Wallet.findOne({ userID: doc._id });
  
      // If the user doesn't have a wallet, create one
      if (!wallet) {
        const newWallet = new Wallet({
          userID: doc._id,
          balance: 0,
        });
        await newWallet.save();
      }
  
      next();
    } catch (error) {
      next(error);
    }
  });

userSchema.methods.matchPassword = async function (enteredPassword) {
	return await bcrypt.compare(enteredPassword, this.password);
};
userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) {
		next();
	}
	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);
module.exports = User;  