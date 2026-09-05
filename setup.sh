#!/bin/bash
# ==============================================================================
# MyHealthChain — Unified One-Command Automated Environment Setup Script (Linux/macOS)
# ==============================================================================

set -e

echo "🏥 Starting MyHealthChain Automated Environment Setup..."
echo "--------------------------------------------------------"

# 1. Check Prerequisites
echo "🔍 Checking System Prerequisites..."
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }

PYTHON_VER=$(python3 --version)
NODE_VER=$(node --version)
echo "✅ Prerequisites detected: $PYTHON_VER | Node $NODE_VER"

# 2. Environment Configuration Check
echo ""
echo "⚙️ Validating Environment File (.env)..."
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "📄 Created .env from .env.example"
  else
    echo "⚠️ .env file missing. Please create .env with required keys."
  fi
else
  echo "✅ Environment file .env exists."
fi

# 3. Setup Python Backend Virtual Environment
echo ""
echo "🐍 Setting up Backend Virtual Environment & Installing Dependencies..."
cd backend
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  echo "✅ Created Python virtual environment (.venv)"
fi

source .venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo "✅ Backend dependencies installed successfully."
cd ..

# 4. Setup Frontend npm Dependencies
echo ""
echo "⚛️ Installing Frontend Dependencies..."
cd frontend
npm install --quiet
echo "✅ Frontend dependencies installed successfully."
cd ..

# 5. Setup WhatsApp Gateway (Optional)
if [ -d "whatsapp-gateway" ]; then
  echo ""
  echo "📱 Installing WhatsApp Gateway Dependencies..."
  cd whatsapp-gateway
  npm install --quiet
  cd ..
fi

echo ""
echo "========================================================="
echo "🎉 SETUP COMPLETE! You are ready to start MyHealthChain."
echo "========================================================="
echo "To start all services, run:"
echo "   ./start.sh"
echo "========================================================="
