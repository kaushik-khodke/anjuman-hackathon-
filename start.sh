#!/bin/bash
# MyHealthChain Startup Script for Linux/macOS

set -e

echo "🏥 Starting MyHealthChain Ecosystem..."
echo "---------------------------------------"

cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

cd frontend
npm run dev -- --open &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================================="
echo "🚀 MyHealthChain Services Running!"
echo "   🌐 Frontend UI: http://localhost:5173"
echo "   ⚡ API Backend: http://localhost:8000"
echo "   📖 Swagger Docs: http://localhost:8000/docs"
echo "   🩺 Health Check: http://localhost:8000/health"
echo "========================================================="

wait $BACKEND_PID $FRONTEND_PID
