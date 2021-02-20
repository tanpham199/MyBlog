const express = require('express');
const { body } = require('express-validator');

const isAuth = require('../middleware/is-auth');
const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.put(
    '/signup',
    [
        body('email')
            .isEmail()
            .withMessage('Please enter a valid email.')
            .custom(async (value) => {
                const user = await User.findOne({ email: value });
                if (user) {
                    return Promise.reject('Email existed.');
                }
            })
            .normalizeEmail(),
        body('password').isLength({ min: 5 }),
        body('name').trim().not().isEmpty(),
    ],
    authController.signup
);

router.post('/login', authController.login);
router.get('/status', isAuth, authController.getUserStatus);
router.patch('/status', isAuth, authController.updateUserStatus);

module.exports = router;
