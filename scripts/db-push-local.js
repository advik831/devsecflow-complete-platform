#!/usr/bin/env node

/**
 * DevSecFlow Platform - Database Schema Update Script
 * 
 * This script pushes database schema changes to the local development database.
 * It ensures the database is running and applies any pending schema changes.
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

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

async function checkDatabase() {
  try {
    // Check if database container is running
    const { stdout } = await execAsync('docker compose -f docker-compose.local.yml ps postgres');
    if (!stdout.includes('Up')) {
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
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            logError('Database failed to start');
            return false;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } else {
      logSuccess('Database is running');
    }
    
    return true;
  } catch (error) {
    logError('Failed to check database status');
    logError(error.message);
    return false;
  }
}

async function loadEnvironment() {
  if (!fs.existsSync('.env.local')) {
    logError('.env.local file not found');
    logInfo('Please run the setup script first:');
    logInfo('  Mac/Linux: ./scripts/setup-local.sh');
    logInfo('  Windows: scripts\\setup-local.bat');
    return false;
  }
  
  // Load environment variables from .env.local
  const envContent = fs.readFileSync('.env.local', 'utf8');
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  logSuccess('Environment variables loaded');
  return true;
}

async function pushSchema() {
  logInfo('Pushing database schema changes...');
  
  return new Promise((resolve, reject) => {
    const pushProcess = spawn('npm', ['run', 'db:push'], {
      stdio: 'inherit',
      env: process.env
    });
    
    pushProcess.on('error', (error) => {
      logError(`Failed to push schema: ${error.message}`);
      reject(error);
    });
    
    pushProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('Database schema updated successfully!');
        resolve();
      } else {
        logError(`Schema push failed with code ${code}`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

async function main() {
  log('🗄️ DevSecFlow Platform - Database Schema Update', colors.bright);
  log('===============================================');
  
  // Load environment variables
  if (!(await loadEnvironment())) {
    process.exit(1);
  }
  
  // Check and start database if needed
  if (!(await checkDatabase())) {
    process.exit(1);
  }
  
  // Check if dependencies are installed
  if (!fs.existsSync('node_modules')) {
    logInfo('Installing dependencies...');
    await execAsync('npm install');
    logSuccess('Dependencies installed');
  }
  
  try {
    await pushSchema();
    log('');
    logSuccess('Database schema update completed!');
    logInfo('Your database is now up to date with the latest schema changes.');
  } catch (error) {
    log('');
    logError('Database schema update failed!');
    logError('Please check the error messages above and fix any issues.');
    process.exit(1);
  }
}

main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});