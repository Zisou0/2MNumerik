import { useState, useRef, useEffect } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import logoPrimary from '../assets/logoprimary.png'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import AlertDialog from '../components/AlertDialog'
import NotificationContainer from '../components/NotificationContainer'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell, faCrosshairs } from '@fortawesome/free-solid-svg-icons'

function Layout({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const notificationRef = useRef(null)
  const location = useLocation()
  const { user } = useAuth()
  const { notifications, removeNotification, clearAllNotifications } = useNotifications()
  const isActive = (path) => location.pathname === path

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get urgent notifications count (including overdue)
  const urgentNotifications = notifications.filter(n => n.priority === 'urgent' || n.priority === 'overdue')
  const totalNotifications = notifications.length

  const handleLogoutClick = () => {
    setShowLogoutDialog(true)
  }

  const handleLogoutConfirm = () => {
    setShowLogoutDialog(false)
    onLogout()
  }

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false)
  }

  const handleFilterClick = () => {
    // Scroll to the filter section in dashboard with offset for fixed navbar
    const filterSection = document.querySelector('.filter-section')
    if (filterSection) {
      const navbarHeight = 80 // Approximate navbar height + some padding
      const elementPosition = filterSection.getBoundingClientRect().top + window.pageYOffset
      const offsetPosition = elementPosition - navbarHeight
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Alert Dialog */}
      <AlertDialog
        isOpen={showLogoutDialog}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        title="Confirmation de déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        confirmText="Se déconnecter"
        cancelText="Annuler"
        type="danger"
      />

      {/* Navbar */}
      <nav className="bg-white shadow-md px-6 py-4 fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md hover:bg-[#00AABB] hover:text-white md:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          {/* Right side - Filter icon (dashboard only), User info and notifications */}
          <div className="flex items-center gap-4">
            {/* Focus icon - only show on dashboard page */}
            {location.pathname === '/dashboard' && (
              <button 
                onClick={handleFilterClick}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 group"
                title="Aller aux filtres"
              >
                <FontAwesomeIcon 
                  icon={faCrosshairs} 
                  className="w-5 h-5 text-gray-600 group-hover:text-[#00AABB] transition-colors duration-200" 
                />
              </button>
            )}

            {/* Notification dropdown */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="p-2 rounded-full hover:bg-gray-100 relative transition-colors duration-200"
              >
                <FontAwesomeIcon 
                  icon={faBell} 
                  className={`w-5 h-5 transition-colors duration-200 ${
                    urgentNotifications.length > 0 ? 'text-red-500' : 'text-gray-600'
                  }`} 
                />
                {/* Notification badge */}
                {totalNotifications > 0 && (
                  <span className={`absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center transition-colors duration-200 ${
                    urgentNotifications.length > 0 ? 'bg-red-500' : 'bg-blue-500'
                  }`}>
                    {totalNotifications > 9 ? '9+' : totalNotifications}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Notifications ({totalNotifications})
                    </h3>
                    {totalNotifications > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Tout effacer
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-500 text-sm">
                        Aucune notification
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                            notification.priority === 'overdue' ? 'bg-red-100 border-red-200' :
                            notification.priority === 'urgent' ? 'bg-red-50 border-red-100' :
                            notification.priority === 'high' ? 'bg-orange-50 border-orange-100' :
                            'bg-white'
                          }`}
                          onClick={() => removeNotification(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {notification.priority === 'overdue' ? (
                                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                              ) : notification.priority === 'urgent' ? (
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              ) : notification.priority === 'high' ? (
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              ) : (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              {notification.orderNumber && (
                                <p className="text-xs text-gray-500 mt-1 font-mono">
                                  {notification.orderNumber}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.timestamp.toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* User avatar and info */}
            {user && (
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 bg-[#00AABB] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                {/* User name and role */}
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user.role}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className={`bg-white shadow-md ${sidebarCollapsed ? 'md:w-16' : 'md:w-64'} w-64 fixed left-0 top-0 bottom-0 z-50 transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}>
          <nav className="p-4 h-full flex flex-col">
            {/* Hamburger menu and logo container */}
            <div className="flex items-center justify-between mb-4">
              {/* Mobile close button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-md hover:bg-[#00AABB] hover:text-white md:hidden"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Logo */}
              <Link to="/" className="hidden md:flex justify-center">
                <img 
                  src={logoPrimary} 
                  alt="" 
                  className={`${sidebarCollapsed ? 'md:w-8 md:h-4' : 'md:w-32 md:h-16'} w-32 h-16 transition-all duration-300`}
                />
              </Link>
              
              {/* Desktop hamburger menu for sidebar collapse */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md hover:bg-[#00AABB] hover:text-white hidden md:block"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            {/* Main navigation items */}
            <ul className="space-y-2 flex-1">
              <li>
                <Link to="/" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Accueil</span>
              </Link>
              </li>
              <li>
                <Link to="/dashboard" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/dashboard') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21l4-4 4 4" />
                  </svg>
                  <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link to="/history" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/history') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Historique</span>
                </Link>
              </li>
              {user?.role === 'admin' && (
                <li>
                  <Link to="/products" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                    isActive('/products') 
                      ? 'bg-[#00AABB] text-white' 
                      : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Products</span>
                  </Link>
                </li>
              )}
              {(user?.role === 'admin' || user?.role === 'commercial') && (
                <li>
                  <Link to="/clients" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                    isActive('/clients') 
                      ? 'bg-[#00AABB] text-white' 
                      : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v1M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Clients</span>
                  </Link>
                </li>
              )}
              {(user?.role === 'admin' || user?.role === 'atelier') && (
                <li>
                  <Link to="/atelier-tasks" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                    isActive('/atelier-tasks') 
                      ? 'bg-[#00AABB] text-white' 
                      : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Tâches d'atelier</span>
                  </Link>
                </li>
              )}
              {(user?.role === 'admin' || user?.role === 'atelier') && (
                <li>
                  <Link to="/history-atelier-tasks" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                    isActive('/history-atelier-tasks') 
                      ? 'bg-[#00AABB] text-white' 
                      : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Historique tâches</span>
                  </Link>
                </li>
              )}
              {user?.role === 'admin' && (
                <li>
                  <Link to="/statistics" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                    isActive('/statistics') 
                      ? 'bg-[#00AABB] text-white' 
                      : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
                    </svg>
                    <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Statistiques</span>
                  </Link>
                </li>
              )}
              {(user?.role === 'admin' || user?.role === 'atelier') && (
                <li>
                  <Link to="/stock" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                    isActive('/stock') 
                      ? 'bg-[#00AABB] text-white' 
                      : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Gestion Stock</span>
                  </Link>
                </li>
              )}
                {user?.role==='admin' &&(
                   <li>
                <Link to="/management" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/management') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Management</span>
                </Link>
              </li>
                )}
             
              
            </ul>

            {/* Bottom navigation items */}
            <ul className="space-y-2 mt-4">
              {user?.role === 'admin' && (
                <li>
                  <Link to="/settings" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                    isActive('/settings') 
                      ? 'bg-[#00AABB] text-white' 
                      : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Settings</span>
                  </Link>
                </li>
              )}
             <li>
  <button 
    onClick={handleLogoutClick}
    className={`w-full flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} text-gray-700 hover:bg-[#00AABB] hover:text-white`}
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
    <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Déconnexion</span>
  </button>
</li>
            </ul>
          </nav>
        </aside>

       
      </div>
      {/* Main Content */}
      <main className={`flex-1 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'} max-w-full mx-auto p-4 transition-all duration-300`}>
        <Outlet /> {/* This renders the child routes */}
      </main>
      
      {/* Notification Container for popup notifications */}
      <NotificationContainer />
    </div>
  )
}

export default Layout