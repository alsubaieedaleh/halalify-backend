import express from 'express';
import { processChunk } from '../controllers/processController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Use upload.any() to handle multipart forms with or without files, 
// or allows requests without multipart/form-data to pass (depending on multer config)
// Better: just remove strict requirement or use .none() if no file expected?
// Safest: use upload.single('file') but catch error? No.
// Let's use upload.any() which accepts any files or none.
router.post('/process_chunk', authenticate, upload.any(), processChunk);
router.post('/track_usage', authenticate, processChunk); // Re-use logic but we'll optimize controller to skip processing if flag present? 
// Better: Create separate controller function 'trackUsage'

export default router;
