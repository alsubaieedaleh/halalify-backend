import User from '../models/userModel.js';
import UsageLog from '../models/usageLogModel.js';

/**
 * Track usage when user processes audio locally
 * Called from frontend after local processing completes
 */
export const trackUsage = async (req, res) => {
    const user = req.user; // Set by authenticate middleware
    const { minutes, videoId, videoTitle } = req.body;

    try {
        // Validate input
        if (!minutes || minutes <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid minutes required'
            });
        }

        // Check quota (Skip for unlimited)
        if (user.minutesTotal !== -1 && user.minutesRemaining < minutes) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient quota',
                minutesRemaining: user.minutesRemaining
            });
        }

        // Deduct usage and log atomically
        if (user.minutesTotal !== -1) {
            user.minutesRemaining -= minutes;
        }

        await user.save();

        // Log usage
        await UsageLog.create({
            userId: user._id,
            email: user.email,
            minutes: minutes,
            videoId: videoId,
            videoTitle: videoTitle,
            processedAt: new Date()
        });

        console.log(`✅ [Usage] Tracked ${minutes} minutes for ${user.email}`);

        res.json({
            success: true,
            minutesRemaining: user.minutesRemaining,
            minutesTotal: user.minutesTotal
        });

    } catch (error) {
        console.error('❌ [Usage] Error tracking usage:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track usage'
        });
    }
};
