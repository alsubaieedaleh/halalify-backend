import express from 'express';
import User from '../models/userModel.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register/login endpoint for extension users
router.post('/auth/register', async (req, res) => {
    const { email } = req.body;

    console.log(`📧 Registration request for: ${email}`);

    try {
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Check if user already exists
        let user = await User.findOne({ email });

        if (user) {
            console.log(`✅ Existing user found: ${email}`);
            return res.json({
                success: true,
                userId: user._id,
                email: user.email,
                plan: user.plan,
                status: user.status,
                quota: {
                    minutesRemaining: user.minutesRemaining,
                    minutesTotal: user.minutesTotal
                }
            });
        }

        // Create new free tier user
        user = await User.create({
            email: email,
            lemonCustomerId: `free_${Date.now()}`, // Placeholder until they subscribe
            plan: 'free',
            status: 'active',
            minutesRemaining: 10,
            minutesTotal: 10,
            usageResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            // subscriptionId intentionally omitted - will be null (sparse index allows multiple nulls)
        });

        console.log(`✨ New free tier user created: ${email}`);

        res.json({
            success: true,
            userId: user._id,
            email: user.email,
            plan: user.plan,
            status: user.status,
            quota: {
                minutesRemaining: user.minutesRemaining,
                minutesTotal: user.minutesTotal
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            message: error.message
        });
    }
});

// Get current user info (requires userId)
router.get('/auth/me', async (req, res) => {
    const { userId } = req.query;

    try {
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            userId: user._id,
            email: user.email,
            plan: user.plan,
            status: user.status,
            quota: {
                minutesRemaining: user.minutesRemaining,
                minutesTotal: user.minutesTotal,
                usageResetDate: user.usageResetDate
            },
            subscription: {
                customerPortalUrl: user.customerPortalUrl
            }
        });

    } catch (error) {
        console.error('❌ Auth me error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user',
            message: error.message
        });
    }
});

// Google OAuth endpoint
router.post('/auth/google', async (req, res) => {
    const { accessToken } = req.body;

    // Legacy support: if client still sends manual data (email, etc), reject or handle gracefully
    // But for security we ONLY trust the token.

    if (!accessToken) {
        return res.status(400).json({
            success: false,
            error: 'Access Token is required'
        });
    }

    console.log(`🔐 Verifying Google Access Token...`);

    try {
        // 1. Verify token and get user info directly from Google
        const googleResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!googleResponse.ok) {
            throw new Error(`Google API returned ${googleResponse.status}`);
        }

        const googleUser = await googleResponse.json();

        // 2. Extract verified info
        const { email, id: googleId, name, picture } = googleUser;

        console.log(`✅ Token verified. User: ${email}`);

        // 3. Find or Create User
        let user = await User.findOne({
            $or: [{ email }, { googleId }]
        });

        if (user) {
            // Update existing user
            if (!user.googleId) {
                user.googleId = googleId;
                user.name = name;
                user.picture = picture;
                await user.save();
                console.log(`✅ Linked existing user to Google: ${email}`);
            } else {
                console.log(`✅ Existing Google user logged in: ${email}`);
            }
        } else {
            // Create new user
            user = await User.create({
                email: email,
                googleId: googleId,
                name: name,
                picture: picture,
                lemonCustomerId: `free_${Date.now()}`,
                plan: 'free',
                status: 'active',
                minutesRemaining: 10,
                minutesTotal: 10,
                usageResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            console.log(`✨ New Google user created: ${email}`);
        }

        // 4. Return Session
        res.json({
            success: true,
            userId: user._id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            plan: user.plan,
            status: user.status,
            quota: {
                minutesRemaining: user.minutesRemaining,
                minutesTotal: user.minutesTotal
            }
        });

    } catch (error) {
        console.error('❌ Google auth error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid Google Token',
            message: error.message
        });
    }
});

export default router;
