-- DevSecFlow Platform - Database Initialization Script
-- This script initializes the PostgreSQL database for local development

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create a basic health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS TEXT AS $$
BEGIN
    RETURN 'DevSecFlow Database is ready!';
END;
$$ LANGUAGE plpgsql;

-- Insert initial data or configurations can be added here
-- The actual schema will be managed by Drizzle ORM migrations