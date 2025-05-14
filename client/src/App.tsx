import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Tasks } from './pages/Tasks';  // This is your existing task list component
import { EmailVerified } from './pages/EmailVerified';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, emailVerified } = useAuth();
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If authenticated but email not verified, redirect to a verification required page
  if (!emailVerified) {
    return <Navigate 
      to="/login" 
      replace 
      state={{ needsVerification: true }} 
    />;
  }
  
  // Otherwise, render the children
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, emailVerified } = useAuth();
  
  if (isAuthenticated) {
    // If authenticated and email is verified, go to tasks
    if (emailVerified) {
      return <Navigate to="/tasks" replace />;
    }
    // If authenticated but email not verified, allow them to stay on login/signup
    // so they can see verification messages
  }
  
  // Not authenticated, show the public route
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignUp />
              </PublicRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <PrivateRoute>
                <Tasks />
              </PrivateRoute>
            }
          />
          <Route path="/email-verified" element={<EmailVerified />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App; 