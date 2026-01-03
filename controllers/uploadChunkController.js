import { v4 as uuidv4 } from 'uuid';
import { replicateService } from '../services/ReplicateService.js';
import { chunkStatusService } from '../services/ChunkStatusService.js';
import { storageService } from '../services/StorageService.js';
import User from '../models/userModel.js';
import UsageLog from '../models/usageLogModel.js';
import path from 'path';

/**
 * Upload Chunk Controller
 * Handles file uploads from Native Host, processes via Replicate AI
 */

/**
 * POST /upload_chunk
 * Receives audio file from Native Host and queues for processing
 */
export const uploadChunk = async (req, res) => {
    const startTime = Date.now();
    
    try {
        // 1. Validate file
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }

        const { chunk_index, duration } = req.body;
        const chunkIndex = parseInt(chunk_index) || 0;
        const filePath = req.file.path;
        const fileSize = req.file.size;
        const durationMinutes = (parseFloat(duration) || 0) / 60;

        console.log(`📥 [Upload] Chunk ${chunkIndex}: Received ${(fileSize / 1024).toFixed(1)} KB, Duration: ${durationMinutes.toFixed(2)} min`);

        // 🔐 ATOMIC QUOTA CHECK + DEDUCT: Prevents race condition with parallel chunks
        let updatedUser = req.user;
        if (req.user && req.user.minutesTotal !== -1 && durationMinutes > 0) {  // -1 = unlimited
            const result = await User.findOneAndUpdate(
                { 
                    _id: req.user._id, 
                    minutesRemaining: { $gte: durationMinutes }  // Only if enough quota
                },
                { 
                    $inc: { minutesRemaining: -durationMinutes } 
                },
                { new: true }
            );
            
            if (!result) {
                // Quota insufficient - atomic operation failed
                console.log(`❌ [Quota] User ${req.user.email}: Insufficient quota (atomic check failed)`);
                await storageService.deleteFile(filePath);
                
                // Fetch current balance for error response
                const currentUser = await User.findById(req.user._id);
                return res.status(403).json({
                    status: 'error',
                    message: 'quota_exceeded',
                    minutesRemaining: currentUser?.minutesRemaining || 0,
                    minutesTotal: currentUser?.minutesTotal || 0
                });
            }
            
            updatedUser = result;
            console.log(`✅ [Quota] User ${req.user.email}: Deducted ${durationMinutes.toFixed(2)} min, Remaining: ${result.minutesRemaining.toFixed(2)}`);
        }

        // 2. Generate unique chunk key
        const chunkKey = `${chunkIndex}_${uuidv4().slice(0, 8)}`;

        // 3. Set initial status
        chunkStatusService.set(chunkKey, {
            status: 'processing',
            progress: 10,
            chunk_index: chunkIndex
        });

        // 4. Process in background (don't await) - pass updatedUser, no need to deduct again
        processChunkBackground(chunkKey, filePath, chunkIndex, updatedUser, parseFloat(duration) || 0, req);

        // 5. Return immediately with chunk_key for polling + updated quota
        return res.json({
            status: 'processing',
            chunk_key: chunkKey,
            chunk_index: chunkIndex,
            minutesRemaining: updatedUser?.minutesRemaining
        });

    } catch (error) {
        console.error(`❌ [Upload] Error:`, error);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

/**
 * Background processing function
 */
async function processChunkBackground(chunkKey, filePath, chunkIndex, user, duration, req) {
    try {
        // Update status
        chunkStatusService.update(chunkKey, {
            status: 'processing',
            progress: 30
        });

        // 1. Process audio via Replicate
        console.log(`🎵 [Process] Chunk ${chunkIndex}: Sending to Replicate...`);
        const result = await replicateService.processAudio(filePath);

        // 2. Generate download URL
        const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
        const downloadUrl = `${baseUrl}/uploads/${result.filename}`;

        // 3. Log usage (deduction already done atomically in uploadChunk)
        if (user && duration > 0) {
            const durationMinutes = duration / 60;
            
            await UsageLog.create({
                userId: user._id,
                videoUrl: 'native://local',
                chunkIndex: chunkIndex,
                minutesProcessed: durationMinutes,
                cached: false
            });

            console.log(`📊 [Usage] Logged ${durationMinutes.toFixed(2)} min for user ${user.email}`);
        }

        // 4. Update status to ready
        chunkStatusService.set(chunkKey, {
            status: 'ready',
            progress: 100,
            url: downloadUrl,
            chunk_index: chunkIndex,
            created_at: Date.now()
        });

        console.log(`✅ [Process] Chunk ${chunkIndex}: Ready at ${downloadUrl}`);

        // 5. Cleanup original uploaded file
        await storageService.deleteFile(filePath);

    } catch (error) {
        console.error(`❌ [Process] Chunk ${chunkIndex} failed:`, error);
        
        chunkStatusService.set(chunkKey, {
            status: 'error',
            error: error.message,
            chunk_index: chunkIndex
        });

        // Cleanup on error
        await storageService.deleteFile(filePath);
    }
}

/**
 * GET /chunk_status/:chunkKey
 * Returns the current status of a chunk
 */
export const getChunkStatus = async (req, res) => {
    const { chunkKey } = req.params;

    const status = chunkStatusService.get(chunkKey);

    if (!status) {
        return res.status(404).json({
            status: 'error',
            message: 'Chunk not found'
        });
    }

    return res.json(status);
};
