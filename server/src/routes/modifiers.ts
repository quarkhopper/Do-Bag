import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { ModifierRegistry } from '../models/modifiers';

export const modifiersRouter = Router();

// Apply auth middleware to all modifiers routes
modifiersRouter.use(authMiddleware);

// Schema validation
const TaskModifierSchema = z.object({
  modifier_id: z.string().uuid().optional(),
  modifier_type: z.string().min(1).optional(),
  value: z.record(z.any()).default({})
});

type TaskModifierInput = z.infer<typeof TaskModifierSchema>;

/**
 * GET /api/modifiers
 * List all available modifiers
 */
modifiersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      'SELECT id, name, description, type, config, created_at FROM modifiers ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/modifiers/types
 * List all registered modifier types
 */
modifiersRouter.get('/types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const types = ModifierRegistry.getAvailableTypes();
    res.json({
      types,
      count: types.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tasks/:taskId/modifiers
 * Get all modifiers for a task
 */
modifiersRouter.get('/tasks/:taskId/modifiers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthRequest;
    const { taskId } = req.params;

    // First verify task belongs to user
    const taskCheck = await query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Get all modifiers for the task with modifier info joined
    const result = await query(
      `SELECT 
        tm.id, 
        tm.task_id, 
        tm.modifier_id, 
        tm.value,
        tm.created_at,
        tm.updated_at,
        m.name as modifier_name,
        m.type as modifier_type,
        m.description as modifier_description,
        m.config as modifier_config
      FROM 
        task_modifiers tm
      JOIN 
        modifiers m ON tm.modifier_id = m.id
      WHERE
        tm.task_id = $1
      ORDER BY
        m.name`,
      [taskId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks/:taskId/modifiers
 * Add a modifier to a task
 */
modifiersRouter.post('/tasks/:taskId/modifiers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthRequest;
    const { taskId } = req.params;
    
    // Validate input
    const input = TaskModifierSchema.parse(req.body);

    // Verify task belongs to user
    const taskCheck = await query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // If modifier_id is provided, use directly
    // If modifier_type is provided, look up the modifier by type
    let modifierId = input.modifier_id;

    if (!modifierId && input.modifier_type) {
      const modifierResult = await query(
        'SELECT id FROM modifiers WHERE type = $1',
        [input.modifier_type]
      );
      
      if (modifierResult.rows.length === 0) {
        return res.status(404).json({ message: 'Modifier type not found' });
      }
      
      modifierId = modifierResult.rows[0].id;
    }

    if (!modifierId) {
      return res.status(400).json({ message: 'Either modifier_id or modifier_type must be provided' });
    }

    // Check if this modifier is already applied to the task
    const existingCheck = await query(
      'SELECT id FROM task_modifiers WHERE task_id = $1 AND modifier_id = $2',
      [taskId, modifierId]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Modifier already applied to this task' });
    }

    // Get the modifier type to validate value
    const modifierTypeResult = await query(
      'SELECT type FROM modifiers WHERE id = $1',
      [modifierId]
    );
    
    if (modifierTypeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Modifier not found' });
    }
    
    const modifierType = modifierTypeResult.rows[0].type;
    
    // Check if value is valid for this modifier type
    const modifierBehavior = ModifierRegistry.get(modifierType);
    
    if (modifierBehavior && !modifierBehavior.validateValue(input.value)) {
      return res.status(400).json({ 
        message: 'Invalid value for this modifier type',
        expectedFormat: modifierBehavior.getDefaultValue()
      });
    }

    // Add modifier to task
    const result = await query(
      `INSERT INTO task_modifiers (task_id, modifier_id, value) 
       VALUES ($1, $2, $3) 
       RETURNING id, task_id, modifier_id, value, created_at, updated_at`,
      [taskId, modifierId, JSON.stringify(input.value)]
    );
    
    // Return the new task modifier
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/tasks/:taskId/modifiers/:modifierId
 * Update a modifier value
 */
modifiersRouter.patch('/tasks/:taskId/modifiers/:modifierId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthRequest;
    const { taskId, modifierId } = req.params;
    
    // Validate input
    const input = TaskModifierSchema.parse(req.body);

    // Verify task belongs to user
    const taskCheck = await query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if the task modifier exists
    const existingModifier = await query(
      `SELECT tm.id, m.type 
       FROM task_modifiers tm 
       JOIN modifiers m ON tm.modifier_id = m.id 
       WHERE tm.task_id = $1 AND tm.modifier_id = $2`,
      [taskId, modifierId]
    );

    if (existingModifier.rows.length === 0) {
      return res.status(404).json({ message: 'Modifier not found for this task' });
    }
    
    const modifierType = existingModifier.rows[0].type;
    
    // Validate the value for this modifier type
    const modifierBehavior = ModifierRegistry.get(modifierType);
    
    if (modifierBehavior && !modifierBehavior.validateValue(input.value)) {
      return res.status(400).json({ 
        message: 'Invalid value for this modifier type',
        expectedFormat: modifierBehavior.getDefaultValue()
      });
    }

    // Update the task modifier
    const result = await query(
      `UPDATE task_modifiers 
       SET value = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE task_id = $2 AND modifier_id = $3 
       RETURNING id, task_id, modifier_id, value, created_at, updated_at`,
      [JSON.stringify(input.value), taskId, modifierId]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tasks/:taskId/modifiers/:modifierId
 * Remove a modifier from a task
 */
modifiersRouter.delete('/tasks/:taskId/modifiers/:modifierId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthRequest;
    const { taskId, modifierId } = req.params;

    // Verify task belongs to user
    const taskCheck = await query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Delete the task modifier
    const result = await query(
      'DELETE FROM task_modifiers WHERE task_id = $1 AND modifier_id = $2 RETURNING id',
      [taskId, modifierId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Modifier not found for this task' });
    }
    
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks/:taskId/modifiers/batch
 * Apply multiple modifiers to a task in a single request
 */
modifiersRouter.post('/tasks/:taskId/modifiers/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthRequest;
    const { taskId } = req.params;
    
    // Validate input - expect an array of modifier configs
    const batchInput = z.array(TaskModifierSchema).parse(req.body);
    
    // Verify task belongs to user
    const taskCheck = await query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Process each modifier in the batch
    const results = [];
    const errors = [];

    for (const modifierInput of batchInput) {
      try {
        // Similar logic as in the single modifier endpoint
        let modifierId = modifierInput.modifier_id;

        if (!modifierId && modifierInput.modifier_type) {
          const modifierResult = await query(
            'SELECT id FROM modifiers WHERE type = $1',
            [modifierInput.modifier_type]
          );
          
          if (modifierResult.rows.length === 0) {
            errors.push({ type: modifierInput.modifier_type, error: 'Modifier type not found' });
            continue;
          }
          
          modifierId = modifierResult.rows[0].id;
        }

        if (!modifierId) {
          errors.push({ input: modifierInput, error: 'Either modifier_id or modifier_type must be provided' });
          continue;
        }

        // Check if this modifier is already applied to the task
        const existingCheck = await query(
          'SELECT id FROM task_modifiers WHERE task_id = $1 AND modifier_id = $2',
          [taskId, modifierId]
        );

        // If exists, update instead of insert
        if (existingCheck.rows.length > 0) {
          const result = await query(
            `UPDATE task_modifiers 
             SET value = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE task_id = $2 AND modifier_id = $3 
             RETURNING id, task_id, modifier_id, value, created_at, updated_at`,
            [JSON.stringify(modifierInput.value), taskId, modifierId]
          );
          results.push(result.rows[0]);
          continue;
        }

        // Get the modifier type to validate value
        const modifierTypeResult = await query(
          'SELECT type FROM modifiers WHERE id = $1',
          [modifierId]
        );
        
        if (modifierTypeResult.rows.length === 0) {
          errors.push({ id: modifierId, error: 'Modifier not found' });
          continue;
        }
        
        const modifierType = modifierTypeResult.rows[0].type;
        
        // Check if value is valid for this modifier type
        const modifierBehavior = ModifierRegistry.get(modifierType);
        
        if (modifierBehavior && !modifierBehavior.validateValue(modifierInput.value)) {
          errors.push({ 
            type: modifierType, 
            error: 'Invalid value for this modifier type',
            expectedFormat: modifierBehavior.getDefaultValue() 
          });
          continue;
        }

        // Add modifier to task
        const result = await query(
          `INSERT INTO task_modifiers (task_id, modifier_id, value) 
           VALUES ($1, $2, $3) 
           RETURNING id, task_id, modifier_id, value, created_at, updated_at`,
          [taskId, modifierId, JSON.stringify(modifierInput.value)]
        );
        
        results.push(result.rows[0]);
      } catch (err) {
        errors.push({ input: modifierInput, error: (err as Error).message });
      }
    }
    
    // Return the results
    res.status(207).json({
      success: results.length > 0,
      results,
      errors: errors.length > 0 ? errors : undefined,
      total: batchInput.length,
      successful: results.length,
      failed: errors.length
    });
  } catch (err) {
    next(err);
  }
});