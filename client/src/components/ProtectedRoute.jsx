import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00AABB] mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check if user has required role (only if roles are specified)
  if (allowedRoles.length > 0 && (!user?.role || !allowedRoles.includes(user.role))) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export default ProtectedRoute