import User from '../models/userModel.js';
import UsageLog from '../models/usageLogModel.js';

// Get user status and usage information
export const getUserStatus = async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({
                status: 'error',
                message: 'user_id parameter required'
            });
        }

        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Get usage stats for current period
        const usageLogs = await UsageLog.find({
            userId: user._id,
            processedAt: { $gte: user.usageResetDate || new Date(0) }
        });

        const totalMinutesUsed = usageLogs.reduce((sum, log) => sum + log.minutesProcessed, 0);

        res.json({
            status: 'success',
            data: {
                email: user.email,
                plan: user.plan,
                status: user.status,
                usage: {
                    minutesRemaining: user.minutesRemaining,
                    minutesTotal: user.minutesTotal,
                    minutesUsed: totalMinutesUsed,
                    usagePercent: Math.round((totalMinutesUsed / user.minutesTotal) * 100)
                },
                subscription: {
                    resetDate: user.usageResetDate,
                    startDate: user.subscriptionStartDate,
                    endDate: user.subscriptionEndDate,
                    customerPortalUrl: user.customerPortalUrl
                }
            }
        });

    } catch (error) {
        console.error('Error in getUserStatus:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// Admin endpoint to reset monthly quotas
export const resetMonthlyQuotas = async (req, res) => {
    try {
        const now = new Date();

        // Find all users whose reset date has passed
        const result = await User.updateMany(
            {
                usageResetDate: { $lte: now },
                status: 'active'
            },
            [
                {
                    $set: {
                        minutesRemaining: '$minutesTotal', // Reset to tier limit
                        usageResetDate: {
                            $add: [new Date(), 30 * 24 * 60 * 60 * 1000] // 30 days from now
                        }
                    }
                }
            ]
        );

        console.log(`Reset quotas for ${result.modifiedCount} users`);

        res.json({
            status: 'success',
            message: `Reset quotas for ${result.modifiedCount} users`,
            data: {
                usersReset: result.modifiedCount
            }
        });

    } catch (error) {
        console.error('Error in resetMonthlyQuotas:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
