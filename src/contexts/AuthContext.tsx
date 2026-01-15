import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'


interface User {
  userId: number
  userName?: string
}

const SESSION_EXPIRY = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds per user request
const LOCAL_STORAGE_KEY = 'mock_auth_user';

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (userName: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize user state synchronously from localStorage to prevent flash
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return null;
      const { user: savedUser, expiry } = JSON.parse(stored);
      if (expiry && Date.now() < expiry) {
        console.log('✅ Valid local session found (Combined Auth)');
        return savedUser;
      }
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return null;
    } catch {
      return null;
    }
  })
  const [isLoading, setIsLoading] = useState(false) // Already checked synchronously above

  const isAuthenticated = !!user

  const checkAuth = async () => {
    // Mock auth check - always return true if we have a user in localStorage, else false
    // For simplicity in this session, we'll just check if we have state, or maybe check localStorage
    setIsLoading(true);
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const { user: savedUser, expiry } = JSON.parse(stored);
        if (expiry && Date.now() < expiry) {
          setUser(savedUser);
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  const login = async (userName: string, password: string) => {
    setIsLoading(true);
    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === '123456') {
      if (userName === 'admin') {
        const userData = { userId: 0, userName: 'admin' };
        setUser(userData);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
          user: userData,
          expiry: Date.now() + SESSION_EXPIRY
        }));
        setIsLoading(false);
        return { success: true };
      } else if (userName === 'user') {
        const userData = { userId: 1, userName: 'user' };
        setUser(userData);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
          user: userData,
          expiry: Date.now() + SESSION_EXPIRY
        }));
        setIsLoading(false);
        return { success: true };
      }
    }

    setIsLoading(false);
    return { success: false, error: 'Invalid credentials' };
  }

  const logout = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setUser(null);
    setIsLoading(false);
  }

  // Note: Auth check is now done synchronously during initialization
  // This useEffect is kept for potential future async auth checks if needed
  // but currently not needed since we check localStorage synchronously

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}