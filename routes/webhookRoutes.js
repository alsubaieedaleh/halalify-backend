import express from 'express';
import { verifyLemonSqueezy } from '../middleware/verifyLemonSqueezy.js';
import User from '../models/userModel.js';

const router = express.Router();

router.post('/webhook/lemonsqueezy', verifyLemonSqueezy, async (req, res) => {
    const eventName = req.body.meta.event_name;
    const data = req.body.data;

    console.log(`Received Lemon Squeezy event: ${eventName}`);

    try {
        const customerId = data.attributes.customer_id;
        const subscriptionId = data.id; // or data.attributes.subscription_id depending on payload

        // Simple logic based on event
        // Note: In a real app, you'd likely use `customer_id` to find the user in your system

        // Mock user update logic
        // const user = await User.findOne({ lemonCustomerId: customerId });
        // if (user) { ... }

        switch (eventName) {
            case 'subscription_created':
            case 'subscription_updated':
            case 'subscription_resumed':
                // Update user to premium
                console.log(`Updating subscription for customer ${customerId} to PREMIUM`);
                break;

            case 'subscription_cancelled':
            case 'subscription_expired':
                // Downgrade user to free
                console.log(`Downgrading subscription for customer ${customerId} to FREE`);
                break;

            default:
                console.log(`Unhandled event: ${eventName}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Webhook Error');
    }
});

export default router;
