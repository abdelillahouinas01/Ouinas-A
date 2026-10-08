import { useState, useEffect } from 'react';
import { LogOut, Users, Settings, BarChart3, Shield, Zap } from 'lucide-react';
import apiClient from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { DashboardOverview, Model, Tool } from '../types';

export default function DeveloperDashboard() {
  const { logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [overviewData, modelsData, toolsData, usersData] = await Promise.all([
        apiClient.getDeveloperOverview(),
        apiClient.getDeveloperModels(),
        apiClient.getDeveloperTools(),
        apiClient.getUsers(),
      ]);

      setOverview(overviewData);
      setModels(modelsData.models);
      setTools(toolsData.tools);
      setUsers(usersData.users);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
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

  const handleToggleModel = async (modelId: string, enabled: boolean) => {
    try {
      const model = models.find(m => m.id === modelId);
      if (model) {
        await apiClient.updateModel(modelId, { enabled: !enabled });
        loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to toggle model:', error);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (confirm('Are you sure you want to delete this model?')) {
      try {
        await apiClient.deleteModel(modelId);
        loadDashboardData();
      } catch (error) {
        console.error('Failed to delete model:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-dark-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-700 px-8 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text">Developer Dashboard</h1>

        <button
          onClick={handleLogout}
          className="bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      {/* Navigation tabs */}
      <div className="bg-dark-900 border-b border-dark-700 px-8">
        <div className="flex gap-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'models', label: 'Models', icon: Settings },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'tools', label: 'Tools', icon: Zap },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`py-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard
              title="Total Users"
              value={overview.total_users}
              icon={Users}
              color="blue"
            />
            <MetricCard
              title="Active Today"
              value={overview.active_users}
              icon={Users}
              color="green"
            />
            <MetricCard
              title="Total Requests"
              value={overview.total_requests}
              icon={BarChart3}
              color="purple"
            />
            <MetricCard
              title="Requests Today"
              value={overview.requests_today}
              icon={BarChart3}
              color="cyan"
            />
            <MetricCard
              title="Credits Used Today"
              value={overview.credits_consumed_today.toFixed(2)}
              icon={Zap}
              color="yellow"
            />
            <MetricCard
              title="Active Models"
              value={overview.active_models}
              icon={Settings}
              color="indigo"
            />
          </div>
        )}

        {/* Models Tab */}
        {activeTab === 'models' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">AI Models</h2>
            <div className="space-y-4">
              {models.map((model) => (
                <div key={model.id} className="glass-dark p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{model.name}</h3>
                      <p className="text-dark-400 text-sm">{model.description}</p>
                      <div className="mt-2 flex gap-4 text-sm text-dark-500">
                        <span>Model ID: {model.model_id}</span>
                        <span>Credits: {model.credits_per_request}</span>
                        {model.context_window && (
                          <span>Context: {model.context_window}k</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={model.enabled}
                          onChange={() => handleToggleModel(model.id, model.enabled)}
                          className="w-4 h-4 rounded bg-dark-800 border border-dark-600"
                        />
                        <span className="text-sm">Enabled</span>
                      </label>

                      <button
                        onClick={() => handleDeleteModel(model.id)}
                        className="text-red-400 hover:text-red-300 text-sm font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left py-3 px-4 text-dark-400 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-semibold">Credits</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-dark-800 hover:bg-dark-800">
                      <td className="py-3 px-4">{user.name || 'Unknown'}</td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1">
                          <Zap size={16} className="text-yellow-500" />
                          {user.credits.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-dark-500 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">AI Tools</h2>
            <div className="space-y-4">
              {tools.map((tool) => (
                <div key={tool.id} className="glass-dark p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{tool.name}</h3>
                      <p className="text-dark-400 text-sm">{tool.description}</p>
                      <div className="mt-2 flex gap-4 text-sm text-dark-500">
                        {tool.category && <span>Category: {tool.category}</span>}
                        {tool.compatible_models.length > 0 && (
                          <span>Models: {tool.compatible_models.join(', ')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-semibold ${
                          tool.enabled ? 'text-green-400' : 'text-dark-500'
                        }`}
                      >
                        {tool.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    cyan: 'text-cyan-400',
    yellow: 'text-yellow-400',
    indigo: 'text-indigo-400',
  };

  return (
    <div className="glass-dark p-6 rounded-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-dark-400 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>

        <Icon size={32} className={colorMap[color]} />
      </div>
    </div>
  );
}
