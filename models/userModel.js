import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    lemonCustomerId: {
        type: String,
        required: true,
        unique: true
    },
    subscriptionId: {
        type: String,
        unique: true
    },
    customerPortalUrl: {
        type: String
    },
    plan: {
        type: String,
        enum: ['free', 'premium'],
        default: 'free'
    },
    status: {
        type: String, // e.g., 'active', 'cancelled', 'expired'
        default: 'active'
    },
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
