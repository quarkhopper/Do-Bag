// @ts-ignore
import React, { createContext, useContext, useState, useEffect } from 'react';
// @ts-ignore
import axios from 'axios';

// Define interfaces for API responses for better type safety
interface AuthResponse {
  token: string;
  emailVerified: boolean;
}

interface AxiosError {
  response?: {
    status: number;
    data: {
      message?: string;
    };
  };
  config?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };
}

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  emailVerified: boolean;
  login: (email: string, password: string) => Promise<{ emailVerified: boolean }>;
  signup: (email: string, password: string, name: string) => Promise<{ emailVerified: boolean }>;
  logout: () => void;
  resendVerification: (email: string) => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  devVerifyEmail: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Use type assertion for Vite's import.meta.env
const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
      
      // Check if email verification status is stored
      const savedEmailVerified = localStorage.getItem('emailVerified');
      if (savedEmailVerified) {
        setEmailVerified(savedEmailVerified === 'true');
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('emailVerified');
      setIsAuthenticated(false);
      setEmailVerified(false);
    }
  }, [token]);

  // When emailVerified changes, save it to localStorage
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('emailVerified', emailVerified.toString());
    }
  }, [emailVerified, isAuthenticated]);
  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/api/auth/login`, {
        email,
        password,
      });
      
      const verified = response.data.emailVerified;
      setEmailVerified(verified);
      setToken(response.data.token);
      
      return { emailVerified: verified };
    } catch (error) {
      console.error('Login error:', error);
      // @ts-ignore: axios type issues
      if (error && error.response && error.response.data && error.response.data.message) {
        // @ts-ignore: axios type issues
        throw new Error(error.response.data.message);
      }
      throw new Error('Login failed');
    }
  };
  const signup = async (email: string, password: string, name: string) => {
    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/api/auth/signup`, {
        email,
        password,
        name,
      });
      setToken(response.data.token);
      setEmailVerified(response.data.emailVerified || false);
      return { emailVerified: response.data.emailVerified || false };
    } catch (error) {
      console.error('Signup error:', error);
      // @ts-ignore: axios type issues
      if (error && error.response && error.response.data) {
        // @ts-ignore: axios type issues
        throw new Error(error.response.data.message || 'Signup failed');
      }
      throw new Error('Network error - please check your connection');
    }
  };
  const resendVerification = async (email: string) => {
    try {
      await axios.post(`${API_URL}/api/auth/resend-verification`, { email });
    } catch (error) {
      console.error('Resend verification error:', error);
      // @ts-ignore: axios type issues
      if (error && error.response && error.response.data) {
        // @ts-ignore: axios type issues
        throw new Error(error.response.data.message || 'Failed to resend verification email');
      }
      throw new Error('Network error - please check your connection');
    }
  };
  const deleteAccount = async (): Promise<boolean> => {
    try {
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      // IMPORTANT: Fixed URL construction
      // For this environment, we should use a simple relative URL instead of absolute
      const url = '/api/auth/delete-account';
      
      // Debug information
      console.log('Deleting account with URL:', url);
      console.log('Using auth token:', token.substring(0, 10) + '...');
      
      const response = await axios.delete(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Delete account response:', response);
      
      // Log out after successful deletion
      logout();
      return true;
    } catch (error) {
      console.error('Delete account error:', error);
      
      // @ts-ignore: axios type issues
      if (error && typeof error === 'object') {
        // @ts-ignore: axios type issues
        console.error('API Error details:', {
          // @ts-ignore: axios type issues
          status: error.response?.status,
          // @ts-ignore: axios type issues
          url: error.config?.url,
          // @ts-ignore: axios type issues
          method: error.config?.method,
          // @ts-ignore: axios type issues
          headers: error.config?.headers,
          // @ts-ignore: axios type issues
          data: error.response?.data
        });
        
        // @ts-ignore: axios type issues
        if (error.response && error.response.data) {
          // @ts-ignore: axios type issues
          throw new Error(error.response.data.message || 'Failed to delete account');
        }
      }
      
      throw new Error('Network error - please check your connection');
      return false;
    }
  };

  const logout = () => {
    setToken(null);
  };
  // FOR DEVELOPMENT ONLY: Manually verify email without needing to click the link
  const devVerifyEmail = async (email: string): Promise<boolean> => {
    try {
      console.log('Development: Manually verifying email:', email);
      const response = await axios.post('/api/auth/dev-verify-email', { email });
      
      // @ts-ignore: response.data typing issue
      if (response.data && response.data.emailVerified) {
        // Update local state
        setEmailVerified(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Development verification error:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      token, 
      emailVerified,
      login, 
      signup, 
      logout,
      resendVerification,
      deleteAccount,
      devVerifyEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}