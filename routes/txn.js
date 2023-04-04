const express = require('express');
const txnRouter = express.Router();
const txnControllers = require('../controllers/transaction');
const {protect} = require('../middlewares/authentication')
// const { errorWrapper } = require('../common/utility');


txnRouter.post('/payment-session', txnControllers.paymentSession)
txnRouter.post('/withdraw', protect, txnControllers.withdraw)

module.exports = txnRouter;