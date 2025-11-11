import { useState, useEffect } from 'react'
import ItemsManagement from '../components/ItemsManagement'
import LocationsManagement from '../components/LocationsManagement'
import TransactionsManagement from '../components/TransactionsManagement'

const API_BASE_URL = 'http://localhost:3001/api'

function StockManagementPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stockData, setStockData] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Process data for table view
  const getTableData = () => {
    const allItems = new Map()
    const locations = stockData

    // Collect all unique items
    locations.forEach(location => {
      location.stockLevels?.forEach(stock => {
        if (stock.item) {
          allItems.set(stock.item.id, {
            id: stock.item.id,
            name: stock.item.name,
            description: stock.item.description,
            locations: {}
          })
        }
      })
    })

    // Populate location data for each item
    locations.forEach(location => {
      location.stockLevels?.forEach(stock => {
        if (stock.item && allItems.has(stock.item.id)) {
          allItems.get(stock.item.id).locations[location.id] = {
            quantity: stock.quantity,
            minimum_quantity: stock.minimum_quantity,
            isLowStock: stock.quantity > 0 && stock.quantity <= stock.minimum_quantity
          }
        }
      })
    })

    return {
      items: Array.from(allItems.values()),
      locations: locations
    }
  }

  // Helper function to get location icon based on type
  const getLocationIcon = (type) => {
    const icons = {
      'main_depot': '🏢',
      'workshop': '🔧',
      'store': '🏪',
      'supplier': '🚚',
      'customer': '👤'
    }
    return icons[type] || '📍'
  }

  // Helper function to get location type label
  const getLocationTypeLabel = (type) => {
    const typeLabels = {
      'main_depot': 'Dépôt Principal',
      'workshop': 'Atelier',
      'store': 'Magasin',
      'supplier': 'Fournisseur',
      'customer': 'Client'
    }
    return typeLabels[type] || type
  }

  // Fetch total items count
  const fetchTotalItems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/items?page=1&limit=1`)
      if (!response.ok) {
        throw new Error('Failed to fetch total items count')
      }

      const data = await response.json()
      setTotalItems(data.totalCount || 0)
    } catch (err) {
      console.error('Error fetching total items:', err)
      setTotalItems(0)
    }
  }

  // Fetch stock overview data
  const fetchStockOverview = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch locations with their stock levels and total items count
      const [locationsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/locations`),
        fetchTotalItems()
      ])
      
      if (!locationsResponse.ok) {
        throw new Error('Failed to fetch stock data')
      }

      const locationsData = await locationsResponse.json()
      setStockData(locationsData.locations || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching stock overview:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load stock data when overview tab is active
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStockOverview()
    }
  }, [activeTab])

  const tabs = [
    { id: 'overview', name: 'Vue d\'ensemble', icon: '📊' },
    { id: 'items', name: 'Articles', icon: '📦' },
    { id: 'locations', name: 'Emplacements', icon: '📍' },
    { id: 'transactions', name: 'Transaction', icon: '📝' },
    { id: 'alerts', name: 'Alertes', icon: '⚠️' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Vue d'ensemble du stock</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">📦</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Total Articles</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {totalItems || '--'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">📍</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Emplacements</p>
                    <p className="text-2xl font-bold text-green-900">
                      {stockData.length || '--'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <span className="text-2xl">🚫</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-red-600">Rupture Stock</p>
                    <p className="text-2xl font-bold text-red-900">
                      {stockData.reduce((count, location) => {
                        const outOfStock = location.stockLevels?.filter(stock => 
                          stock.quantity === 0
                        ).length || 0
                        return count + outOfStock
                      }, 0) || '--'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-600">Stock Faible</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {stockData.reduce((count, location) => {
                        const lowStock = location.stockLevels?.filter(stock => 
                          stock.quantity > 0 && stock.quantity <= stock.minimum_quantity
                        ).length || 0
                        return count + lowStock
                      }, 0) || '--'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">📝</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">Quantité Totale</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {stockData.reduce((total, location) => {
                        const locationTotal = location.stockLevels?.reduce((sum, stock) => 
                          sum + (stock.quantity || 0), 0
                        ) || 0
                        return total + locationTotal
                      }, 0) || '--'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Table Section */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <span className="mr-2">�</span>
                Tableau des Stocks
              </h3>

              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00AABB]"></div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  Erreur lors du chargement: {error}
                </div>
              ) : stockData.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <span className="text-6xl">📦</span>
                  <p className="text-gray-500 mt-4">Aucune donnée de stock disponible</p>
                  <p className="text-sm text-gray-400 mt-2">Créez des articles et des emplacements pour voir les niveaux de stock</p>
                </div>
              ) : (
                (() => {
                  const tableData = getTableData()
                  
                  return (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                      {/* Enhanced Table Header */}
                      <div className="bg-gradient-to-r from-[#00AABB] to-[#008899] px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                              <span className="text-white text-xl">📊</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white">Tableau des Stocks</h3>
                              <p className="text-white/80 text-sm">Vue détaillée par emplacement</p>
                            </div>
                          </div>
                          <div className="text-white/90 text-sm">
                            <span className="bg-white/20 px-3 py-1 rounded-full">
                              {tableData.items.length} articles
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr className="border-b border-gray-300">
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10 shadow-sm border-r border-gray-200">
                                <div className="flex items-center space-x-2">
                                  <span>📦</span>
                                  <span>Article</span>
                                </div>
                              </th>
                              {tableData.locations.map(location => (
                                <th key={location.id} className="px-3 py-3 text-center text-sm font-semibold text-gray-700 min-w-28 border-r border-gray-200">
                                  <div className="flex flex-col items-center space-y-1">
                                    <div className="p-1 bg-white rounded-lg shadow-sm border">
                                      <span className="text-lg">{getLocationIcon(location.type)}</span>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-medium text-gray-800 text-xs">{location.name}</div>
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {getLocationTypeLabel(location.type)}
                                      </div>
                                    </div>
                                  </div>
                                </th>
                              ))}
                              <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700">
                                <div className="flex flex-col items-center space-y-1">
                                  <span className="text-lg">🎯</span>
                                  <span className="text-xs">Total</span>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {tableData.items.length === 0 ? (
                              <tr>
                                <td colSpan={tableData.locations.length + 2} className="px-4 py-12 text-center border-b border-gray-200">
                                  <div className="flex flex-col items-center space-y-3">
                                    <div className="p-4 bg-gray-100 rounded-full">
                                      <span className="text-3xl text-gray-400">📦</span>
                                    </div>
                                    <p className="text-gray-500 font-medium">Aucun article trouvé</p>
                                    <p className="text-gray-400 text-sm">Ajoutez des articles pour voir les niveaux de stock</p>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              tableData.items.map((item, idx) => {
                                const totalQuantity = Object.values(item.locations).reduce((sum, loc) => sum + (loc.quantity || 0), 0)
                                const hasOutOfStock = Object.values(item.locations).some(loc => loc.quantity === 0)
                                const hasLowStock = Object.values(item.locations).some(loc => loc.isLowStock)
                                
                                return (
                                  <tr key={item.id} className={`
                                    ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}
                                    hover:bg-blue-50/50 transition-colors duration-200 border-b border-gray-200
                                  `}>
                                    <td className="px-4 py-2.5 sticky left-0 bg-inherit z-10 shadow-sm border-r border-gray-200">
                                      <div className="flex items-center space-x-2">
                                        <div className="flex-shrink-0">
                                          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                                            <span className="text-blue-600 font-bold text-xs">
                                              {item.name.charAt(0).toUpperCase()}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                                            {!hasOutOfStock && hasLowStock && (
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                ⚠️
                                              </span>
                                            )}
                                          </div>
                                          {item.description && (
                                            <p className="text-xs text-gray-500 truncate max-w-48">{item.description}</p>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    {tableData.locations.map(location => {
                                      const stockData = item.locations[location.id]
                                      
                                      return (
                                        <td key={location.id} className="px-3 py-2.5 text-center border-r border-gray-200">
                                          {stockData ? (
                                            <div className="flex flex-col items-center space-y-1">
                                              <div className={`
                                                inline-flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm
                                                ${stockData.quantity === 0
                                                  ? 'bg-red-100 text-red-700 border border-red-300' 
                                                  : stockData.isLowStock 
                                                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                                  : 'bg-green-100 text-green-700 border border-green-300'
                                                }
                                              `}>
                                                {stockData.quantity}
                                              </div>
                                              <div className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                min: {stockData.minimum_quantity}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center">
                                              <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                                <span className="text-gray-400 text-sm">-</span>
                                              </div>
                                              <span className="text-xs text-gray-400 mt-1">N/A</span>
                                            </div>
                                          )}
                                        </td>
                                      )
                                    })}
                                    <td className="px-3 py-2.5 text-center">
                                      <div className="flex flex-col items-center space-y-1">
                                        <div className="inline-flex items-center justify-center w-12 h-10 rounded-lg bg-gradient-to-br from-[#00AABB] to-[#008899] text-white font-bold text-sm shadow-sm">
                                          {totalQuantity}
                                        </div>
                                        <span className="text-xs text-gray-500 font-medium">Total</span>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Enhanced Table Footer */}
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="font-medium">{tableData.items.length}</span>
                              <span>articles au total</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="font-medium">
                                {tableData.items.reduce((total, item) => 
                                  total + Object.values(item.locations).reduce((sum, loc) => sum + (loc.quantity || 0), 0), 0
                                )}
                              </span>
                              <span>unités au total</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            {/* Stock Status Indicators */}
                            <div className="flex items-center space-x-3 text-xs">
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                                <span className="text-gray-600">Stock OK</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-yellow-300 rounded-full"></div>
                                <span className="text-gray-600">Stock faible</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 bg-red-300 rounded-full"></div>
                                <span className="text-gray-600">Rupture</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()
              )}
            </div>
          </div>
        )

      case 'items':
        return <ItemsManagement />

      case 'locations':
        return <LocationsManagement />

      case 'transactions':
        return <TransactionsManagement />

      case 'alerts':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Alertes de Stock</h2>
            
            <div className="text-center py-12">
              <span className="text-6xl">✅</span>
              <p className="text-gray-500 mt-4">Aucune alerte active</p>
              <p className="text-sm text-gray-400 mt-2">Les alertes de stock faible apparaîtront ici</p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion de Stock</h1>
        <p className="text-gray-600 mt-1">Gérez vos articles, emplacements et transactions de stock</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-[#00AABB] text-[#00AABB]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  )
}

export default StockManagementPage