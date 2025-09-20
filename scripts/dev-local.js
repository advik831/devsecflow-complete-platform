#!/usr/bin/env node

/**
 * DevSecFlow Platform - Local Development Server
 * 
 * This script starts the development server with local database configuration.
 * It ensures the database is running and starts both backend and frontend.
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logInfo(message) {
  log(`ℹ️ ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

async function checkDocker() {
  try {
    await execAsync('docker --version');
    logSuccess('Docker is installed');
    
    await execAsync('docker info');
    logSuccess('Docker is running');
    return true;
  } catch (error) {
    logError('Docker is not installed or not running');
    logError('Please install and start Docker Desktop first');
    return false;
  }
}

async function checkEnvFile() {
  const envPath = '.env.local';
  if (!fs.existsSync(envPath)) {
    logError('.env.local file not found');
    logInfo('Please run the setup script first:');
    logInfo('  Mac/Linux: ./scripts/setup-local.sh');
    logInfo('  Windows: scripts\\setup-local.bat');
    return false;
  }
  
  logSuccess('.env.local file found');
  return true;
}

async function checkDatabase() {
  try {
    const { stdout } = await execAsync('docker compose -f docker-compose.local.yml ps postgres');
    if (stdout.includes('Up')) {
      logSuccess('PostgreSQL database is running');
      return true;
    } else {
      logWarning('PostgreSQL database is not running');
      logInfo('Starting database...');
      
      await execAsync('docker compose -f docker-compose.local.yml up -d postgres');
      
      // Wait for database to be ready
      logInfo('Waiting for database to be ready...');
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        try {
          await execAsync('docker compose -f docker-compose.local.yml exec postgres pg_isready -U postgres');
          logSuccess('Database is ready!');
          return true;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            logError('Database failed to start');
            return false;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  } catch (error) {
    logError('Failed to check database status');
    logError('Make sure docker-compose.local.yml exists');
    return false;
  }
}

async function startDevelopmentServer() {
  logInfo('Starting development server...');
  
  // Load environment variables from .env.local
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  // Set environment variables
  Object.assign(process.env, envVars);
  process.env.NODE_ENV = 'development';
  
  // Start the development server
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    env: process.env
  });
  
  devProcess.on('error', (error) => {
    logError(`Failed to start development server: ${error.message}`);
    process.exit(1);
  });
  
  devProcess.on('close', (code) => {
    if (code !== 0) {
      logError(`Development server exited with code ${code}`);
      process.exit(code);
    }
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    log('\n🛑 Shutting down development server...');
    devProcess.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('\n🛑 Shutting down development server...');
    devProcess.kill('SIGTERM');
    process.exit(0);
  });
}

async function main() {
  log('🚀 DevSecFlow Platform - Development Server', colors.bright);
  log('===========================================');
  
  // Check prerequisites
  if (!(await checkDocker())) {
    process.exit(1);
  }
  
  if (!(await checkEnvFile())) {
    process.exit(1);
  }
  
  if (!(await checkDatabase())) {
    process.exit(1);
  }
  
  // Check if dependencies are installed
  if (!fs.existsSync('node_modules')) {
    logInfo('Installing dependencies...');
    await execAsync('npm install');
    logSuccess('Dependencies installed');
  }
  
  log('');
  logSuccess('All checks passed! Starting development server...');
  logInfo('The application will be available at: http://localhost:5000');
  logInfo('Press Ctrl+C to stop the server');
  log('');
  
  await startDevelopmentServer();
}

main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});