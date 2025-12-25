import crypto from 'crypto';

export const verifyLemonSqueezy = (req, res, next) => {
    const secret = process.env.LEMON_SQUEEZY_SECRET || 'your-webhook-secret';


    // Here is a simplified check assuming we have the signature header
    const signature = req.get('X-Signature');

    if (!signature) {
        return res.status(401).json({ message: 'No signature' });
    }

    if (!req.rawBody) {
        return res.status(500).json({ message: 'Raw body not available for verification' });
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(req.rawBody).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
        return res.status(401).json({ message: 'Invalid signature' });
    }

    next();
};
