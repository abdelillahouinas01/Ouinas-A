// API client service
import axios, { AxiosInstance } from 'axios';
import type { User, Model, Tool, Conversation, Message, CreditBalance } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      withCredentials: true,
    });

    // Add error interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear auth and redirect to login
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async getCurrentUser(): Promise<{ user: User; credits: number }> {
    const response = await this.client.get('/auth/user');
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
  }

  async developerLogin(code: string): Promise<{ message: string; token: string }> {
    const response = await this.client.post('/auth/developer/login', { code });
    return response.data;
  }

  // Chat endpoints
  async sendMessage(
    content: string,
    modelId: string,
    toolId?: string,
    conversationId?: string
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await this.client.post(
      '/chat/message',
      {
        content,
        model_id: modelId,
        tool_id: toolId,
        conversation_id: conversationId,
      },
      {
        responseType: 'stream',
      }
    );

    return response.data;
  }

  async getConversations(
    limit: number = 50,
    offset: number = 0
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const response = await this.client.get('/chat/conversations', {
      params: { limit, offset },
    });
    return response.data;
  }

  async getConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] }> {
    const response = await this.client.get(`/chat/conversations/${id}`);
    return response.data;
  }

  async deleteConversation(id: string): Promise<void> {
    await this.client.delete(`/chat/conversations/${id}`);
  }

  // Models and tools
  async getModels(): Promise<{ models: Model[] }> {
    const response = await this.client.get('/chat/models');
    return response.data;
  }

  async getTools(): Promise<{ tools: Tool[] }> {
    const response = await this.client.get('/chat/tools');
    return response.data;
  }

  // Developer endpoints
  async getDeveloperOverview(): Promise<any> {
    const response = await this.client.get('/developer/overview');
    return response.data;
  }

  async getUsers(search?: string, limit: number = 50, offset: number = 0): Promise<any> {
    const response = await this.client.get('/developer/users', {
      params: { search, limit, offset },
    });
    return response.data;
  }

  async adjustUserCredits(userId: string, amount: number, reason: string): Promise<any> {
    const response = await this.client.put(`/developer/users/${userId}/credits`, {
      amount,
      reason,
    });
    return response.data;
  }

  async getDeveloperModels(): Promise<{ models: Model[] }> {
    const response = await this.client.get('/developer/models');
    return response.data;
  }

  async createModel(data: Partial<Model>): Promise<{ model: Model }> {
    const response = await this.client.post('/developer/models', data);
    return response.data;
  }

  async updateModel(id: string, data: Partial<Model>): Promise<{ model: Model }> {
    const response = await this.client.put(`/developer/models/${id}`, data);
    return response.data;
  }

  async deleteModel(id: string): Promise<void> {
    await this.client.delete(`/developer/models/${id}`);
  }

  async testModel(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post(`/developer/models/${id}/test`);
    return response.data;
  }

  async getDeveloperTools(): Promise<{ tools: Tool[] }> {
    const response = await this.client.get('/developer/tools');
    return response.data;
  }

  async createTool(data: Partial<Tool>): Promise<{ tool: Tool }> {
    const response = await this.client.post('/developer/tools', data);
    return response.data;
  }

  async updateTool(id: string, data: Partial<Tool>): Promise<{ tool: Tool }> {
    const response = await this.client.put(`/developer/tools/${id}`, data);
    return response.data;
  }

  async deleteTool(id: string): Promise<void> {
    await this.client.delete(`/developer/tools/${id}`);
  }

  async testOmniRoute(): Promise<any> {
    const response = await this.client.post('/developer/omniroute/test');
    return response.data;
  }

  async getAnalytics(days?: number): Promise<any> {
    const response = await this.client.get('/developer/analytics', {
      params: { days },
    });
    return response.data;
  }

  async getAuditLogs(limit: number = 50, offset: number = 0): Promise<any> {
    const response = await this.client.get('/developer/audit-logs', {
      params: { limit, offset },
    });
    return response.data;
  }
}

// Singleton instance
const apiClient = new ApiClient();
export default apiClient;
