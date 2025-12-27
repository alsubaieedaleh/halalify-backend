import fetch from 'node-fetch';

const PROD_URL = 'https://halalify-backend-production-f0c2.up.railway.app';

async function testGoogleAuthEndpoint() {
    console.log('🧪 Testing /auth/google endpoint on production\n');

    try {
        const response = await fetch(`${PROD_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@gmail.com',
                googleId: 'google_123456',
                name: 'Test User',
                picture: 'https://example.com/pic.jpg'
            })
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.ok && data.success) {
            console.log('\n✅ Endpoint is working!');
        } else {
            console.log('\n❌ Endpoint returned error');
        }

    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

testGoogleAuthEndpoint();
