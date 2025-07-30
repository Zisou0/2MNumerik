import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../utils/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await authAPI.getProfile()
      setUser(response.user)
      setIsAuthenticated(true)
      localStorage.setItem('user', JSON.stringify(response.user))
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem('user')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials)
      setUser(response.user)
      setIsAuthenticated(true)
      localStorage.setItem('user', JSON.stringify(response.user))
      return response
    } catch (error) {
      throw error
    }
  }

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData)
      setUser(response.user)
      setIsAuthenticated(true)
      localStorage.setItem('user', JSON.stringify(response.user))
      return response
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem('user')
    }
  }

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkAuthStatus,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
