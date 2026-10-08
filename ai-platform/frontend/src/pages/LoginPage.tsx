import { useState } from 'react';
import { Github, Lock } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../services/api';

export default function LoginPage() {
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setDeveloper } = useAuthStore();

  const handleGitHubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_GITHUB_REDIRECT_URI;
    const scope = 'user:email';

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    window.location.href = authUrl;
  };

  const handleDeveloperLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await apiClient.developerLogin(devCode);
      setDeveloper(true);
      window.location.href = '/developer';
    } catch (err) {
      setError('Invalid developer code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 gradient-text">AI Platform</h1>
          <p className="text-dark-400">Unified AI Interface</p>
        </div>

        {/* Main card */}
        <div className="glass-dark p-8 rounded-2xl">
          {!showDevLogin ? (
            <>
              {/* User Login */}
              <h2 className="text-xl font-semibold mb-6">Get Started</h2>

              <button
                onClick={handleGitHubLogin}
                className="w-full bg-dark-800 hover:bg-dark-700 border border-dark-600 hover:border-dark-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
              >
                <Github size={20} />
                Continue with GitHub
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-dark-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-dark-900 text-dark-500">or</span>
                </div>
              </div>

              <button
                onClick={() => setShowDevLogin(true)}
                className="w-full border border-dark-600 hover:border-dark-500 text-dark-300 hover:text-dark-200 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Lock size={20} />
                Developer Access
              </button>

              <p className="text-xs text-dark-500 text-center mt-6">
                New users get 10 free credits automatically
              </p>
            </>
          ) : (
            <>
              {/* Developer Login */}
              <button
                onClick={() => setShowDevLogin(false)}
                className="mb-4 text-dark-400 hover:text-dark-300 text-sm flex items-center gap-1"
              >
                ← Back
              </button>

              <h2 className="text-xl font-semibold mb-4">Developer Login</h2>

              <form onSubmit={handleDeveloperLogin}>
                <div className="mb-4">
                  <input
                    type="password"
                    placeholder="Enter developer code"
                    value={devCode}
                    onChange={(e) => setDevCode(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-600 focus:border-purple-500 text-white placeholder-dark-500 py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-dark-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {isLoading ? 'Verifying...' : 'Access Dashboard'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-dark-500 text-center mt-6">
          © 2024 AI Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
}
