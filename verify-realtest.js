import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';
import SubscriptionHistory from './models/subscriptionHistoryModel.js';

dotenv.config();

async function checkRealtestUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        const user = await User.findOne({ email: 'realtest@halalify.com' });

        if (user) {
            console.log('🎉 SUCCESS! User created by LemonSqueezy webhook!\n');
            console.log('📊 User Details:');
            console.log('   Email:', user.email);
            console.log('   Customer ID:', user.lemonCustomerId);
            console.log('   Subscription ID:', user.subscriptionId);
            console.log('   Plan:', user.plan.toUpperCase());
            console.log('   Quota:', user.minutesRemaining, '/', user.minutesTotal, 'minutes');
            console.log('   Status:', user.status);
            console.log('   Created:', user.createdAt.toISOString());
            console.log('   Portal URL:', user.customerPortalUrl);
            console.log();

            // Get subscription history
            const history = await SubscriptionHistory.find({ userId: user._id }).sort({ timestamp: -1 });
            console.log('📋 Subscription History:', history.length, 'event(s)\n');
            history.forEach((event, i) => {
                console.log(`   ${i + 1}. ${event.action.toUpperCase()}`);
                console.log(`      Tier: ${event.tier}`);
                console.log(`      Subscription ID: ${event.lemonSubscriptionId}`);
                console.log(`      Time: ${event.timestamp.toISOString()}`);
                console.log();
            });

            console.log('✅ LemonSqueezy integration working perfectly!');
        } else {
            console.log('❌ User not found: realtest@halalify.com');
            console.log('   The webhook may still be processing...');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkRealtestUser();
