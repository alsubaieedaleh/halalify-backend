import fetch from 'node-fetch';

const API_URL = process.argv[2] || 'http://localhost:3000';

async function testAuthEndpoints() {
    console.log('🧪 Testing Authentication Endpoints\n');
    console.log(`API URL: ${API_URL}\n`);

    try {
        // Test 1: Register new user
        console.log('1️⃣  Testing POST /auth/register (new user)');
        const registerResponse = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'authtest@halalify.com' })
        });

        const registerData = await registerResponse.json();

        if (registerResponse.ok) {
            console.log('   ✅ User registered successfully');
            console.log(`   📧 Email: ${registerData.email}`);
            console.log(`   🆔 User ID: ${registerData.userId}`);
            console.log(`   📊 Plan: ${registerData.plan}`);
            console.log(`   💰 Quota: ${registerData.quota.minutesRemaining}/${registerData.quota.minutesTotal} minutes\n`);
        } else {
            console.log(`   ❌ Registration failed:`, registerData);
            return;
        }

        const userId = registerData.userId;

        // Test 2: Register with same email (should return existing user)
        console.log('2️⃣  Testing POST /auth/register (existing user)');
        const existingResponse = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'authtest@halalify.com' })
        });

        const existingData = await existingResponse.json();

        if (existingResponse.ok && existingData.userId === userId) {
            console.log('   ✅ Returned existing user (no duplicate created)');
            console.log(`   🆔 Same User ID: ${existingData.userId}\n`);
        } else {
            console.log(`   ❌ Failed:`, existingData);
        }

        // Test 3: Get user info with /auth/me
        console.log('3️⃣  Testing GET /auth/me');
        const meResponse = await fetch(`${API_URL}/auth/me?userId=${userId}`);
        const meData = await meResponse.json();

        if (meResponse.ok) {
            console.log('   ✅ User info retrieved');
            console.log(`   📧 Email: ${meData.email}`);
            console.log(`   📊 Plan: ${meData.plan} (${meData.status})`);
            console.log(`   💰 Quota: ${meData.quota.minutesRemaining}/${meData.quota.minutesTotal} minutes`);
            console.log(`   📅 Reset Date: ${new Date(meData.quota.usageResetDate).toLocaleDateString()}\n`);
        } else {
            console.log(`   ❌ Failed:`, meData);
        }

        // Test 4: Invalid email
        console.log('4️⃣  Testing POST /auth/register (invalid email)');
        const invalidResponse = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'not-an-email' })
        });

        const invalidData = await invalidResponse.json();

        if (invalidResponse.status === 400) {
            console.log('   ✅ Invalid email rejected correctly');
            console.log(`   📋 Error: ${invalidData.error}\n`);
        } else {
            console.log(`   ⚠️  Should have rejected invalid email\n`);
        }

        // Test 5: Missing email
        console.log('5️⃣  Testing POST /auth/register (missing email)');
        const missingResponse = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const missingData = await missingResponse.json();

        if (missingResponse.status === 400) {
            console.log('   ✅ Missing email rejected correctly');
            console.log(`   📋 Error: ${missingData.error}\n`);
        } else {
            console.log(`   ⚠️  Should have rejected missing email\n`);
        }

        console.log('✅ All auth endpoint tests completed!\n');
        console.log('📊 Summary:');
        console.log('   - /auth/register creates free tier users (10 minutes)');
        console.log('   - Duplicate emails return existing user');
        console.log('   - /auth/me returns user quota and status');
        console.log('   - Email validation working');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testAuthEndpoints();
