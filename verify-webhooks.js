import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';
import SubscriptionHistory from './models/subscriptionHistoryModel.js';

dotenv.config();

async function verifyWebhookResults() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find the webhook test user
        const user = await User.findOne({ lemonCustomerId: '123456' });

        if (user) {
            console.log('📊 Webhook Test User Status:');
            console.log('   Email:', user.email);
            console.log('   Customer ID:', user.lemonCustomerId);
            console.log('   Plan:', user.plan);
            console.log('   Status:', user.status);
            console.log('   Quota:', user.minutesRemaining, '/', user.minutesTotal);
            console.log();

            // Get subscription history
            const history = await SubscriptionHistory.find({ userId: user._id }).sort({ timestamp: -1 });
            console.log('📋 Subscription History:', history.length, 'events');
            history.forEach((log, index) => {
                console.log(`   ${index + 1}. ${log.action.toUpperCase()}`);
                console.log(`      Tier: ${log.tier}`);
                console.log(`      Time: ${log.timestamp.toISOString()}`);
                console.log();
            });

        } else {
            console.log('❌ Webhook test user not found');
            console.log('   Expected customer_id: 123456');
        }

        console.log('✅ Verification complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

verifyWebhookResults();
