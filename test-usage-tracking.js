import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import User from './models/userModel.js';
import UsageLog from './models/usageLogModel.js';

dotenv.config();

const API_URL = 'http://localhost:3000';
const API_TOKEN = process.env.API_SECRET || 'super_secret_token_123';

// Test the complete usage tracking flow
async function testUsageTracking() {
    try {
        console.log('🚀 Starting Usage Tracking Tests...\n');

        // Connect to DB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/halalify');
        console.log('✅ Connected to MongoDB\n');

        // Clean up test data
        await User.deleteMany({ email: 'testuser@halalify.com' });
        await UsageLog.deleteMany({});
        console.log('🧹 Cleaned up test data\n');

        // ==========================================
        // TEST 1: Create test user with free tier
        // ================== ========================
        console.log('📝 TEST 1: Creating test user with free tier (10 minutes)');
        const testUser = await User.create({
            lemonCustomerId: 'test_customer_' + Date.now(),
            email: 'testuser@halalify.com',
            plan: 'free',
            status: 'active',
            minutesRemaining: 10,
            minutesTotal: 10
        });
        console.log(`   ✅ User created: ${testUser.email}`);
        console.log(`   📊 Quota: ${testUser.minutesRemaining}/${testUser.minutesTotal} minutes\n`);

        // ==========================================
        // TEST 2: Check user status endpoint
        // ==========================================
        console.log('📝 TEST 2: Testing GET /user/status endpoint');
        const statusResponse = await fetch(
            `${API_URL}/user/status?user_id=${testUser._id}`,
            {
                headers: { 'Authorization': `Bearer ${API_TOKEN}` }
            }
        );
        const statusData = await statusResponse.json();

        if (statusResponse.ok) {
            console.log('   ✅ Status endpoint working');
            console.log(`   📊 Plan: ${statusData.data.plan}`);
            console.log(`   📊 Minutes Remaining: ${statusData.data.usage.minutesRemaining}\n`);
        } else {
            console.log('   ❌ Status endpoint failed:', statusData);
        }

        // ==========================================
        // TEST 3: Process chunk (successful)
        // ==========================================
        console.log('📝 TEST 3: Processing chunk (120 seconds / 2 minutes)');

        // Create dummy audio file
        const dummyAudioPath = './test.mp3';
        if (!fs.existsSync(dummyAudioPath)) {
            fs.writeFileSync(dummyAudioPath, 'dummy audio content');
        }

        const formData = new FormData();
        formData.append('file', fs.createReadStream(dummyAudioPath));
        formData.append('url', 'https://youtube.com/watch?v=test123');
        formData.append('chunk_index', '0');
        formData.append('duration', '120'); // 2 minutes in seconds
        formData.append('classifier_mode', 'auto');
        formData.append('classifier_threshold', '0.45');
        formData.append('user_id', testUser._id.toString());

        const processResponse = await fetch(`${API_URL}/process_chunk`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        const processData = await processResponse.json();

        if (processResponse.ok) {
            console.log('   ✅ Chunk processed successfully');
            console.log(`   📊 Minutes Used: ${processData.usage.minutesUsed}`);
            console.log(`   📊 Minutes Remaining: ${processData.usage.minutesRemaining}\n`);
        } else {
            console.log('   ❌ Processing failed:', processData.message);
            console.log(`   📊 Error details:`, processData);
        }

        // Verify usage was logged
        const usageLogs = await UsageLog.find({ userId: testUser._id });
        console.log(`   📊 Usage logs created: ${usageLogs.length}`);
        if (usageLogs.length > 0) {
            console.log(`      - Minutes Processed: ${usageLogs[0].minutesProcessed}`);
            console.log(`      - Cached: ${usageLogs[0].cached}\n`);
        }

        // ==========================================
        // TEST 4: Verify quota was deducted
        // ==========================================
        console.log('📝 TEST 4: Verifying quota deduction in database');
        const updatedUser = await User.findById(testUser._id);
        console.log(`   ✅ Previous quota: ${testUser.minutesRemaining} minutes`);
        console.log(`   ✅ Current quota: ${updatedUser.minutesRemaining} minutes`);
        console.log(`   📊 Deducted: ${testUser.minutesRemaining - updatedUser.minutesRemaining} minutes\n`);

        // ==========================================
        // TEST 5: Exhaust quota (should fail)
        // ==========================================
        console.log('📝 TEST 5: Attempting to process when quota exceeded');

        // First, manually reduce quota to near-zero
        updatedUser.minutesRemaining = 0.5; // Only 30 seconds left
        await updatedUser.save();

        const formData2 = new FormData();
        formData2.append('file', fs.createReadStream(dummyAudioPath));
        formData2.append('url', 'https://youtube.com/watch?v=test456');
        formData2.append('chunk_index', '1');
        formData2.append('duration', '120'); // 2 minutes - should exceed quota
        formData2.append('user_id', testUser._id.toString());

        const quotaExceededResponse = await fetch(`${API_URL}/process_chunk`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                ...formData2.getHeaders()
            },
            body: formData2
        });

        const quotaExceededData = await quotaExceededResponse.json();

        if (quotaExceededResponse.status === 403) {
            console.log('   ✅ Quota exceeded properly blocked');
            console.log(`   📊 Error message: ${quotaExceededData.message}`);
            console.log(`   📊 Minutes remaining: ${quotaExceededData.usage.minutesRemaining}`);
            console.log(`   📊 Minutes needed: ${quotaExceededData.usage.minutesNeeded}\n`);
        } else {
            console.log('   ❌ Should have blocked quota exceeded request');
        }

        // ==========================================
        // TEST 6: Reset quotas (admin endpoint)
        // ==========================================
        console.log('📝 TEST 6: Testing admin quota reset');

        // Set user's reset date to past
        updatedUser.usageResetDate = new Date(Date.now() - 1000);
        await updatedUser.save();

        const resetResponse = await fetch(`${API_URL}/admin/reset-quotas`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const resetData = await resetResponse.json();

        if (resetResponse.ok) {
            console.log('   ✅ Quotas reset successfully');
            console.log(`   📊 Users reset: ${resetData.data.usersReset}`);

            const resetUser = await User.findById(testUser._id);
            console.log(`   📊 New quota: ${resetUser.minutesRemaining}/${resetUser.minutesTotal} minutes\n`);
        } else {
            console.log('   ❌ Reset failed:', resetData);
        }

        // ==========================================
        // SUMMARY
        // ==========================================
        console.log('📊 TEST SUMMARY:');
        const finalUser = await User.findById(testUser._id);
        const finalLogs = await UsageLog.find({ userId: testUser._id });

        console.log(`   ✅ User Status: ${finalUser.status}`);
        console.log(`   ✅ Current Plan: ${finalUser.plan}`);
        console.log(`   ✅ Quota: ${finalUser.minutesRemaining}/${finalUser.minutesTotal} minutes`);
        console.log(`   ✅ Total Processing Events: ${finalLogs.length}`);
        console.log(`   ✅ Total Minutes Processed: ${finalLogs.reduce((sum, log) => sum + log.minutesProcessed, 0)}`);

        console.log('\n✅ All usage tracking tests completed!\n');

        // Clean up
        await User.deleteMany({ email: 'testuser@halalify.com' });
        await UsageLog.deleteMany({ userId: testUser._id });
        console.log('🧹 Cleaned up test data');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('📦 Database connection closed');
        process.exit(0);
    }
}

// Run tests
testUsageTracking();
