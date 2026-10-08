-- Initial database schema for AI Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id INTEGER UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  disabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_email ON users(email);

-- GitHub identities (for storing encrypted tokens)
CREATE TABLE IF NOT EXISTS github_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  github_id INTEGER NOT NULL,
  username VARCHAR(255),
  access_token TEXT, -- Should be encrypted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_github_identities_user_id ON github_identities(user_id);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);

-- Developer sessions
CREATE TABLE IF NOT EXISTS developer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_developer_sessions_token ON developer_sessions(token);

-- Credits
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) DEFAULT 10.00,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credits_user_id ON credits(user_id);

-- Credit transactions (audit trail)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  reason VARCHAR(255),
  type VARCHAR(20) NOT NULL, -- 'deduction', 'grant', 'refund'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);

-- Providers
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  base_url VARCHAR(255) NOT NULL,
  auth_token TEXT, -- Should be encrypted
  model_mapping JSONB DEFAULT '{}',
  omniroute_config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Models
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  model_id VARCHAR(255) NOT NULL, -- e.g., "claude-3-sonnet"
  description TEXT,
  icon VARCHAR(255),
  category VARCHAR(100),
  capabilities JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  free_tier BOOLEAN DEFAULT FALSE,
  credits_per_request DECIMAL(10, 2) DEFAULT 1.00,
  max_input INTEGER,
  max_output INTEGER,
  context_window INTEGER,
  sort_priority INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_models_enabled ON models(enabled);
CREATE INDEX idx_models_sort_priority ON models(sort_priority);
CREATE INDEX idx_models_provider_id ON models(provider_id);

-- Tools
CREATE TABLE IF NOT EXISTS tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  category VARCHAR(100),
  capabilities JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  compatible_models JSONB DEFAULT '[]', -- Array of model IDs or "*" for all
  metadata JSONB DEFAULT '{}',
  sort_priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tools_enabled ON tools(enabled);
CREATE INDEX idx_tools_sort_priority ON tools(sort_priority);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  model_used VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  model_used VARCHAR(255),
  tool_used VARCHAR(255),
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Usage logs
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_id UUID REFERENCES models(id) ON DELETE SET NULL,
  tool_id UUID REFERENCES tools(id) ON DELETE SET NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  credits_consumed DECIMAL(10, 2),
  request_status VARCHAR(50), -- 'success', 'failed', 'cancelled'
  response_duration_ms INTEGER,
  error_message TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER
);

CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_timestamp ON usage_logs(timestamp);
CREATE INDEX idx_usage_logs_model_id ON usage_logs(model_id);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', etc.
  resource_type VARCHAR(100) NOT NULL, -- 'model', 'tool', 'user', 'provider', etc.
  resource_id VARCHAR(255),
  resource_name VARCHAR(255),
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Initialize default system settings if they don't exist
INSERT INTO system_settings (key, value) VALUES
  ('branding', '{"platform_name": "AI Platform", "logo_url": null}'),
  ('maintenance_mode', 'false'),
  ('free_credits_amount', '10'),
  ('registration_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
