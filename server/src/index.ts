import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { taskRouter } from './routes/tasks';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tasks', taskRouter);

// Error handling
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 