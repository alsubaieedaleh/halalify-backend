import express from 'express';

const router = express.Router();

router.get('/checkStatus', (req, res) => {
    // In a real app, you might check DB connection or Redis status here
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

export default router;
