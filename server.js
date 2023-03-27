const http = require('http');
const {logger} = require('./config/logging');
const port = process.env.PORT || 3000;
const dotenv = require('dotenv');
dotenv.config({path: `.env`});
// const {config} = require('./config/config.js');