import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import apiClient from './services/api';
import './styles/globals.css';

// Pages
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import DeveloperDashboard from './pages/DeveloperDashboard';
import AuthCallback from './pages/AuthCallback';

function App() {
  const { user, isDeveloper, setDeveloper, login } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const data = await apiClient.getCurrentUser();
        login(data.user, data.credits);
      } catch (error) {
        // User not authenticated
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [login]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-dark-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={user ? <Navigate to="/chat" /> : <LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected user routes */}
        <Route
          path="/chat"
          element={user && !isDeveloper ? <ChatPage /> : <Navigate to="/" />}
        />

        {/* Protected developer routes */}
        <Route
          path="/developer/*"
          element={isDeveloper ? <DeveloperDashboard /> : <Navigate to="/" />}
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
