const jwt = require('jsonwebtoken');
const database = require('../database/database');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user still exists
        const user = await database.findUserById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'Invalid token - user not found' });
        }

        req.user = {
            userId: user._id,
            username: user.username,
            email: user.email
        };
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await database.findUserById(decoded.userId);
        req.user = user ? {
            userId: user._id,
            username: user.username,
            email: user.email
        } : null;
    } catch (error) {
        req.user = null;
    }
    
    next();
};

module.exports = { authenticateToken, optionalAuth };
