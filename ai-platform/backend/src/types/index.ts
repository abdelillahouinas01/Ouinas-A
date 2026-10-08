// Backend type definitions

export interface User {
  id: string;
  github_id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  disabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Credits {
  id: string;
  user_id: string;
  balance: number;
  updated_at: Date;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string | null;
  type: 'deduction' | 'grant' | 'refund';
  created_at: Date;
}

export interface Model {
  id: string;
  name: string;
  provider_id: string | null;
  model_id: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  capabilities: Record<string, any>;
  enabled: boolean;
  free_tier: boolean;
  credits_per_request: number;
  max_input: number | null;
  max_output: number | null;
  context_window: number | null;
  sort_priority: number;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Tool {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  capabilities: Record<string, any>;
  enabled: boolean;
  compatible_models: string[]; // model IDs or "*"
  metadata: Record<string, any>;
  sort_priority: number;
  created_at: Date;
  updated_at: Date;
}

export interface Provider {
  id: string;
  name: string;
  base_url: string;
  auth_token: string | null;
  model_mapping: Record<string, any>;
  omniroute_config: Record<string, any>;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  model_used: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used: string | null;
  tool_used: string | null;
  tokens_used: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface UsageLog {
  id: string;
  user_id: string;
  model_id: string | null;
  tool_id: string | null;
  timestamp: Date;
  credits_consumed: number;
  request_status: 'success' | 'failed' | 'cancelled';
  response_duration_ms: number | null;
  error_message: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
}

export interface AuditLog {
  id: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  changes: Record<string, any>;
  created_at: Date;
}

export interface AuthenticatedRequest {
  user?: User;
  isDeveloper?: boolean;
}

export interface ChatRequest {
  conversation_id?: string;
  content: string;
  model_id: string;
  tool_id?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  content: string;
  model_used: string;
  tokens_used: number;
  credits_consumed: number;
}

export interface OmniRouteMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OmniRouteRequest {
  model: string;
  messages: OmniRouteMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface OmniRouteResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}
