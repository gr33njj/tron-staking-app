-- Initial database setup for TRON Staking Platform
-- This script will be executed when PostgreSQL container starts

-- Create database if it doesn't exist
-- Note: This will run as part of docker-entrypoint-initdb.d

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create admin user for the application
-- This will be handled by the application migration, but we can set some initial data

-- You can add any initial SQL setup here
-- The actual tables will be created by Alembic migrations
