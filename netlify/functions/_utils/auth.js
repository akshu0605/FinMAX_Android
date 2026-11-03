const jwt = require('jsonwebtoken');

/**
 * Extract and verify the JWT from the Authorization header.
 * Returns the decoded payload { userId, email, iat, exp }.
 * Throws a plain Error with a friendly message on failure — callers catch it.
 */
const verifyToken = (event) => {
    const authHeader = event.headers && event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded; // { userId, email, iat, exp }
    } catch (err) {
        if (err.name === 'TokenExpiredError') throw new Error('Token expired');
        throw new Error('Invalid token');
    }
};

module.exports = { verifyToken };
