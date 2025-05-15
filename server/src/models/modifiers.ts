/**
 * Models and interfaces for the Task Modifiers system
 * 
 * This file defines the core types used by the modifiers system, which allows
 * task attributes to be extended dynamically through code rather than being
 * hardcoded in the Task interface.
 */

/**
 * Base interface for a modifier definition
 */
export interface Modifier {
  id: string;
  name: string;
  description: string | null;
  type: string;
  config: Record<string, any>;
  created_at: Date;
}

/**
 * Interface for a modifier applied to a specific task
 */
export interface TaskModifier {
  id: string;
  task_id: string;
  modifier_id: string;
  value: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface for the simplified Task entity with UUIDs
 * instead of direct attributes like expected_duration, is_divisible, etc.
 */
export interface Task {
  id: string;
  text: string;
  position: number;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  status: 'bag' | 'shelf';
}

/**
 * Interface that all modifier types must implement
 * to interact with the scheduling engine
 */
export interface ModifierBehavior {
  /**
   * Returns scheduling hints based on a task and its modifier value
   * @param task The task this modifier is applied to
   * @param value The modifier's value
   * @param schedule The current schedule state
   * @returns Scheduling hints that the engine can use
   */
  getSchedulingHints(task: Task, value: Record<string, any>, schedule: any): SchedulingHint[];
  
  /**
   * Validates a modifier value
   * @param value The value to validate
   * @returns Whether the value is valid for this modifier
   */
  validateValue(value: Record<string, any>): boolean;
  
  /**
   * Returns the default value for this modifier
   * @returns The default value
   */
  getDefaultValue(): Record<string, any>;
}

/**
 * Generic scheduling hint structure that informs the
 * scheduling engine about placement preferences
 */
export interface SchedulingHint {
  type: string;
  priority: number; // 0-100, higher numbers have more importance
  data: Record<string, any>; // Hint-specific data
}

/**
 * Registry to track available modifier types
 */
export class ModifierRegistry {
  private static modifiers = new Map<string, ModifierBehavior>();

  /**
   * Register a new modifier type
   */
  static register(type: string, behavior: ModifierBehavior): void {
    this.modifiers.set(type, behavior);
  }

  /**
   * Get a modifier behavior by type
   */
  static get(type: string): ModifierBehavior | undefined {
    return this.modifiers.get(type);
  }

  /**
   * Get all registered modifier types
   */
  static getAvailableTypes(): string[] {
    return Array.from(this.modifiers.keys());
  }
}