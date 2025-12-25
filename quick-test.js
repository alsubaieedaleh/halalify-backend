import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const API_URL = 'http://localhost:3000';
const API_TOKEN = 'super_secret_token_123';

async function quickTest() {
    console.log('🧪 Quick API Tests\n');

    try {
        // Test 1: Server health check
        console.log('1. Testing server health...');
        const healthResponse = await fetch(`${API_URL}/`);
        const healthText = await healthResponse.text();
        console.log(`   ✅ ${healthText}\n`);

        // Test 2: Check status endpoint
        console.log('2. Testing /checkStatus...');
        const statusResponse = await fetch(`${API_URL}/checkStatus`, {
            headers: { 'Authorization': `Bearer ${API_TOKEN}` }
        });
        const statusData = await statusResponse.json();
        console.log(`   ✅ Status: ${statusData.status}`);
        console.log(`   📊 Message: ${statusData.message}\n`);

        // Test 3: Process chunk without user_id (should work)
        console.log('3. Testing /process_chunk WITHOUT user_id (no quota enforcement)...');

        const dummyAudioPath = './dummy.mp3';
        if (!fs.existsSync(dummyAudioPath)) {
            fs.writeFileSync(dummyAudioPath, 'test audio content');
        }

        const formData = new FormData();
        formData.append('file', fs.createReadStream(dummyAudioPath));
        formData.append('url', 'https://youtube.com/watch?v=quicktest');
        formData.append('chunk_index', '0');
        formData.append('duration', '60');

        const processResponse = await fetch(`${API_URL}/process_chunk`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        const processData = await processResponse.json();
        console.log(`   Status: ${processResponse.status}`);
        console.log(`   Response:`, JSON.stringify(processData, null, 2));

        console.log('\n✅  Quick tests completed!');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

quickTest();
