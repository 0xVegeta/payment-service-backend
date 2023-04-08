const dotenv = require("dotenv");
dotenv.config({ path: `.env` });
const { config } = require("./config/config.js");
const {connectDB} = require("./config/db");
const { notFound, errorHandler } = require("./middlewares/error.js");

connectDB();
const express = require("express");
const expressApp = express();
const bodyParser = require("body-parser");
const { apiRouters } = require("./routes/api");

expressApp.use(bodyParser.urlencoded({ extended: false }));
expressApp.use(bodyParser.json());
expressApp.use("/api", apiRouters);

expressApp.use(notFound);

expressApp.use(errorHandler);

module.exports = {
    app: expressApp,
};