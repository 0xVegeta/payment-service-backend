const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Wallet = require("./walletModel");
const { generateMaskedCode, generateSixDigitPin} = require("../common/libraries");

const userSchema = mongoose.Schema(
	{
		organization: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		password: {
			type: String,
			required: true,
		},
		code: { type: String, required: false },
		category: { type: String, required: false },
		wallets: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
				required: false,
			},
		],
	},
	{ timestamps: true }
);
userSchema.pre("save", async function (next) {
	// Check if the code field has already been updated
	if (this.isNew && !this.code) {
		try {
			const maskedCode = generateMaskedCode({
				identifier: this._id,
				className: "User",
			});
			console.log("check------------", maskedCode);
			this.code = maskedCode;

			// Check if the user already has a wallet
			const wallets = await Wallet.find({ userID: this._id });

			// If the user doesn't have a wallet, create one
			let newWallet;
			if (!wallets.length) {
				newWallet = new Wallet({
					userID: this._id,
					balance: 1000,
					isDefault: true,
					pin: 123456
				});
				await newWallet.save();
			}
			if (newWallet) wallets.push(newWallet);
			this.wallets = wallets;

			next();
		} catch (error) {
			console.error(error); // Log any errors that occur
			next(error);
		}
	} else {
		next();
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