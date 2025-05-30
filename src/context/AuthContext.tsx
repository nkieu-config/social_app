import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  bio?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
  updateUser: (userData: Partial<User>) => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = 'http://localhost:3001/api';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(() => {
    const storedToken = localStorage.getItem('token');
    
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      // Decode token to check if it's expired
      const decodedToken: any = jwtDecode(storedToken);
      const currentTime = Date.now() / 1000;
      
      if (decodedToken.exp < currentTime) {
        // Token expired
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Token is valid, set up axios with token and fetch user data
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      
      axios.get(`${API_URL}/users/me`)
        .then(response => {
          setUser(response.data);
          setToken(storedToken);
          setIsLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setIsLoading(false);
        });
    } catch (error) {
      // Invalid token
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    setToken(token);
    setUser(user);
  };

  const register = async (username: string, email: string, password: string, fullName?: string) => {
    const response = await axios.post(`${API_URL}/auth/register`, { 
      username, 
      email, 
      password,
      fullName 
    });
    
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  const value = {
    isAuthenticated: !!token,
    isLoading,
    user,
    login,
    register,
    logout,
    checkAuth,
    updateUser,
    token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};