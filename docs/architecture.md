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
The REST API provides endpoints for:
- Retrieving tasks
- Creating new tasks
- Updating existing tasks
- Removing tasks
- Health check monitoring

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
- CORS configuration for allowed origins
- Database security best practices
- Environment-based configurations
- Secure credential management

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
   - System health monitoring
   - Database connection checks
   - Automatic recovery procedures

2. **Logging**:
   - Application logging
   - Build process logging
   - Database activity monitoring

3. **Analytics**:
   - Performance metrics
   - Usage statistics
   - System health metrics