import User from '../models/userModel.js';

export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ status: 'error', message: 'No authorization header provided' });
    }

    const token = authHeader.split(' ')[1];

    // Check for userId-based token format: "userId_{actual_userId}"
    if (token && token.startsWith('userId_')) {
        const userId = token.replace('userId_', '');

        try {
            // Verify user exists in database
            const user = await User.findById(userId);

            if (!user) {
                return res.status(403).json({ status: 'error', message: 'Invalid user token' });
            }

            // Attach user to request for downstream use
            req.user = user;
            req.userId = userId;
            return next();
        } catch (error) {
            console.error('[Auth] Error validating userId token:', error);
            return res.status(403).json({ status: 'error', message: 'Invalid user token' });
        }
    }

    // Fallback: Check for legacy static token (for backward compatibility)
    const VALID_TOKEN = process.env.API_SECRET || 'super_secret_token_123';
    if (token === VALID_TOKEN) {
        return next();
    }

    return res.status(403).json({ status: 'error', message: 'Invalid token' });
};
