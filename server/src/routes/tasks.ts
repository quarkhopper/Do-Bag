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
  status: z.enum(['bag', 'shelf']).optional(),
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

// Update POST to include user_id and status
taskRouter.post('/', (async (req, res, next) => {
  try {
    const { userId } = req as AuthRequest;
    const task = TaskSchema.parse(req.body) as TaskInput;
    const result = await query(
      `INSERT INTO tasks (text, expected_duration, is_divisible, priority_hint, position, user_id, status)
       VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks WHERE user_id = $5), $5, $6)
       RETURNING *`,
      [task.text, task.expected_duration, task.is_divisible, task.priority_hint, userId, task.status || 'bag']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}) as AuthRequestHandler);

// Update PATCH to verify ownership and include status updates
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
           priority_hint = COALESCE($4, priority_hint),
           status = COALESCE($5, status)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [task.text, task.expected_duration, task.is_divisible, task.priority_hint, task.status, id, userId]
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

// Add endpoint to update task position (for drag and drop)
taskRouter.patch('/:id/position', (async (req, res, next) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const { position } = req.body;
    
    if (typeof position !== 'number') {
      res.status(400).json({ message: 'Position must be a number' });
      return;
    }
    
    const result = await query(
      `UPDATE tasks SET position = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [position, id, userId]
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

// Add DELETE endpoint
taskRouter.delete('/:id', (async (req, res, next) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    
    const result = await query(
      `DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}) as AuthRequestHandler); 