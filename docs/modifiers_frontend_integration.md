# Task Modifiers System - Frontend Integration

This document describes how to integrate with the new Task Modifiers System from the frontend.

## Overview

The Task Modifiers System replaces hardcoded task attributes with a dynamic, extensible system of "modifiers" that can be attached to tasks. This allows for:

1. Dynamic extension of task attributes without modifying the core Task entity
2. Consistent scheduling behavior across different attributes
3. Easy addition of new attributes in the future

## Key Changes for Frontend Integration

### 1. Task IDs and User IDs are now UUIDs

All Task IDs and User IDs throughout the system have been converted from integers to UUIDs. This affects:

- URL parameters for task routes
- Request/response bodies containing task or user IDs
- Local storage or any cached data referencing these IDs

### 2. Simplified Task Model

The Task model has been simplified and no longer contains these fields:
- `expected_duration`
- `is_divisible`
- `priority_hint`

The new Task model looks like:

```typescript
interface Task {
  id: string;  // UUID
  text: string;
  position: number;
  created_at: string;
  updated_at: string;
  user_id: string;  // UUID
  status: 'bag' | 'shelf';
}
```

### 3. Accessing Task Attributes via Modifiers

The former task attributes are now accessible through the modifiers API:

```typescript
// Example modifier value structure
interface TaskModifier {
  id: string;
  task_id: string;
  modifier_id: string;
  value: Record<string, any>;  // Modifier-specific values
  created_at: string;
  updated_at: string;
  
  // Joined fields from the modifiers table
  modifier_name?: string;
  modifier_type?: string;
  modifier_description?: string;
  modifier_config?: Record<string, any>;
}
```

## API Endpoints

### List All Modifiers

```
GET /api/modifiers
```

Returns all available modifier types in the system.

### Get Available Modifier Types 

```
GET /api/modifiers/types
```

Returns a list of available modifier type identifiers that can be used.

### Get Task Modifiers

```
GET /api/tasks/:taskId/modifiers
```

Returns all modifiers applied to a specific task.

### Add Modifier to Task

```
POST /api/tasks/:taskId/modifiers
```

Body:
```json
{
  "modifier_id": "uuid-of-modifier", 
  // OR
  "modifier_type": "duration",
  "value": {
    // Modifier-specific value format
    "value": "30m" 
  }
}
```

### Update Task Modifier

```
PATCH /api/tasks/:taskId/modifiers/:modifierId
```

Body:
```json
{
  "value": {
    // Updated value
    "value": "1h"
  }
}
```

### Delete Task Modifier

```
DELETE /api/tasks/:taskId/modifiers/:modifierId
```

### Batch Apply Modifiers

```
POST /api/tasks/:taskId/modifiers/batch
```

Body:
```json
[
  {
    "modifier_type": "duration",
    "value": { "value": "30m" }
  },
  {
    "modifier_type": "priority",
    "value": { "value": "high" }
  },
  {
    "modifier_type": "divisibility",
    "value": { "value": true }
  }
]
```

## Default Modifiers

The system includes these default modifiers:

### 1. Duration Modifier
- Type: `duration`
- Format: String like "30m" or "1.5h"
- Example: `{ "value": "30m" }`

### 2. Priority Modifier
- Type: `priority`
- Format: String enum: "low", "medium", "high"
- Example: `{ "value": "high" }`

### 3. Divisibility Modifier
- Type: `divisibility`
- Format: Boolean
- Example: `{ "value": true }`

## Example Usage

### Create a Task with Modifiers

1. Create the task:
```typescript
const taskResponse = await fetch('/api/tasks', {
  method: 'POST',
  body: JSON.stringify({
    text: 'New task'
  })
});
const task = await taskResponse.json();
```

2. Apply modifiers:
```typescript
await fetch(`/api/tasks/${task.id}/modifiers/batch`, {
  method: 'POST',
  body: JSON.stringify([
    {
      modifier_type: 'duration',
      value: { value: '1h' }
    },
    {
      modifier_type: 'priority',
      value: { value: 'high' }
    }
  ])
});
```

### Retrieve and Display Task with Modifiers

```typescript
const taskResponse = await fetch(`/api/tasks/${taskId}`);
const task = await taskResponse.json();

const modifiersResponse = await fetch(`/api/tasks/${taskId}/modifiers`);
const modifiers = await modifiersResponse.json();

// Find specific modifiers
const durationModifier = modifiers.find(m => m.modifier_type === 'duration');
const priorityModifier = modifiers.find(m => m.modifier_type === 'priority');

// Display task with modifiers
console.log(`Task: ${task.text}`);
console.log(`Duration: ${durationModifier?.value?.value || 'Not set'}`);
console.log(`Priority: ${priorityModifier?.value?.value || 'Not set'}`);
```
