import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import LoginPage from './pages/Login'
import HomePage from './pages/HomePage'
import ManagementPage from './pages/ManagementPage' 
import ProductsPage from './pages/ProductsPage'
import ClientsPage from './pages/ClientsPage'
import HistoryOrdersPage from './pages/HistoryOrdersPage'
import HistoryAtelierTasksPage from './pages/HistoryAtelierTasksPage'
import StatisticsPage from './pages/StatisticsPage'
import AtelierTasksPage from './pages/AtelierTasksPage'
import Layout from './layout/Layout'
import RegisterPage from './pages/RegisterPage'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPageClean from './pages/DashboardPageClean'
import UnauthorizedPage from './pages/UnauthorizedPage'
import SettingsPage from './pages/SettingsPage'
import StockManagementPage from './pages/StockManagementPage'


// Separate component to use auth context
function AppRoutes() {
  const { isAuthenticated, logout } = useAuth()

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/register" 
        element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/unauthorized" 
        element={<UnauthorizedPage/>} // Replace with UnauthorizedPage component
      />
      
      {/* Protected routes with layout - no role restriction */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout onLogout={logout} />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        
        {/* Admin-only routes */}
        <Route 
          path="/management" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ManagementPage/> {/* Replace with AdminPage component */}
            </ProtectedRoute>
          } 
        />
        
        {/* Routes for both admin and manager */}
        <Route 
          path="management" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <div>Management Page</div> {/* Replace with ManagementPage component */}
            </ProtectedRoute>
          } 
        />
        {/* Admin-only statistics route */}
        <Route 
          path="statistics" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <StatisticsPage />
            </ProtectedRoute>
          } 
        />
        
        <Route path="dashboard" element={<DashboardPageClean />} />
        <Route path="history" element={<HistoryOrdersPage />} />
        <Route 
          path="history-atelier-tasks" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'atelier']}>
              <HistoryAtelierTasksPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="products" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ProductsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="clients" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'commercial']}>
              <ClientsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="atelier-tasks" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'atelier']}>
              <AtelierTasksPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="stock" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'atelier']}>
              <StockManagementPage />
            </ProtectedRoute>
          } 
        />
        {/* Admin-only settings route */}
        <Route 
          path="settings" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SettingsPage />
            </ProtectedRoute>
          } 
        />
        
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <WebSocketProvider>
          <Router>
            <AppRoutes />
          </Router>
        </WebSocketProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App