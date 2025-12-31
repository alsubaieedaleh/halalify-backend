import express from 'express';
import { processChunk } from '../controllers/processController.js';
import { uploadChunk, getChunkStatus } from '../controllers/uploadChunkController.js';
import { trackUsage } from '../controllers/usageController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Existing routes
router.post('/process_chunk', authenticate, upload.any(), processChunk);
router.post('/track_usage', authenticate, trackUsage);

// ========================================
// 📁 NATIVE HOST ROUTES (NEW)
// ========================================

// POST /upload_chunk - Receive file from Native Host
// Protected with authentication
router.post('/upload_chunk', authenticate, upload.single('file'), uploadChunk);

// GET /chunk_status/:chunkKey - Poll for processing status
router.get('/chunk_status/:chunkKey', getChunkStatus);

export default router;

