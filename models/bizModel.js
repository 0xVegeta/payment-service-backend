const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Wallet = require("./walletModel");
const {generateMaskedCode} = require("../common/libraries");

const userSchema = mongoose.Schema(
	{
		organization: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		password: {
			type: String,
			required: true,
		},
        code: { type: String, required: false },
        category : { type: String, required: false }
		
	},
	{ timestamps: true }
);

userSchema.pre("save", async function (next) {
	// Check if the code field has already been updated
	if (this.isNew && !this.code) {
		try {
			const maskedCode = generateMaskedCode({
				identifier: this._id,
				className: 'User'
			});
			console.log('check------------',maskedCode)
			this.code = maskedCode;

			// Check if the user already has a wallet
			const wallet = await Wallet.findOne({ userID: this._id });

			// If the user doesn't have a wallet, create one
			if (!wallet) {
				const newWallet = new Wallet({
					userID: this._id,
					balance: 0,
				});
				await newWallet.save();
			}

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