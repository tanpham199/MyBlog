const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

const VALIDATION_ERROR_MESSAGE = 'Validation failed, entered data is incorrent.';
const INVALID_LOGIN_MESSAGE = 'Invalid email or password.';

const throwError = (statusCode, message, errorsData, next) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (errorsData) {
        error.data = errorsData.array();
    }
    return next(error);
};

const catchDatabaseError = (err, next) => {
    if (!err.statusCode) {
        err.statusCode = 500;
    }
    return next(err);
};

exports.signup = async (req, res, next) => {
    const { email, name, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return throwError(422, VALIDATION_ERROR_MESSAGE, errors, next);
    }
    try {
        const user = new User({
            email,
            password: await bcrypt.hash(password, 12),
            name,
        });
        await user.save();
        return res.status(201).json({ message: 'User created.', userId: user._id });
    } catch (err) {
        return catchDatabaseError(err, next);
    }
};

exports.login = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        const isMatch = user && await bcrypt.compare(password, user.password);
        if (!user || !isMatch) {
            return throwError(401, INVALID_LOGIN_MESSAGE, null, next);
        }

        const userId = user._id.toString();
        const token = jwt.sign({ email: user.email, userId }, 'my secret', { expiresIn: '1h' });
        res.status(200).json({ token, userId });
    } catch (err) {
        return catchDatabaseError(err, next);
    }
};

exports.getUserStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return throwError(404, 'Could not find user.', next);
        }
        res.status(200).json({ message: 'User status fetch successfully.', status: user.status });
    } catch (err) {
        return catchDatabaseError(err, next);
    }
};

exports.updateUserStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return throwError(404, 'Could not find user.', next);
        }
        user.status = req.body.status;
        await user.save();
        res.status(200).json({ message: 'User status updated.', status: user.status });
    } catch (err) {
        return catchDatabaseError(err, next);
    }
};
