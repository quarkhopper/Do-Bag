/**
 * Divisibility Modifier
 * 
 * This modifier specifies whether a task can be divided into smaller segments.
 * It provides scheduling hints about how flexible a task is in terms of scheduling.
 */
import { ModifierBehavior, Task, SchedulingHint } from '../../models/modifiers';

export class DivisibilityModifier implements ModifierBehavior {
  /**
   * Generate scheduling hints based on whether the task is divisible
   */
  getSchedulingHints(task: Task, value: Record<string, any>, schedule: any): SchedulingHint[] {
    // Get divisibility value - default to false if not specified
    const isDivisible = value.value === true;
    
    // Get minimum segment duration if specified (default to 15 minutes)
    const minSegmentMinutes = value.minSegmentMinutes || 15;
    
    return [{
      type: 'segmentation-option',
      priority: 50, // Medium priority as this is a flexibility option
      data: {
        isDivisible,
        minSegmentMinutes,
        preferContiguous: true, // Prefer contiguous time even if divisible
        maxSegments: isDivisible ? (value.maxSegments || 3) : 1
      }
    }];
  }
  
  /**
   * Validate that the divisibility value is correctly formatted
   */
  validateValue(value: Record<string, any>): boolean {
    // Check if value exists with appropriate type
    if (!value || typeof value.value !== 'boolean') return false;
    
    // If divisible, check for additional parameters
    if (value.value === true) {
      // If minSegmentMinutes is provided, it must be a positive number
      if (value.minSegmentMinutes !== undefined && 
          (typeof value.minSegmentMinutes !== 'number' || value.minSegmentMinutes <= 0)) {
        return false;
      }
      
      // If maxSegments is provided, it must be a positive integer
      if (value.maxSegments !== undefined && 
          (typeof value.maxSegments !== 'number' || value.maxSegments <= 0 || !Number.isInteger(value.maxSegments))) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Provide a sensible default value for this modifier
   */
  getDefaultValue(): Record<string, any> {
    return { 
      value: false,
      minSegmentMinutes: 15,
      maxSegments: 3
    };
  }
}