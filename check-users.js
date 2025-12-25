import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';
import SubscriptionHistory from './models/subscriptionHistoryModel.js';

dotenv.config();

async function checkLatestUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all users sorted by creation date
        const allUsers = await User.find().sort({ createdAt: -1 }).limit(5);

        console.log(`📊 Latest ${allUsers.length} users in database:\n`);

        for (const user of allUsers) {
            console.log('─'.repeat(60));
            console.log('👤 Email:', user.email);
            console.log('   Customer ID:', user.lemonCustomerId);
            console.log('   Plan:', user.plan.toUpperCase());
            console.log('   Quota:', user.minutesRemaining, '/', user.minutesTotal);
            console.log('   Status:', user.status);
            console.log('   Created:', user.createdAt.toISOString());

            // Get subscription history
            const history = await SubscriptionHistory.find({ userId: user._id });
            if (history.length > 0) {
                console.log('   Events:', history.map(h => h.action).join(', '));
            }
            console.log();
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkLatestUsers();
