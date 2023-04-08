const asyncHandler = require("express-async-handler");
const User = require("../models/organizationModel");
const generateToken = require("../config/utility");
const Wallet = require("./../models/walletModel");


const register = asyncHandler(async (req, res) => {
	const { organization, email, password, category } = req.body;

	if (!organization || !email || !password) {
		res.status(400);
		throw new Error("Please Enter all the fields");
	}

	const userExists = await User.findOne({ email });
    console.log('check---------------',userExists);
	if (userExists) {
		res.status(400);
		throw new Error("User already Exists");
	}

	const user = await User.create({
		organization,
		email,
		password,
        category
	});

	if (user) {
        const wallet = await Wallet.findOne({ userID: user._id });

        res.status(201).json({
          userCode: user.code,
          merchant: user.organization,
          email: user.email,
		  walletCode: wallet.code,
          balance: wallet.balance,
		  pin:wallet.pin,
        });
    } else {
        res.status(400);
        throw new Error("Failed to create a user");
    }
});

const login = asyncHandler(async (req, res) => {
	const { email, password } = req.body;

	const user = await User.findOne({ email });
	console.log('checl user--------', user)

	if (user && (await user.matchPassword(password))) {
        const wallet = await Wallet.findOne({ userID: user._id });
		res.status(200);
		res.json({
			userCode: user.code,
			merchant: user.organization,
			email: user.email,
            balance:  wallet.balance,
			walletCode: wallet.code,
			token: generateToken(user._id),
		});
	} else {
		res.status(401);
		throw new Error("Invalid Email or Password");
	}
});

const getUserProfile = asyncHandler(async (req, res) => {
	const user = await User.findById(req.user._id);

	if (user) {
		const wallets = await Wallet.find({ userID: user._id });
		const balance = wallets.reduce((acc, curr) => acc + curr.balance, 0);

		res.status(201).json({
			_id: user._id,
			merchant: user.organization,
			email: user.email,
			balance: balance,
			wallets: user.wallets,
			category: user.category,
			token: generateToken(user._id),
		});
	} else {
		res.status(401);
		throw new Error("Invalid Email or Password");
	}
});
// @desc  Update User Profile
// @route PUT /api/v1/biz/profile
// @access  Private

const updateUserProfile = asyncHandler(async (req, res) => {
	const user = await User.findById(req.user._id);

	if (user) {
		user.organization = req.body.organization || user.organization;
		user.email = req.body.email || user.email;
		user.category = req.body.category || user.category;
		if (req.body.password)
			user.password = req.body.password || user.password;
		const updatedUser = await user.save();
		const wallets = await Wallet.find({ userID: updatedUser._id });
		const balance = wallets.reduce((acc, curr) => acc + curr.balance, 0);

		res.status(201).json({
			_id: updatedUser._id,
			merchant: updatedUser.organization,
			email: updatedUser.email,
			balance: balance,
			wallets: updatedUser.wallets,
			category: user.category,
			token: generateToken(updatedUser._id),
		});
	} else {
		res.status(404);
		throw new Error("User Not found");
	}
});

module.exports = { register, login, getUserProfile, updateUserProfile };


// module.exports = {
//     login,
//     register
// }
