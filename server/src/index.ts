// @ts-ignore
import express from 'express';
// @ts-ignore
import cors from 'cors';
// @ts-ignore
import dotenv from 'dotenv';
// @ts-ignore
import { Pool } from 'pg';
import { taskRouter } from './routes/tasks';
import { authRouter } from './routes/auth';
import { modifiersRouter } from './routes/modifiers';
import { errorHandler } from './middleware/errorHandler';
import { initializeDatabase } from './db';
import { initializeEmailService } from './services/emailService';
// Import modifiers to ensure they are registered at startup
import './modifiers';

// Add Node.js type support
// @ts-ignore
declare const process: any;

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
    // Initialize database connection
    await initializeDatabase();
    
    // Initialize email service
    await initializeEmailService();
      // Health check endpoint
    app.get('/health', (req: express.Request, res: express.Response) => {
      res.json({ status: 'ok' });
    });// Routes
    app.use('/api/auth', authRouter);
    app.use('/api/tasks', taskRouter);
    app.use('/api/modifiers', modifiersRouter);

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