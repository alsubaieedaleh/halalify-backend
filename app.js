import express from 'express';
import cors from 'cors';
import processRoutes from './routes/processRoutes.js';
import statusRoutes from './routes/statusRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import connectDB from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to Database
connectDB();

const app = express();
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
app.use('/uploads', express.static('uploads'));

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

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
