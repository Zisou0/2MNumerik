import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { orderAPI, userAPI } from '../utils/api'

function HomePage() {
  const { user } = useAuth()
  const [data, setData] = useState({
    orders: [],
    stats: {},
    users: [],
    urgentOrders: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      if (user?.role === 'admin') {
        // Admin gets business overview and team info
        const [statsRes, usersRes] = await Promise.all([
          orderAPI.getOrderStats(),
          userAPI.getUsers()
        ])
        
        setData({
          stats: statsRes.stats || {},
          users: usersRes.users || [],
          orders: [],
          urgentOrders: []
        })
      } else {
        // Regular users get minimal data
        setData({
          stats: {},
          users: [],
          orders: [],
          urgentOrders: []
        })
      }
    } catch (error) {
      console.error('Error fetching homepage data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityLevel = (order) => {
    if (!order.date_limite_livraison_estimee) return 'normal'
    
    const deliveryDate = new Date(order.date_limite_livraison_estimee)
    const now = new Date()
    
    // If estimated work time is provided, calculate when work must start
    if (order.estimated_work_time_minutes) {
      const workTimeMs = order.estimated_work_time_minutes * 60 * 1000 // Convert minutes to milliseconds
      const latestStartTime = new Date(deliveryDate.getTime() - workTimeMs)
      
      // Check if we're past the latest start time
      if (now >= latestStartTime) return 'urgent'
      
      // Check how much time remains before we must start
      const timeUntilStart = latestStartTime.getTime() - now.getTime()
      const hoursUntilStart = timeUntilStart / (1000 * 60 * 60)
      
      // If we need to start within 24 hours, it's high priority
      if (hoursUntilStart <= 24) return 'high'
      
      return 'normal'
    }
    
    // Fallback to old logic if no estimated work time is set
    const diffDays = Math.ceil((deliveryDate - now) / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 1) return 'urgent'
    if (diffDays <= 3) return 'high'
    return 'normal'
  }

  const getStatusColor = (status) => {
    const colors = {
      'problem_technique': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'en_cours': 'bg-blue-100 text-blue-800 border-blue-200',
      'termine': 'bg-green-100 text-green-800 border-green-200',
      'livre': 'bg-purple-100 text-purple-800 border-purple-200',
      'annule': 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatStatus = (status) => {
    const statusMap = {
      'problem_technique': 'Problème technique',
      'en_cours': 'En cours',
      'termine': 'Terminé',
      'livre': 'Livré',
      'annule': 'Annulé'
    }
    return statusMap[status] || status
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Admin Homepage
  if (user?.role === 'admin') {
    return (
      <div className="space-y-10">
        {/* Admin Hero Section */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 rounded-3xl p-10 text-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Centre de Pilotage
                </h1>
                <p className="text-xl text-slate-300 mb-6">
                  Tableau de bord administrateur 2MNumerik
                </p>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-200 font-medium">Système opérationnel</span>
                  </div>
                  <div className="text-slate-400">
                    {new Date().toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="text-4xl font-bold mb-1">{data.stats.total || 0}</div>
                  <div className="text-slate-300">Commandes totales</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Business Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg group-hover:shadow-red-200 transition-all">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{data.stats.problem_technique || 0}</p>
              <p className="text-red-600 text-sm font-semibold uppercase tracking-wide">Problème Technique</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:shadow-blue-200 transition-all">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{data.stats.en_cours || 0}</p>
              <p className="text-blue-600 text-sm font-semibold uppercase tracking-wide">En Production</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg group-hover:shadow-green-200 transition-all">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{(data.stats.termine || 0) + (data.stats.livre || 0)}</p>
              <p className="text-green-600 text-sm font-semibold uppercase tracking-wide">Terminées</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg group-hover:shadow-orange-200 transition-all">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{data.stats.annule || 0}</p>
              <p className="text-orange-600 text-sm font-semibold uppercase tracking-wide">Annulées</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-purple-200 transition-all">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{data.users.length}</p>
              <p className="text-purple-600 text-sm font-semibold uppercase tracking-wide">Équipe Active</p>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Management Tools */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center mb-8">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 8.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Outils de Gestion</h3>
            </div>
            
            <div className="space-y-4">
              <a href="/dashboard" className="flex items-center p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-300 group border border-blue-200">
                <div className="p-3 bg-blue-500 rounded-lg mr-4 group-hover:bg-blue-600 transition-colors">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-blue-700 text-lg">Tableau de Bord</span>
                  <p className="text-blue-600 text-sm">Gérer toutes les commandes</p>
                </div>
              </a>

              <a href="/management" className="flex items-center p-5 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all duration-300 group border border-purple-200">
                <div className="p-3 bg-purple-500 rounded-lg mr-4 group-hover:bg-purple-600 transition-colors">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-purple-700 text-lg">Gestion Équipe</span>
                  <p className="text-purple-600 text-sm">Administrer les utilisateurs</p>
                </div>
              </a>

              <a href="/products" className="flex items-center p-5 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl hover:from-orange-100 hover:to-orange-200 transition-all duration-300 group border border-orange-200">
                <div className="p-3 bg-orange-500 rounded-lg mr-4 group-hover:bg-orange-600 transition-colors">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-orange-700 text-lg">Catalogue Produits</span>
                  <p className="text-orange-600 text-sm">Gérer les produits</p>
                </div>
              </a>

              <a href="/statistics" className="flex items-center p-5 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl hover:from-indigo-100 hover:to-indigo-200 transition-all duration-300 group border border-indigo-200">
                <div className="p-3 bg-indigo-500 rounded-lg mr-4 group-hover:bg-indigo-600 transition-colors">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-indigo-700 text-lg">Statistiques</span>
                  <p className="text-indigo-600 text-sm">Analyser les performances</p>
                </div>
              </a>
            </div>
          </div>

          {/* Team Overview */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Équipe</h3>
              </div>
              <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-medium">
                {data.users.length} membres
              </span>
            </div>
            
            <div className="space-y-4">
              {data.users.slice(0, 6).map((teamUser) => (
                <div key={teamUser.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                      {teamUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{teamUser.username}</p>
                      <p className="text-sm text-gray-600 capitalize">{teamUser.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm text-green-600 font-medium">En ligne</span>
                  </div>
                </div>
              ))}
              {data.users.length > 6 && (
                <a href="/management" className="block text-center py-3 text-blue-600 hover:text-blue-700 font-medium border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-300 transition-colors">
                  Voir tous les membres ({data.users.length})
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Regular User Homepage
  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-12 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-8.837-7.163-16-16-16V0c11.046 0 20 8.954 20 20s-8.954 20-20 20v-4c8.837 0 16-7.163 16-16z'/%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="relative z-10">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
              Bienvenue {user?.username} 🎨
            </h1>
            <p className="text-2xl text-emerald-100 mb-8 max-w-3xl mx-auto">
              Votre espace personnel 2MNumerik pour gérer vos projets d'impression
            </p>
            <div className="flex items-center justify-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-emerald-300 rounded-full animate-pulse"></div>
                <span className="text-emerald-200 font-medium">Connecté</span>
              </div>
              <div className="text-emerald-300">
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  day: 'numeric',
                  month: 'long'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`grid grid-cols-1 gap-8 ${(user?.role === 'admin' || user?.role === 'commercial') ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {/* Only show "Nouvelle Commande" for admin and commercial users */}
        {(user?.role === 'admin' || user?.role === 'commercial') && (
          <a href="/dashboard" className="group bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
            <div className="flex flex-col items-center text-center">
              <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:shadow-blue-200 transition-all mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-3">Nouvelle Commande</h3>
              <p className="text-gray-600 text-lg leading-relaxed">Créer une nouvelle commande d'impression personnalisée</p>
            </div>
          </a>
        )}

        <a href="/dashboard" className="group bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-green-200">
          <div className="flex flex-col items-center text-center">
            <div className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg group-hover:shadow-green-200 transition-all mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors mb-3">Mes Commandes</h3>
            <p className="text-gray-600 text-lg leading-relaxed">Suivre l'état et l'avancement de vos commandes</p>
          </div>
        </a>

        <a href="/history" className="group bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-orange-200">
          <div className="flex flex-col items-center text-center">
            <div className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:shadow-orange-200 transition-all mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors mb-3">Historique</h3>
            <p className="text-gray-600 text-lg leading-relaxed">Consulter les commandes terminées et annulées</p>
          </div>
        </a>
      </div>

      

      {/* User Profile */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex items-center mb-8">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mr-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Mon Profil</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm text-gray-600 mb-1">Utilisateur</p>
            <p className="font-bold text-gray-900 text-lg">{user?.username}</p>
          </div>
          
          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">Adresse email</p>
            <p className="font-bold text-gray-900 text-lg break-all">{user?.email}</p>
          </div>
          
          <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">Statut du compte</p>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span className="font-bold text-green-700 text-lg">Actif</span>
            </div>
          </div>
          
          <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">Membre depuis</p>
            <p className="font-bold text-gray-900 text-lg">{formatDate(user?.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage