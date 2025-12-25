import express from 'express';
import { processChunk } from '../controllers/processController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/process_chunk', authenticate, upload.single('file'), processChunk);

export default router;
