-- Create the database (if it doesn't already exist)
CREATE DATABASE "iam-service-test";

-- Connect to the test database
\c "iam-service-test";

-- Create the schema (if it doesn't already exist)
CREATE SCHEMA IF NOT EXISTS iam;

-- Connect to the dev database
\c "iam-service-dev";

-- Create the schema (if it doesn't already exist)
CREATE SCHEMA IF NOT EXISTS iam;