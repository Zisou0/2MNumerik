import { useState, useEffect, useMemo } from 'react'
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar
} from 'recharts'
import { statisticsAPI, clientAPI } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

function StatisticsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState(null)
  const [timeFrame, setTimeFrame] = useState('last30days')
  const [monthsToShow, setMonthsToShow] = useState('12')
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [error, setError] = useState(null)
  
  // Client statistics state
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientStatistics, setClientStatistics] = useState(null)
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [clientSearchResults, setClientSearchResults] = useState([])
  const [loadingClientStats, setLoadingClientStats] = useState(false)
  const [clientStatsError, setClientStatsError] = useState(null)

  // Employee statistics state
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [employeeStatistics, setEmployeeStatistics] = useState(null)
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')
  const [employeeSearchResults, setEmployeeSearchResults] = useState([])
  const [loadingEmployeeStats, setLoadingEmployeeStats] = useState(false)
  const [employeeStatsError, setEmployeeStatsError] = useState(null)

  useEffect(() => {
    fetchStatistics()
  }, [timeFrame, monthsToShow])

  // Refresh client statistics when timeFrame changes
  useEffect(() => {
    if (selectedClient) {
      fetchClientStatistics(selectedClient.id)
    }
  }, [timeFrame, monthsToShow, customDateRange])

  // Refresh employee statistics when timeFrame changes
  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeStatistics(selectedEmployee.id)
    }
  }, [timeFrame, monthsToShow, customDateRange])

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = { timeFrame, monthsToShow }
      if (timeFrame === 'custom' && customDateRange.startDate && customDateRange.endDate) {
        params.startDate = customDateRange.startDate
        params.endDate = customDateRange.endDate
      }
      
      const response = await statisticsAPI.getBusinessStats(params)
      setStatistics(response.data)
    } catch (err) {
      console.error('Error fetching statistics:', err)
      setError('Erreur lors du chargement des statistiques')
    } finally {
      setLoading(false)
    }
  }

  const handleTimeFrameChange = (newTimeFrame) => {
    setTimeFrame(newTimeFrame)
  }

  const handleCustomDateSubmit = () => {
    if (customDateRange.startDate && customDateRange.endDate) {
      fetchStatistics()
    }
  }

  // Client search and statistics functions
  const searchClients = async (query) => {
    if (query.length < 2) {
      setClientSearchResults([])
      return
    }
    
    try {
      const response = await clientAPI.searchClients(query)
      setClientSearchResults(response.clients || [])
    } catch (error) {
      console.error('Error searching clients:', error)
      setClientSearchResults([])
    }
  }

  const selectClient = (client) => {
    setSelectedClient(client)
    setClientSearchQuery(client.nom)
    setClientSearchResults([])
    fetchClientStatistics(client.id)
  }

  const fetchClientStatistics = async (clientId) => {
    try {
      setLoadingClientStats(true)
      setClientStatsError(null)
      
      const params = { timeFrame, monthsToShow }
      if (timeFrame === 'custom' && customDateRange.startDate && customDateRange.endDate) {
        params.startDate = customDateRange.startDate
        params.endDate = customDateRange.endDate
      }
      
      const response = await clientAPI.getClientDetailedStats(clientId, params)
      setClientStatistics(response)
    } catch (err) {
      console.error('Error fetching client statistics:', err)
      setClientStatsError('Erreur lors du chargement des statistiques du client')
    } finally {
      setLoadingClientStats(false)
    }
  }

  const clearClientSelection = () => {
    setSelectedClient(null)
    setClientStatistics(null)
    setClientSearchQuery('')
    setClientSearchResults([])
    setClientStatsError(null)
  }

  // Employee search and statistics functions
  const searchEmployees = async (query) => {
    if (query.length < 2) {
      setEmployeeSearchResults([])
      return
    }
    
    try {
      const response = await statisticsAPI.searchEmployees(query)
      setEmployeeSearchResults(response.users || [])
    } catch (error) {
      console.error('Error searching employees:', error)
      setEmployeeSearchResults([])
    }
  }

  const selectEmployee = (employee) => {
    setSelectedEmployee(employee)
    setEmployeeSearchQuery(employee.username)
    setEmployeeSearchResults([])
    fetchEmployeeStatistics(employee.id)
  }

  const fetchEmployeeStatistics = async (employeeId) => {
    try {
      setLoadingEmployeeStats(true)
      setEmployeeStatsError(null)
      
      const params = { timeFrame, monthsToShow }
      if (timeFrame === 'custom' && customDateRange.startDate && customDateRange.endDate) {
        params.startDate = customDateRange.startDate
        params.endDate = customDateRange.endDate
      }
      
      const response = await statisticsAPI.getEmployeeStats(employeeId, params)
      setEmployeeStatistics(response)
    } catch (err) {
      console.error('Error fetching employee statistics:', err)
      setEmployeeStatsError('Erreur lors du chargement des statistiques de l\'employé')
    } finally {
      setLoadingEmployeeStats(false)
    }
  }

  const clearEmployeeSelection = () => {
    setSelectedEmployee(null)
    setEmployeeStatistics(null)
    setEmployeeSearchQuery('')
    setEmployeeSearchResults([])
    setEmployeeStatsError(null)
  }

  // Calculate business metrics
  const getBusinessMetrics = () => {
    if (!statistics) return { activeOrders: 0, deliveredOrders: 0, completedOrders: 0, cancelledOrders: 0 };
    
    const byStatus = statistics.orders.byStatus || {};
    
    return {
      // Active orders = orders still being worked on (excluding termine and livre)
      activeOrders: (byStatus.problem_technique || 0) + (byStatus.en_cours || 0) + (byStatus.attente_validation || 0) + (byStatus.modification || 0),
      // Delivered orders for selected period
      deliveredOrders: byStatus.livre || 0,
      // Completed orders (ready for delivery)
      completedOrders: byStatus.termine || 0,
      // Cancelled orders
      cancelledOrders: byStatus.annule || 0,
      // Total including cancelled
      totalOrders: statistics.orders.total || 0
    };
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`
  }

  // Chart color schemes
  const CHART_COLORS = {
    primary: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6'],
    gradient: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'],
    workshop: {
      'petit format': '#3B82F6',
      'grand format': '#10B981', 
      'sous-traitance': '#8B5CF6',
      'soustraitance': '#8B5CF6',
      'service crea': '#F59E0B'
    },
    status: {
      'problem_technique': '#F59E0B',
      'en_cours': '#3B82F6',
      'attente_validation': '#F97316',
      'modification': '#6366F1',
      'termine': '#10B981',
      'livre': '#8B5CF6',
      'annule': '#EF4444'
    }
  }

  // Memoized chart data calculations
  const chartData = useMemo(() => {
    if (!statistics) return null;

    // Team performance data
    const teamData = Object.entries(statistics.team.commercialPerformance).map(([name, value]) => ({
      name: name.length > 10 ? name.substring(0, 10) + '...' : name,
      commercial: value,
      infographe: statistics.team.infographerPerformance[name] || 0
    }));

    // Monthly trend data
    const monthlyData = statistics.trends?.map(trend => ({
      ...trend,
      monthName: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][trend.month - 1],
      // For periods longer than 12 months, show year too
      displayName: parseInt(monthsToShow) > 12 
        ? `${['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][trend.month - 1]} ${trend.year}`
        : ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][trend.month - 1]
    })) || [];

    return { teamData, monthlyData };
  }, [statistics]);

  const businessMetrics = getBusinessMetrics();

  const getTimeFrameLabel = () => {
    const labels = {
      'last7days': 'Derniers 7 jours',
      'last30days': 'Derniers 30 jours',
      'last90days': 'Derniers 90 jours',
      'lastYear': 'Dernière année',
      'custom': 'Période personnalisée',
      'all': 'Toutes les données'
    }
    return labels[timeFrame] || 'Période sélectionnée'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Chargement des statistiques...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-800">{error}</span>
        </div>
        <button 
          onClick={fetchStatistics}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Aucune donnée disponible</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Clean Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 rounded-3xl p-8 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/5"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-white/5"></div>
        </div>
        
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold mb-2">📊 Analytics Dashboard</h1>
          <p className="text-lg text-indigo-100">Performance commerciale 2MNumerik</p>
          <p className="text-indigo-200 mt-1">Période: {getTimeFrameLabel()}</p>
        </div>
      </div>

      {/* Time Frame Selector */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Période d'analyse</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          {[
            { value: 'last7days', label: '7 jours' },
            { value: 'last30days', label: '30 jours' },
            { value: 'last90days', label: '90 jours' },
            { value: 'lastYear', label: '1 an' },
            { value: 'custom', label: 'Personnalisé' },
            { value: 'all', label: 'Tout' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => handleTimeFrameChange(option.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeFrame === option.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        {timeFrame === 'custom' && (
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
              <input
                type="date"
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
              <input
                type="date"
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <button
              onClick={handleCustomDateSubmit}
              disabled={!customDateRange.startDate || !customDateRange.endDate}
              className="mt-6 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Appliquer
            </button>
          </div>
        )}
      </div>

      {/* Business Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Active Orders */}
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center border-l-4 border-blue-500">
          <div className="flex items-center justify-center mb-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-blue-600 mb-1">{businessMetrics.activeOrders}</h2>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Commandes Actives</h3>
          <p className="text-sm text-gray-500">En cours de production</p>
          <div className="mt-2 text-xs text-blue-600">
            {businessMetrics.totalOrders > 0 ? formatPercentage((businessMetrics.activeOrders / businessMetrics.totalOrders) * 100) : '0%'} du total
          </div>
        </div>

        {/* Delivered Orders */}
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center border-l-4 border-green-500">
          <div className="flex items-center justify-center mb-3">
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-green-600 mb-1">{businessMetrics.deliveredOrders}</h2>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Commandes Livrées</h3>
          <p className="text-sm text-gray-500">Business finalisé avec succès</p>
          <div className="mt-2 text-xs text-green-600">
            {businessMetrics.totalOrders > 0 ? formatPercentage((businessMetrics.deliveredOrders / businessMetrics.totalOrders) * 100) : '0%'} du total
          </div>
        </div>

        {/* Completed Orders */}
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center border-l-4 border-purple-500">
          <div className="flex items-center justify-center mb-3">
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-purple-600 mb-1">{businessMetrics.completedOrders}</h2>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Prêtes à Livrer</h3>
          <p className="text-sm text-gray-500">Commandes terminées</p>
          <div className="mt-2 text-xs text-purple-600">
            {businessMetrics.totalOrders > 0 ? formatPercentage((businessMetrics.completedOrders / businessMetrics.totalOrders) * 100) : '0%'} du total
          </div>
        </div>

        {/* Total Orders (including cancelled) */}
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center border-l-4 border-gray-500">
          <div className="flex items-center justify-center mb-3">
            <div className="p-3 bg-gray-100 rounded-full">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-700 mb-1">{businessMetrics.totalOrders}</h2>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Total Commandes</h3>
          <p className="text-sm text-gray-500">Toutes commandes confondues</p>
          <div className="mt-2 text-xs text-red-600">
            {businessMetrics.cancelledOrders} annulées ({businessMetrics.totalOrders > 0 ? formatPercentage((businessMetrics.cancelledOrders / businessMetrics.totalOrders) * 100) : '0%'})
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Formats Overview */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Formats d'impression</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>🖨️ Petit:</span>
              <span className="font-medium text-blue-600">{statistics.orders.byWorkshop['petit format'] || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>🏗️ Grand:</span>
              <span className="font-medium text-green-600">{statistics.orders.byWorkshop['grand format'] || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>🤝 Sous-trait.:</span>
              <span className="font-medium text-purple-600">{(statistics.orders.byWorkshop['sous-traitance'] || statistics.orders.byWorkshop['soustraitance'] || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>🎨 Service Crea:</span>
              <span className="font-medium text-orange-600">{statistics.orders.byWorkshop['service crea'] || 0}</span>
            </div>
          </div>
        </div>

        {/* Orders Type Breakdown */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Type de Commandes</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>🚀 Express:</span>
              <span className="font-medium text-orange-600">{statistics.orders.express || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>📋 Standard:</span>
              <span className="font-medium text-blue-600">{statistics.orders.standard || 0}</span>
            </div>
          </div>
        </div>

        {/* Clients Overview */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <div className="w-6 h-6 text-green-600 flex items-center justify-center text-xl">
                👥
              </div>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Clients</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>📊 Total:</span>
              <span className="font-medium text-gray-900">{statistics.clients.total}</span>
            </div>
            <div className="flex justify-between">
              <span>✅ Actifs:</span>
              <span className="font-medium text-green-600">{statistics.clients.active}</span>
            </div>
            <div className="flex justify-between">
              <span>🆕 Nouveaux:</span>
              <span className="font-medium text-blue-600">{statistics.clients.new}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Workshop Categories Section - Enhanced Pie Chart */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">📋 Répartition par Format d'Impression</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Pie Chart */}
          <div className="lg:col-span-2 w-full h-64">
            {(() => {
              const petitFormat = statistics.orders.byWorkshop['petit format'] || 0;
              const grandFormat = statistics.orders.byWorkshop['grand format'] || 0;
              const sousTraitance = statistics.orders.byWorkshop['sous-traitance'] || statistics.orders.byWorkshop['soustraitance'] || 0;
              const serviceCrea = statistics.orders.byWorkshop['service crea'] || 0;
              
              const data = [
                { 
                  name: 'Petit Format', 
                  value: petitFormat, 
                  color: '#3B82F6',
                  icon: '🖨️'
                },
                { 
                  name: 'Grand Format', 
                  value: grandFormat, 
                  color: '#10B981',
                  icon: '🏗️'
                },
                { 
                  name: 'Sous-traitance', 
                  value: sousTraitance, 
                  color: '#8B5CF6',
                  icon: '🤝'
                },
                { 
                  name: 'Service Crea', 
                  value: serviceCrea, 
                  color: '#F59E0B',
                  icon: '🎨'
                }
              ].filter(item => item.value > 0);

              if (data.length === 0) {
                return (
                  <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <span className="text-gray-500 text-lg">Aucune donnée disponible</span>
                  </div>
                );
              }

              const total = data.reduce((sum, item) => sum + item.value, 0);

              const CustomTooltip = ({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
                  return (
                    <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-semibold text-sm">{data.payload.icon} {data.name}</p>
                      <p className="text-xs text-gray-600">{data.value} commandes ({percentage}%)</p>
                    </div>
                  );
                }
                return null;
              };

              const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';

                return (
                  <text 
                    x={x} 
                    y={y} 
                    fill="white" 
                    textAnchor={x > cx ? 'start' : 'end'} 
                    dominantBaseline="central"
                    className="font-bold text-xs"
                  >
                    {percentage}%
                  </text>
                );
              };

              return (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={CustomLabel}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#ffffff"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
          
          {/* Legend */}
          <div className="space-y-3">
            {/* Petit Format */}
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <div>
                <div className="font-medium text-gray-900 text-sm">🖨️ Petit Format</div>
                <div className="text-lg font-bold text-blue-600">
                  {statistics.orders.byWorkshop['petit format'] || 0}
                </div>
                <div className="text-xs text-blue-500">
                  {businessMetrics.activeOrders > 0 ? formatPercentage((statistics.orders.byWorkshop['petit format'] || 0) / businessMetrics.activeOrders * 100) : '0%'}
                </div>
              </div>
            </div>
            
            {/* Grand Format */}
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div>
                <div className="font-medium text-gray-900 text-sm">🏗️ Grand Format</div>
                <div className="text-lg font-bold text-green-600">
                  {statistics.orders.byWorkshop['grand format'] || 0}
                </div>
                <div className="text-xs text-green-500">
                  {businessMetrics.activeOrders > 0 ? formatPercentage((statistics.orders.byWorkshop['grand format'] || 0) / businessMetrics.activeOrders * 100) : '0%'}
                </div>
              </div>
            </div>
            
            {/* Sous-traitance */}
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
              <div>
                <div className="font-medium text-gray-900 text-sm">🤝 Sous-traitance</div>
                <div className="text-lg font-bold text-purple-600">
                  {statistics.orders.byWorkshop['sous-traitance'] || statistics.orders.byWorkshop['soustraitance'] || 0}
                </div>
                <div className="text-xs text-purple-500">
                  {businessMetrics.activeOrders > 0 ? formatPercentage(((statistics.orders.byWorkshop['sous-traitance'] || statistics.orders.byWorkshop['soustraitance'] || 0) / businessMetrics.activeOrders) * 100) : '0%'}
                </div>
              </div>
            </div>

            {/* Service Crea */}
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <div>
                <div className="font-medium text-gray-900 text-sm">🎨 Service Crea</div>
                <div className="text-lg font-bold text-orange-600">
                  {statistics.orders.byWorkshop['service crea'] || 0}
                </div>
                <div className="text-xs text-orange-500">
                  {businessMetrics.activeOrders > 0 ? formatPercentage((statistics.orders.byWorkshop['service crea'] || 0) / businessMetrics.activeOrders * 100) : '0%'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        {/* Top Clients - Enhanced List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">🏆 Top Clients</h3>
          <div className="space-y-3">
            {statistics.clients.topClients.slice(0, 8).map((client, index) => {
              const isTopThree = index < 3;
              const medals = ['🥇', '🥈', '🥉'];
              
              return (
                <div key={client.id} className={`flex items-center justify-between p-3 rounded-lg transition-all hover:scale-105 ${
                  isTopThree ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 ${
                      isTopThree 
                        ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' 
                        : 'bg-gradient-to-br from-green-500 to-teal-600'
                    }`}>
                      {isTopThree ? medals[index] : index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{client.nom}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-green-600">{client.orderCount}</span>
                    <div className="text-xs text-gray-500">commandes</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Monthly Trends Chart */}
      {statistics.trends && statistics.trends.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">📈 Évolution des Commandes</h3>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData?.monthlyData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="displayName" 
                  fontSize={12}
                  angle={parseInt(monthsToShow) > 12 ? -45 : 0}
                  textAnchor={parseInt(monthsToShow) > 12 ? "end" : "middle"}
                  height={parseInt(monthsToShow) > 12 ? 80 : 50}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return `${payload[0].payload.monthName} ${payload[0].payload.year}`;
                    }
                    return label;
                  }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Client Statistics Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">🔍 Statistiques Client</h3>
        
        {/* Client Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Rechercher un client par nom, email ou code..."
                  value={clientSearchQuery}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value)
                    searchClients(e.target.value)
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {clientSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {clientSearchResults.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => selectClient(client)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{client.nom}</div>
                        <div className="text-sm text-gray-500">
                          {client.code_client && `${client.code_client} • `}
                          {client.email}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedClient && (
                <button
                  onClick={clearClientSelection}
                  className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selected Client Info */}
        {selectedClient && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-lg font-semibold text-blue-900 mb-2">{selectedClient.nom}</h4>
                <div className="space-y-1 text-sm text-blue-700">
                  {selectedClient.code_client && (
                    <p><span className="font-medium">Code:</span> {selectedClient.code_client}</p>
                  )}
                  {selectedClient.email && (
                    <p><span className="font-medium">Email:</span> {selectedClient.email}</p>
                  )}
                  {selectedClient.telephone && (
                    <p><span className="font-medium">Téléphone:</span> {selectedClient.telephone}</p>
                  )}
                </div>
              </div>
              <div>
                <div className="space-y-1 text-sm text-blue-700">
                  {selectedClient.type_client && (
                    <p><span className="font-medium">Type:</span> <span className="capitalize">{selectedClient.type_client}</span></p>
                  )}
                  {selectedClient.adresse && (
                    <p><span className="font-medium">Adresse:</span> {selectedClient.adresse}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client Statistics Display */}
        {loadingClientStats && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Chargement des statistiques...</span>
          </div>
        )}

        {clientStatsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <span className="text-red-800">{clientStatsError}</span>
          </div>
        )}

        {clientStatistics && !loadingClientStats && (
          <div className="space-y-6">
            {/* Client Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {clientStatistics.statistics.orders.total}
                </div>
                <div className="text-sm font-medium text-blue-800">Total Commandes</div>
              </div>
              
              <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {clientStatistics.statistics.orders.delivered}
                </div>
                <div className="text-sm font-medium text-green-800">Livrées</div>
              </div>
              
              <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-200">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {clientStatistics.statistics.orders.current}
                </div>
                <div className="text-sm font-medium text-orange-800">En Cours</div>
              </div>
              
              <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
                <div className="text-2xl font-bold text-red-600 mb-1">
                  {clientStatistics.statistics.orders.cancelled}
                </div>
                <div className="text-sm font-medium text-red-800">Annulées</div>
              </div>
            </div>

            {/* Top 3 Products */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top 3 Articles</h4>
              {clientStatistics.statistics.products.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {clientStatistics.statistics.products.topProducts.map((product, index) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                        <div className="flex items-center">
                          <span className="text-xl mr-3">{medals[index]}</span>
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">
                              {product.orders} commande{product.orders > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">{product.quantity}</div>
                          <div className="text-xs text-gray-500">quantité</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Aucun produit trouvé pour cette période
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedClient && !loadingClientStats && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-lg font-medium">Recherchez un client pour voir ses statistiques</p>
            <p className="text-sm">Tapez au moins 2 caractères pour commencer la recherche</p>
          </div>
        )}
      </div>

      {/* Employee Statistics Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">👥 Statistiques Employé</h3>
        
        {/* Employee Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Rechercher un employé par nom d'utilisateur ou email..."
                  value={employeeSearchQuery}
                  onChange={(e) => {
                    setEmployeeSearchQuery(e.target.value)
                    searchEmployees(e.target.value)
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {employeeSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {employeeSearchResults.map((employee) => (
                      <div
                        key={employee.id}
                        onClick={() => selectEmployee(employee)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{employee.username}</div>
                        <div className="text-sm text-gray-500">
                          <span className="capitalize bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs mr-2">
                            {employee.role}
                          </span>
                          {employee.email}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedEmployee && (
                <button
                  onClick={clearEmployeeSelection}
                  className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selected Employee Info */}
        {selectedEmployee && (
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-lg font-semibold text-purple-900 mb-2 flex items-center">
                  👤 {selectedEmployee.username}
                  <span className="ml-2 bg-purple-200 text-purple-800 px-2 py-1 rounded-full text-xs capitalize">
                    {selectedEmployee.role}
                  </span>
                </h4>
                <div className="space-y-1 text-sm text-purple-700">
                  <p><span className="font-medium">Email:</span> {selectedEmployee.email}</p>
                  <p><span className="font-medium">Rôle:</span> <span className="capitalize">{selectedEmployee.role}</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Employee Statistics Display */}
        {loadingEmployeeStats && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-gray-600">Chargement des statistiques...</span>
          </div>
        )}

        {employeeStatsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <span className="text-red-800">{employeeStatsError}</span>
          </div>
        )}

        {employeeStatistics && !loadingEmployeeStats && (
          <div className="space-y-6">
            {/* Role-based Performance Metrics */}
            {selectedEmployee.role === 'commercial' && employeeStatistics.commercial && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {employeeStatistics.commercial.currentOrders}
                  </div>
                  <div className="text-sm font-medium text-blue-800">Commandes En Cours</div>
                </div>
                
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {employeeStatistics.commercial.deliveredOrders}
                  </div>
                  <div className="text-sm font-medium text-green-800">Commandes Livrées</div>
                </div>
                
                <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
                  <div className="text-2xl font-bold text-red-600 mb-1">
                    {employeeStatistics.commercial.cancelledOrders}
                  </div>
                  <div className="text-sm font-medium text-red-800">Commandes Annulées</div>
                </div>
              </div>
            )}

            {selectedEmployee.role === 'infograph' && employeeStatistics.infograph && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {employeeStatistics.infograph.totalProducts}
                  </div>
                  <div className="text-sm font-medium text-blue-800">Commandes Traités</div>
                </div>
                
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {employeeStatistics.infograph.travailGraphiqueProducts || 0}
                  </div>
                  <div className="text-sm font-medium text-green-800">Travail Graphique</div>
                </div>
                
                <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {employeeStatistics.infograph.conceptionProducts || 0}
                  </div>
                  <div className="text-sm font-medium text-purple-800">Conception</div>
                </div>
                
                <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-200">
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {employeeStatistics.infograph.atelierProducts}
                  </div>
                  <div className="text-sm font-medium text-orange-800">Atelier</div>
                </div>
              </div>
            )}

            {selectedEmployee.role === 'atelier' && employeeStatistics.atelier && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {employeeStatistics.atelier.currentOrders}
                  </div>
                  <div className="text-sm font-medium text-blue-800">Commandes En Cours</div>
                </div>
                
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {employeeStatistics.atelier.deliveredOrders}
                  </div>
                  <div className="text-sm font-medium text-green-800">Commandes Livrées</div>
                </div>
                
                <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
                  <div className="text-2xl font-bold text-red-600 mb-1">
                    {employeeStatistics.atelier.cancelledOrders}
                  </div>
                  <div className="text-sm font-medium text-red-800">Commandes Annulées</div>
                </div>
                
                <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {employeeStatistics.atelier.totalTasks}
                  </div>
                  <div className="text-sm font-medium text-purple-800">Tâches Assignées</div>
                </div>
              </div>
            )}

            {/* Performance Chart */}
            {employeeStatistics.monthlyTrends && employeeStatistics.monthlyTrends.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📈 Performance Mensuelle</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={employeeStatistics.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="monthName" 
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#8B5CF6" 
                        strokeWidth={3}
                        dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top Products/Clients for Employee */}
            {employeeStatistics.topItems && employeeStatistics.topItems.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">🏆 {selectedEmployee.role === 'commercial' ? 'Top Clients' : 'Top Produits'}</h4>
                <div className="space-y-3">
                  {employeeStatistics.topItems.slice(0, 5).map((item, index) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                        <div className="flex items-center">
                          <span className="text-xl mr-3">{index < 3 ? medals[index] : `${index + 1}.`}</span>
                          <div>
                            <div className="font-medium text-gray-900">{item.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-purple-600">{item.count}</div>
                          <div className="text-xs text-gray-500">{selectedEmployee.role === 'commercial' ? 'commandes' : 'fois'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedEmployee && !loadingEmployeeStats && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-lg font-medium">Recherchez un employé pour voir ses statistiques</p>
            <p className="text-sm">Tapez au moins 2 caractères pour commencer la recherche</p>
          </div>
        )}
      </div>

      {/* Action Center */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">🔧 Centre de Contrôle</h3>
        
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={fetchStatistics}
            disabled={loading}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <span>{loading ? '⏳' : '🔄'}</span>
            <span>{loading ? 'Actualisation...' : 'Actualiser les données'}</span>
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <span>🖨️</span>
            <span>Imprimer le rapport</span>
          </button>
          
          
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Dernière mise à jour: {new Date().toLocaleString('fr-FR')}</p>
        </div>
      </div>
    </div>
  )
}

export default StatisticsPage
