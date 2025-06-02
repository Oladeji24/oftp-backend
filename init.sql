-- SQL to create the users table for demo mode
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    balance NUMERIC(20, 2) DEFAULT 0
);
