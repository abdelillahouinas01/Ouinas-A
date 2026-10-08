// Frontend type definitions
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Model {
  id: string;
  name: string;
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
}

export interface Tool {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  capabilities: Record<string, any>;
  enabled: boolean;
  compatible_models: string[];
  sort_priority: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used: string | null;
  tool_used: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  model_used: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditBalance {
  balance: number;
  used_today: number;
  requests_today: number;
}

export interface DashboardOverview {
  total_users: number;
  active_users: number;
  total_requests: number;
  requests_today: number;
  credits_consumed_today: number;
  active_models: number;
  active_tools: number;
}
