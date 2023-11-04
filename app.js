const dotenv = require("dotenv");
dotenv.config({ path: `.env` });
const cors = require("cors");
const { config } = require("./config/config.js");
const {connectDB} = require("./config/db");
const { notFound, errorHandler } = require("./middlewares/error.js");

connectDB();
const express = require("express");
const expressApp = express();
expressApp.use(cors());
const bodyParser = require("body-parser");

expressApp.get('/', (req, res) => {
  res.json({ message: 'Hello' });
});
const { apiRouters } = require("./routes/api");

expressApp.use(bodyParser.urlencoded({ extended: false }));
expressApp.use(bodyParser.json());
expressApp.use("/api", apiRouters);

expressApp.use(notFound);

expressApp.use(errorHandler);

module.exports = {
    app: expressApp,
};