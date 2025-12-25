import { audioProcessor } from '../services/AudioProcessor.js';
import { storageService } from '../services/StorageService.js';
import { cacheService } from '../services/CacheService.js';
import crypto from 'crypto';

export const processChunk = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const { url, chunk_index, start_time, duration, classifier_mode, classifier_threshold } = req.body;
    const filePath = req.file.path;

    try {
        console.log(`Received chunk ${chunk_index} for URL: ${url}`);

        // Generate accurate cache key
        const rawKey = `${url}:${chunk_index}:${classifier_mode}:${classifier_threshold}`;
        const cacheKey = 'proc:' + crypto.createHash('md5').update(rawKey).digest('hex');

        // 1. Check Cache
        const cachedResult = await cacheService.get(cacheKey);
        if (cachedResult) {
            console.log(`Cache hit for ${cacheKey}`);
            // Clean up uploaded file immediately since we don't need it
            await storageService.deleteFile(filePath);
            return res.json({
                status: 'success',
                data: cachedResult,
                cached: true
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

        // 3. Cache Result (24 hrs)
        await cacheService.set(cacheKey, responseData, 86400);

        res.json({
            status: 'success',
            data: responseData
        });

    } catch (error) {
        console.error('Error in processChunk:', error);
        res.status(500).json({ status: 'error', message: error.message });
    } finally {
        // Cleanup uploaded file
        // In a real scenario, you might keep the processed file if it needs to be returned to user
        // For now, we clean up the input file.
        await storageService.deleteFile(filePath);
    }
};
