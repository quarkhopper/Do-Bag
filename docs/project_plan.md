## 📘 **DoBag – Project Plan (Live Draft)**

---

### 1. **Project Overview**

**DoBag** is a browser-based scheduling tool designed to let users freely throw todos into a big bag — no upfront structure required. It watches how users interact with their tasks (especially through dragging and rearranging), and builds a hidden, intelligent model of task relationships, constraints, and resources. The system asks smart questions, suggests helpful structure, and respects uncertainty — it never assumes it fully understands the user's intent.

DoBag is focused on the **current day**. Instead of managing recurring tasks or long-term planning, it maintains a single "**day bag**" containing all tasks relevant to the day ahead. This encourages presence, prioritization, and adaptability.

---

### 2. **UX Philosophy**

- **Freeform first**: Users can add tasks with no structure, tags, or categories required.
- **Structure emerges**: The system builds its own model over time by observing patterns.
- **Frictionless rearrangement**: Drag-and-drop is the primary way users shape their bag.
- **AI doesn’t pretend to be a mind reader**: It asks questions, infers cautiously, and surfaces structure only when helpful.
- **Invisible complexity**: The user experiences simplicity; the system maintains hidden structure.
- **One-day focus**: Users interact with a single "day bag" of tasks, not a calendar or long-term planner.

---

### 3. **Task Model**

Each task is a structured unit with the following properties:

#### 3.1. **User-Defined Properties**
- `text`: freeform task description
- `expected_duration`: time estimate (e.g. 30 min, 1 hr)
- `is_divisible`: can this be split across multiple work sessions?
- `priority_hint`: optional (low / medium / high)

#### 3.2. **System-Inferred Metadata (Hidden from user initially)**
- `inferred_grouping`: clustered with similar tasks
- `last_successful_time`: when user last completed a similar task
- `energy_cost`: estimated from past behavior
- `interruption_penalty`: score for how badly this task breaks when interrupted
- `required_resources`: list of resources needed (e.g., oven, laptop, focus)
- `can_overlap`: derived from resource usage; tasks can run in parallel if non-competing
- `preconditions`: inferred setup tasks that must complete before this task can begin (e.g., "print report" before "review report")

---

### 4. **Interruptions and Adaptive Scheduling**

When a user presses the **"Interrupted"** button, it signals that the current flow has been broken. A submenu may appear to log the reason (e.g., external disruption, personal need, shift in priority), but regardless of the reason, it **unlocks the schedule for reconfiguration**.

DoBag observes the user's response:
- Did they immediately resume the task? → Task may be divisible.
- Did they restart the task from the beginning? → Task may be indivisible.
- Was the task dropped or deprioritized? → Possible loss of relevance or priority.

The system makes **tentative inferences**, but always allows user confirmation:
> “You were doing this when you got interrupted — want to split it up? Start over? Save your place?”

This process strengthens the system's understanding of task fragility, essentiality, and structure, enhancing future scheduling recommendations without imposing rigid assumptions.

---

### 5. **Technical Stack and Scaffolding Plan**

To support sprint-based development and immediate usability, the project will be scaffolded with the following technologies and structure:

#### 5.1. **Frontend**
- **Framework**: React + Vite
- **Styling**: CSS Modules (Tailwind CSS is intentionally excluded from this project)
- **Interaction Library**: `dnd-kit` (for drag-and-drop behavior)
- **Auth & State**: Local state for sprint 1; future: auth token persistence

#### 5.2. **Backend**
- **Runtime**: Node.js with Express or Fastify (simple REST for now)
- **Containerization**: Docker-based backend server for development and deployment
- **Auth**: Simple hashed password-based login system with JWT (initially local-only)

#### 5.3. **Database**
- **Database**: PostgreSQL (containerized)
- **Hosting**: Reuse existing PostgreSQL service architecture from `kitecore-project`
- **Schema (initial)**:
  ```sql
  CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    position INT,
    is_divisible BOOLEAN DEFAULT false
  );
  ```

#### 5.4. **Project Layout**
```
dobag/
├── client/            # React frontend
├── server/            # Express/Fastify backend
├── db/
│   ├── schema.sql     # Initial DB schema
│   └── Dockerfile     # Container setup for PostgreSQL
├── docker-compose.yml # Combines frontend, backend, and db
```

This scaffolding allows for immediate end-to-end iteration in the first sprint:
- Users can register/log in
- Tasks can be added and persist in Postgres
- Backend routes serve and manage per-user task data

From here, additional features like drag-and-drop, inferred metadata, interruptions, and sharing can be layered in with each sprint.

