import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import cors from 'cors';

const app = express();

connectDB();
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true, 
}));
app.get('/', (req, res) => res.send('Hello from backend!'));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));