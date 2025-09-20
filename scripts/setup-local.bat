@echo off
setlocal enabledelayedexpansion

REM DevSecFlow Platform - Local Setup Script for Windows
REM This script sets up the local development environment

echo 🚀 DevSecFlow Platform - Local Setup
echo ======================================

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first:
    echo    https://docs.docker.com/get-docker/
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    exit /b 1
)

echo ✅ Docker is installed and running

REM Create .env.local file if it doesn't exist
if not exist ".env.local" (
    echo 📝 Creating .env.local file...
    (
        echo # DevSecFlow Platform - Local Environment Configuration
        echo.
        echo # Database Configuration
        echo DATABASE_URL=postgresql://postgres:password@localhost:5432/devsecflow
        echo POSTGRES_PASSWORD=password
        echo POSTGRES_DB=devsecflow
        echo POSTGRES_USER=postgres
        echo.
        echo # Session Configuration
        echo SESSION_SECRET=your-super-secret-session-key-change-this-in-production
        echo.
        echo # Application Configuration
        echo NODE_ENV=development
        echo PORT=5000
        echo.
        echo # Optional: GitHub Integration ^(uncomment and configure if needed^)
        echo # GITHUB_CLIENT_ID=your_github_client_id
        echo # GITHUB_CLIENT_SECRET=your_github_client_secret
    ) > .env.local
    echo ✅ Created .env.local file
) else (
    echo ✅ .env.local file already exists
)

REM Start PostgreSQL database
echo 🗄️ Starting PostgreSQL database...
docker compose -f docker-compose.local.yml up -d postgres

REM Wait for database to be ready
echo ⏳ Waiting for database to be ready...
timeout /t 5 /nobreak >nul

REM Check if database is responding
set max_attempts=30
set attempt=1

:check_db
docker compose -f docker-compose.local.yml exec postgres pg_isready -U postgres >nul 2>&1
if not errorlevel 1 (
    echo ✅ Database is ready!
    goto db_ready
)

if !attempt! geq !max_attempts! (
    echo ❌ Database failed to start after !max_attempts! attempts
    echo Check logs with: docker compose -f docker-compose.local.yml logs postgres
    exit /b 1
)

echo ⏳ Waiting for database... ^(attempt !attempt!/!max_attempts!^)
timeout /t 2 /nobreak >nul
set /a attempt+=1
goto check_db

:db_ready

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Run database migrations
echo 🗄️ Setting up database schema...
npm run db:push

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Run: node scripts/dev-local.js
echo 2. Open: http://localhost:5000
echo 3. Register a new account to get started
echo.
echo Useful commands:
echo - Start dev server: node scripts/dev-local.js
echo - Update database: node scripts/db-push-local.js
echo - View logs: docker compose -f docker-compose.local.yml logs postgres
echo - Stop database: docker compose -f docker-compose.local.yml down

pause