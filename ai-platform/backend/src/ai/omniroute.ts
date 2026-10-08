// AI Provider Service - handles OmniRoute integration
import axios, { AxiosInstance } from 'axios';
import { OmniRouteRequest, OmniRouteResponse } from '../types';
import { Errors } from '../middleware/errors';

class OmniRouteProvider {
  private client: AxiosInstance;
  private baseUrl: string;
  private authToken: string;

  constructor() {
    this.baseUrl = process.env.ANTHROPIC_BASE_URL || 'http://localhost:20128';
    this.authToken = process.env.ANTHROPIC_AUTH_TOKEN || '';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 seconds
    });
  }

  async sendMessage(request: OmniRouteRequest): Promise<OmniRouteResponse> {
    try {
      const response = await this.client.post<OmniRouteResponse>(
        '/v1/messages',
        request
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw Errors.SERVICE_UNAVAILABLE(
            'OmniRoute authentication failed. Check your credentials.'
          );
        }

        if (error.response?.status === 404) {
          throw Errors.NOT_FOUND(
            `Model not found on OmniRoute: ${request.model}`
          );
        }

        if (error.code === 'ECONNREFUSED') {
          throw Errors.SERVICE_UNAVAILABLE(
            'Cannot connect to OmniRoute. Ensure it is running at ' + this.baseUrl
          );
        }

        throw Errors.SERVICE_UNAVAILABLE(
          error.response?.data?.message ||
            'Failed to communicate with OmniRoute'
        );
      }

      throw Errors.INTERNAL_ERROR('Failed to send message to OmniRoute');
    }
  }

  async *streamMessage(
    request: OmniRouteRequest
  ): AsyncGenerator<string, void, unknown> {
    try {
      const response = await this.client.post(
        '/v1/messages',
        { ...request, stream: true },
        { responseType: 'stream' }
      );

      for await (const chunk of response.data) {
        const text = chunk.toString('utf-8');

        // Parse streaming chunks (typically JSON lines)
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices?.[0]?.delta?.content) {
                yield data.choices[0].delta.content;
              }
            } catch (e) {
              // Skip malformed JSON lines
            }
          }
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw Errors.SERVICE_UNAVAILABLE(
          'Streaming failed: ' + (error.message || 'Unknown error')
        );
      }
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try to list available models or make a simple request
      const response = await this.client.get('/v1/models', {
        timeout: 5000,
      });

      return response.status === 200;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('OmniRoute connection test failed:', error.message);
        return false;
      }
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.get<{ data: Array<{ id: string }> }>(
        '/v1/models'
      );

      return response.data.data.map((model) => model.id);
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      return [];
    }
  }
}

// Singleton instance
let providerInstance: OmniRouteProvider | null = null;

export function getProvider(): OmniRouteProvider {
  if (!providerInstance) {
    providerInstance = new OmniRouteProvider();
  }
  return providerInstance;
}

// Reset provider (useful for testing)
export function resetProvider(): void {
  providerInstance = null;
}
