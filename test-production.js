import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const PROD_URL = 'https://halalify-backend-production-f0c2.up.railway.app';
const API_TOKEN = 'super_secret_token_123';

async function testProductionWithUser() {
    console.log('🧪 Testing Production Backend with Real User Data\n');

    // You need to provide a real user_id from your MongoDB Atlas
    // To get this:
    // 1. Go to MongoDB Atlas → Browse Collections
    // 2. Find the 'users' collection
    // 3. Find a user document and copy the _id value

    const TEST_USER_ID = process.argv[2]; // Pass user_id as command line argument

    if (!TEST_USER_ID) {
        console.log('❌ Please provide a user_id as argument');
        console.log('   Usage: node test-production.js <user_id>');
        console.log('\n📋 To get a user_id:');
        console.log('   1. Go to MongoDB Atlas (cloud.mongodb.com)');
        console.log('   2. Browse Collections → users');
        console.log('   3. Copy the _id value from any user document');
        console.log('   4. Run: node test-production.js <that_id>');
        return;
    }

    try {
        // Test 1: Get user status
        console.log('1️⃣  Testing GET /user/status with real user...');
        const statusResponse = await fetch(
            `${PROD_URL}/user/status?user_id=${TEST_USER_ID}`,
            { headers: { 'Authorization': `Bearer ${API_TOKEN}` } }
        );
        const statusData = await statusResponse.json();

        if (statusResponse.ok) {
            console.log('   ✅ User status retrieved successfully');
            console.log(`   📧 Email: ${statusData.data.email}`);
            console.log(`   📊 Plan: ${statusData.data.plan}`);
            console.log(`   💰 Quota: ${statusData.data.usage.minutesRemaining}/${statusData.data.usage.minutesTotal} minutes`);
            console.log(`   📈 Usage: ${statusData.data.usage.usagePercent}%\n`);
        } else {
            console.log(`   ❌ Failed: ${statusData.message}\n`);
            return;
        }

        // Test 2: Process chunk with user quota enforcement
        console.log('2️⃣  Testing POST /process_chunk with quota enforcement...');

        // Create test audio file
        const testAudioPath = './test-prod.mp3';
        if (!fs.existsSync(testAudioPath)) {
            fs.writeFileSync(testAudioPath, 'test audio content for production');
        }

        const formData = new FormData();
        formData.append('file', fs.createReadStream(testAudioPath));
        formData.append('url', 'https://youtube.com/watch?v=prodtest123');
        formData.append('chunk_index', '0');
        formData.append('duration', '30'); // 30 seconds = 0.5 minutes
        formData.append('classifier_mode', 'auto');
        formData.append('classifier_threshold', '0.45');
        formData.append('user_id', TEST_USER_ID);

        const processResponse = await fetch(`${PROD_URL}/process_chunk`, {
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
            console.log(`   💰 Minutes Deducted: ${processData.usage.minutesUsed}`);
            console.log(`   💰 Minutes Remaining: ${processData.usage.minutesRemaining}`);
            console.log(`   📊 Cached: ${processData.cached || false}\n`);
        } else {
            console.log(`   ❌ Failed: ${processData.message}`);
            if (processData.usage) {
                console.log(`   💰 Quota Info:`, processData.usage);
            }
        }

        // Test 3: Verify quota deduction
        console.log('3️⃣  Verifying quota was deducted...');
        const verifyResponse = await fetch(
            `${PROD_URL}/user/status?user_id=${TEST_USER_ID}`,
            { headers: { 'Authorization': `Bearer ${API_TOKEN}` } }
        );
        const verifyData = await verifyResponse.json();

        if (verifyResponse.ok) {
            console.log('   ✅ Quota verification complete');
            console.log(`   💰 Current Quota: ${verifyData.data.usage.minutesRemaining}/${verifyData.data.usage.minutesTotal} minutes`);
            console.log(`   📈 Usage Percent: ${verifyData.data.usage.usagePercent}%\n`);
        }

        console.log('✅ All production tests with real user data completed!\n');

        // Cleanup
        if (fs.existsSync(testAudioPath)) {
            fs.unlinkSync(testAudioPath);
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testProductionWithUser();
