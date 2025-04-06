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
- **AI doesn't pretend to be a mind reader**: It asks questions, infers cautiously, and surfaces structure only when helpful.
- **Invisible complexity**: The user experiences simplicity; the system maintains hidden structure.
- **One-day focus**: Users interact with a single "day bag" of tasks, not a calendar or long-term planner.

---

### 3. **Task Model**

Each task is a structured unit with the following properties:

#### 3.1. **User-Defined Properties** (✅ Implemented)
- `text`: freeform task description
- `expected_duration`: time estimate (e.g. 30 min, 1 hr)
- `is_divisible`: can this be split across multiple work sessions?
- `priority_hint`: optional (low / medium / high)
- `position`: order in the task list

#### 3.2. **System-Inferred Metadata** (🔄 Planned)
- `inferred_grouping`: clustered with similar tasks
- `last_successful_time`: when user last completed a similar task
- `energy_cost`: estimated from past behavior
- `interruption_penalty`: score for how badly this task breaks when interrupted
- `required_resources`: list of resources needed (e.g., oven, laptop, focus)
- `can_overlap`: derived from resource usage; tasks can run in parallel if non-competing
- `preconditions`: inferred setup tasks that must complete before this task can begin

---

### 4. **Interruptions and Adaptive Scheduling** (🔄 Planned)

When a user presses the **"Interrupted"** button, it signals that the current flow has been broken. A submenu may appear to log the reason (e.g., external disruption, personal need, shift in priority), but regardless of the reason, it **unlocks the schedule for reconfiguration**.

DoBag observes the user's response:
- Did they immediately resume the task? → Task may be divisible.
- Did they restart the task from the beginning? → Task may be indivisible.
- Was the task dropped or deprioritized? → Possible loss of relevance or priority.

The system makes **tentative inferences**, but always allows user confirmation:
> "You were doing this when you got interrupted — want to split it up? Start over? Save your place?"

This process strengthens the system's understanding of task fragility, essentiality, and structure, enhancing future scheduling recommendations without imposing rigid assumptions.

---

### 5. **Technical Stack and Implementation Status**

#### 5.1. **Frontend** (✅ Implemented)
- **Framework**: React + Vite
- **Styling**: CSS Modules
- **State Management**: React hooks and context
- **API Client**: Axios
- **Deployment**: Vercel
- **Environment Variables**:
  - `VITE_API_URL`: Points to Railway backend

#### 5.2. **Backend** (✅ Implemented)
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Deployment**: Railway
- **Features**:
  - REST API endpoints
  - CORS configuration
  - Health check endpoint
  - Automatic database migrations

#### 5.3. **Database** (✅ Implemented)
- **Database**: PostgreSQL on Railway
- **Schema**:

    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    expected_duration TEXT,
    is_divisible BOOLEAN DEFAULT false,
    priority_hint TEXT CHECK (priority_hint IN ('low', 'medium', 'high')),
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

- **Index**:

    CREATE INDEX tasks_position_idx ON tasks(position);

#### 5.4. **Project Layout** (✅ Implemented)

    dobag/
    ├── client/                # React frontend
    │   ├── src/              # Frontend source code
    │   ├── public/           # Static assets
    │   └── package.json      # Frontend dependencies
    ├── server/               # Express backend
    │   ├── src/             # Backend source code
    │   │   ├── db/          # Database and migrations
    │   │   ├── routes/      # API routes
    │   │   └── middleware/  # Express middleware
    │   └── package.json     # Backend dependencies
    ├── docs/                # Project documentation
    └── docker-compose.yml   # Local development setup

This scaffolding enables our current implementation:
- Basic frontend UI with task list
- Backend API with PostgreSQL integration
- Database migrations system
- Production deployment on Vercel and Railway

From here, additional features like drag-and-drop, inferred metadata, interruptions, and sharing can be layered in with each sprint.


