import { audioProcessor } from '../services/AudioProcessor.js';
import { storageService } from '../services/StorageService.js';
import { cacheService } from '../services/CacheService.js';
import User from '../models/userModel.js';
import UsageLog from '../models/usageLogModel.js';
import crypto from 'crypto';

export const processChunk = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const { url, chunk_index, start_time, duration, classifier_mode, classifier_threshold, user_id } = req.body;
    const filePath = req.file.path;

    try {
        console.log(`Received chunk ${chunk_index} for URL: ${url}`);

        // 0. Get user and check quota (if user_id provided)
        let user = null;
        const durationMinutes = parseFloat(duration) / 60 || 0;

        if (user_id) {
            user = await User.findById(user_id);
            if (!user) {
                await storageService.deleteFile(filePath);
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid user ID'
                });
            }

            // Check if user has enough quota
            if (user.minutesRemaining < durationMinutes) {
                await storageService.deleteFile(filePath);
                return res.status(403).json({
                    status: 'error',
                    message: 'Quota exceeded',
                    usage: {
                        minutesRemaining: user.minutesRemaining,
                        minutesTotal: user.minutesTotal,
                        minutesNeeded: durationMinutes,
                        upgradeUrl: user.customerPortalUrl || 'https://your-store.lemonsqueezy.com'
                    }
                });
            }

            console.log(`User ${user.email} - Quota: ${user.minutesRemaining}/${user.minutesTotal} min`);
        }

        // Generate accurate cache key
        const rawKey = `${url}:${chunk_index}:${classifier_mode}:${classifier_threshold}`;
        const cacheKey = 'proc:' + crypto.createHash('md5').update(rawKey).digest('hex');

        // 1. Check Cache
        const cachedResult = await cacheService.get(cacheKey);
        if (cachedResult) {
            console.log(`Cache hit for ${cacheKey}`);

            // Still log usage even for cached results (optional - decide your policy)
            if (user) {
                await UsageLog.create({
                    userId: user._id,
                    videoUrl: url,
                    chunkIndex: chunk_index,
                    minutesProcessed: 0, // No minutes charged for cache hits
                    classifierMode: classifier_mode || 'auto',
                    classifierThreshold: classifier_threshold || '0.45',
                    cached: true
                });
            }

            // Clean up uploaded file immediately since we don't need it
            await storageService.deleteFile(filePath);
            return res.json({
                status: 'success',
                data: cachedResult,
                cached: true,
                usage: user ? {
                    minutesUsed: 0,
                    minutesRemaining: user.minutesRemaining,
                    minutesTotal: user.minutesTotal
                } : null
            });
        }

        // 2. Process
        const result = await audioProcessor.processChunk(filePath, {
            mode: classifier_mode || 'auto',
            threshold: classifier_threshold || '0.45'
        });

        const responseData = {
            chunk_index,
            ...result
        };

        // 3. Deduct usage and log (if user authenticated)
        if (user) {
            // ⚡ ATOMIC UPDATE: Use $inc to prevent race conditions during parallel processing
            const updatedUser = await User.findByIdAndUpdate(
                user._id,
                { $inc: { minutesRemaining: -durationMinutes } },
                { new: true } // Return the updated document
            );

            // Update local user object for response
            user.minutesRemaining = updatedUser.minutesRemaining;

            console.log(`Deducted ${durationMinutes} minutes. Remaining: ${user.minutesRemaining}`);

            // Log usage
            await UsageLog.create({
                userId: user._id,
                videoUrl: url,
                chunkIndex: chunk_index,
                minutesProcessed: durationMinutes,
                classifierMode: classifier_mode || 'auto',
                classifierThreshold: classifier_threshold || '0.45',
                cached: false
            });
        }

        // 4. Cache Result (24 hrs)
        await cacheService.set(cacheKey, responseData, 86400);

        res.json({
            status: 'success',
            data: responseData,
            usage: user ? {
                minutesUsed: durationMinutes,
                minutesRemaining: user.minutesRemaining,
                minutesTotal: user.minutesTotal
            } : null
        });

    } catch (error) {
        console.error('Error in processChunk:', error);
        res.status(500).json({ status: 'error', message: error.message });
    } finally {
        // Cleanup uploaded file
        await storageService.deleteFile(filePath);
    }
};
