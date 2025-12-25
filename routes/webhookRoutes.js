import express from 'express';
import { verifyLemonSqueezy } from '../middleware/verifyLemonSqueezy.js';
import User from '../models/userModel.js';
import SubscriptionHistory from '../models/subscriptionHistoryModel.js';
import { getTierMinutes, getPlanFromVariant } from '../config/tierConfig.js';

const router = express.Router();

router.post('/webhook/lemonsqueezy', verifyLemonSqueezy, async (req, res) => {
    const eventName = req.body.meta.event_name;
    const data = req.body.data;

    console.log(`📨 Received LemonSqueezy event: ${eventName}`);
    console.log('📦 Full payload:', JSON.stringify(req.body, null, 2));

    try {
        // Extract common data
        const customerId = data.attributes.customer_id?.toString();
        const subscriptionId = data.id?.toString();
        const userEmail = data.attributes.user_email;
        const variantId = data.attributes.variant_id?.toString();
        const customerPortalUrl = data.attributes.urls?.customer_portal;

        console.log('🔍 Extracted data:');
        console.log('   - customerId:', customerId);
        console.log('   - subscriptionId:', subscriptionId);
        console.log('   - userEmail:', userEmail);
        console.log('   - variantId:', variantId);
        console.log('   - customerPortalUrl:', customerPortalUrl);

        if (!customerId) {
            console.error('❌ No customer_id in webhook payload');
            return res.status(400).json({ error: 'Missing customer_id' });
        }

        // Find or create user
        let user = await User.findOne({ lemonCustomerId: customerId });
        console.log('👤 Existing user found:', !!user);

        switch (eventName) {
            case 'subscription_created':
                console.log(`✨ New subscription for customer ${customerId}`);

                const plan = getPlanFromVariant(variantId);
                const minutes = getTierMinutes(plan);

                if (!user) {
                    // Create new user
                    user = await User.create({
                        lemonCustomerId: customerId,
                        subscriptionId: subscriptionId,
                        email: userEmail,
                        plan: plan,
                        status: 'active',
                        minutesRemaining: minutes,
                        minutesTotal: minutes,
                        customerPortalUrl: customerPortalUrl,
                        subscriptionStartDate: new Date(),
                        usageResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    });
                    console.log(`✅ Created new user: ${userEmail} (${plan} plan)`);
                } else {
                    // Update existing user (upgrade)
                    user.subscriptionId = subscriptionId;
                    user.plan = plan;
                    user.status = 'active';
                    user.minutesRemaining = minutes;
                    user.minutesTotal = minutes;
                    user.customerPortalUrl = customerPortalUrl;
                    user.subscriptionStartDate = new Date();
                    user.usageResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    await user.save();
                    console.log(`✅ Updated user: ${userEmail} to ${plan} plan`);
                }

                // Log subscription history
                await SubscriptionHistory.create({
                    userId: user._id,
                    lemonSubscriptionId: subscriptionId,
                    tier: plan,
                    action: 'created',
                    eventData: req.body
                });

                break;

            case 'subscription_updated':
                console.log(`🔄 Subscription updated for customer ${customerId}`);

                if (!user) {
                    console.warn(`⚠️ User not found for customer ${customerId}`);
                    return res.status(404).json({ error: 'User not found' });
                }

                const updatedPlan = getPlanFromVariant(variantId);
                const updatedMinutes = getTierMinutes(updatedPlan);

                // Determine if this is an upgrade or downgrade
                const oldPlan = user.plan;
                const action = updatedMinutes > user.minutesTotal ? 'upgraded' :
                    updatedMinutes < user.minutesTotal ? 'downgraded' : 'renewed';

                user.plan = updatedPlan;
                user.subscriptionId = subscriptionId;
                user.minutesRemaining = updatedMinutes;
                user.minutesTotal = updatedMinutes;
                user.customerPortalUrl = customerPortalUrl;
                await user.save();

                console.log(`✅ ${action} user from ${oldPlan} to ${updatedPlan}`);

                // Log subscription history
                await SubscriptionHistory.create({
                    userId: user._id,
                    lemonSubscriptionId: subscriptionId,
                    tier: updatedPlan,
                    action: action,
                    eventData: req.body
                });

                break;

            case 'subscription_resumed':
                console.log(`▶️ Subscription resumed for customer ${customerId}`);

                if (!user) {
                    console.warn(`⚠️ User not found for customer ${customerId}`);
                    return res.status(404).json({ error: 'User not found' });
                }

                user.status = 'active';
                user.subscriptionId = subscriptionId;
                await user.save();

                console.log(`✅ Resumed subscription for ${user.email}`);

                // Log subscription history
                await SubscriptionHistory.create({
                    userId: user._id,
                    lemonSubscriptionId: subscriptionId,
                    tier: user.plan,
                    action: 'resumed',
                    eventData: req.body
                });

                break;

            case 'subscription_cancelled':
                console.log(`⏸️ Subscription cancelled for customer ${customerId}`);

                if (!user) {
                    console.warn(`⚠️ User not found for customer ${customerId}`);
                    return res.status(404).json({ error: 'User not found' });
                }

                // Mark as cancelled but keep quota until expiration
                user.status = 'cancelled';
                await user.save();

                console.log(`✅ Marked ${user.email} as cancelled`);

                // Log subscription history
                await SubscriptionHistory.create({
                    userId: user._id,
                    lemonSubscriptionId: subscriptionId,
                    tier: user.plan,
                    action: 'cancelled',
                    eventData: req.body
                });

                break;

            case 'subscription_expired':
                console.log(`🔴 Subscription expired for customer ${customerId}`);

                if (!user) {
                    console.warn(`⚠️ User not found for customer ${customerId}`);
                    return res.status(404).json({ error: 'User not found' });
                }

                // Downgrade to free tier
                const freeMinutes = getTierMinutes('free');
                user.status = 'expired';
                user.plan = 'free';
                user.minutesRemaining = freeMinutes;
                user.minutesTotal = freeMinutes;
                user.subscriptionEndDate = new Date();
                await user.save();

                console.log(`✅ Downgraded ${user.email} to free tier`);

                // Log subscription history
                await SubscriptionHistory.create({
                    userId: user._id,
                    lemonSubscriptionId: subscriptionId,
                    tier: 'free',
                    action: 'expired',
                    eventData: req.body
                });

                break;

            default:
                console.log(`ℹ️ Unhandled event: ${eventName}`);
        }

        res.json({ received: true, event: eventName });

    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed', message: error.message });
    }
});

export default router;
