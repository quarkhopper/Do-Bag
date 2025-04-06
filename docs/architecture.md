# DoBag Technical Architecture

## System Overview
DoBag implements a modern web architecture with:
- Stateless REST API backend
- React-based SPA frontend
- PostgreSQL for data persistence
- Containerized development environment
- Cloud-native deployment

## Technical Stack

### Frontend (Vercel)
- **Core Technologies**:
  - React 18 with TypeScript
  - Vite for build optimization
  - React DnD for drag-and-drop
  - Framer Motion for animations
  - Axios for API communication
  - CSS Modules for styling

- **State Management**:
  - React Context for global state
  - Custom hooks for business logic
  - Local storage for persistence

- **Build & Deploy**:
  - TypeScript compilation
  - Vite production bundling
  - Automatic Vercel deployment
  - Environment-based configuration

### Backend (Railway)
- **Core Technologies**:
  - Node.js 18 with Express
  - TypeScript for type safety
  - PostgreSQL for data storage
  - Docker for containerization

- **API Design**:
  - RESTful endpoints
  - JSON payload format
  - Zod for validation
  - Error middleware
  - CORS security

- **Database**:
  - Connection pooling
  - Prepared statements
  - Automatic migrations
  - SSL in production

### Database Schema
```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    expected_duration TEXT,
    is_divisible BOOLEAN DEFAULT false,
    priority_hint TEXT CHECK (priority_hint IN ('low', 'medium', 'high')),
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX tasks_position_idx ON tasks(position);
```

## API Endpoints

### Tasks
- `GET /api/tasks`
  - Returns all tasks ordered by position
  - Query params: none
  - Response: `Task[]`

- `POST /api/tasks`
  - Creates a new task
  - Body: `CreateTaskDTO`
  - Response: `Task`

- `PATCH /api/tasks/:id`
  - Updates task properties
  - Body: `UpdateTaskDTO`
  - Response: `Task`

- `DELETE /api/tasks/:id`
  - Removes a task
  - Response: `204 No Content`

## Deployment Configuration

### Frontend (Vercel)
```json
{
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

### Backend (Railway)
```toml
[build]
builder = "DOCKERFILE"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100
```

## Security Measures
1. **CORS Configuration**:
   ```typescript
   app.use(cors({
     origin: process.env.NODE_ENV === 'production' 
       ? ['https://do-bag.vercel.app']
       : 'http://localhost:5173'
   }));
   ```

2. **Database Security**:
   - SSL connections in production
   - Connection pooling
   - Prepared statements

3. **Environment Variables**:
   - Secured in Vercel/Railway
   - Different configs per environment
   - No secrets in code

## Development Setup
1. **Prerequisites**:
   - Node.js 18+
   - Docker & Docker Compose
   - PostgreSQL (local or Docker)

2. **Local Development**:
   ```bash
   # Start all services
   docker-compose up

   # Frontend only
   cd client && npm run dev

   # Backend only
   cd server && npm run dev
   ```

## Monitoring
1. **Health Checks**:
   - Endpoint: `/health`
   - Checks: DB connection, API status
   - Automatic restarts on failure

2. **Logging**:
   - Application logs in Railway
   - Build logs in Vercel
   - Database logs in Railway

3. **Analytics**:
   - Vercel Analytics for frontend
   - Railway metrics for backend