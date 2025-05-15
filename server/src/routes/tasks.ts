// @ts-ignore
import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
// @ts-ignore
import { z } from 'zod';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const taskRouter = Router();

// Apply auth middleware to all task routes
taskRouter.use(authMiddleware);

// Updated Task Schema with template fields
const TaskSchema = z.object({
  text: z.string().min(1),
  status: z.enum(['bag', 'shelf']).optional(),
  is_template: z.boolean().optional(),
});

type TaskInput = z.infer<typeof TaskSchema>;

// Helper type for route handlers
type AuthRequestHandler = RequestHandler<any, any, any, any, { userId: string }>;

// Update GET tasks to handle templates and regular tasks
taskRouter.get('/', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthRequest;
    const { templates } = req.query;
    
    let queryText: string;
    
    if (templates === 'true') {
      // Return only templates
      queryText = `
        SELECT t.*, 
          (SELECT COUNT(*) FROM tasks WHERE template_id = t.id) AS usage_count 
        FROM tasks t 
        WHERE t.user_id = $1 AND t.is_template = true 
        ORDER BY t.position ASC
      `;
    } else if (templates === 'false') {
      // Return only non-templates
      queryText = `
        SELECT t.*, 
          (SELECT row_to_json(template) FROM (SELECT * FROM tasks WHERE id = t.template_id) AS template) AS template_info
        FROM tasks t 
        WHERE t.user_id = $1 AND (t.is_template = false OR t.is_template IS NULL)
        ORDER BY t.position ASC
      `;
    } else {
      // Return all tasks with a flag indicating if they're a template
      queryText = `
        SELECT t.*,
          CASE
            WHEN t.is_template = true THEN (SELECT COUNT(*) FROM tasks WHERE template_id = t.id)
            ELSE NULL
          END AS usage_count,
          CASE
            WHEN t.template_id IS NOT NULL THEN (SELECT row_to_json(template) FROM (SELECT * FROM tasks WHERE id = t.template_id) AS template)
            ELSE NULL
          END AS template_info
        FROM tasks t
        WHERE t.user_id = $1
        ORDER BY t.is_template DESC, t.position ASC
      `;
    }
    
    const result = await query(queryText, [userId]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}) as AuthRequestHandler);

// Update POST to handle template creation
taskRouter.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthRequest;
    const task = TaskSchema.parse(req.body) as TaskInput;
    
    // If the task is a template or status is 'shelf', set is_template to true
    const isTemplate = task.is_template === true || task.status === 'shelf';
    
    const result = await query(
      `INSERT INTO tasks (text, position, user_id, status, is_template)
       VALUES ($1, 
              (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks WHERE user_id = $2 AND (is_template = $3)), 
              $2, $4, $3)
       RETURNING *`,
      [task.text, userId, isTemplate, task.status || (isTemplate ? 'shelf' : 'bag')]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}) as AuthRequestHandler);

// Update PATCH to verify ownership and include status updates, without modifier fields
taskRouter.patch('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    const task = TaskSchema.partial().parse(req.body) as Partial<TaskInput>;
    const result = await query(
      `UPDATE tasks
       SET text = COALESCE($1, text),
           status = COALESCE($2, status)
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [task.text, task.status, id, userId]
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
taskRouter.patch('/:id/position', (async (req: Request, res: Response, next: NextFunction) => {
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

// Add endpoint to instantiate a task from a template
taskRouter.post('/:id/instantiate', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    
    // First, check if the template exists and belongs to the user
    const templateResult = await query(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2 AND is_template = true`,
      [id, userId]
    );
    
    if (templateResult.rows.length === 0) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }
    
    const template = templateResult.rows[0];
    
    // Create a new task instance from the template
    const taskResult = await query(
      `INSERT INTO tasks (text, position, user_id, status, is_template, template_id)
       VALUES ($1, (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks WHERE user_id = $2 AND status = 'bag'), $2, 'bag', false, $3)
       RETURNING *`,
      [template.text, userId, id]
    );
    
    const newTask = taskResult.rows[0];
    
    // Copy all modifiers from the template to the new task instance
    await query(
      `INSERT INTO task_modifiers (task_id, modifier_id, value)
       SELECT $1, modifier_id, value 
       FROM task_modifiers 
       WHERE task_id = $2`,
      [newTask.id, id]
    );
    
    // Return the new task with its modifiers
    const result = await query(
      `SELECT t.*, json_agg(
        json_build_object(
          'id', tm.id, 
          'modifier_id', tm.modifier_id, 
          'value', tm.value
        )
      ) as modifiers
      FROM tasks t
      LEFT JOIN task_modifiers tm ON t.id = tm.task_id
      WHERE t.id = $1
      GROUP BY t.id`,
      [newTask.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}) as AuthRequestHandler);

// Add DELETE endpoint
taskRouter.delete('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthRequest;
    const { id } = req.params;
    
    // For templates, we should check they aren't in use before deletion
    const checkUsage = await query(
      `SELECT COUNT(*) FROM tasks WHERE template_id = $1 AND user_id = $2`,
      [id, userId]
    );
    
    if (parseInt(checkUsage.rows[0].count) > 0) {
      res.status(400).json({ message: 'Cannot delete template that is in use by tasks' });
      return;
    }
    
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
