import React, { useState, useEffect } from 'react'
import { orderAPI } from '../utils/api'
import Button from '../components/ButtonComponent'
import AlertDialog from '../components/AlertDialog'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import WebSocketStatus from '../components/WebSocketStatus'

const HistoryOrdersPage = () => {
  const { user } = useAuth()
  const { subscribe, connected } = useWebSocket()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [filters, setFilters] = useState({
    statut: '', // 'termine', 'livre', 'annule' or '' for all history
    commercial: '',
    client: '',
    atelier: '',
    infographe: '',
    etape: ''
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0
  })
  const [stats, setStats] = useState({})

  // Status options for history (only delivered and cancelled orders)
  const historyStatusOptions = [
    { value: 'livre', label: 'Livré', color: 'bg-green-200 text-green-900 border border-green-300' },
    { value: 'annule', label: 'Annulé', color: 'bg-red-200 text-red-900 border border-red-300' }
  ]

  const atelierOptions = ['petit format', 'grand format', 'sous-traitance']
  const etapeOptions = ['conception', 'pré-presse', 'impression', 'finition', 'découpe']

  // Helper function to check if user can delete orders
  const canDeleteOrders = () => {
    // Only admin users can delete history orders
    return user && user.role === 'admin'
  }

  const fetchHistoryOrders = async (page = 1) => {
    try {
      setLoading(true)
      
      // Force filter to only show history orders (finished and cancelled)
      const historyFilters = {
        ...filters,
        page,
        limit: 10,
        timeFilter: 'all'
      }

      // If no specific status is selected, include only livre and annule statuses
      if (!historyFilters.statut) {
        // Fetch only delivered and cancelled orders
        const [deliveredResponse, cancelledResponse] = await Promise.all([
          orderAPI.getOrders({ ...historyFilters, statut: 'livre' }),
          orderAPI.getOrders({ ...historyFilters, statut: 'annule' })
        ])

        // Combine results
        const allHistoryOrders = [
          ...(deliveredResponse.orders || []),
          ...(cancelledResponse.orders || [])
        ]

        // Sort by modified date (most recent first)
        allHistoryOrders.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

        // Handle pagination manually for combined results
        const startIndex = (page - 1) * 10
        const endIndex = startIndex + 10
        const paginatedOrders = allHistoryOrders.slice(startIndex, endIndex)

        setOrders(paginatedOrders)
        setPagination({
          currentPage: page,
          totalPages: Math.ceil(allHistoryOrders.length / 10),
          totalOrders: allHistoryOrders.length,
          hasNextPage: endIndex < allHistoryOrders.length,
          hasPrevPage: page > 1
        })
      } else {
        // Fetch specific status
        const response = await orderAPI.getOrders(historyFilters)
        setOrders(response.orders || [])
        setPagination(response.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalOrders: 0
        })
      }
    } catch (err) {
      setError('Erreur lors du chargement de l\'historique des commandes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistoryStats = async () => {
    try {
      const response = await orderAPI.getOrderStats()
      const allStats = response.stats || {}
      
      // Extract only history-related stats (livre and annule)
      setStats({
        livre: allStats.livre || 0,
        annule: allStats.annule || 0,
        total: (allStats.livre || 0) + (allStats.annule || 0)
      })
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err)
    }
  }

  useEffect(() => {
    fetchHistoryOrders()
    fetchHistoryStats()
  }, [filters])

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!connected) return

    const unsubscribeOrderUpdated = subscribe('orderUpdated', (updatedOrder) => {
      console.log('Real-time: Order updated in history', updatedOrder)
      
      // Only add to history if order is now cancelled or delivered
      if (updatedOrder.statut === 'annule' || updatedOrder.statut === 'livre') {
        setOrders(prevOrders => {
          const orderIndex = prevOrders.findIndex(order => order.id === updatedOrder.id)
          if (orderIndex >= 0) {
            const newOrders = [...prevOrders]
            newOrders[orderIndex] = updatedOrder
            return newOrders
          } else {
            // Order wasn't in history before but now should be
            return [updatedOrder, ...prevOrders]
          }
        })
        
        // Update stats
        fetchHistoryStats()
      } else {
        // Order is no longer in history state, remove it
        setOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id))
        fetchHistoryStats()
      }
    })

    const unsubscribeOrderDeleted = subscribe('orderDeleted', (deletedOrderData) => {
      console.log('Real-time: Order deleted from history', deletedOrderData)
      
      setOrders(prevOrders => prevOrders.filter(order => order.id !== deletedOrderData.id))
      
      // Update stats
      fetchHistoryStats()
    })

    // Cleanup function
    return () => {
      unsubscribeOrderUpdated()
      unsubscribeOrderDeleted()
    }
  }, [connected, subscribe])

  const handleDeleteOrder = async (orderId) => {
    setOrderToDelete(orderId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteOrder = async () => {
    if (orderToDelete) {
      try {
        await orderAPI.deleteOrder(orderToDelete)
        fetchHistoryOrders(pagination.currentPage)
        fetchHistoryStats()
        setShowDeleteDialog(false)
        setOrderToDelete(null)
      } catch (err) {
        setError('Erreur lors de la suppression')
        setShowDeleteDialog(false)
        setOrderToDelete(null)
      }
    }
  }

  const cancelDeleteOrder = () => {
    setShowDeleteDialog(false)
    setOrderToDelete(null)
  }

  const handleRowClick = (order, event) => {
    // Don't open modal if clicking on action buttons
    if (event.target.closest('.action-button')) {
      return
    }
    setSelectedOrder(order)
    setShowViewModal(true)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const statusConfig = historyStatusOptions.find(s => s.value === status)
    if (!statusConfig) return status
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    )
  }

  const getRowBackgroundClass = (order) => {
    const { statut } = order
    
    if (statut === 'livre') {
      return 'bg-green-50 hover:bg-green-100 border-l-4 border-green-400'
    } else if (statut === 'annule') {
      return 'bg-red-50 hover:bg-red-100 border-l-4 border-red-400'
    }
    
    return 'bg-gray-50 hover:bg-gray-100'
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement de l'historique...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Historique des commandes</h1>
            <p className="text-gray-600 mt-1">Commandes livrées et annulées</p>
          </div>
        </div>

        {/* Information Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-800">Politique de conservation</h3>
              <p className="text-sm text-blue-700 mt-1">
                Les commandes livrées et annulées sont conservées de manière permanente pour l'audit, la comptabilité et la traçabilité. 
                La suppression est désactivée pour préserver l'intégrité des données.
              </p>
            </div>
          </div>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-600">{stats.total || 0}</div>
            <div className="text-sm text-gray-600">Total historique</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.livre || 0}</div>
            <div className="text-sm text-gray-600">Livrées</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">{stats.annule || 0}</div>
            <div className="text-sm text-gray-600">Annulées</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={filters.statut}
              onChange={(e) => setFilters({...filters, statut: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
            >
              <option value="">Tous les statuts</option>
              {historyStatusOptions.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="Commercial"
              value={filters.commercial}
              onChange={(e) => setFilters({...filters, commercial: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
            />
            
            <input
              type="text"
              placeholder="Client"
              value={filters.client}
              onChange={(e) => setFilters({...filters, client: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
            />

            <input
              type="text"
              placeholder="Infographe"
              value={filters.infographe}
              onChange={(e) => setFilters({...filters, infographe: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
            />
            
            <select
              value={filters.atelier}
              onChange={(e) => setFilters({...filters, atelier: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
            >
              <option value="">Tous les ateliers</option>
              {atelierOptions.map(atelier => (
                <option key={atelier} value={atelier}>
                  {atelier}
                </option>
              ))}
            </select>

            <select
              value={filters.etape}
              onChange={(e) => setFilters({...filters, etape: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
            >
              <option value="">Toutes les étapes</option>
              {etapeOptions.map(etape => (
                <option key={etape} value={etape}>
                  {etape}
                </option>
              ))}
            </select>

            {/* Clear Filters Button */}
            {(filters.statut || filters.commercial || filters.client || filters.infographe || filters.atelier || filters.etape) && (
              <button
                onClick={() => setFilters({
                  statut: '',
                  commercial: '',
                  client: '',
                  atelier: '',
                  infographe: '',
                  etape: ''
                })}
                className="text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition-colors duration-200"
              >
                Effacer filtres
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Orders Cards - Mobile/Tablet View */}
        <div className="lg:hidden space-y-4 mb-6">
          {orders.map((order) => (
            <div 
              key={order.id} 
              className={`shadow-md rounded-lg p-4 border transition-colors duration-200 cursor-pointer ${getRowBackgroundClass(order)}`}
              onClick={(e) => handleRowClick(order, e)}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{order.numero_pms}</h3>
                    {getStatusBadge(order.statut)}
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <p><span className="font-medium">Client:</span> {order.client}</p>
                    <p><span className="font-medium">Commercial:</span> {order.commercial_en_charge}</p>
                    {order.infographe_en_charge && (
                      <p><span className="font-medium">Infographe:</span> {order.infographe_en_charge}</p>
                    )}
                    <div>
                      <span className="font-medium">Produits:</span>
                      {order.products && order.products.length > 0 ? (
                        <ul className="ml-4 mt-1">
                          {order.products.map((product, index) => (
                            <li key={index} className="text-sm">
                              {product.name} (Qté: {product.orderProduct?.quantity || 'N/A'})
                              {product.orderProduct?.unit_price && (
                                <span className="text-gray-600"> - {product.orderProduct.unit_price}€/unité</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="ml-2 text-gray-500">Aucun produit associé</span>
                      )}
                    </div>
                    {order.etape && (
                      <p><span className="font-medium">Étape finale:</span> {order.etape}</p>
                    )}
                    {order.atelier_concerne && (
                      <p><span className="font-medium">Atelier:</span> {order.atelier_concerne}</p>
                    )}
                    <p><span className="font-medium">Date de création:</span> {formatDate(order.createdAt)}</p>
                    <p><span className="font-medium">Dernière mise à jour:</span> {formatDate(order.updatedAt)}</p>
                    {order.option_finition && (
                      <p><span className="font-medium">Finitions:</span> {order.option_finition}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {canDeleteOrders() && (
                <div className="flex justify-end pt-3 border-t">
                  <div className="action-button">
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="flex items-center gap-2 text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
              Aucune commande trouvée dans l'historique
            </div>
          )}
        </div>

        {/* Orders Table - Desktop View */}
        <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commande
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commercial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Infographe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Étape finale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atelier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date création
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Finitions
                  </th>
                  {canDeleteOrders() && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr 
                    key={order.id} 
                    className={`transition-colors duration-200 cursor-pointer ${getRowBackgroundClass(order)}`}
                    onClick={(e) => handleRowClick(order, e)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.numero_pms}
                        </div>
                        <div className="text-sm text-gray-500 max-w-xs">
                          {order.products && order.products.length > 0 ? (
                            <>
                              {order.products.slice(0, 2).map((product, index) => (
                                <div key={index} className="truncate">
                                  {product.name} (Qté: {product.orderProduct?.quantity || 'N/A'})
                                </div>
                              ))}
                              {order.products.length > 2 && (
                                <div className="text-xs text-gray-400">
                                  +{order.products.length - 2} produit(s) de plus
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">Aucun produit</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.client}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.commercial_en_charge}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.infographe_en_charge || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.statut)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.etape || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.atelier_concerne || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                      {order.option_finition || '-'}
                    </td>
                    {canDeleteOrders() && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="action-button">
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Supprimer
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => fetchHistoryOrders(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  onClick={() => fetchHistoryOrders(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{pagination.currentPage}</span> sur{' '}
                    <span className="font-medium">{pagination.totalPages}</span> - Total:{' '}
                    <span className="font-medium">{pagination.totalOrders}</span> commandes
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {[...Array(pagination.totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => fetchHistoryOrders(i + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pagination.currentPage === i + 1
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Order Modal */}
      {showViewModal && selectedOrder && (
        <OrderViewModal
          order={selectedOrder}
          onClose={() => {
            setShowViewModal(false)
            setSelectedOrder(null)
          }}
          formatDate={formatDate}
          getStatusBadge={getStatusBadge}
          etapeOptions={etapeOptions}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={showDeleteDialog}
        onClose={cancelDeleteOrder}
        onConfirm={confirmDeleteOrder}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer définitivement la commande ${orders.find(o => o.id === orderToDelete)?.numero_pms || ''} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      />
    </div>
  )
}

// Simple Order View Modal Component for History
const OrderViewModal = ({ order, onClose, formatDate, getStatusBadge, etapeOptions }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 ease-out overflow-y-auto h-full w-full z-50 animate-in fade-in">
      <div className="relative top-8 mx-auto p-0 w-11/12 max-w-4xl min-h-[calc(100vh-4rem)] animate-in slide-in-from-top-4 duration-500">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-3xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 px-8 py-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
            
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">
                    Historique - Commande
                  </h3>
                  <p className="text-gray-100 text-sm mt-1 font-medium">
                    {order.numero_pms}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 group border border-white/20 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Basic Information */}
              <div className="space-y-6">
                {/* Basic Info Section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg shadow-sm border border-blue-200">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">Informations générales</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-blue-200/50">
                      <span className="font-medium text-gray-700">Numéro PMS:</span>
                      <span className="text-gray-900 font-semibold">{order.numero_pms}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-200/50">
                      <span className="font-medium text-gray-700">Client:</span>
                      <span className="text-gray-900 font-medium">{order.client}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-200/50">
                      <span className="font-medium text-gray-700">Commercial:</span>
                      <span className="text-gray-900">{order.commercial_en_charge}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-200/50">
                      <span className="font-medium text-gray-700">Infographe:</span>
                      <span className="text-gray-900">{order.infographe_en_charge || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-gray-700">Statut final:</span>
                      {getStatusBadge(order.statut)}
                    </div>
                  </div>
                </div>

                {/* Production Section */}
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg shadow-sm border border-purple-200">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">Production</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                      <span className="font-medium text-gray-700">Étape finale:</span>
                      <span className="text-gray-900 bg-white px-3 py-1 rounded-full border border-purple-200/50 font-medium">
                        {order.etape || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                      <span className="font-medium text-gray-700">Atelier concerné:</span>
                      <span className="text-gray-900">{order.atelier_concerne || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-gray-700">Options de finition:</span>
                      <span className="text-gray-900">{order.option_finition || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Product Details Section */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg shadow-sm border border-green-200">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">Produits</h4>
                  </div>
                  <div className="space-y-3">
                    {order.products && order.products.length > 0 ? (
                      order.products.map((product, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg border border-green-200/50 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 mb-1">{product.name}</h5>
                              <p className="text-sm text-gray-600">{product.description || 'Aucune description'}</p>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-sm text-gray-600">Quantité</div>
                              <div className="font-semibold text-gray-900">{product.orderProduct?.quantity || 'N/A'}</div>
                              {product.orderProduct?.unit_price && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {product.orderProduct.unit_price}€/unité
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        Aucun produit associé à cette commande
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates Section */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg shadow-sm border border-orange-200">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">Dates importantes</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-orange-200/50">
                      <span className="font-medium text-gray-700">Date de création:</span>
                      <span className="text-gray-900">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-orange-200/50">
                      <span className="font-medium text-gray-700">Dernière mise à jour:</span>
                      <span className="text-gray-900">{formatDate(order.updatedAt)}</span>
                    </div>
                    {order.date_limite_livraison_estimee && (
                      <div className="flex justify-between items-center py-2 border-b border-orange-200/50">
                        <span className="font-medium text-gray-700">Livraison estimée:</span>
                        <span className="text-gray-900">{formatDate(order.date_limite_livraison_estimee)}</span>
                      </div>
                    )}
                    {order.date_limite_livraison_attendue && (
                      <div className="flex justify-between items-center py-2">
                        <span className="font-medium text-gray-700">Livraison attendue:</span>
                        <span className="text-gray-900">{formatDate(order.date_limite_livraison_attendue)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comments Section */}
                {order.commentaires && (
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-gray-100 rounded-lg shadow-sm border border-gray-200">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-800">Commentaires</h4>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200/50 shadow-sm">
                      <p className="text-gray-700 whitespace-pre-wrap">{order.commentaires}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HistoryOrdersPage
