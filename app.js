import express from 'express';
import cors from 'cors';
import processRoutes from './routes/processRoutes.js';
import statusRoutes from './routes/statusRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import connectDB from './config/db.js';
import dotenv from 'dotenv';
import { keepAliveService } from './services/KeepAliveService.js';

dotenv.config();

// Connect to Database
connectDB();

const app = express();
app.enable('trust proxy'); // 🛡️ Trust Railway/Heroku proxy for req.protocol
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow all origins for now, restrict in prod

// Capture raw body for webhook verification
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.use(express.urlencoded({ extended: true }));
// Serve static files from absolute path to match controller
import path from 'path';
const uploadsPath = path.join(process.cwd(), 'uploads');

app.use('/uploads', express.static(uploadsPath, {
    setHeaders: (res, path, stat) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin'); // 🛡️ Allow loading by other origins (extensions)
    }
}));

// Routes
app.use('/', processRoutes);
app.use('/', statusRoutes);
app.use('/', webhookRoutes);
app.use('/', userRoutes);
app.use('/', authRoutes);

// For now, simple health check at root
app.get('/', (req, res) => {
    res.send('Halalify Backend is running');
});

// 🛡️ Keep-Alive Statistics endpoint
app.get('/keep-alive-stats', (req, res) => {
    res.json(keepAliveService.getStats());
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // 🛡️ Start Keep-Alive Service
    keepAliveService.start();
});

export default app;

