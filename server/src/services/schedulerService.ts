/**
 * Task Scheduler Service
 * 
 * This service is responsible for scheduling tasks based on their modifiers.
 * It gathers position suggestions from all modifiers attached to a task,
 * and determines the final position through a simple voting mechanism.
 * 
 * The scheduler is completely agnostic to specific modifier types,
 * maintaining strict abstraction between the scheduler and modifiers.
 */
import { ModifierRegistry, Task, TaskModifier, SchedulingHint, ModifierBehavior } from '../models/modifiers';
import { query } from '../db';

/**
 * Service responsible for scheduling tasks based on modifiers
 */
export class SchedulerService {
  /**
   * Calculate a task's position based on its modifiers
   * 
   * @param task The task to schedule
   * @returns The calculated position for the task
   */
  async calculateTaskPosition(task: Task): Promise<number> {
    // First, gather all scheduling hints from the task's modifiers
    const hints = await this.getSchedulingHints(task);
    
    // Extract position suggestions from the hints
    const positions = this.getPositionSuggestions(hints);
    
    if (positions.length === 0) {
      // No positions suggested, use default position
      return await this.getDefaultPosition(task.user_id);
    }
    
    // Determine final position from suggested positions
    return this.resolvePosition(positions);
  }
  
  /**
   * Get scheduling hints for a task by consulting all its modifiers
   * 
   * @param task The task to get scheduling hints for
   * @returns Array of scheduling hints
   */
  private async getSchedulingHints(task: Task): Promise<SchedulingHint[]> {
    // Get all modifiers for this task
    const modifierEntries = await this.getTaskModifiers(task.id);
    
    if (!modifierEntries || modifierEntries.length === 0) {
      return [];
    }
    
    // Get scheduling context
    const context = await this.getScheduleContext(task.user_id);
    
    // Collect hints from all modifiers
    const hints: SchedulingHint[] = [];
    
    for (const entry of modifierEntries) {
      if (entry && entry.behavior && typeof entry.behavior.getSchedulingHints === 'function') {
        // Get hints from this modifier
        const modifierHints = await entry.behavior.getSchedulingHints(
          task,
          entry.modifier.value,
          context
        );
        
        if (modifierHints && Array.isArray(modifierHints)) {
          hints.push(...modifierHints);
        }
      }
    }
    
    return hints;
  }

  /**
   * Extract position suggestions from scheduling hints
   * 
   * @param hints The scheduling hints from all modifiers
   * @returns Array of position suggestions
   */
  private getPositionSuggestions(hints: SchedulingHint[]): number[] {
    const positions: number[] = [];
    
    // Process each hint to extract position suggestions
    for (const hint of hints) {
      // If the hint directly specifies a position
      if (hint.data && typeof hint.data.position === 'number') {
        positions.push(hint.data.position);
      }
      
      // If the hint specifies multiple suggested positions
      if (hint.data && Array.isArray(hint.data.suggestedPositions)) {
        for (const suggestion of hint.data.suggestedPositions) {
          if (typeof suggestion === 'number') {
            positions.push(suggestion);
          } else if (suggestion && typeof suggestion.position === 'number') {
            positions.push(suggestion.position);
          }
        }
      }
      
      // For position hint type
      if (hint.type === 'position' && hint.data && typeof hint.data.value === 'number') {
        positions.push(hint.data.value);
      }
    }
    
    return positions;
  }
  
  /**
   * Determine the final position from all position suggestions
   * 
   * @param positions Array of position suggestions
   * @returns The resolved position
   */
  private resolvePosition(positions: number[]): number {
    // Count occurrences of each position
    const positionCounts: Record<number, number> = {};
    
    // Count votes for each position
    for (const position of positions) {
      positionCounts[position] = (positionCounts[position] || 0) + 1;
    }
    
    // Find position(s) with the most votes
    let maxVotes = 0;
    let topPositions: number[] = [];
    
    for (const [posStr, count] of Object.entries(positionCounts)) {
      const position = parseInt(posStr);
      
      if (count > maxVotes) {
        // New highest vote count
        maxVotes = count;
        topPositions = [position];
      } else if (count === maxVotes) {
        // Tie in vote count, add to candidates
        topPositions.push(position);
      }
    }
    
    // If there are multiple top positions, choose the furthest future (highest) position
    return topPositions.length > 0 ? Math.max(...topPositions) : 1;
  }
    
  /**
   * Get all modifiers for a specific task with their corresponding behavior
   * 
   * @param taskId The ID of the task
   * @returns Array of objects containing task modifier and its corresponding behavior
   */
  private async getTaskModifiers(taskId: string): Promise<{ modifier: TaskModifier; behavior: ModifierBehavior }[]> {
    const result = await query(`
      SELECT tm.*, m.type as modifier_type
      FROM task_modifiers tm
      JOIN modifiers m ON tm.modifier_id = m.id
      WHERE tm.task_id = $1
    `, [taskId]);
    
    // Map the results to include the behavior
    return result.rows.map(row => {
      const behavior = ModifierRegistry.get(row.modifier_type);
      if (!behavior) {
        console.warn(`Unknown modifier type: ${row.modifier_type}`);
        return null;
      }
      return {
        modifier: {
          id: row.id,
          task_id: row.task_id,
          modifier_id: row.modifier_id,
          value: row.value,
          created_at: row.created_at,
          updated_at: row.updated_at
        },
        behavior: behavior
      };
    }).filter(item => item !== null);
  }
  
  /**
   * Get context for scheduling calculations
   * 
   * @param userId The user ID to get tasks for
   * @returns Schedule context object
   */
  private async getScheduleContext(userId: string): Promise<any> {
    // Get all active tasks for the user (non-templates)
    const result = await query(`
      SELECT t.*, json_agg(
        json_build_object(
          'id', tm.id, 
          'modifier_id', tm.modifier_id, 
          'modifier_type', m.type,
          'value', tm.value
        )
      ) as modifiers
      FROM tasks t
      LEFT JOIN task_modifiers tm ON t.id = tm.task_id
      LEFT JOIN modifiers m ON tm.modifier_id = m.id
      WHERE t.user_id = $1 AND (t.is_template = false OR t.is_template IS NULL)
      GROUP BY t.id
      ORDER BY t.position ASC
    `, [userId]);
    
    return {
      tasks: result.rows,
      currentTime: new Date()
    };
  }
  
  /**
   * Get the default position for a new task
   * 
   * @param userId The user ID to get tasks for
   * @returns Default position (after the last task)
   */
  private async getDefaultPosition(userId: string): Promise<number> {
    const result = await query(`
      SELECT MAX(position) + 1 as next_position
      FROM tasks 
      WHERE user_id = $1 AND (is_template = false OR is_template IS NULL) AND status = 'bag'
    `, [userId]);
    
    return result.rows[0]?.next_position || 1;
  }
}

// Export a singleton instance
export const schedulerService = new SchedulerService();
