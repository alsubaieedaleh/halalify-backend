import fetch from 'node-fetch';
import crypto from 'crypto';

const WEBHOOK_URL = process.argv[2] || 'http://localhost:3000/webhook/lemonsqueezy';
const WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_SECRET || 'your-webhook-secret';

// Mock LemonSqueezy webhook payloads
const mockPayloads = {
    subscription_created: {
        meta: {
            event_name: 'subscription_created'
        },
        data: {
            id: 'sub_test_' + Date.now(),
            attributes: {
                customer_id: 123456,
                user_email: 'webhooktest@halalify.com',
                variant_id: null, // Will default to free plan
                urls: {
                    customer_portal: 'https://halalify.lemonsqueezy.com/billing'
                }
            }
        }
    },

    subscription_updated: {
        meta: {
            event_name: 'subscription_updated'
        },
        data: {
            id: 'sub_test_upgrade',
            attributes: {
                customer_id: 123456,
                user_email: 'webhooktest@halalify.com',
                variant_id: null, // Upgrade to creator
                urls: {
                    customer_portal: 'https://halalify.lemonsqueezy.com/billing'
                }
            }
        }
    },

    subscription_cancelled: {
        meta: {
            event_name: 'subscription_cancelled'
        },
        data: {
            id: 'sub_test_cancel',
            attributes: {
                customer_id: 123456,
                user_email: 'webhooktest@halalify.com'
            }
        }
    },

    subscription_expired: {
        meta: {
            event_name: 'subscription_expired'
        },
        data: {
            id: 'sub_test_expired',
            attributes: {
                customer_id: 123456,
                user_email: 'webhooktest@halalify.com'
            }
        }
    },

    subscription_resumed: {
        meta: {
            event_name: 'subscription_resumed'
        },
        data: {
            id: 'sub_test_resumed',
            attributes: {
                customer_id: 123456,
                user_email: 'webhooktest@halalify.com'
            }
        }
    }
};

async function testWebhook(eventType) {
    const payload = mockPayloads[eventType];

    if (!payload) {
        console.error(`❌ Unknown event type: ${eventType}`);
        console.log('Available events:', Object.keys(mockPayloads).join(', '));
        return;
    }

    const payloadString = JSON.stringify(payload);

    // Generate signature (HMAC SHA-256)
    const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(payloadString)
        .digest('hex');

    console.log(`\n🧪 Testing webhook event: ${eventType}`);
    console.log(`📨 Sending to: ${WEBHOOK_URL}\n`);

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': signature
            },
            body: payloadString
        });

        const result = await response.json();

        if (response.ok) {
            console.log(`✅ Webhook processed successfully`);
            console.log(`📊 Response:`, result);
        } else {
            console.log(`❌ Webhook failed (${response.status})`);
            console.log(`📊 Error:`, result);
        }

    } catch (error) {
        console.error(`❌ Request failed:`, error.message);
    }
}

async function runAllTests() {
    console.log('🚀 Running all webhook tests sequentially\n');

    const events = [
        'subscription_created',
        'subscription_updated',
        'subscription_cancelled',
        'subscription_resumed',
        'subscription_expired'
    ];

    for (const event of events) {
        await testWebhook(event);
        console.log('\n' + '='.repeat(60) + '\n');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    }

    console.log('✅ All webhook tests completed!');
}

// Usage: node test-webhook.js [event_type] [webhook_url]
// Examples:
//   node test-webhook.js subscription_created
//   node test-webhook.js all
//   node test-webhook.js subscription_created http://localhost:3000/webhook/lemonsqueezy

const eventType = process.argv[3] || 'all';

if (eventType === 'all') {
    runAllTests();
} else {
    testWebhook(eventType);
}
