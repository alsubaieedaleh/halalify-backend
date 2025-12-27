import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';
import SubscriptionHistory from './models/subscriptionHistoryModel.js';

dotenv.config();

async function checkDalhUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        const user = await User.findOne({ email: 'dalh072@gmail.com' });

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
            console.log('   Portal URL:', user.customerPortalUrl || 'N/A');
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

            console.log('✅ Week 2: LemonSqueezy Integration COMPLETE!');
        } else {
            console.log('❌ User not found: dalh072@gmail.com');
            console.log('\n📋 Checking all recent users...\n');

            const recentUsers = await User.find().sort({ createdAt: -1 }).limit(3);
            recentUsers.forEach(u => {
                console.log(`   - ${u.email} (${u.plan}) - Created: ${u.createdAt.toISOString()}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkDalhUser();
