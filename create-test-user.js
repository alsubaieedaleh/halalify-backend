import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';

dotenv.config();

async function createTestUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Clean up old test users
        await User.deleteMany({ email: 'prodtest@halalify.com' });

        // Create production test user
        const testUser = await User.create({
            lemonCustomerId: 'prod_test_' + Date.now(),
            email: 'prodtest@halalify.com',
            plan: 'creator',
            status: 'active',
            minutesRemaining: 300,
            minutesTotal: 300,
            customerPortalUrl: 'https://halalify.lemonsqueezy.com/billing'
        });

        console.log('✅ Test user created for production testing:');
        console.log('   User ID:', testUser._id.toString());
        console.log('   Email:', testUser.email);
        console.log('   Plan:', testUser.plan);
        console.log('   Quota:', testUser.minutesRemaining, '/', testUser.minutesTotal);
        console.log('\n📋 Use this user_id for testing:');
        console.log('   ', testUser._id.toString());

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

createTestUser();
