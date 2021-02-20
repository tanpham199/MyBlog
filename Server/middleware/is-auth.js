const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const header = req.get('Authorization');
    if (!header) {
        const error = new Error('Not authenticated');
        error.statusCode = 401;
        throw error;
    }
    const token = header.split(' ')[1];
    try {
        const decodedToken = jwt.verify(token, 'my secret');
        if (!decodedToken) {
            const error = new Error('Not authenticated');
            error.statusCode = 401;
            throw error;
        }
        req.userId = decodedToken.userId;
        next();
    } catch (err) {
        err.statusCode = 500;
        throw err;
    }
};
