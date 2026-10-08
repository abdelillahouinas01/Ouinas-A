import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../services/api';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait a moment for the backend to set the session cookie
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch user data
        const data = await apiClient.getCurrentUser();
        login(data.user, data.credits);

        // Redirect to chat
        navigate('/chat');
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/');
      }
    };

    handleCallback();
  }, [login, navigate]);

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-dark-400">Completing authentication...</p>
      </div>
    </div>
  );
}
