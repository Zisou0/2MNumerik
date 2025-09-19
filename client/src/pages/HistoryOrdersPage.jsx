import React, { useState, useEffect, useRef } from 'react'
import { orderAPI, userAPI } from '../utils/api'
import Button from '../components/ButtonComponent'
import AlertDialog from '../components/AlertDialog'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import OrderViewModal from '../components/OrderViewModal'
import WebSocketStatus from '../components/WebSocketStatus'

// Multi-select filter component
const MultiSelectFilter = ({ options, selectedValues, onChange, placeholder, className }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleToggleOption = (value) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value]
    onChange(newSelectedValues)
  }

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([])
    } else {
      onChange(options.map(opt => typeof opt === 'string' ? opt : opt.value))
    }
  }

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder
    } else if (selectedValues.length === 1) {
      const option = options.find(opt => 
        (typeof opt === 'string' ? opt : opt.value) === selectedValues[0]
      )
      return typeof option === 'string' ? option : option?.label || selectedValues[0]
    } else {
      return `${selectedValues.length} sélectionné(s)`
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-left w-full flex items-center justify-between"
      >
        <span className={selectedValues.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
          {getDisplayText()}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="px-3 py-2 border-b border-gray-200">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {selectedValues.length === options.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          </div>
          {options.map((option) => {
            const value = typeof option === 'string' ? option : option.value
            const label = typeof option === 'string' ? option : option.label
            const isSelected = selectedValues.includes(value)
            
            return (
              <label
                key={value}
                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleOption(value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                />
                <span className="text-sm text-gray-900">{label}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

const HistoryOrdersPage = () => {
  const { user } = useAuth()
  const { subscribe, connected } = useWebSocket()
  // Changed from orders to orderProductRows to match dashboard structure
  const [orderProductRows, setOrderProductRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedOrderProduct, setSelectedOrderProduct] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [filters, setFilters] = useState({
    statut: '', // 'termine', 'livre', 'annule' or '' for all history
    commercial: [], // Changed to array for multi-select
    client: '',
    atelier: [], // Changed to array for multi-select
    infographe: [], // Changed to array for multi-select
    etape: [], // Changed to array for multi-select
    search: '',
    agent_impression: [], // Changed to array for multi-select
    machine_impression: '',
    bat: '',
    express: '',
    pack_fin_annee: '',
    type_sous_traitance: [] // Changed to array for multi-select
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0
  })
  const [stats, setStats] = useState({})
  
  // Users for dropdowns
  const [commercialUsers, setCommercialUsers] = useState([])
  const [infographUsers, setInfographUsers] = useState([])
  const [atelierUsers, setAtelierUsers] = useState([])

  // Inline editing state
  const [inlineEditing, setInlineEditing] = useState({})
  const [tempValues, setTempValues] = useState({})

  // Status options for history (only delivered and cancelled orders)
  const historyStatusOptions = [
    { value: 'livre', label: 'Livré', color: 'bg-green-200 text-green-900 border border-green-300' },
    { value: 'annule', label: 'Annulé', color: 'bg-red-200 text-red-900 border border-red-300' }
  ]

  // All status options for admin editing
  const allStatusOptions = [
    { value: 'problem_technique', label: 'Problème technique' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'attente_validation', label: 'Attente de validation' },
    { value: 'modification', label: 'Modification' },
    { value: 'termine', label: 'Terminé' },
    { value: 'livre', label: 'Livré' },
    { value: 'annule', label: 'Annulé' }
  ]

  const atelierOptions = ['petit format', 'grand format', 'sous-traitance', 'service crea']
  const etapeOptions = ['conception', 'pré-presse', 'travail graphique', 'impression', 'finition', 'en production', 'controle qualité']
  
  const batOptions = [
    { value: 'avec', label: 'Avec' },
    { value: 'sans', label: 'Sans' }
  ]
  const expressOptions = [
    { value: 'oui', label: 'Oui' },
    { value: 'non', label: 'Non' }
  ]

  const packFinAnneeOptions = [
    { value: 'true', label: 'Oui' },
    { value: 'false', label: 'Non' }
  ]

  const sousTraitanceOptions = [
    { value: 'Offset', label: 'Offset' },
    { value: 'Sérigraphie', label: 'Sérigraphie' },
    { value: 'Objet publicitaire', label: 'Objet publicitaire' },
    { value: 'Autre', label: 'Autre' }
  ]

  // Helper function to check if user can delete orders
  const canDeleteOrders = () => {
    // Only admin users can delete history orders
    return user && user.role === 'admin'
  }

  // Helper function to check if user can edit fields
  const isFieldEditable = (field) => {
    // Only admin users can edit status in history
    return user && user.role === 'admin' && field === 'statut'
  }

  // Inline editing functions
  const handleInlineEdit = (orderProductId, field, currentValue) => {
    if (!isFieldEditable(field)) {
      return // Not allowed to edit this field
    }
    
    const editKey = `${orderProductId}-${field}`
    setInlineEditing({ [editKey]: true })
    setTempValues({ [editKey]: currentValue })
  }

  const cancelInlineEdit = (orderProductId, field) => {
    const editKey = `${orderProductId}-${field}`
    setInlineEditing({ ...inlineEditing, [editKey]: false })
    setTempValues({ ...tempValues, [editKey]: null })
  }

  const handleTempValueChange = (orderProductId, field, value) => {
    setTempValues({ ...tempValues, [`${orderProductId}-${field}`]: value })
  }

  const saveInlineEdit = async (orderProductId, field, newValue) => {
    try {
      // Find the row to get orderId and orderProductId
      const row = orderProductRows.find(r => r.orderProductId === orderProductId)
      if (!row) {
        throw new Error('Order product not found')
      }
      
      const data = { [field]: newValue }
      await orderAPI.updateOrderProduct(row.orderId, row.orderProductId, data)
      
      // Update the local state
      setOrderProductRows(prev => prev.map(row => 
        row.orderProductId === orderProductId 
          ? { ...row, [field]: newValue }
          : row
      ))
      
      // Clear editing state
      const editKey = `${orderProductId}-${field}`
      setInlineEditing({ ...inlineEditing, [editKey]: false })
      setTempValues({ ...tempValues, [editKey]: null })
      
      // Refresh stats if status changed
      if (field === 'statut') {
        fetchHistoryStats()
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour')
      console.error(err)
      // Cancel editing on error
      cancelInlineEdit(orderProductId, field)
    }
  }

  // Render inline status editor
  const renderInlineStatus = (orderProductRow) => {
    const editKey = `${orderProductRow.orderProductId}-statut`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => handleTempValueChange(orderProductRow.orderProductId, 'statut', e.target.value)}
            onBlur={() => {
              if (tempValue && tempValue !== orderProductRow.statut) {
                saveInlineEdit(orderProductRow.orderProductId, 'statut', tempValue)
              } else {
                cancelInlineEdit(orderProductRow.orderProductId, 'statut')
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (tempValue && tempValue !== orderProductRow.statut) {
                  saveInlineEdit(orderProductRow.orderProductId, 'statut', tempValue)
                } else {
                  cancelInlineEdit(orderProductRow.orderProductId, 'statut')
                }
              } else if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, 'statut')
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          >
            <option value="">-</option>
            {allStatusOptions.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      )
    }

    const fieldEditable = isFieldEditable('statut')

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, 'statut', orderProductRow.statut)}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{getStatusBadge(orderProductRow.statut)}</span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  // Role-based permissions - simplified for history (read-only)
  const getVisibleColumns = () => {
    if (user?.role === 'commercial') {
      return {
        numero_affaire: true,
        numero_dm: true,
        client_info: true,
        commercial_en_charge: true,
        product_name: true,
        quantity: true,
        numero_pms: false,
        date_limite_livraison_attendue: true,
        statut: true,
        etape: true,
        atelier_concerne: false,
        infograph_en_charge: false,
        date_limite_livraison_estimee: true,
        estimated_work_time_minutes: false,
        bat: false,
        express: false,
        pack_fin_annee: false,
        type_sous_traitance: false,
        commentaires: false,
        agent_impression: false,
        machine_impression: false
      }
    } else if (user?.role === 'infograph') {
      return {
        numero_affaire: false,
        numero_dm: false,
        client_info: true,
        commercial_en_charge: false,
        product_name: true,
        quantity: true,
        numero_pms: true,
        date_limite_livraison_attendue: false,
        statut: true,
        etape: true,
        atelier_concerne: true,
        infograph_en_charge: true,
        agent_impression: true,
        machine_impression: false,
        date_limite_livraison_estimee: true,
        estimated_work_time_minutes: false,
        bat: true,
        express: true,
        pack_fin_annee: false,
        type_sous_traitance: false,
        commentaires: false
      }
    } else if (user?.role === 'atelier') {
      return {
        numero_affaire: false,
        numero_dm: false,
        client_info: true,
        commercial_en_charge: false,
        product_name: true,
        quantity: true,
        numero_pms: true,
        date_limite_livraison_attendue: false,
        statut: true,
        etape: true,
        atelier_concerne: true,
        infograph_en_charge: true,
        agent_impression: true,
        machine_impression: true,
        date_limite_livraison_estimee: true,
        estimated_work_time_minutes: false,
        bat: true,
        express: true,
        pack_fin_annee: false,
        type_sous_traitance: true,
        commentaires: false
      }
    } else {
      // Admin and other roles see everything
      return {
        numero_affaire: true,
        numero_dm: true,
        client_info: true,
        commercial_en_charge: true,
        product_name: true,
        quantity: true,
        numero_pms: true,
        date_limite_livraison_attendue: true,
        statut: true,
        etape: true,
        atelier_concerne: true,
        infograph_en_charge: true,
        agent_impression: true,
        machine_impression: true,
        date_limite_livraison_estimee: true,
        estimated_work_time_minutes: true,
        bat: true,
        express: true,
        pack_fin_annee: true,
        type_sous_traitance: true,
        commentaires: true
      }
    }
  }

  const visibleColumns = getVisibleColumns()

  // Fetch orders and flatten to order-product rows (history version)
  const fetchHistoryOrders = async (page = 1) => {
    try {
      setLoading(true)
      
      // Use the new history API endpoint
      const historyFilters = {
        ...filters,
        page,
        limit: 10
      }

      // Convert array filters to comma-separated strings for backend compatibility
      const processedFilters = { ...historyFilters }
      if (Array.isArray(processedFilters.atelier) && processedFilters.atelier.length > 0) {
        processedFilters.atelier = processedFilters.atelier.join(',')
      }
      if (Array.isArray(processedFilters.etape) && processedFilters.etape.length > 0) {
        processedFilters.etape = processedFilters.etape.join(',')
      }
      if (Array.isArray(processedFilters.type_sous_traitance) && processedFilters.type_sous_traitance.length > 0) {
        processedFilters.type_sous_traitance = processedFilters.type_sous_traitance.join(',')
      }
      if (Array.isArray(processedFilters.commercial) && processedFilters.commercial.length > 0) {
        processedFilters.commercial = processedFilters.commercial.join(',')
      }
      if (Array.isArray(processedFilters.infographe) && processedFilters.infographe.length > 0) {
        processedFilters.infographe = processedFilters.infographe.join(',')
      }
      if (Array.isArray(processedFilters.agent_impression) && processedFilters.agent_impression.length > 0) {
        processedFilters.agent_impression = processedFilters.agent_impression.join(',')
      }

      // Remove empty filters
      Object.keys(processedFilters).forEach(key => {
        if (Array.isArray(processedFilters[key])) {
          // For array filters, remove if empty array
          if (processedFilters[key].length === 0) {
            delete processedFilters[key]
          }
        } else {
          // For string filters, remove if empty string
          if (processedFilters[key] === '') {
            delete processedFilters[key]
          }
        }
      })

      const response = await orderAPI.getHistoryOrders(processedFilters)
      
      // Flatten the response orders to order-product rows
      const flatRows = []
      response.orders.forEach(order => {
        if (order.orderProducts && order.orderProducts.length > 0) {
          order.orderProducts.forEach(orderProduct => {
            const productStatus = orderProduct.statut || order.statut
            
            flatRows.push({
              orderProductId: orderProduct.id,
              orderId: order.id,
              numero_affaire: order.numero_affaire,
              numero_dm: order.numero_dm,
              client_info: order.clientInfo?.nom || order.client,
              commercial_en_charge: order.commercial_en_charge,
              date_limite_livraison_attendue: order.date_limite_livraison_attendue,
              product_id: orderProduct.product_id,
              product_name: orderProduct.product?.name || orderProduct.productInfo?.name || 'Produit',
              quantity: orderProduct.quantity,
              numero_pms: orderProduct.numero_pms,
              statut: productStatus,
              etape: orderProduct.etape,
              atelier_concerne: orderProduct.atelier_concerne,
              infograph_en_charge: orderProduct.infograph_en_charge,
              agent_impression: orderProduct.agent_impression,
              machine_impression: orderProduct.machine_impression,
              date_limite_livraison_estimee: orderProduct.date_limite_livraison_estimee,
              estimated_work_time_minutes: orderProduct.estimated_work_time_minutes,
              bat: orderProduct.bat,
              express: orderProduct.express,
              pack_fin_annee: orderProduct.pack_fin_annee,
              type_sous_traitance: orderProduct.type_sous_traitance,
              commentaires: orderProduct.commentaires,
              finitions: orderProduct.finitions || [],
              orderProductFinitions: orderProduct.orderProductFinitions || [],
              clientInfo: order.clientInfo || { nom: order.client },
              createdAt: order.createdAt,
              updatedAt: order.updatedAt
            })
          })
        }
      })
      
      setOrderProductRows(flatRows)
      setPagination(response.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalOrders: 0
      })
    } catch (err) {
      setError('Erreur lors du chargement de l\'historique des commandes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistoryStats = async () => {
    try {
      const response = await orderAPI.getHistoryOrderStats()
      setStats(response.stats || {
        livre: 0,
        annule: 0,
        total: 0
      })
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err)
    }
  }

  // Fetch users by role for dropdowns
  const fetchUsersByRole = async () => {
    try {
      const [commercialResponse, infographResponse, atelierResponse] = await Promise.all([
        userAPI.getUsers({ role: 'commercial' }),
        userAPI.getUsers({ role: 'infograph' }),
        userAPI.getUsers({ role: 'atelier' })
      ])
      setCommercialUsers(commercialResponse.users || [])
      setInfographUsers(infographResponse.users || [])
      setAtelierUsers(atelierResponse.users || [])
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err)
    }
  }

  useEffect(() => {
    fetchHistoryOrders()
    fetchHistoryStats()
  }, [filters])

  // Fetch users once on component mount
  useEffect(() => {
    fetchUsersByRole()
  }, [])

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!connected) return

    const unsubscribeOrderUpdated = subscribe('orderUpdated', (updatedOrder) => {
      console.log('Real-time: Order updated in history', updatedOrder)
      
      // Only add to history if order is now cancelled or delivered
      if (updatedOrder.statut === 'annule' || updatedOrder.statut === 'livre') {
        // Refresh the data since the structure is more complex now
        fetchHistoryOrders(pagination.currentPage)
        fetchHistoryStats()
      } else {
        // Order is no longer in history state, refresh data
        fetchHistoryOrders(pagination.currentPage)
        fetchHistoryStats()
      }
    })

    const unsubscribeOrderDeleted = subscribe('orderDeleted', (deletedOrderData) => {
      console.log('Real-time: Order deleted from history', deletedOrderData)
      
      setOrderProductRows(prevRows => prevRows.filter(row => row.orderId !== deletedOrderData.id))
      
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

  const handleRowClick = async (orderProductRow, event) => {
    // Don't open modal if clicking on action buttons or inline edit fields
    if (event.target.closest('.action-button') || event.target.closest('.inline-edit')) {
      return
    }
    
    try {
      // Fetch the complete order with all products from the API
      const response = await orderAPI.getOrder(orderProductRow.orderId)
      if (response && response.order) {
        // Find the specific order product that was clicked
        const clickedOrderProduct = response.order.orderProducts?.find(
          op => op.id === orderProductRow.orderProductId
        )
        
        setSelectedOrder(response.order)
        setSelectedOrderProduct(clickedOrderProduct || null)
        setShowViewModal(true)
      } else {
        console.error('Failed to fetch order details')
        setError('Erreur lors du chargement des détails de la commande')
      }
    } catch (error) {
      console.error('Error fetching order for view:', error)
      setError('Erreur lors du chargement des détails de la commande')
    }
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
    if (!statusConfig) {
      // Fallback for any other status
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-900 border border-gray-300">
          {status || 'Inconnu'}
        </span>
      )
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    )
  }

  const getRowBackgroundClass = (orderProductRow) => {
    const { statut } = orderProductRow
    
    if (statut === 'livre') {
      return 'bg-green-50 hover:bg-green-100 border-l-4 border-green-400'
    } else if (statut === 'annule') {
      return 'bg-red-50 hover:bg-red-100 border-l-4 border-red-400'
    }
    
    return 'bg-gray-50 hover:bg-gray-100'
  }

  const getBatBadge = (batValue) => {
    const getBatBackgroundClass = (value) => {
      if (value === 'avec') {
        return 'bg-green-100 text-green-800 border border-green-200'
      } else if (value === 'sans') {
        return 'bg-red-100 text-red-800 border border-red-200'
      } else {
        return 'bg-gray-100 text-gray-800 border border-gray-200'
      }
    }

    const getBatLabel = (value) => {
      const option = batOptions.find(opt => opt.value === value)
      return option ? option.label : (value || '-')
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBatBackgroundClass(batValue)}`}>
        {getBatLabel(batValue)}
      </span>
    )
  }

  const getExpressBadge = (expressValue) => {
    const isExpress = expressValue === 'oui'
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        isExpress 
          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          : 'bg-gray-100 text-gray-800 border border-gray-200'
      }`}>
        {isExpress ? 'Oui' : 'Non'}
      </span>
    )
  }

  const getAtelierBadge = (atelierValue) => {
    const getAtelierBackgroundClass = (value) => {
      if (value === 'grand format') {
        return 'bg-green-100 text-green-800 border border-green-200'
      } else if (value === 'petit format') {
        return 'bg-blue-100 text-blue-800 border border-blue-200'
      } else if (value === 'sous-traitance') {
        return 'bg-orange-100 text-orange-800 border border-orange-200'
      } else if (value === 'service crea') {
        return 'bg-purple-100 text-purple-800 border border-purple-200'
      } else {
        return 'bg-gray-100 text-gray-800 border border-gray-200'
      }
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAtelierBackgroundClass(atelierValue)}`}>
        {atelierValue || '-'}
      </span>
    )
  }

  const getPackFinAnneeBadge = (packValue) => {
    const isPackFinAnnee = packValue === true || packValue === 'true'
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        isPackFinAnnee 
          ? 'bg-purple-100 text-purple-800 border border-purple-200'
          : 'bg-gray-100 text-gray-800 border border-gray-200'
      }`}>
        {isPackFinAnnee ? 'Oui' : 'Non'}
      </span>
    )
  }

  if (loading && orderProductRows.length === 0) {
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
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Historique des commandes</h1>
            <WebSocketStatus />
          </div>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
            <div className="text-2xl font-bold text-gray-600">{stats.total || 0}</div>
            <div className="text-sm text-gray-600">Total historique</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-600">{stats.livre || 0}</div>
            <div className="text-sm text-gray-600">Livrées</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
            <div className="text-2xl font-bold text-red-600">{stats.annule || 0}</div>
            <div className="text-sm text-gray-600">Annulées</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          {/* Admin editing notice */}
          {user?.role === 'admin' && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-blue-800">
                  Mode administrateur : Vous pouvez modifier le statut des commandes en cliquant dessus.
                </span>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3 items-center">
            {/* 1. PMS Search Field */}
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher par N° PMS"
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64"
              />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* 2. Client Filter */}
            <input
              type="text"
              placeholder="Client"
              value={filters.client}
              onChange={(e) => setFilters({...filters, client: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />

            {/* 3. Commercial Filter */}
            <MultiSelectFilter
              options={commercialUsers.map(user => ({ value: user.username, label: user.username }))}
              selectedValues={filters.commercial}
              onChange={(values) => setFilters({...filters, commercial: values})}
              placeholder="Commercial"
              className="w-48"
            />

            {/* 4. Infographe Filter */}
            <MultiSelectFilter
              options={infographUsers.map(user => ({ value: user.username, label: user.username }))}
              selectedValues={filters.infographe}
              onChange={(values) => setFilters({...filters, infographe: values})}
              placeholder="Infographe"
              className="w-48"
            />

            {/* 5. Agent Impression Filter */}
            <MultiSelectFilter
              options={atelierUsers.map(user => ({ value: user.username, label: user.username }))}
              selectedValues={filters.agent_impression}
              onChange={(values) => setFilters({ ...filters, agent_impression: values })}
              placeholder="Agent impression"
              className="w-48"
            />

            {/* 6. Workshop Filter - Tous les ateliers */}
            <MultiSelectFilter
              options={atelierOptions}
              selectedValues={filters.atelier}
              onChange={(values) => setFilters({...filters, atelier: values})}
              placeholder="Tous les ateliers"
              className="w-48"
            />

            {/* 7. Etape Filter - Toutes les étapes */}
            <MultiSelectFilter
              options={etapeOptions}
              selectedValues={filters.etape}
              onChange={(values) => setFilters({...filters, etape: values})}
              placeholder="Toutes les étapes"
              className="w-48"
            />

            {/* 8. Status Filter - Tous les statuts */}
            <select
              value={filters.statut}
              onChange={(e) => setFilters({...filters, statut: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Tous les statuts</option>
              {historyStatusOptions.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            {/* 9. Type Sous-traitance Filter */}
            <MultiSelectFilter
              options={sousTraitanceOptions}
              selectedValues={filters.type_sous_traitance}
              onChange={(values) => setFilters({...filters, type_sous_traitance: values})}
              placeholder="Type sous-traitance"
              className="w-48"
            />

            {/* 10. Express Filter - Toutes les urgences */}
            <select
              value={filters.express || ''}
              onChange={(e) => setFilters({ ...filters, express: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Toutes les urgences</option>
              <option value="oui">Express uniquement</option>
              <option value="non">Non express</option>
            </select>

            {/* 11. BAT Filter - Tous les BAT */}
            <select
              value={filters.bat || ''}
              onChange={(e) => setFilters({ ...filters, bat: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Tous les BAT</option>
              <option value="avec">Avec BAT</option>
              <option value="sans">Sans BAT</option>
            </select>

            {/* 12. Pack Fin d'Année Filter */}
            <select
              value={filters.pack_fin_annee || ''}
              onChange={(e) => setFilters({ ...filters, pack_fin_annee: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Pack fin d'année</option>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>

            {/* 13. Machine Impression Filter - Only visible for admin and atelier users */}
            {(user?.role === 'admin' || user?.role === 'atelier') && (
              <input
                type="text"
                placeholder="Machine impression"
                value={filters.machine_impression}
                onChange={(e) => setFilters({ ...filters, machine_impression: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            )}

            {/* Clear Filters Button */}
            {(Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== '')) && (
              <button
                onClick={() => setFilters({
                  statut: '',
                  commercial: [], // Reset to empty array
                  client: '',
                  atelier: [], // Reset to empty array
                  infographe: [], // Reset to empty array
                  etape: [], // Reset to empty array
                  search: '',
                  agent_impression: [], // Reset to empty array
                  machine_impression: '',
                  bat: '',
                  express: '',
                  pack_fin_annee: '',
                  type_sous_traitance: [] // Reset to empty array
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

        {/* Main Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Role-based column visibility */}
                  {visibleColumns.atelier_concerne && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Atelier
                    </th>
                  )}
                  {visibleColumns.client_info && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                  )}
                  {visibleColumns.product_name && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produit
                    </th>
                  )}
                  {visibleColumns.quantity && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantité
                    </th>
                  )}
                  {visibleColumns.bat && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      BAT
                    </th>
                  )}
                  {visibleColumns.express && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Express
                    </th>
                  )}
                  {visibleColumns.pack_fin_annee && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pack fin d'année
                    </th>
                  )}
                  {visibleColumns.infograph_en_charge && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Graphiste
                    </th>
                  )}
                  {visibleColumns.numero_pms && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      N° PMS
                    </th>
                  )}
                  {visibleColumns.etape && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Étape
                    </th>
                  )}
                  {visibleColumns.agent_impression && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent impression
                    </th>
                  )}
                  {visibleColumns.machine_impression && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Machine impression
                    </th>
                  )}
                  {visibleColumns.statut && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                  )}
                  {visibleColumns.date_limite_livraison_estimee && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Délais
                    </th>
                  )}
                  {visibleColumns.numero_affaire && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      N° Affaire
                    </th>
                  )}
                  {visibleColumns.numero_dm && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      N° DM
                    </th>
                  )}
                  {visibleColumns.commercial_en_charge && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commercial
                    </th>
                  )}
                  {visibleColumns.date_limite_livraison_attendue && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Délai Client
                    </th>
                  )}
                  {visibleColumns.estimated_work_time_minutes && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Temps (min)
                    </th>
                  )}
                  {visibleColumns.commentaires && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commentaires
                    </th>
                  )}
                  {visibleColumns.type_sous_traitance && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type sous-traitance
                    </th>
                  )}
                  {canDeleteOrders() && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orderProductRows.map((row) => (
                  <tr 
                    key={`${row.orderId}-${row.orderProductId}`}
                    className={`transition-colors duration-200 cursor-pointer ${getRowBackgroundClass(row)}`}
                    onClick={(e) => handleRowClick(row, e)}
                  >
                    {/* Role-based column visibility */}
                    {visibleColumns.atelier_concerne && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {getAtelierBadge(row.atelier_concerne)}
                      </td>
                    )}
                    {visibleColumns.client_info && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {row.client_info}
                      </td>
                    )}
                    {visibleColumns.product_name && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {row.product_name}
                      </td>
                    )}
                    {visibleColumns.quantity && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {row.quantity}
                      </td>
                    )}
                    {visibleColumns.bat && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {getBatBadge(row.bat)}
                      </td>
                    )}
                    {visibleColumns.express && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {getExpressBadge(row.express)}
                      </td>
                    )}
                    {visibleColumns.pack_fin_annee && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {getPackFinAnneeBadge(row.pack_fin_annee)}
                      </td>
                    )}
                    {visibleColumns.infograph_en_charge && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {row.infograph_en_charge || '-'}
                      </td>
                    )}
                    {visibleColumns.numero_pms && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {row.numero_pms}
                      </td>
                    )}
                    {visibleColumns.etape && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {row.etape || '-'}
                      </td>
                    )}
                    {visibleColumns.agent_impression && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {row.agent_impression || '-'}
                      </td>
                    )}
                    {visibleColumns.machine_impression && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {row.machine_impression || '-'}
                      </td>
                    )}
                    {visibleColumns.statut && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {renderInlineStatus(row)}
                      </td>
                    )}
                    {visibleColumns.date_limite_livraison_estimee && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(row.date_limite_livraison_estimee)}
                      </td>
                    )}
                    {visibleColumns.numero_affaire && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {row.numero_affaire}
                      </td>
                    )}
                    {visibleColumns.numero_dm && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {row.numero_dm}
                      </td>
                    )}
                    {visibleColumns.commercial_en_charge && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {row.commercial_en_charge}
                      </td>
                    )}
                    {visibleColumns.date_limite_livraison_attendue && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(row.date_limite_livraison_attendue)}
                      </td>
                    )}
                    {visibleColumns.estimated_work_time_minutes && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {row.estimated_work_time_minutes ? `${row.estimated_work_time_minutes} min` : '-'}
                      </td>
                    )}
                    {visibleColumns.commentaires && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {row.commentaires && row.commentaires.length > 50 
                          ? row.commentaires.substring(0, 47) + '...' 
                          : row.commentaires || '-'}
                      </td>
                    )}
                    {visibleColumns.type_sous_traitance && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        {row.type_sous_traitance || '-'}
                      </td>
                    )}
                    {canDeleteOrders() && (
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2 action-button">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteOrder(row.orderId)
                            }}
                            className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-xs"
                          >
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

          {orderProductRows.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white">
              Aucune commande trouvée dans l'historique
            </div>
          )}

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
                    <span className="font-medium">{pagination.totalOrders}</span> éléments
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
          selectedOrderProduct={selectedOrderProduct}
          onClose={() => {
            setShowViewModal(false)
            setSelectedOrder(null)
            setSelectedOrderProduct(null)
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
        message={`Êtes-vous sûr de vouloir supprimer définitivement cette commande ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      />
    </div>
  )
}

export default HistoryOrdersPage
