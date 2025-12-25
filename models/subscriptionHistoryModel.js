import mongoose from 'mongoose';

const subscriptionHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    lemonSubscriptionId: {
        type: String,
        required: true
    },
    tier: {
        type: String,
        enum: ['free', 'starter', 'creator', 'pro'],
        required: true
    },
    action: {
        type: String,
        enum: ['created', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'expired', 'resumed'],
        required: true
    },
    eventData: {
        type: mongoose.Schema.Types.Mixed, // Store raw webhook payload
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Index for history queries
subscriptionHistorySchema.index({ userId: 1, timestamp: -1 });

const SubscriptionHistory = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);

export default SubscriptionHistory;
