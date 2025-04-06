import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { taskRouter } from './routes/tasks';
import { authRouter } from './routes/auth';
import { errorHandler } from './middleware/errorHandler';
import { initializeDatabase } from './db';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://do-bag.vercel.app']
    : 'http://localhost:5173'
}));
app.use(express.json());

// Initialize database before starting the server
async function startServer() {
  try {
    await initializeDatabase();
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Routes
    app.use('/api/auth', authRouter);
    app.use('/api/tasks', taskRouter);

    // Error handling
    app.use(errorHandler);

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer(); 