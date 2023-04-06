const mongoose = require("mongoose");
const colors = require("colors");

const connectDB = async () => {
	try {
		const conn = await mongoose.connect(process.env.MONGO_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});

		console.log(
			`MongoDB Connected: ${conn.connection.host}`.cyan.underline
		);
	} catch (error) {
		console.log(`Error: ${error.message}`.red.bold);
		process.exit();
	}
};

let session = null;

const startAtomicSession = async (walletId = null) => {
	if (session) {
		return session;
	}

	session = await mongoose.startSession();
	session.startTransaction();

	if (walletId) {
		await session.withTransaction({ readPreference: "primary" });
	}
	session.on("error", () => {
		session.endSession();
		session = null;
	});

	session.on("ended", () => {
		session = null;
	});

	return session;
};


module.exports = {
	connectDB,
	startAtomicSession
};