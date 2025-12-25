# Testing LemonSqueezy Webhooks in Test Mode

## Your Configuration
- **Variant ID**: 1170913 → Creator plan (300 minutes)
- **Webhook Secret**: Already configured in Railway & .env
- **Production URL**: https://halalify-backend-production-f0c2.up.railway.app/webhook/lemonsqueezy

## Available Plans
- ✅ **Free**: 10 minutes (default for non-subscribers)
- ✅ **Starter**: 100 minutes
- ✅ **Creator**: 300 minutes (Variant 1170913)
- ✅ **Pro**: 500 minutes

## Step 1: Configure Webhook in LemonSqueezy

1. Go to https://app.lemonsqueezy.com/settings/webhooks
2. Click "+" to add a new webhook
3. Fill in:
   - **URL**: `https://halalify-backend-production-f0c2.up.railway.app/webhook/lemonsqueezy`
   - **Signing Secret**: Copy this and ensure it's in Railway env as `LEMON_SQUEEZY_SECRET`
   - **Events**: Select these subscription events:
     - ✅ subscription_created
     - ✅ subscription_updated
     - ✅ subscription_cancelled
     - ✅ subscription_expired
     - ✅ subscription_resumed
4. Click "Save"

## Step 2: Test with LemonSqueezy Test Mode

### Create Test Subscription

1. Go to your LemonSqueezy product
2. Click "Preview" to get test checkout link
3. Use LemonSqueezy test card:
   ```
   Card: 4242 4242 4242 4242
   Expiry: Any future date (e.g., 12/25)
   CVC: Any 3 digits (e.g., 123)
   ```
4. Complete checkout with test email (e.g., `testuser@halalify.com`)

### What Happens

1. **LemonSqueezy sends webhook** → Your backend
2. **Backend receives** `subscription_created` event
3. **User is created** in MongoDB:
   ```javascript
   {
     lemonCustomerId: "123...",
     email: "testuser@halalify.com",
     plan: "creator",
     minutesRemaining: 300,
     minutesTotal: 300,
     status: "active"
   }
   ```
4. **Subscription history logged**

## Step 3: Verify in Database

After test subscription, check MongoDB:

```javascript
// Find user by email
db.users.findOne({ email: "testuser@halalify.com" })

// Check subscription history
db.subscriptionhistories.find({ userId: ObjectId("...") })
```

## Step 4: Test Additional Events

### Test Cancellation
1. Go to LemonSqueezy customer portal
2. Cancel the test subscription
3. Webhook sends `subscription_cancelled`
4. User status → `cancelled` (keeps quota until expiration)

### Test Resumption
1. Resume the cancelled subscription
2. Webhook sends `subscription_resumed`
3. User status → `active`

## Monitoring Webhooks

### Check LemonSqueezy Webhook Logs
1. Go to Webhooks → Your webhook
2. Click "Recent deliveries"
3. See all webhook attempts and responses

### Check Railway Logs
```bash
# In Railway dashboard, view deployment logs
# Look for these messages:
📨 Received LemonSqueezy event: subscription_created
✅ Created new user: testuser@halalify.com (creator plan)
```

## Testing Checklist

- [ ] Webhook URL configured in LemonSqueezy
- [ ] Webhook secret matches Railway env
- [ ] Created test subscription with test card
- [ ] User appears in MongoDB with correct plan
- [ ] Quota set correctly (300 for creator)
- [ ] Subscription history logged
- [ ] Tested cancellation
- [ ] Tested resumption

## Troubleshooting

### Webhook Not Received
- Check webhook URL is correct
- Verify secret matches
- Check Railway logs for errors
- Ensure Railway service is running

### User Not Created
- Check Railway logs for error messages
- Verify MongoDB connection
- Check variant ID mapping in tierConfig.js

### Wrong Plan Assigned
- Verify variant ID (1170913) is correct
- Check tierConfig.js mapping
- LemonSqueezy might have different variant IDs for test mode

## Next Steps After Testing

Once test subscription works:
1. ✅ Switch LemonSqueezy to live mode
2. ✅ Update webhook to use live secret
3. ✅ Test with real payment
4. ✅ Ready for production users!
