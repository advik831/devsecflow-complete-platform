#!/bin/bash

# DevSecFlow Platform - Local Setup Script
# This script sets up the local development environment

set -e

echo "🚀 DevSecFlow Platform - Local Setup"
echo "======================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is installed and running"

# Create .env.local file if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << 'EOF'
# DevSecFlow Platform - Local Environment Configuration

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/devsecflow
POSTGRES_PASSWORD=password
POSTGRES_DB=devsecflow
POSTGRES_USER=postgres

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Application Configuration
NODE_ENV=development
PORT=5000

# Optional: GitHub Integration (uncomment and configure if needed)
# GITHUB_CLIENT_ID=your_github_client_id
# GITHUB_CLIENT_SECRET=your_github_client_secret
EOF
    echo "✅ Created .env.local file"
else
    echo "✅ .env.local file already exists"
fi

# Start PostgreSQL database
echo "🗄️ Starting PostgreSQL database..."
docker compose -f docker-compose.local.yml up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check if database is responding
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if docker compose -f docker-compose.local.yml exec postgres pg_isready -U postgres; then
        echo "✅ Database is ready!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Database failed to start after $max_attempts attempts"
        echo "Check logs with: docker compose -f docker-compose.local.yml logs postgres"
        exit 1
    fi
    
    echo "⏳ Waiting for database... (attempt $attempt/$max_attempts)"
    sleep 2
    ((attempt++))
done

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run database migrations
echo "🗄️ Setting up database schema..."
npm run db:push

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: node scripts/dev-local.js"
echo "2. Open: http://localhost:5000"
echo "3. Register a new account to get started"
echo ""
echo "Useful commands:"
echo "- Start dev server: node scripts/dev-local.js"
echo "- Update database: node scripts/db-push-local.js"
echo "- View logs: docker compose -f docker-compose.local.yml logs postgres"
echo "- Stop database: docker compose -f docker-compose.local.yml down"