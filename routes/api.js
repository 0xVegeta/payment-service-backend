const express = require('express');
const apiRouters = express.Router();

apiRouters.use('/v1', require('./biz'));
// apiRouters.use('/v1', require('./customer'));

module.exports = {apiRouters};