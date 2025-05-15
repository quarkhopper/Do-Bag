# Task Modifiers System Implementation Plan

## Completed Steps

### 1. Database Schema Changes (May 13, 2025)
- Created migration file `006_task_modifiers_system.ts` to:
  - Convert Task IDs and User IDs from SERIAL to UUID for better portability
  - Create a new `modifiers` table to store different modifier types
  - Create a `task_modifiers` table to map tasks to modifiers with JSON values
  - Migrate existing task attributes (expected_duration, is_divisible, priority_hint) to the new modifiers system
  - Include rollback functionality in the down() method

### 2. Core Models and Interfaces
- Created `models/modifiers.ts` with:
  - `Modifier` interface for modifier definitions
  - `TaskModifier` interface for task-modifier mappings
  - `Task` interface simplified to remove hardcoded attributes
  - `ModifierBehavior` interface defining the contract for all modifier implementations
  - `SchedulingHint` interface for communicating with the scheduling engine
  - `ModifierRegistry` class to manage available modifiers

### 3. Dynamic Modifiers System
- Implemented a directory-based dynamic modifier system:
  - Created base structure in `server/src/modifiers/`
  - Created `modifiers/index.ts` with dynamic file discovery and registration
  - Implemented three initial modifiers in `modifiers/types/`:
    - `duration.ts`: Handles task duration information
    - `priority.ts`: Manages priority levels
    - `divisibility.ts`: Controls task segmentation

### 4. Application Integration
- Updated `server/src/index.ts` to import and register all modifiers at startup

## Completed (Continued)

### 5. API Endpoints for Modifiers (May 14, 2025)
- Created routes for modifier management (`server/src/routes/modifiers.ts`):
  - `GET /api/modifiers`: List all available modifiers
  - `GET /api/modifiers/types`: List registered modifier types
  - `GET /api/tasks/:taskId/modifiers`: Get all modifiers for a task
  - `POST /api/tasks/:taskId/modifiers`: Add a modifier to a task
  - `POST /api/tasks/:taskId/modifiers/batch`: Add multiple modifiers to a task at once
  - `PATCH /api/tasks/:taskId/modifiers/:modifierId`: Update a modifier value
  - `DELETE /api/tasks/:taskId/modifiers/:modifierId`: Remove a modifier from a task

### 6. Updated Task Routes (May 14, 2025)
- Updated `server/src/routes/tasks.ts` to:
  - Use UUIDs instead of numeric IDs
  - Modify task endpoints to handle the simplified task model without hardcoded modifiers
  - Removed references to obsolete fields (expected_duration, is_divisible, priority_hint)

### 7. Auth Middleware Updates (May 14, 2025)
- Updated `server/src/middleware/auth.ts` to change userId type from number to string for UUID compatibility
- Updated all references to userId in routes to use string type

### 8. Frontend Integration Documentation (May 14, 2025)
- Created `docs/modifiers_frontend_integration.md` with:
  - Details on the API changes
  - Examples of how to integrate with the new modifiers system
  - Information about the available modifiers and their expected value formats

## Next Steps

### 3. Frontend Updates (Medium Term)
- Update `client/src/api/tasks.ts` to work with UUIDs and the new modifiers system
- Create a new API client for modifiers
- Implement UI components for:
  - Displaying modifiers on tasks
  - Editing modifier values
  - Adding/removing modifiers

### 4. Scheduling Engine (Long Term)
- Implement a scheduling engine that:
  - Collects hints from all modifiers on a task
  - Analyzes hint compatibility and conflicts
  - Determines optimal task placement
  - Handles cases where user intervention is needed

### 5. Frontend Schedule View (Long Term)
- Create a schedule view component that:
  - Displays the generated schedule
  - Shows task placement with modifier influences
  - Allows manual adjustments when needed

## Implementation Priorities

1. **Finish Backend API Implementation**
   - Ensure database migrations work correctly
   - Complete modifier and task routes
   - Add comprehensive tests

2. **Update Frontend to Work with UUIDs**
   - Modify existing task interface to use string IDs
   - Update API calls to handle UUIDs

3. **Build Modifier UI Components**
   - Create dynamic UI for adding/editing modifiers
   - Implement per-modifier UI controls

4. **Develop Scheduling Engine**
   - Implement the hint collection system
   - Create scheduling algorithms that use hints

This implementation plan ensures a modular, extensible system where the scheduling engine is completely unaware of specific modifier types, letting us add new scheduling behaviors without changing core code.