import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Build database connection URL from environment variables
function buildDatabaseURL(): string {
  // If DATABASE_URL is provided, use it directly
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Build URL from individual components
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const name = process.env.DB_NAME || 'devops_platform';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'postgres';
  const ssl = process.env.DB_SSL === 'true' ? '?sslmode=require' : '';

  return `postgresql://${user}:${password}@${host}:${port}/${name}${ssl}`;
}

const databaseURL = buildDatabaseURL();

if (!databaseURL) {
  throw new Error(
    "Database configuration missing. Set DATABASE_URL or DB_* environment variables.",
  );
}

console.log(`🗄️  Database Mode: ${process.env.DATABASE_MODE || 'bundled'}`);
console.log(`🔗 Connecting to database: ${databaseURL.replace(/:([^:@]{1,})@/, ':****@')}`);

// Configure SSL based on DB_SSL environment variable
const poolConfig: any = { 
  connectionString: databaseURL,
  max: 20,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
};

if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });

// Auto-migration implementation
async function runMigrations() {
  if (process.env.RUN_MIGRATIONS === 'true') {
    try {
      console.log('🚀 Running database migrations...');
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      await execAsync('npm run db:push');
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      // Don't fail startup for migration errors in development
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }
}

// Run migrations on startup if enabled
runMigrations().catch(console.error);