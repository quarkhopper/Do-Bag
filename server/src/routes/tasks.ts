import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const taskRouter = Router();

// Apply auth middleware to all task routes
taskRouter.use(authMiddleware);

const TaskSchema = z.object({
  text: z.string().min(1),
  expected_duration: z.string().optional(),
  is_divisible: z.boolean().optional(),
  priority_hint: z.enum(['low', 'medium', 'high']).optional(),
});

type TaskInput = z.infer<typeof TaskSchema>;

// Helper type for route handlers
type AuthRequestHandler = RequestHandler<any, any, any, any, { userId: number }>;

// Update GET tasks to only return user's tasks
taskRouter.get('/', (async (req, res, next) => {
  try {
    const { userId } = req as AuthRequest;
    const result = await query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY position ASC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}) as AuthRequestHandler);

// Update POST to include user_id
taskRouter.post('/', (async (req, res, next) => {
  try {
    const { userId } = req as AuthRequest;
    const task = TaskSchema.parse(req.body) as TaskInput;
    const result = await query(
      `INSERT INTO tasks (text, expected_duration, is_divisible, priority_hint, position, user_id)
       VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks WHERE user_id = $5), $5)
       RETURNING *`,
      [task.text, task.expected_duration, task.is_divisible, task.priority_hint, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}) as AuthRequestHandler);

// Update PATCH to verify ownership
taskRouter.patch('/:id', (async (req, res, next) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const task = TaskSchema.partial().parse(req.body) as Partial<TaskInput>;
    const result = await query(
      `UPDATE tasks
       SET text = COALESCE($1, text),
           expected_duration = COALESCE($2, expected_duration),
           is_divisible = COALESCE($3, is_divisible),
           priority_hint = COALESCE($4, priority_hint)
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [task.text, task.expected_duration, task.is_divisible, task.priority_hint, id, userId]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}) as AuthRequestHandler); 