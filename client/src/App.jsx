import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Investments from './pages/Investments';
import Goals from './pages/Goals';
import Portfolio from './pages/Portfolio';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import LoadingSpinner from './components/LoadingSpinner';

// Protected Route component (with contexts)
const ProtectedRoute = ({ children }) => {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <ProtectedRouteInner>{children}</ProtectedRouteInner>
      </CurrencyProvider>
    </AuthProvider>
  );
};

// Inner protected route component
const ProtectedRouteInner = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route component (with auth context only)
const PublicRoute = ({ children }) => {
  return (
    <AuthProvider>
      <PublicRouteInner>{children}</PublicRouteInner>
    </AuthProvider>
  );
};

// Inner public route component
const PublicRouteInner = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return !isAuthenticated ? children : <Navigate to="/app/dashboard" replace />;
};

// Main App Routes
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      <Route path="/app" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="investments" element={<Investments />} />
        <Route path="goals" element={<Goals />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Main App Component
const App = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppRoutes />
    </div>
  );
};

export default App;
