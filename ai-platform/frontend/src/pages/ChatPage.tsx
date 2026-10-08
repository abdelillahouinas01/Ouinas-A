import { useEffect, useState, useRef } from 'react';
import { Send, MessageCircle, LogOut, Menu, X, Zap } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../services/api';
import type { Conversation, Message, Model } from '../types';

export default function ChatPage() {
  const { user, credits, logout } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations and models on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [convsData, modelsData] = await Promise.all([
          apiClient.getConversations(),
          apiClient.getModels(),
        ]);

        setConversations(convsData.conversations);
        setModels(modelsData.models);

        if (modelsData.models.length > 0) {
          setSelectedModel(modelsData.models[0].id);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || !selectedModel || isLoading) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: currentConversation?.id || 'new',
      role: 'user',
      content: inputValue,
      model_used: null,
      tool_used: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const stream = await apiClient.sendMessage(
        inputValue,
        selectedModel,
        undefined,
        currentConversation?.id
      );

      let assistantContent = '';
      const assistantMessage: Message = {
        id: `temp-${Date.now()}-assistant`,
        conversation_id: currentConversation?.id || 'new',
        role: 'assistant',
        content: '',
        model_used: selectedModel,
        tool_used: null,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'chunk') {
                assistantContent += data.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: assistantContent,
                  };
                  return updated;
                });
              } else if (data.type === 'complete') {
                // Update message ID and conversation
                if (data.conversation_id) {
                  setCurrentConversation({
                    id: data.conversation_id,
                    title: null,
                    model_used: selectedModel,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                }
              } else if (data.type === 'error') {
                console.error('Stream error:', data.error);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.slice(0, -1)); // Remove assistant message
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setCurrentConversation(conv);
    try {
      const data = await apiClient.getConversation(conv.id);
      setMessages(data.messages);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="flex h-screen bg-dark-950">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-dark-900 border-r border-dark-700 transition-all duration-300 overflow-hidden flex flex-col`}
      >
        {/* New conversation button */}
        <button
          onClick={handleNewConversation}
          className="m-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <MessageCircle size={18} />
          New Chat
        </button>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelectConversation(conv)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                currentConversation?.id === conv.id
                  ? 'bg-dark-800 text-white'
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
              }`}
            >
              <div className="truncate font-medium">
                {conv.title || 'New Conversation'}
              </div>
              <div className="text-xs text-dark-500 truncate">
                {new Date(conv.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>

        {/* User info */}
        <div className="p-4 border-t border-dark-700">
          <div className="text-sm text-dark-400 mb-3">
            <div className="font-semibold text-dark-200 truncate">{user?.name}</div>
            <div className="flex items-center gap-1 text-xs text-yellow-500">
              <Zap size={14} />
              {credits.toFixed(1)} credits
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-dark-900 border-b border-dark-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-dark-400 hover:text-dark-200 p-2"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <h1 className="text-xl font-bold gradient-text">AI Chat</h1>

          <div className="w-24"></div> {/* Spacer for alignment */}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle size={48} className="mx-auto mb-4 text-dark-700" />
                <p className="text-dark-400 text-lg">Start a new conversation</p>
                <p className="text-dark-500 text-sm mt-2">
                  Select a model below and type a message
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md lg:max-w-2xl p-4 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'glass-dark text-dark-100'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="glass-dark p-4 rounded-lg">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="bg-dark-900 border-t border-dark-700 p-6">
          {/* Model selector */}
          <div className="mb-4">
            <select
              value={selectedModel || ''}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-dark-800 border border-dark-600 focus:border-purple-500 text-dark-200 placeholder-dark-500 py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Message input */}
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-dark-800 border border-dark-600 focus:border-purple-500 text-dark-200 placeholder-dark-500 py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-dark-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
            >
              <Send size={20} />
              Send
            </button>
          </form>

          <p className="text-xs text-dark-500 text-center mt-2">
            Each message costs {selectedModel ? models.find(m => m.id === selectedModel)?.credits_per_request || 1 : 1} credit(s)
          </p>
        </div>
      </div>
    </div>
  );
}
