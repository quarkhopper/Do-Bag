import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';

const router = Router();

const TaskSchema = z.object({
  text: z.string().min(1),
  expected_duration: z.string().optional(),
  is_divisible: z.boolean().optional(),
  priority_hint: z.enum(['low', 'medium', 'high']).optional(),
});

// Get all tasks
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM tasks ORDER BY position ASC',
      []
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Create task
router.post('/', async (req, res, next) => {
  try {
    const task = TaskSchema.parse(req.body);
    const result = await query(
      `INSERT INTO tasks (text, expected_duration, is_divisible, priority_hint, position)
       VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks))
       RETURNING *`,
      [task.text, task.expected_duration, task.is_divisible, task.priority_hint]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Update task
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = TaskSchema.partial().parse(req.body);
    const result = await query(
      `UPDATE tasks
       SET text = COALESCE($1, text),
           expected_duration = COALESCE($2, expected_duration),
           is_divisible = COALESCE($3, is_divisible),
           priority_hint = COALESCE($4, priority_hint)
       WHERE id = $5
       RETURNING *`,
      [task.text, task.expected_duration, task.is_divisible, task.priority_hint, id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export const taskRouter = router; 