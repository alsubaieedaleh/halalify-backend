import User from './models/userModel.js';
import UsageLog from './models/usageLogModel.js';
import SubscriptionHistory from './models/subscriptionHistoryModel.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Test database models
async function testDatabaseModels() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/halalify');
        console.log('✅ MongoDB Connected for testing');

        // Clean up test data
        await User.deleteMany({ email: 'test@halalify.com' });
        console.log('🧹 Cleaned up previous test data');

        // Test 1: Create a free user
        const testUser = await User.create({
            lemonCustomerId: 'test_cus_' + Date.now(),
            email: 'test@halalify.com',
            plan: 'free',
            status: 'active'
        });
        console.log('\n✅ Test 1: Created free user');
        console.log('   - Email:', testUser.email);
        console.log('   - Plan:', testUser.plan);
        console.log('   - Minutes Remaining:', testUser.minutesRemaining);
        console.log('   - Minutes Total:', testUser.minutesTotal);
        console.log('   - Usage Reset Date:', testUser.usageResetDate.toISOString());

        // Test 2: Create usage log entry
        const usageLog = await UsageLog.create({
            userId: testUser._id,
            videoUrl: 'https://youtube.com/watch?v=test123',
            chunkIndex: 0,
            minutesProcessed: 2.5,
            classifierMode: 'auto',
            classifierThreshold: '0.45',
            cached: false
        });
        console.log('\n✅ Test 2: Created usage log entry');
        console.log('   - Video URL:', usageLog.videoUrl);
        console.log('   - Minutes Processed:', usageLog.minutesProcessed);
        console.log('   - Cached:', usageLog.cached);

        // Test 3: Update user quota
        testUser.minutesRemaining -= usageLog.minutesProcessed;
        await testUser.save();
        console.log('\n✅ Test 3: Deducted usage from quota');
        console.log('   - Minutes Remaining:', testUser.minutesRemaining);
        console.log('   - Minutes Used:', usageLog.minutesProcessed);

        // Test 4: Create subscription history
        const history = await SubscriptionHistory.create({
            userId: testUser._id,
            lemonSubscriptionId: 'sub_test_123',
            tier: 'creator',
            action: 'created',
            eventData: { test: true }
        });
        console.log('\n✅ Test 4: Created subscription history entry');
        console.log('   - Action:', history.action);
        console.log('   - Tier:', history.tier);

        // Test 5: Upgrade user to creator plan
        testUser.plan = 'creator';
        testUser.minutesRemaining = 300;
        testUser.minutesTotal = 300;
        testUser.subscriptionId = 'sub_test_123';
        testUser.subscriptionStartDate = new Date();
        await testUser.save();
        console.log('\n✅ Test 5: Upgraded user to creator plan');
        console.log('   - New Plan:', testUser.plan);
        console.log('   - New Quota:', testUser.minutesRemaining, '/', testUser.minutesTotal);

        // Test 6: Query usage logs
        const userLogs = await UsageLog.find({ userId: testUser._id }).sort({ processedAt: -1 });
        console.log('\n✅ Test 6: Queried usage logs');
        console.log('   - Total Logs:', userLogs.length);

        // Test 7: Query subscription history
        const userHistory = await SubscriptionHistory.find({ userId: testUser._id }).sort({ timestamp: -1 });
        console.log('\n✅ Test 7: Queried subscription history');
        console.log('   - Total History Events:', userHistory.length);

        console.log('\n✅ All database tests passed!');

        // Clean up
        await User.deleteMany({ email: 'test@halalify.com' });
        await UsageLog.deleteMany({ userId: testUser._id });
        await SubscriptionHistory.deleteMany({ userId: testUser._id });
        console.log('\n🧹 Cleaned up test data');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n📦 Database connection closed');
    }
}

testDatabaseModels();
