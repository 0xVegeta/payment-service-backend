const express = require('express');
const apiRouters = express.Router();
apiRouters.use('/v1/org', require('./org'));
apiRouters.use('/v1/txn', require('./txn'));

module.exports = {apiRouters};