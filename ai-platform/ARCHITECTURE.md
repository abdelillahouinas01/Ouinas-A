# AI Platform - Architecture Documentation

## Overview

This document describes the technical architecture, design decisions, and implementation details of the AI Platform SaaS application.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  React SPA (TypeScript)                                 │   │
│  │  - Chat Interface                                       │   │
│  │  - Developer Dashboard                                  │   │
│  │  - Model/Tool Management                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP/WebSocket
                       │
       ┌───────────────┴───────────────┐
       │                               │
   REST API                      Socket.io
   (JSON)                      (Real-time)
       │                               │
       ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Express.js Backend (TypeScript)                     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ API Routes                                               │  │
│  │ - /api/auth/* - User authentication                      │  │
│  │ - /api/chat/* - Chat and conversations                   │  │
│  │ - /api/models/* - Model management (user view)           │  │
│  │ - /api/tools/* - Tool management (user view)             │  │
│  │ - /api/developer/* - Developer dashboard APIs            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Services                                                 │  │
│  │ - AuthService (GitHub OAuth, sessions)                   │  │
│  │ - ChatService (messages, conversations)                  │  │
│  │ - CreditService (deduction, transactions)                │  │
│  │ - AIProviderService (OmniRoute routing)                   │  │
│  │ - DeveloperService (admin operations)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Middleware                                               │  │
│  │ - Authentication validation                              │  │
│  │ - Authorization checks                                   │  │
│  │ - Input validation & sanitization                        │  │
│  │ - Rate limiting                                          │  │
│  │ - Error handling                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Real-time Layer (Socket.io)                              │  │
│  │ - Model/tool updates broadcast                           │  │
│  │ - Credit updates                                         │  │
│  │ - Activity notifications                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────┬────────────────────────┬─────────────────────────┘
               │                        │
          Database              AI Providers
               │                        │
               ▼                        ▼
        ┌─────────────┐        ┌──────────────┐
        │ PostgreSQL  │        │  OmniRoute   │
        │  Database   │        │  (localhost) │
        └─────────────┘        └──────────────┘
```

## Authentication Flow

### User Authentication (GitHub OAuth)

```
1. User clicks "Login with GitHub"
2. Frontend redirects to /auth/github
3. Backend generates state token, redirects to GitHub
4. User authorizes on GitHub
5. GitHub redirects to /auth/callback?code=XXX&state=YYY
6. Backend exchanges code for access token
7. Backend fetches user info from GitHub API
8. Backend checks if user exists in database
   - If new: create user with 10 free credits
   - If exists: update last_login
9. Backend creates session token
10. Frontend stores session token in secure HTTP-only cookie
11. Frontend redirects to /chat
```

### Developer Authentication

```
1. User clicks "Developer Login" button
2. Modal opens with code input
3. User enters "2727"
4. Frontend sends POST /api/developer/login { code: "2727" }
5. Backend validates code against DEVELOPER_CODE_HASH (secure comparison)
6. If valid: generate developer session token
7. Store token in secure HTTP-only cookie
8. Frontend redirected to /developer
9. Authorization middleware on all /api/developer/* routes validates token
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id INTEGER UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  disabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Credits Table
```sql
CREATE TABLE credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) DEFAULT 10.00,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Credit Transactions (Audit Trail)
```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  reason VARCHAR(255),
  type VARCHAR(20) NOT NULL, -- 'deduction' or 'grant'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
```

### Models Table
```sql
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  provider_id UUID REFERENCES providers(id),
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
```

### Tools Table
```sql
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  category VARCHAR(100),
  capabilities JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  compatible_models JSONB DEFAULT '[]', -- Array of model IDs
  metadata JSONB DEFAULT '{}',
  sort_priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tools_enabled ON tools(enabled);
```

### Conversations Table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
```

### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  model_used VARCHAR(255),
  tool_used VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
```

### Usage Logs Table
```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_id UUID REFERENCES models(id),
  tool_id UUID REFERENCES tools(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  credits_consumed DECIMAL(10, 2),
  request_status VARCHAR(50), -- 'success' or 'failed'
  response_duration_ms INTEGER,
  error_message TEXT
);

CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_timestamp ON usage_logs(timestamp);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', etc.
  resource_type VARCHAR(100) NOT NULL, -- 'model', 'tool', 'user', etc.
  resource_id VARCHAR(255),
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
```

### Providers Table
```sql
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  base_url VARCHAR(255) NOT NULL,
  auth_token TEXT, -- Encrypted
  model_mapping JSONB DEFAULT '{}',
  omniroute_config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Specification

### User Endpoints

#### Authentication

**GET /api/auth/github**
- Initiates GitHub OAuth flow
- Redirects to GitHub authorization

**GET /api/auth/callback**
- GitHub OAuth callback handler
- Parameters: code, state
- Returns: Redirect to /chat with session cookie

**POST /api/auth/logout**
- Invalidates user session
- Clears session cookie
- Returns: 200 OK

**GET /api/auth/user**
- Get current authenticated user profile
- Returns: `{ id, email, name, avatar_url, credits_balance }`

#### Chat

**POST /api/chat/message**
- Send a chat message
- Body: `{ conversation_id?, content, model_id, tool_id? }`
- Returns: Streaming response (SSE or chunked)
- Authentication: Required
- Credit verification: Required

**GET /api/chat/conversations**
- List user's conversations
- Query: `limit?, offset?`
- Returns: `{ conversations: [...], total_count }`

**GET /api/chat/conversations/:id**
- Get conversation with all messages
- Returns: `{ id, title, created_at, messages: [...] }`

**DELETE /api/chat/conversations/:id**
- Delete a conversation
- Returns: 200 OK

#### Models & Tools

**GET /api/models**
- List enabled models
- Returns: `{ models: [...] }`

**GET /api/tools**
- List enabled tools
- Returns: `{ tools: [...] }`

#### Credits & Usage

**GET /api/credits**
- Get user credit balance and stats
- Returns: `{ balance, used_today, requests_today, reset_date? }`

**GET /api/usage**
- Get user usage analytics
- Query: `days?` (default: 30)
- Returns: `{ daily_usage: [...], credits_by_model: [...] }`

### Developer Endpoints

All developer endpoints require developer authentication via middleware.

**POST /api/developer/login**
- Developer login
- Body: `{ code: "2727" }`
- Returns: `{ token }` (stored in secure cookie)

**GET /api/developer/overview**
- Dashboard overview metrics
- Returns: `{ total_users, active_users, total_requests, requests_today, credits_consumed_today, active_models, active_tools }`

#### User Management

**GET /api/developer/users**
- List all users with search/filter
- Query: `search?, status?, limit?, offset?`
- Returns: `{ users: [...], total_count }`

**PUT /api/developer/users/:id/credits**
- Adjust user credits
- Body: `{ amount, reason }`
- Returns: `{ new_balance, transaction }`

**PUT /api/developer/users/:id/status**
- Enable/disable user account
- Body: `{ disabled }`
- Returns: `{ status }`

#### Model Management

**GET /api/developer/models**
- List all models (including disabled)
- Returns: `{ models: [...] }`

**POST /api/developer/models**
- Create new model
- Body: `{ name, provider_id, model_id, description, ..., all fields }`
- Returns: `{ model }`

**PUT /api/developer/models/:id**
- Update model
- Body: `{ ...updated fields }`
- Returns: `{ model }`

**PATCH /api/developer/models/:id/order**
- Reorder model in selector
- Body: `{ new_priority }`
- Returns: `{ success }`

**DELETE /api/developer/models/:id**
- Delete model
- Returns: 200 OK

**POST /api/developer/models/:id/test**
- Test model connection
- Returns: `{ success, message }`

#### Tool Management

**GET /api/developer/tools**
- List all tools

**POST /api/developer/tools**
- Create tool

**PUT /api/developer/tools/:id**
- Update tool

**PATCH /api/developer/tools/:id/order**
- Reorder tool

**DELETE /api/developer/tools/:id**
- Delete tool

#### Provider Management

**GET /api/developer/providers**
- List configured providers

**POST /api/developer/providers**
- Add new provider

**PUT /api/developer/providers/:id**
- Update provider

**DELETE /api/developer/providers/:id**
- Delete provider

**POST /api/developer/omniroute/test**
- Test OmniRoute connection
- Returns: `{ connected, models_available }`

#### Analytics

**GET /api/developer/analytics**
- Usage analytics with charts
- Query: `days?`
- Returns: `{ daily_requests, credits_consumed, active_users, top_models }`

**GET /api/developer/audit-logs**
- View audit logs
- Query: `resource_type?, limit?, offset?`
- Returns: `{ logs: [...], total_count }`

**GET /api/developer/activity**
- Real-time activity feed
- Returns: `{ events: [...] }`

#### System Settings

**GET /api/developer/settings**
- Get system configuration

**PUT /api/developer/settings**
- Update system configuration
- Body: `{ branding, maintenance_mode, free_credits_amount, ... }`
- Returns: `{ settings }`

## Credit System

### Deduction Logic

1. **Verification Phase**
   - User sends message
   - Verify user is authenticated
   - Verify model exists and is enabled
   - Verify user has sufficient credits

2. **Reservation Phase**
   - Lock user's credit row
   - Calculate cost: `model.credits_per_request + token_count * cost_per_token`
   - Reserve credits atomically
   - Create pending transaction record

3. **Execution Phase**
   - Call OmniRoute API
   - Stream response to client
   - Track actual usage

4. **Settlement Phase**
   - Calculate actual credits consumed (may differ from estimate)
   - Update transaction record
   - Update user credit balance

5. **Error Handling**
   - If API call fails: restore reserved credits
   - If user cancels: restore reserved credits
   - Log failed transaction with error details

### Transaction Types

- **deduction**: Credits removed for API calls
- **grant**: Credits added by developer (bonus, correction)
- **refund**: Credits restored due to failure

## Real-time Communication (Socket.io)

### Client → Server Events

```javascript
// Join the real-time channel
socket.emit('join', { token: sessionToken });

// Typing indicator
socket.emit('typing', { conversation_id });
socket.emit('stop_typing', { conversation_id });

// Regenerate response
socket.emit('regenerate', { message_id });
```

### Server → Client Events

```javascript
// Model/tool updates
socket.broadcast('models:updated', { models: [...] });
socket.broadcast('tools:updated', { tools: [...] });

// Credit updates
socket.emit('credits:updated', { balance, timestamp });

// Activity notifications
socket.broadcast('activity:notification', { event: 'user_joined' });

// Real-time chat
socket.emit('message:streaming', { text: 'partial response' });
socket.emit('message:complete', { message });
```

## AI Provider Integration

### OmniRoute Provider

The backend communicates with OmniRoute (running at http://localhost:20128) to execute AI requests.

```typescript
interface OmniRouteRequest {
  model: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface OmniRouteResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### Provider Abstraction Layer

```typescript
interface AIProvider {
  sendMessage(request: ChatRequest): Promise<ChatResponse>;
  listModels(): Promise<Model[]>;
  testConnection(): Promise<boolean>;
}

class OmniRouteProvider implements AIProvider {
  // Implementation
}
```

## Security Architecture

### Input Validation

- All user input validated server-side
- Whitelist known fields
- Reject unknown parameters
- Validate data types and lengths

### Rate Limiting

- Per-user rate limiting: 100 requests per 15 minutes
- Per-IP rate limiting: 1000 requests per 15 minutes
- Reject with 429 Too Many Requests

### Authentication & Authorization

- Session tokens validated on every protected endpoint
- Developer routes double-check developer status
- Scope-limited access (users can't modify other users' data)

### Secret Management

- All secrets in environment variables only
- GitHub tokens encrypted in database
- OmniRoute credentials never exposed to frontend
- Never log sensitive data

### CORS

```typescript
cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
```

### CSRF Protection

- Double-submit cookie pattern for state-changing operations
- SameSite=Strict on cookies
- Validate origin header

## Error Handling

### Error Categories

1. **Authentication Errors** (401)
   - Invalid session
   - Expired token
   - Missing credentials

2. **Authorization Errors** (403)
   - User lacks permission
   - Developer-only endpoint

3. **Validation Errors** (400)
   - Invalid request body
   - Missing required fields

4. **Not Found Errors** (404)
   - Resource doesn't exist

5. **Conflict Errors** (409)
   - Duplicate model name
   - Resource state conflict

6. **Server Errors** (500)
   - Unhandled exceptions
   - Database errors

### Error Response Format

```json
{
  "error": "error_code",
  "message": "User-friendly message",
  "details": {}
}
```

## Performance Considerations

### Database

- Connection pooling for concurrent requests
- Indexes on frequently queried columns
- Query optimization for large datasets

### Caching

- Cache model/tool list in memory (invalidate on update)
- Cache user credit balance (invalidate on deduction)
- Use Redis for session storage (optional)

### Frontend

- Code splitting and lazy loading
- Image optimization
- Skeleton loaders for perceived performance
- Virtual scrolling for large lists

## Monitoring & Logging

### Logs to Track

- Authentication attempts (success/failure)
- API endpoint calls
- Database queries (slow query log)
- Error stacktraces
- Credit deductions and transactions

### Metrics to Monitor

- API response times
- Error rates by endpoint
- Database query times
- Active user count
- Credit consumption rate

## Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: ai_platform
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/ai_platform
      - NODE_ENV=production
    ports:
      - "3001:3001"
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

## Future Enhancements

- [ ] Multiple provider support (OpenAI, Google, Hugging Face)
- [ ] Advanced routing and load balancing
- [ ] User quotas and rate limiting tiers
- [ ] File upload and processing
- [ ] Conversation sharing and collaboration
- [ ] API key generation for third-party access
- [ ] Webhook system
- [ ] Plugin marketplace
- [ ] Usage-based billing integration
