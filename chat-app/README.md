# Real-time Chat Application

## Features
- User registration and authentication
- Real-time messaging with Redis
- Server-Sent Events (SSE) for notifications
- Online/offline user status
- Message persistence
- Responsive UI

## Tech Stack
- Frontend: React + Tailwind CSS
- Backend: Node.js + Express
- Database: MongoDB
- Cache/Messaging: Redis
- Real-time: Server-Sent Events (SSE)

## Step-by-Step Setup Instructions

### Prerequisites
1. Install Node.js (v18+) from https://nodejs.org/
2. Install Docker Desktop from https://www.docker.com/products/docker-desktop/
3. Install MongoDB locally OR create MongoDB Atlas account (recommended)

### Step 1: Clone and Setup Project Structure
```bash
# Navigate to your chat-app directory
cd chat-app
```

### Step 2: Start Redis with Docker
```bash
# Start Redis container (run this in chat-app directory)
docker-compose up -d

# Verify Redis is running
docker ps
```

### Step 3: Setup Backend
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Update .env file with your MongoDB connection
# If using MongoDB Atlas, replace MONGODB_URI with your connection string
# Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp

# Start backend server
npm run dev
```
Backend will run on http://localhost:5000

### Step 4: Setup Frontend
```bash
# Open new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start frontend development server
npm start
```
Frontend will run on http://localhost:3000

### Step 5: Test the Application
1. Open http://localhost:3000 in your browser
2. Register a new account
3. Open another browser/incognito window
4. Register another account
5. Start chatting between the two accounts

## Environment Variables (.env file in backend)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatapp
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

## Deployment Options

### Option 1: Railway (Recommended)
1. **Backend**: Deploy to Railway
   - Connect GitHub repo
   - Add environment variables
   - Railway provides Redis addon

2. **Frontend**: Deploy to Vercel
   - Connect GitHub repo
   - Update API URLs in frontend

### Option 2: Render + MongoDB Atlas
1. **Database**: MongoDB Atlas (free tier)
2. **Redis**: Redis Cloud (free tier)
3. **Backend**: Render Web Service
4. **Frontend**: Netlify/Vercel

### Option 3: Docker Deployment
```bash
# Create docker-compose.prod.yml for production
# Include MongoDB, Redis, Backend, and Frontend services
```

## Troubleshooting

### Common Issues:
1. **Redis Connection Error**: Make sure Docker is running and Redis container is up
2. **MongoDB Connection Error**: Check MongoDB is running or Atlas connection string is correct
3. **CORS Issues**: Ensure frontend URL is in backend CORS configuration
4. **SSE Not Working**: Check browser network tab for EventSource connections

### Commands to Check Services:
```bash
# Check if Redis is running
docker ps

# Check backend logs
cd backend && npm run dev

# Check if MongoDB is running (local)
mongosh

# Test API endpoints
curl http://localhost:5000/health
```