# 2MNumerik

Full-stack application with React frontend and Node.js backend.

## Development Setup

### Prerequisites

- Node.js (v14 or higher)
- npm
- MySQL database

### Quick Start

1. **Install all dependencies:**

   ```bash
   npm run install:all
   ```

2. **Start development servers (Frontend + Backend):**
   ```bash
   npm run dev
   ```
   This will start:
   - Backend server on http://localhost:3001
   - Frontend development server on http://localhost:5173

### Individual Scripts

- `npm run dev:client` - Start only the frontend (React + Vite)
- `npm run dev:server` - Start only the backend (Node.js + Express)
- `npm run install:client` - Install only frontend dependencies
- `npm run install:server` - Install only backend dependencies
- `npm run build` - Build the frontend for production

### Project Structure

```
├── client/          # React frontend
├── server/          # Node.js backend
├── docker-compose.yml
└── package.json     # Root package with development scripts
```

### Database Setup

Make sure to configure your database connection in `server/config/` and run migrations:

```bash
cd server
npm run migrate
npm run seed
```
