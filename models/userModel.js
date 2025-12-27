import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    lemonCustomerId: {
        type: String,
        required: true,
        unique: true
    },
    subscriptionId: {
        type: String,
        unique: true,
        sparse: true // Allow multiple nulls
    },
    customerPortalUrl: {
        type: String
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true // Allow users without Google auth
    },
    name: {
        type: String
    },
    picture: {
        type: String
    },
    plan: {
        type: String,
        enum: ['free', 'starter', 'creator', 'pro'],
        default: 'free'
    },
    status: {
        type: String,
        enum: ['active', 'cancelled', 'expired', 'paused'],
        default: 'active'
    },
    // Usage Tracking
    minutesRemaining: {
        type: Number,
        default: 10 // Free tier gets 10 minutes
    },
    minutesTotal: {
        type: Number,
        default: 10
    },
    usageResetDate: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    },
    // Subscription Dates
    subscriptionStartDate: {
        type: Date
    },
    subscriptionEndDate: {
        type: Date
    },
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// If we are not connecting to a real DB yet, this might throw if we try to use it.
// Assuming the user will configure DB connection in app.js or similar.
const User = mongoose.model('User', userSchema);

export default User;
