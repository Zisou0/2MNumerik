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
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  ComposedChart
} from 'recharts'
import { statisticsAPI } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

function StatisticsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState(null)
  const [timeFrame, setTimeFrame] = useState('last30days')
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStatistics()
  }, [timeFrame])

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = { timeFrame }
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

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
      'soustraitance': '#8B5CF6'
    },
    status: {
      'en_attente': '#F59E0B',
      'en_cours': '#3B82F6',
      'termine': '#10B981',
      'livre': '#8B5CF6',
      'annule': '#EF4444'
    }
  }

  // Memoized chart data calculations
  const chartData = useMemo(() => {
    if (!statistics) return null;

    // Revenue trend data
    const revenueData = [
      { name: 'Réalisé', value: statistics.revenue.completed, color: '#10B981' },
      { name: 'En cours', value: statistics.revenue.pending, color: '#3B82F6' },
      { name: 'Estimé', value: statistics.revenue.total - statistics.revenue.completed - statistics.revenue.pending, color: '#F59E0B' }
    ].filter(item => item.value > 0);

    // Team performance data
    const teamData = Object.entries(statistics.team.commercialPerformance).map(([name, value]) => ({
      name: name.length > 10 ? name.substring(0, 10) + '...' : name,
      commercial: value,
      infographe: statistics.team.infographerPerformance[name] || 0
    }));

    // Monthly trend data with enhanced info
    const monthlyData = statistics.trends?.map(trend => ({
      ...trend,
      monthName: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][trend.month - 1],
      revenue: (statistics.revenue.total / statistics.orders.total) * trend.orders || 0
    })) || [];

    return { revenueData, teamData, monthlyData };
  }, [statistics]);

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
      {/* Enhanced Header with Real-time Stats */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 rounded-3xl p-8 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/5"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-white/5"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">📊 Analytics Dashboard</h1>
              <p className="text-lg text-indigo-100">Analyse complète des performances 2MNumerik</p>
              <p className="text-indigo-200 mt-1">Période: {getTimeFrameLabel()}</p>
            </div>
            <div className="text-right">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="text-3xl font-bold">{statistics.orders.total}</div>
                <div className="text-indigo-200 text-sm">Commandes totales</div>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="text-xl font-bold">{formatCurrency(statistics.revenue.total)}</div>
              <div className="text-indigo-200 text-xs">CA Total</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="text-xl font-bold">{statistics.clients.total}</div>
              <div className="text-indigo-200 text-xs">Clients</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="text-xl font-bold">{formatPercentage(statistics.efficiency.onTimeDeliveryRate)}</div>
              <div className="text-indigo-200 text-xs">Livraisons à temps</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="text-xl font-bold">{statistics.efficiency.averageCompletionTime}h</div>
              <div className="text-indigo-200 text-xs">Temps moyen</div>
            </div>
          </div>
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

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Formats Overview */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-gray-900">{statistics.orders.total}</span>
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
          </div>
        </div>

        {/* Orders Overview */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-gray-900">{statistics.orders.total}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Commandes</h3>
          <div className="text-sm text-gray-600 space-y-1">
            {statistics.orders.urgent > 0 && (
              <div className="flex justify-between">
                <span>🚨 Urgentes:</span>
                <span className="font-medium text-red-600">{statistics.orders.urgent}</span>
              </div>
            )}
          </div>
        </div>

        {/* Clients Overview */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-gray-900">{statistics.clients.total}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Clients</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Actifs:</span>
              <span className="font-medium text-green-600">{statistics.clients.active}</span>
            </div>
            <div className="flex justify-between">
              <span>Nouveaux:</span>
              <span className="font-medium text-blue-600">{statistics.clients.new}</span>
            </div>
          </div>
        </div>

        {/* Revenue Overview */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.revenue.total)}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chiffre d'affaires</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Réalisé:</span>
              <span className="font-medium text-green-600">{formatCurrency(statistics.revenue.completed)}</span>
            </div>
            <div className="flex justify-between">
              <span>En cours:</span>
              <span className="font-medium text-blue-600">{formatCurrency(statistics.revenue.pending)}</span>
            </div>
          </div>
        </div>

        {/* Efficiency Overview */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-gray-900">{formatPercentage(statistics.efficiency.onTimeDeliveryRate)}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Livraisons à temps:</span>
              <span className="font-medium text-green-600">{statistics.efficiency.onTimeDeliveries}</span>
            </div>
            <div className="flex justify-between">
              <span>Temps moyen:</span>
              <span className="font-medium text-blue-600">{statistics.efficiency.averageCompletionTime}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Breakdown - Donut Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            💰 Analyse du Chiffre d'Affaires
          </h3>
          
          <div className="h-64">
            {chartData?.revenueData && chartData.revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.revenueData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#ffffff"
                  >
                    {chartData.revenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Montant']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                <span className="text-gray-500">Aucune donnée de revenus</span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <div className="font-bold text-green-600">{formatCurrency(statistics.revenue.completed)}</div>
              <div className="text-green-500 text-xs">Réalisé</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="font-bold text-blue-600">{formatCurrency(statistics.revenue.pending)}</div>
              <div className="text-blue-500 text-xs">En cours</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded-lg">
              <div className="font-bold text-yellow-600">{formatCurrency(statistics.revenue.total)}</div>
              <div className="text-yellow-500 text-xs">Total</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics - Radial Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            ⚡ Indicateurs de Performance
          </h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={[
                {
                  name: 'Livraisons à temps',
                  value: statistics.efficiency.onTimeDeliveryRate,
                  fill: '#10B981'
                },
                {
                  name: 'Taux de satisfaction',
                  value: Math.min(95, (statistics.clients.active / statistics.clients.total) * 100),
                  fill: '#3B82F6'
                },
                {
                  name: 'Efficacité équipe',
                  value: Math.min(100, (statistics.orders.total / (statistics.orders.total + (statistics.orders.urgent || 0))) * 100),
                  fill: '#8B5CF6'
                }
              ]}>
                <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" />
                <Tooltip 
                  formatter={(value) => [`${value.toFixed(1)}%`, 'Performance']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1"></div>
              <div className="font-medium">Livraisons</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1"></div>
              <div className="font-medium">Satisfaction</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded">
              <div className="w-3 h-3 bg-purple-500 rounded-full mx-auto mb-1"></div>
              <div className="font-medium">Efficacité</div>
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
                  const percentage = ((data.value / total) * 100).toFixed(1);
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
                const percentage = ((value / total) * 100).toFixed(1);

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
                  {statistics.orders.total > 0 ? formatPercentage((statistics.orders.byWorkshop['petit format'] || 0) / statistics.orders.total * 100) : '0%'}
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
                  {statistics.orders.total > 0 ? formatPercentage((statistics.orders.byWorkshop['grand format'] || 0) / statistics.orders.total * 100) : '0%'}
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
                  {statistics.orders.total > 0 ? formatPercentage(((statistics.orders.byWorkshop['sous-traitance'] || statistics.orders.byWorkshop['soustraitance'] || 0) / statistics.orders.total) * 100) : '0%'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Orders by Status - Horizontal Bar Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">📈 Statuts des Commandes</h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.entries(statistics.orders.byStatus).map(([status, count]) => {
                  const statusLabels = {
                    'en_attente': 'En attente',
                    'en_cours': 'En cours', 
                    'termine': 'Terminé',
                    'livre': 'Livré',
                    'annule': 'Annulé'
                  }
                  return {
                    name: statusLabels[status] || status,
                    value: count,
                    fill: CHART_COLORS.status[status] || '#6B7280'
                  }
                })}
                layout="horizontal"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={60} fontSize={12} />
                <Tooltip 
                  formatter={(value) => [value, 'Commandes']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Performance - Grouped Bar Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">👥 Performance Équipe</h3>
          
          <div className="h-64">
            {chartData?.teamData && chartData.teamData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.teamData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="commercial" fill="#3B82F6" name="Commercial" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="infographe" fill="#10B981" name="Infographe" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                <span className="text-gray-500">Aucune donnée d'équipe</span>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex justify-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span>Commerciaux</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span>Infographes</span>
            </div>
          </div>
        </div>


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

      {/* Enhanced Monthly Trends with Multiple Charts */}
      {statistics.trends && statistics.trends.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Line Chart for Orders Evolution */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">📈 Évolution des Commandes</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData?.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthName" fontSize={12} />
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

          {/* Area Chart for Revenue Evolution */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">💹 Évolution du CA Estimé</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData?.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthName" fontSize={12} />
                  <YAxis tickFormatter={(value) => `${Math.round(value/1000)}k€`} />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'CA Estimé']}
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
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10B981" 
                    fill="url(#revenueGradient)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Combined Analytics - Composed Chart */}
      {statistics.trends && statistics.trends.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">🔄 Analyse Combinée - Commandes & Revenus</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData?.monthlyData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthName" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${Math.round(value/1000)}k€`} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'orders') return [value, 'Commandes'];
                    if (name === 'revenue') return [formatCurrency(value), 'CA Estimé'];
                    return [value, name];
                  }}
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
                <Bar yAxisId="left" dataKey="orders" fill="#3B82F6" name="orders" opacity={0.7} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} name="revenue" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 flex justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded mr-2 opacity-70"></div>
              <span>Nombre de commandes</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-1 bg-green-500 mr-2"></div>
              <span>Chiffre d'affaires estimé</span>
            </div>
          </div>
        </div>
      )}

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
