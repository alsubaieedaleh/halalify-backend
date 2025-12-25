
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ status: 'error', message: 'No authorization header provided' });
    }

    const token = authHeader.split(' ')[1];

    // In production, use environment variable or database lookup
    const VALID_TOKEN = process.env.API_SECRET || 'super_secret_token_123';

    if (token !== VALID_TOKEN) {
        return res.status(403).json({ status: 'error', message: 'Invalid token' });
    }

    next();
};
