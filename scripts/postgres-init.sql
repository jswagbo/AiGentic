-- AIGentic PostgreSQL Initialization Script
-- This script runs when the PostgreSQL container is first created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create development and test databases
CREATE DATABASE aigentic_dev;
CREATE DATABASE aigentic_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE aigentic TO postgres;
GRANT ALL PRIVILEGES ON DATABASE aigentic_dev TO postgres;
GRANT ALL PRIVILEGES ON DATABASE aigentic_test TO postgres;

-- Log the initialization
\echo 'AIGentic PostgreSQL databases initialized successfully';
\echo 'Available databases: aigentic (main), aigentic_dev, aigentic_test';
\echo 'Extensions enabled: uuid-ossp, pg_trgm';

-- Show database configuration
SELECT 
    datname as "Database Name",
    pg_size_pretty(pg_database_size(datname)) as "Size",
    datcollate as "Collation"
FROM pg_database 
WHERE datname LIKE 'aigentic%'; 