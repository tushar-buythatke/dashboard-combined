import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'


interface User {
  userId: number
  userName?: string
}

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
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  const checkAuth = async () => {
    // Mock auth check - always return true if we have a user in localStorage, else false
    // For simplicity in this session, we'll just check if we have state, or maybe check localStorage
    const stored = localStorage.getItem('mock_auth_user');
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }

  const login = async (userName: string, password: string) => {
    setIsLoading(true);
    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === '123456') {
      if (userName === 'admin') {
        const userData = { userId: 0, userName: 'admin' };
        setUser(userData);
        localStorage.setItem('mock_auth_user', JSON.stringify(userData));
        setIsLoading(false);
        return { success: true };
      } else if (userName === 'user') {
        const userData = { userId: 1, userName: 'user' };
        setUser(userData);
        localStorage.setItem('mock_auth_user', JSON.stringify(userData));
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
    localStorage.removeItem('mock_auth_user');
    setUser(null);
    setIsLoading(false);
  }

  // Check authentication status on mount
  useEffect(() => {
    // Only check auth if we don't already have a user
    if (!user) {
      // Wrap in timeout to avoid potential router issues
      const timer = setTimeout(() => {
        checkAuth()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, []) // Remove user dependency to avoid re-running after login

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