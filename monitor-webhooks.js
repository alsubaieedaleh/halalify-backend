import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';
import SubscriptionHistory from './models/subscriptionHistoryModel.js';

dotenv.config();

// Script to monitor for new webhook users
async function monitorWebhookUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
        console.log('👀 Monitoring for new users from LemonSqueezy webhooks...\n');

        // Get all users created in the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const recentUsers = await User.find({
            createdAt: { $gte: oneHourAgo }
        }).sort({ createdAt: -1 });

        if (recentUsers.length === 0) {
            console.log('📭 No users created in the last hour');
            console.log('\n💡 Create a test subscription in LemonSqueezy to test the webhook');
        } else {
            console.log(`📊 Found ${recentUsers.length} recent user(s):\n`);

            for (const user of recentUsers) {
                console.log('─'.repeat(60));
                console.log('👤 User Details:');
                console.log('   Email:', user.email);
                console.log('   Customer ID:', user.lemonCustomerId);
                console.log('   Plan:', user.plan.toUpperCase());
                console.log('   Quota:', user.minutesRemaining, '/', user.minutesTotal, 'minutes');
                console.log('   Status:', user.status);
                console.log('   Created:', user.createdAt.toISOString());

                // Get subscription history
                const history = await SubscriptionHistory.find({
                    userId: user._id
                }).sort({ timestamp: -1 });

                if (history.length > 0) {
                    console.log('\n   📋 Subscription Events:', history.length);
                    history.forEach(event => {
                        console.log(`      - ${event.action.toUpperCase()} (${event.tier}) at ${event.timestamp.toISOString()}`);
                    });
                }
                console.log();
            }
            console.log('─'.repeat(60));
        }

        console.log('\n✅ Monitoring complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

monitorWebhookUsers();
