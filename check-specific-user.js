import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';
import SubscriptionHistory from './models/subscriptionHistoryModel.js';

dotenv.config();

async function checkSpecificUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        const user = await User.findOne({ email: 'prodtest@halalify.com' });

        if (user) {
            console.log('📊 User: prodtest@halalify.com\n');
            console.log('   Customer ID:', user.lemonCustomerId);
            console.log('   Subscription ID:', user.subscriptionId);
            console.log('   Plan:', user.plan);
            console.log('   Quota:', user.minutesRemaining, '/', user.minutesTotal);
            console.log('   Status:', user.status);
            console.log('   Created:', user.createdAt.toISOString());
            console.log('   Updated:', user.updatedAt.toISOString());
            console.log();

            // Get ALL subscription history
            const history = await SubscriptionHistory.find({ userId: user._id }).sort({ timestamp: -1 });
            console.log('📋 Subscription History:', history.length, 'events\n');
            history.forEach((event, i) => {
                console.log(`   ${i + 1}. ${event.action.toUpperCase()}`);
                console.log(`      Tier: ${event.tier}`);
                console.log(`      Subscription ID: ${event.lemonSubscriptionId}`);
                console.log(`      Time: ${event.timestamp.toISOString()}`);
                console.log();
            });
        } else {
            console.log('❌ No user found with email: prodtest@halalify.com');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkSpecificUser();
