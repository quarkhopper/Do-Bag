/**
 * Duration Modifier
 * 
 * This modifier specifies the expected duration of a task.
 * It provides scheduling hints about how much time a task requires.
 */
import { ModifierBehavior, Task, SchedulingHint } from '../../models/modifiers';

export class DurationModifier implements ModifierBehavior {
  /**
   * Generate scheduling hints based on the task's duration
   */
  getSchedulingHints(task: Task, value: Record<string, any>, schedule: any): SchedulingHint[] {
    // Parse the duration value - default to 30 minutes if not specified
    const durationMinutes = this.parseDuration(value.value || '30m');
    
    return [{
      type: 'time-requirement',
      priority: 80, // Higher priority as duration is a critical constraint
      data: {
        durationMinutes,
        mustFit: true // The task must fit within its allocated time slot
      }
    }];
  }
  
  /**
   * Validate that the duration value is in correct format
   */
  validateValue(value: Record<string, any>): boolean {
    // Check if value exists and is properly formatted
    if (!value || !value.value) return false;
    
    // Accept strings like "30m", "1h", "1.5h"
    return typeof value.value === 'string' && 
           /^(\d+|\d+\.\d+)[mh]$/.test(value.value);
  }
  
  /**
   * Provide a sensible default value for this modifier
   */
  getDefaultValue(): Record<string, any> {
    return { value: '30m' };
  }
  
  /**
   * Convert a duration string to minutes
   * @param duration Format examples: "30m", "1.5h"
   * @returns Duration in minutes
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+|\d+\.\d+)([mh])$/);
    if (!match) return 30; // Default to 30 minutes
    
    const [_, value, unit] = match;
    return unit === 'h' ? parseFloat(value) * 60 : parseFloat(value);
  }
}