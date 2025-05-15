/**
 * Task Modifiers API Client
 * 
 * This file provides helper functions for working with the task modifiers system.
 */

/**
 * Modifier type definitions 
 */
export interface Modifier {
  id: string;
  name: string;
  description: string | null;
  type: string;
  config: Record<string, any>;
  created_at: string;
}

export interface TaskModifier {
  id: string;
  task_id: string;
  modifier_id: string;
  value: Record<string, any>;
  created_at: string;
  updated_at: string;
  modifier_name?: string;
  modifier_type?: string;
  modifier_description?: string;
  modifier_config?: Record<string, any>;
}

/**
 * Get all available modifiers
 */
export async function getModifiers(): Promise<Modifier[]> {
  const response = await fetch('/api/modifiers');
  return response.json();
}

/**
 * Get all available modifier types
 */
export async function getModifierTypes(): Promise<string[]> {
  const response = await fetch('/api/modifiers/types');
  const data = await response.json();
  return data.types;
}

/**
 * Get all modifiers for a specific task
 */
export async function getTaskModifiers(taskId: string): Promise<TaskModifier[]> {
  const response = await fetch(`/api/tasks/${taskId}/modifiers`);
  return response.json();
}

/**
 * Add a modifier to a task
 */
export async function addModifierToTask(
  taskId: string, 
  modifierType: string, 
  value: Record<string, any>
): Promise<TaskModifier> {
  const response = await fetch(`/api/tasks/${taskId}/modifiers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      modifier_type: modifierType,
      value
    }),
  });
  return response.json();
}

/**
 * Update a task modifier value
 */
export async function updateTaskModifier(
  taskId: string, 
  modifierId: string, 
  value: Record<string, any>
): Promise<TaskModifier> {
  const response = await fetch(`/api/tasks/${taskId}/modifiers/${modifierId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value }),
  });
  return response.json();
}

/**
 * Remove a modifier from a task
 */
export async function removeModifierFromTask(taskId: string, modifierId: string): Promise<void> {
  await fetch(`/api/tasks/${taskId}/modifiers/${modifierId}`, {
    method: 'DELETE',
  });
}

/**
 * Apply multiple modifiers to a task in a single operation
 */
export async function applyModifiersToTask(
  taskId: string, 
  modifiers: Array<{
    modifier_type: string;
    value: Record<string, any>;
  }>
): Promise<{
  success: boolean;
  results: TaskModifier[];
  errors?: any[];
  total: number;
  successful: number;
  failed: number;
}> {
  const response = await fetch(`/api/tasks/${taskId}/modifiers/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(modifiers),
  });
  return response.json();
}

/**
 * Helper function to get a specific modifier for a task
 */
export async function getTaskModifierByType(
  taskId: string, 
  modifierType: string
): Promise<TaskModifier | undefined> {
  const modifiers = await getTaskModifiers(taskId);
  return modifiers.find(m => m.modifier_type === modifierType);
}

/**
 * Helper function to get a modifier value directly
 * Returns the value or undefined if the modifier doesn't exist
 */
export async function getTaskModifierValue<T = any>(
  taskId: string, 
  modifierType: string
): Promise<T | undefined> {
  const modifier = await getTaskModifierByType(taskId, modifierType);
  return modifier?.value?.value as T | undefined;
}

// Note: Removed hardcoded modifier-specific helper functions to follow the encapsulation principle.
// Generic functions like getModifierUIConfig, createModifierObject, etc. should be used instead.

/**
 * Get UI configuration for a specific modifier type
 * This helps the frontend build appropriate input controls
 */
export async function getModifierUIConfig(modifierType: string): Promise<Record<string, any> | undefined> {
  // First get all available modifiers
  const allModifiers = await getModifiers();
  
  // Find the specific modifier we're looking for
  const modifier = allModifiers.find(m => m.type === modifierType);
  
  // Return its config if found
  return modifier?.config;
}

/**
 * Get all available modifiers with their UI metadata
 * This can be used to dynamically build modifier selection and input interfaces
 */
export async function getModifiersWithUIMetadata(): Promise<Array<{
  id: string;
  name: string;
  description: string | null;
  type: string;
  config: Record<string, any>;
  uiComponent?: string;
  defaultValue?: any;
}>> {
  const modifiers = await getModifiers();
    // Enhance modifiers with default UI information based on their config
  return modifiers.map(modifier => {
    // Extract hints about UI components from the config
    let uiComponent = 'text'; // Default UI component
    let defaultValue;
    
    // Use the config to determine the appropriate UI component
    // This avoids hardcoding specific modifier types
    if (modifier.config) {
      if (modifier.config.inputType === 'select' && Array.isArray(modifier.config.options)) {
        uiComponent = 'select';
        defaultValue = modifier.config.defaultValue || modifier.config.options[0];
      } else if (modifier.config.inputType === 'toggle' || modifier.config.inputType === 'checkbox') {
        uiComponent = 'toggle';
        defaultValue = !!modifier.config.defaultValue;
      } else if (modifier.config.inputType === 'duration' || modifier.config.inputType === 'durationPicker') {
        uiComponent = 'durationPicker';
        defaultValue = modifier.config.defaultValue || '';      } else if (modifier.config.inputType === 'range' || modifier.config.inputType === 'slider') {
        uiComponent = 'slider';
        defaultValue = modifier.config.defaultValue || modifier.config.min || 0;
      } else {
        // Default form value if no specific type is recognized
        defaultValue = modifier.config.defaultValue || null;
      }
    }
    
    // Override with explicit UI metadata from the config if present
    if (modifier.config) {
      if (modifier.config.uiComponent) uiComponent = modifier.config.uiComponent;
      if (modifier.config.defaultValue !== undefined) defaultValue = modifier.config.defaultValue;
    }
    
    return {
      ...modifier,
      uiComponent,
      defaultValue
    };
  });
}

/**
 * Convert a form value to the proper structure for a modifier
 * @param modifierType The type of modifier
 * @param formValue The raw value from a form input
 */
export function createModifierValue(modifierType: string, formValue: any): Record<string, any> {
  // All modifiers currently use a standard { value: X } format
  // But this function allows for more complex transformations if needed
  return { value: formValue };
}

/**
 * Extract a form-friendly value from a modifier
 * @param modifier The modifier object
 */
export function extractFormValueFromModifier(modifier: TaskModifier): any {
  // Currently all our modifiers store their main value in the value.value property
  return modifier?.value?.value;
}

/**
 * Create a complete modifier object for API submission
 */
export function createModifierObject(modifierType: string, formValue: any): {
  modifier_type: string;
  value: Record<string, any>;
} {
  return {
    modifier_type: modifierType,
    value: createModifierValue(modifierType, formValue)
  };
}
