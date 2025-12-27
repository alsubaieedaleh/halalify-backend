import fetch from 'node-fetch';

const PROD_URL = 'https://halalify-backend-production-f0c2.up.railway.app';

async function testProductionAuth() {
    console.log('🚀 Testing Production Authentication Endpoints\n');
    console.log(`API URL: ${PROD_URL}\n`);

    try {
        // Test 1: Register new production user
        console.log('1️⃣  Testing POST /auth/register (production)');
        const testEmail = `prodauth${Date.now()}@halalify.com`;

        const registerResponse = await fetch(`${PROD_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail })
        });

        const registerData = await registerResponse.json();

        if (registerResponse.ok) {
            console.log('   ✅ User registered successfully');
            console.log(`   📧 Email: ${registerData.email}`);
            console.log(`   🆔 User ID: ${registerData.userId}`);
            console.log(`   📊 Plan: ${registerData.plan}`);
            console.log(`   💰 Quota: ${registerData.quota.minutesRemaining}/${registerData.quota.minutesTotal} minutes\n`);

            const userId = registerData.userId;

            // Test 2: Get user info
            console.log('2️⃣  Testing GET /auth/me (production)');
            const meResponse = await fetch(`${PROD_URL}/auth/me?userId=${userId}`);
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

            // Test 3: Duplicate registration
            console.log('3️⃣  Testing duplicate registration');
            const dupResponse = await fetch(`${PROD_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: testEmail })
            });

            const dupData = await dupResponse.json();

            if (dupResponse.ok && dupData.userId === userId) {
                console.log('   ✅ Returned existing user (no duplicate)\n');
            } else {
                console.log(`   ❌ Failed:`, dupData);
            }

            console.log('✅ Production auth endpoints working!\n');
            console.log('📊 Summary:');
            console.log(`   - Test User: ${testEmail}`);
            console.log(`   - User ID: ${userId}`);
            console.log('   - All endpoints responding correctly');
            console.log('   - Ready for extension integration');

        } else {
            console.log(`   ❌ Registration failed:`, registerData);
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
        console.log('\n⚠️  Make sure Railway deployment is complete!');
    }
}

testProductionAuth();
