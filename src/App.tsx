import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import ExplorePage from './pages/ExplorePage';
import MessagesPage from './pages/MessagesPage';
import ConversationPage from './pages/ConversationPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import PostDetailPage from './pages/PostDetailPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { checkAuth, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="spinner w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} 
      />
      <Route 
        path="/register" 
        element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} 
      />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:userId" element={<ConversationPage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/post/:postId" element={<PostDetailPage />} />
        </Route>
      </Route>

      {/* Redirect all other routes */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
    </Routes>
  );
}

export default App;