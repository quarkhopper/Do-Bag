/**
 * Priority Modifier
 * 
 * This modifier specifies the priority level of a task.
 * It provides scheduling hints about how important a task is.
 */
import { ModifierBehavior, Task, SchedulingHint } from '../../models/modifiers';

export class PriorityModifier implements ModifierBehavior {
  /**
   * Generate scheduling hints based on the task's priority
   */
  getSchedulingHints(task: Task, value: Record<string, any>, schedule: any): SchedulingHint[] {
    // Get priority level - default to 'medium' if not specified
    const priority = value.value || 'medium';
    
    // Map priority to a numerical value (0-100)
    const priorityValue = this.getPriorityValue(priority);
    
    return [{
      type: 'scheduling-priority',
      priority: priorityValue, // Use the priority value directly as the hint priority
      data: {
        level: priority,
        earlySchedulingPreference: priority === 'high',
        canDelay: priority === 'low'
      }
    }];
  }
  
  /**
   * Validate that the priority value is allowed
   */
  validateValue(value: Record<string, any>): boolean {
    // Check if value exists and is one of the allowed priority levels
    if (!value || !value.value) return false;
    
    return typeof value.value === 'string' && 
           ['low', 'medium', 'high'].includes(value.value);
  }
  
  /**
   * Provide a sensible default value for this modifier
   */
  getDefaultValue(): Record<string, any> {
    return { value: 'medium' };
  }
  
  /**
   * Convert a priority string to a numerical value
   * @param priority One of: 'low', 'medium', 'high'
   * @returns Priority value from 0-100
   */
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'high': return 90;
      case 'medium': return 60;
      case 'low': return 30;
      default: return 60; // Default to medium priority
    }
  }
}