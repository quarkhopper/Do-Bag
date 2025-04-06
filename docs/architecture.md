# DoBag Architecture Documentation

## Overview
DoBag is a task management application with a React frontend and Express backend, using a PostgreSQL database. The application is deployed across two platforms:
- Frontend: Vercel
- Backend: Railway (including PostgreSQL database)

## System Architecture

### Frontend (Vercel)
- **Technology Stack**:
  - React with TypeScript
  - Vite as build tool
  - Axios for API calls
  - React DnD for drag-and-drop functionality
  - Deployed on Vercel

- **Key Components**:
  - Location: `/client`
  - Build Output: `/client/dist`
  - Environment Variables:
    - `VITE_API_URL`: Points to Railway backend

### Backend (Railway)
- **Technology Stack**:
  - Node.js with Express
  - TypeScript
  - PostgreSQL for data storage
  - Deployed on Railway

- **Key Components**:
  - Location: `/server`
  - API Routes:
    - GET `/api/tasks`: Retrieve all tasks
    - POST `/api/tasks`: Create new task
    - PATCH `/api/tasks/:id`: Update task
  - Database Migrations: Automatic on startup

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

## Deployment Configuration

### Frontend (Vercel)
- **Repository**: `quarkhopper/Do-Bag`
- **Branch**: `main`
- **Root Directory**: `/client`
- **Build Settings**:
  ```json
  {
    "installCommand": "npm install",
    "buildCommand": "npm run build",
    "outputDirectory": "dist"
  }
  ```

### Backend (Railway)
- **Repository**: `quarkhopper/Do-Bag`
- **Branch**: `main`
- **Root Directory**: `/server`
- **Configuration** (`railway.toml`):
  ```toml
  [build]
  builder = "DOCKERFILE"

  [deploy]
  healthcheckPath = "/health"
  healthcheckTimeout = 100
  ```

## Security & CORS
- Backend configured to accept requests from:
  - Production: `https://do-bag.vercel.app` and related preview URLs
  - Development: `http://localhost:5173`
- Database connection uses SSL in production
- Environment variables stored securely in respective platforms

## Development Workflow
1. Local Development:
   - Frontend: `cd client && npm run dev`
   - Backend: `cd server && npm run dev`
   - Database: Local PostgreSQL or Docker container

2. Deployment:
   - Frontend: Auto-deploys from main branch to Vercel
   - Backend: Auto-deploys from main branch to Railway
   - Database migrations run automatically on backend startup

## Future Considerations
1. Implement user authentication
2. Add task categories/tags
3. Enable task scheduling
4. Implement task dependencies
5. Add data export/import functionality

## Monitoring & Maintenance
- Health check endpoint at `/health`
- Automatic restarts on failure (Railway)
- Database backups handled by Railway
- Vercel analytics for frontend performance 