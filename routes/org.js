const express = require('express');
const orgRouter = express.Router();
const authControllers = require('../controllers/auth.js');
const {protect} = require('../middlewares/authentication')
// const { errorWrapper } = require('../common/utility');


orgRouter.post('/register', authControllers.register)
orgRouter.post('/login',authControllers.login)
orgRouter.route("/profile").get(protect, authControllers.getUserProfile).put(protect, authControllers.updateUserProfile);


module.exports = orgRouter;