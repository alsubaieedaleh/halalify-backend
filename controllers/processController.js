import { audioProcessor } from '../services/AudioProcessor.js';
import { storageService } from '../services/StorageService.js';
import { cacheService } from '../services/CacheService.js';
import User from '../models/userModel.js';
import UsageLog from '../models/usageLogModel.js';
import crypto from 'crypto';

export const processChunk = async (req, res) => {
    // ⚡ FAST PATH: Track Usage Only (Frontend processed the file)
    if (req.path === '/track_usage' || req.body.trackOnly) {
        const { url, chunk_index, duration, user_id } = req.body;
        console.log(`📊 Tracking usage for User ${user_id}: ${duration}s`);

        try {
            const durationMinutes = parseFloat(duration) / 60 || 0;
            // Atomic update
            const updatedUser = await User.findByIdAndUpdate(
                user_id,
                { $inc: { minutesRemaining: -durationMinutes } },
                { new: true }
            );

            if (!updatedUser) return res.status(404).json({ status: 'error', message: 'User not found' });

            // Log it
            await UsageLog.create({
                userId: updatedUser._id,
                videoUrl: url,
                chunkIndex: chunk_index,
                minutesProcessed: durationMinutes,
                cached: false,
                classifierMode: 'native_host'
            });

            return res.json({
                status: 'success',
                usage: {
                    minutesUsed: durationMinutes,
                    minutesRemaining: updatedUser.minutesRemaining,
                    minutesTotal: updatedUser.minutesTotal
                }
            });
        } catch (e) {
            console.error('Track usage error:', e);
            return res.status(500).json({ status: 'error', message: e.message });
        }
    }

    // 🔧 IF NO FILE: Mock it! (Simulate server-side download)
    let filePath;
    let mockFileCreated = false;

    if (req.files && req.files.length > 0) {
        filePath = req.files[0].path;
    } else if (req.file) {
        filePath = req.file.path;
    } else {
        // Mock file creation for URL-only requests
        console.log(`⚠️ No file uploaded. Mocking download for URL: ${req.body.url}`);

        // Check if we have URL at least
        if (!req.body.url) {
            return res.status(400).json({ status: 'error', message: 'No file uploaded and no URL provided' });
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Use absolute path to match uploadMiddleware and express.static
        const path = await import('path');
        const uploadDir = path.default.join(process.cwd(), 'uploads');

        // Ensure absolute path is used for writing
        filePath = path.default.join(uploadDir, `mock-${uniqueSuffix}.mp3`);

        // Use relative path for URL generation later
        const relativePath = `uploads/mock-${uniqueSuffix}.mp3`;

        // Create dummy file with valid WAV header (1 second silence)
        try {
            const fs = await import('fs');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            // Minimal WAV header (44 byte) + silence
            const buffer = Buffer.from([
                0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
                0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
                0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00
            ]);
            fs.writeFileSync(filePath, buffer);
            mockFileCreated = true;

            // Update filePath variable to be the relative path for URL generation downstream?
            // Actually downstream code uses 'filePath' to generate URL.
            // URL generation logc: url: `https://${req.get('host')}/${filePath.replace(/\\/g, '/')}`
            // If filePath is absolute (/app/uploads/mock.mp3), URL will be https://host//app/uploads/mock.mp3 -> WRONG.
            // We need to keep 'filePath' as the logical file identifier, but write to 'absolutePath'.

            // Let's revert 'filePath' to relative path for downstream compatibility, 
            // but use 'absolutePath' for fs operations.
            var absolutePath = filePath; // Keep the absolute one we just made
            filePath = relativePath;     // Reset filePath to relative for URL generation block

        } catch (e) {
            console.error('Failed to create mock file:', e);
            return res.status(500).json({ status: 'error', message: 'Server failed to handle download' });
        }
    }

    const { url, chunk_index, start_time, duration, classifier_mode, classifier_threshold, user_id } = req.body;
    // const filePath is set above

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

            // ⚠️ DO NOT DELETE FILE YET - The frontend needs to download it!
            // await storageService.deleteFile(filePath); <-- REMOVED

            return res.json({
                status: 'success',
                data: {
                    ...cachedResult,
                    // 🔗 ALWAYS return the URL of the CURRENT file we just prepared/mocked
                    url: `${req.get('host').includes('localhost') ? 'http' : 'https'}://${req.get('host')}/${filePath.replace(/\\/g, '/')}`
                },
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
            ...result,
            // 🔗 Generate public URL for the file (Crucial for frontend download)
            // Smart Protocol: HTTP for localhost, HTTPS for production
            url: `${req.get('host').includes('localhost') ? 'http' : 'https'}://${req.get('host')}/${filePath.replace(/\\/g, '/')}`
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
