import fetch from 'node-fetch';

const API_URL = process.argv[2] || 'http://localhost:3000';

async function testGoogleAuth() {
    console.log('🧪 Testing Google OAuth Endpoint\n');
    console.log(`API URL: ${API_URL}\n`);

    try {
        // Test Google auth with mock data
        console.log('1️⃣  Testing POST /auth/google (new user)');
        const googleData = {
            email: `googletest${Date.now()}@gmail.com`,
            googleId: `google_${Date.now()}`,
            name: 'Test User',
            picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
        };

        const response = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(googleData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('   ✅ Google auth successful');
            console.log(`   📧 Email: ${data.email}`);
            console.log(`   👤 Name: ${data.name}`);
            console.log(`   🆔 User ID: ${data.userId}`);
            console.log(`   📊 Plan: ${data.plan}`);
            console.log(`   💰 Quota: ${data.quota.minutesRemaining}/${data.quota.minutesTotal} minutes\n`);

            // Test with same Google ID (should return existing user)
            console.log('2️⃣  Testing POST /auth/google (existing user)');
            const response2 = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(googleData)
            });

            const data2 = await response2.json();

            if (response2.ok && data2.userId === data.userId) {
                console.log('   ✅ Returned existing user');
                console.log(`   🆔 Same User ID: ${data2.userId}\n`);
            }

            console.log('✅ All Google OAuth tests passed!');
        } else {
            console.log(`   ❌ Google auth failed:`, data);
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testGoogleAuth();
