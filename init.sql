-- SQL to create the users table for demo mode
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    balance NUMERIC(20, 2) DEFAULT 0
);

-- Transaction history table (for wallet)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'deposit' or 'withdraw'
    amount NUMERIC(20, 2) NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallet audit log table
CREATE TABLE IF NOT EXISTS wallet_audit_logs (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL, -- deposit, withdraw, trade, profit, etc.
    amount NUMERIC(20, 2) NOT NULL,
    meta JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
