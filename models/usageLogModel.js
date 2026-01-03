import mongoose from 'mongoose';

const usageLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    videoUrl: {
        type: String,
        required: true
    },
    chunkIndex: {
        type: Number,
        required: true
    },
    minutesProcessed: {
        type: Number,
        required: true
    },

    cached: {
        type: Boolean,
        default: false
    },
    processedAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Index for analytics queries
usageLogSchema.index({ userId: 1, processedAt: -1 });

const UsageLog = mongoose.model('UsageLog', usageLogSchema);

export default UsageLog;
