import React, { useState, useEffect, useMemo } from 'react'
import { orderAPI, userAPI } from '../utils/api'
import Button from '../components/ButtonComponent'
import Input from '../components/InputComponent'
import AlertDialog from '../components/AlertDialog'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { usePriorityNotifications } from '../hooks/usePriorityNotifications'
import { useInfographNotifications } from '../hooks/useInfographNotifications'
import { useAtelierNotifications } from '../hooks/useAtelierNotifications'
import OrderModal from '../components/OrderModal'
import OrderViewModal from '../components/OrderViewModal'
import WebSocketStatus from '../components/WebSocketStatus'

const DashboardPageClean = () => {
  const { user } = useAuth()
  const { subscribe, connected } = useWebSocket()
  
  // State management
  const [orderProductRows, setOrderProductRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({})
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  
  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)
  
  // Filters
  const [filters, setFilters] = useState({
    statut: '',
    commercial: '',
    client: '',
    atelier: '',
    infograph: '',
    agent_impression: '',
    etape: '',
    express: '',
    bat: '',
    pack_fin_annee: '',
    search: '',
    date_from: '',
    date_to: '',
    timeFilter: 'all'
  })
  
  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0
  })
  
  // Inline editing
  const [inlineEditing, setInlineEditing] = useState({})
  const [tempValues, setTempValues] = useState({})
  // Confirmation dialog for status change
  const [pendingStatusChange, setPendingStatusChange] = useState(null) // { orderProductId, newValue } | null
  const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false)
  
  // Problème technique dialog
  const [showProblemeDialog, setShowProblemeDialog] = useState(false)
  const [pendingProblemeChange, setPendingProblemeChange] = useState(null) // { orderProductId, newValue } | null
  const [problemeDescription, setProblemeDescription] = useState('')
  
  // Users for dropdowns
  const [infographUsers, setInfographUsers] = useState([])
  const [atelierUsers, setAtelierUsers] = useState([])
  
  // Time-based refresh
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Options arrays
  const statusOptions = [
    { value: 'problem_technique', label: 'Problème technique' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'termine', label: 'Terminé' },
    { value: 'livre', label: 'Livré' },
    { value: 'annule', label: 'Annulé' }
  ]
  
  const atelierOptions = ['petit format', 'grand format', 'sous-traitance', 'service crea']
  
  // All users can now filter by any etape
  const etapeOptions = ['conception', 'pré-presse', 'travail graphique', 'impression', 'finition']
  
  // Helper function to get etape options based on atelier_concerne
  const getEtapeOptionsByAtelier = (atelierConcerne) => {
    if (!atelierConcerne) return []
    
    const atelier = atelierConcerne.toLowerCase()
    
    if (atelier === 'petit format' || atelier === 'grand format') {
      return ['pré-presse', 'impression', 'finition']
    } else if (atelier === 'service crea') {
      return ['travail graphique', 'conception']
    } else if (atelier === 'sous-traitance') {
      return []
    }
    
    // Default fallback
    return etapeOptions
  }
  
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

  // Convert flattened orderProductRows back to orders format for notifications
  const convertToOrdersFormat = (orderProductRows) => {
    const orderMap = new Map()
    
    orderProductRows.forEach(row => {
      if (!orderMap.has(row.orderId)) {
        orderMap.set(row.orderId, {
          id: row.orderId,
          numero_affaire: row.numero_affaire,
          numero_dm: row.numero_dm,
          numero_pms: row.numero_pms,
          client: row.client_info,
          clientInfo: row.clientInfo,
          commercial_en_charge: row.commercial_en_charge,
          date_limite_livraison_attendue: row.date_limite_livraison_attendue,
          date_limite_livraison_estimee: row.date_limite_livraison_estimee,
          estimated_work_time_minutes: row.estimated_work_time_minutes,
          statut: row.statut,
          etape: row.etape,
          express: row.express,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        })
      }
    })
    return Array.from(orderMap.values())
  }

  // Priority notifications - use converted order format
  const ordersForNotifications = convertToOrdersFormat(orderProductRows)
  const { checkUrgentOrders } = usePriorityNotifications(ordersForNotifications)

  // Role-specific notifications for etape changes
  useInfographNotifications()
  useAtelierNotifications()

  // Role-based permissions
  const canCreateOrders = () => user && (user.role === 'admin' || user.role === 'commercial')
  const canEditOrders = () => user && (user.role === 'admin' || user.role === 'commercial' || user.role === 'infograph')
  const canDeleteOrders = () => user && user.role === 'admin'

  // Get visible columns based on user role
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
        date_limite_livraison_client: true, // New column for client deadline
        statut: true,
        etape: true,
        atelier_concerne: false,
        infograph_en_charge: false,
        date_limite_livraison_estimee: true,
        estimated_work_time_minutes: false,
        bat: false,
        express: false,
        pack_fin_annee: true,
        commentaires: false
      }
    } else if (user?.role === 'infograph' || user?.role === 'atelier') {
      // For infograph and atelier users: Atelier - Client - Produit - Quantity - BAT - Express - Graphiste - PMS - Etape - Agent impression - Statut - Délais
      return {
        numero_affaire: false,
        numero_dm: false,
        client_info: true,
        commercial_en_charge: false,
        product_name: true,
        quantity: true,
        numero_pms: true,
        date_limite_livraison_attendue: false,
        date_limite_livraison_client: false, // Hidden for infograph/atelier
        statut: true,
        etape: true,
        atelier_concerne: true,
        infograph_en_charge: true,
        agent_impression: true,
        date_limite_livraison_estimee: true,
        estimated_work_time_minutes: false,
        bat: true,
        express: true,
        pack_fin_annee: true,
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
        date_limite_livraison_client: true, // Admin sees all columns including client deadline
        statut: true,
        etape: true,
        atelier_concerne: true,
        infograph_en_charge: true,
        agent_impression: true,
        date_limite_livraison_estimee: true,
        estimated_work_time_minutes: true,
        bat: true,
        express: true,
        pack_fin_annee: true,
        commentaires: true
      }
    }
  }

  const visibleColumns = getVisibleColumns()

  // Fetch orders and flatten to order-product rows
  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true)
      const params = { page, limit: 10, ...filters }
      Object.keys(params).forEach(key => params[key] === '' && delete params[key])
      
      const response = await orderAPI.getOrders(params)
      
      // Flatten orders to order-product rows
      const flatRows = []
      response.orders.forEach(order => {
        if (order.orderProducts && order.orderProducts.length > 0) {
          order.orderProducts.forEach(orderProduct => {
            // Get the actual product status (prioritize product status over order status)
            const productStatus = orderProduct.statut || order.statut
            
            flatRows.push({
              // Unique identifier for this row
              orderProductId: orderProduct.id,
              
              // Order-level fields
              orderId: order.id,
              numero_affaire: order.numero_affaire,
              numero_dm: order.numero_dm,
              client_info: order.clientInfo?.nom || order.client,
              commercial_en_charge: order.commercial_en_charge,
              date_limite_livraison_attendue: order.date_limite_livraison_attendue,
              
              // Product-level fields
              product_id: orderProduct.product_id,
              product_name: orderProduct.product?.name || orderProduct.productInfo?.name || 'Produit',
              quantity: orderProduct.quantity,
              numero_pms: orderProduct.numero_pms,
              statut: productStatus,
              etape: orderProduct.etape,
              atelier_concerne: orderProduct.atelier_concerne,
              infograph_en_charge: orderProduct.infograph_en_charge,
              agent_impression: orderProduct.agent_impression,
              date_limite_livraison_estimee: orderProduct.date_limite_livraison_estimee,
              estimated_work_time_minutes: orderProduct.estimated_work_time_minutes,
              bat: orderProduct.bat,
              express: orderProduct.express,
              pack_fin_annee: orderProduct.pack_fin_annee,
              commentaires: orderProduct.commentaires,
              finitions: orderProduct.finitions || [], // Legacy finitions field for backward compatibility
              orderProductFinitions: orderProduct.orderProductFinitions || [], // New finitions structure
              
              // Derived fields for compatibility
              clientInfo: order.clientInfo || { nom: order.client },
              
              // Timestamp fields
              createdAt: order.createdAt,
              updatedAt: order.updatedAt
            })
          })
        }
      })
      
      setOrderProductRows(flatRows)
      setPagination({
        currentPage: response.pagination?.currentPage || 1,
        totalPages: response.pagination?.totalPages || 1,
        totalOrders: response.pagination?.totalOrders || 0
      })
    } catch (err) {
      setError('Erreur lors du chargement des commandes')
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await orderAPI.getOrderStats()
      setStats(response.stats)
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  // Fetch users by role for dropdowns
  const fetchUsersByRole = async () => {
    try {
      const [infographResponse, atelierResponse] = await Promise.all([
        userAPI.getUsers({ role: 'infograph' }),
        userAPI.getUsers({ role: 'atelier' })
      ])
      setInfographUsers(infographResponse.users || [])
      setAtelierUsers(atelierResponse.users || [])
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  // Calculate urgency for sorting and coloring
  const getOrderUrgency = (orderProductRow) => {
    const { statut, date_limite_livraison_estimee, estimated_work_time_minutes } = orderProductRow
    
    // If status is finished, least urgent (5)
    if (statut === 'termine' || statut === 'livre') {
      return 5
    }
    
    // If no deadline date, medium urgency (3)
    if (!date_limite_livraison_estimee) {
      return 3
    }
    
    const now = currentTime
    const deadline = new Date(date_limite_livraison_estimee)
    
    // Calculate work time in milliseconds (default to 2 hours if not specified)
    const workTimeMs = estimated_work_time_minutes ? estimated_work_time_minutes * 60 * 1000 : 2 * 60 * 60 * 1000
    
    // Calculate the latest start time (deadline - work time needed)
    const latestStartTime = new Date(deadline.getTime() - workTimeMs)
    
    // Calculate time until we must start working
    const timeUntilMustStart = latestStartTime - now
    
    // Determine urgency level
    if (timeUntilMustStart < 0) {
      return 0 // Most urgent - past the time we should have started (RED)
    } else if (timeUntilMustStart <= 30 * 60 * 1000) {
      return 1 // Very urgent - 30 minutes or less before must start (ORANGE)
    } else if (timeUntilMustStart <= 60 * 60 * 1000) {
      return 2 // Urgent - 1 hour or less before must start (YELLOW)
    } else {
      return 4 // Normal - enough time available (GRAY)
    }
  }

  // Sort orders by express status first, then urgency and deadline
  const sortedOrderProductRows = useMemo(() => {
    const sorted = [...orderProductRows].sort((a, b) => {
      // First priority: Express orders (oui) go to the top
      const isExpressA = a.express === 'oui'
      const isExpressB = b.express === 'oui'
      
      if (isExpressA && !isExpressB) return -1 // A is express, B is not - A goes first
      if (!isExpressA && isExpressB) return 1  // B is express, A is not - B goes first
      
      // If both are express or both are not express, sort by urgency
      const urgencyA = getOrderUrgency(a)
      const urgencyB = getOrderUrgency(b)
      
      if (urgencyA !== urgencyB) {
        return urgencyA - urgencyB // Lower urgency number = higher priority
      }
      
      // If same urgency, sort by deadline
      const deadlineA = a.date_limite_livraison_estimee ? new Date(a.date_limite_livraison_estimee) : new Date('2099-12-31')
      const deadlineB = b.date_limite_livraison_estimee ? new Date(b.date_limite_livraison_estimee) : new Date('2099-12-31')
      
      return deadlineA - deadlineB
    })
    
    return sorted
  }, [orderProductRows, currentTime])

  // Group orders by express status for display
  const groupedOrderProductRows = useMemo(() => {
    const expressOrders = sortedOrderProductRows.filter(row => row.express === 'oui')
    const regularOrders = sortedOrderProductRows.filter(row => row.express !== 'oui')
    
    return { expressOrders, regularOrders }
  }, [sortedOrderProductRows])

  // Get row background color based on urgency and express status
  const getRowBackgroundClass = (orderProductRow) => {
    // Special handling for completed status - always green
    if (orderProductRow.statut === 'termine') {
      return 'bg-green-100 hover:bg-green-200 border-l-4 border-green-500'
    }
    
    const urgency = getOrderUrgency(orderProductRow)
    const isExpress = orderProductRow.express === 'oui'
    
    // Express orders get a special yellow accent
    if (isExpress) {
      switch (urgency) {
        case 0: return 'bg-red-200 hover:bg-red-300 border-l-4 border-yellow-500' // Express overdue
        case 1: return 'bg-orange-200 hover:bg-orange-300 border-l-4 border-yellow-500' // Express very urgent
        case 2: return 'bg-yellow-200 hover:bg-yellow-300 border-l-4 border-yellow-500' // Express urgent
        case 3: return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500' // Express medium urgency
        case 4: return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500' // Express normal
        case 5:
        default: return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500' // Express least urgent
      }
    }
    
    // Non-express orders use regular styling
    switch (urgency) {
      case 0: return 'bg-red-200 hover:bg-red-300 border-l-4 border-red-500' // Overdue
      case 1: return 'bg-orange-200 hover:bg-orange-300 border-l-4 border-orange-500' // Very urgent
      case 2: return 'bg-yellow-200 hover:bg-yellow-300 border-l-4 border-yellow-500' // Urgent
      case 3: return 'bg-gray-50 hover:bg-gray-100' // Medium urgency - no deadline set
      case 4: return 'bg-gray-50 hover:bg-gray-100' // Normal - enough time
      case 5:
      default: return 'bg-gray-50 hover:bg-gray-100' // Least urgent or default
    }
  }

  // Status badge component
  const getStatusBadge = (status) => {
    const statusConfig = {
      'problem_technique': { label: 'Problème technique', color: 'bg-yellow-100 text-yellow-800' },
      'en_cours': { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      'termine': { label: 'Terminé', color: 'bg-purple-100 text-purple-800' },
      'livre': { label: 'Livré', color: 'bg-green-100 text-green-800' },
      'annule': { label: 'Annulé', color: 'bg-red-100 text-red-800' }
    }
    
    const config = statusConfig[status] || { label: status || 'Inconnu', color: 'bg-gray-100 text-gray-800' }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  // Date formatting
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Helper function to check if a field is editable
  const isFieldEditable = (field) => {
    const editableFields = {
      admin: 'all', // Admin can edit everything
      commercial: [
        'numero_affaire', 'numero_dm', 'commercial_en_charge', 'date_limite_livraison_attendue',
        'quantity', 'numero_pms', 'statut', 'etape', 'atelier_concerne', 
        'infograph_en_charge', 'estimated_work_time_minutes', 'bat', 'express', 'pack_fin_annee', 'commentaires', 'finitions'
      ], // Commercial can edit everything except 'date_limite_livraison_estimee' (délais)
      infograph: [
        'quantity', 'numero_pms', 'statut', 'etape', 'atelier_concerne', 
        'infograph_en_charge', 'date_limite_livraison_estimee', 
        'estimated_work_time_minutes', 'bat', 'express', 'pack_fin_annee', 'commentaires', 'finitions'
      ], // Infograph can edit product-level fields
      atelier: ['statut', 'etape', 'atelier_concerne', 'agent_impression', 'commentaires', 'date_limite_livraison_estimee', 'pack_fin_annee'] // Atelier can edit limited fields including délais
    }
    
    const userRole = user?.role || 'guest'
    const allowedFields = editableFields[userRole] || []
    
    return allowedFields === 'all' || allowedFields.includes(field)
  }

  // Inline editing functions
  const handleInlineEdit = (orderProductId, field, currentValue) => {
    // Check if user can edit this field
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
      let valueToSend = newValue
      if (field === 'date_limite_livraison_estimee' && newValue) {
        valueToSend = new Date(newValue).toISOString()
      }

      // Find the order product row to get orderId and productId
      const orderProductRow = orderProductRows.find(row => row.orderProductId === orderProductId)
      if (!orderProductRow) return

      // Check if it's an order-level field or product-level field
      const orderLevelFields = ['numero_affaire', 'numero_dm', 'commercial_en_charge', 'date_limite_livraison_attendue']
      
      if (orderLevelFields.includes(field)) {
        await orderAPI.updateOrder(orderProductRow.orderId, { [field]: valueToSend })
      } else {
        // Use the actual product_id, not the orderProduct.id
        await orderAPI.updateOrderProduct(orderProductRow.orderId, orderProductRow.product_id, { [field]: valueToSend })
      }

      // Update local state
      if (field === 'statut' && (newValue === 'annule' || newValue === 'livre')) {
        setOrderProductRows(orderProductRows.filter(row => row.orderProductId !== orderProductId))
      } else {
        setOrderProductRows(orderProductRows.map(row => 
          row.orderProductId === orderProductId ? { ...row, [field]: valueToSend } : row
        ))
      }

      // Update selectedOrder if modal is open and it's the same order
      if (selectedOrder && showViewModal && orderProductRow.orderId === selectedOrder.id) {
        const updatedSelectedOrder = { ...selectedOrder }
        
        // Update order-level fields
        if (orderLevelFields.includes(field)) {
          updatedSelectedOrder[field] = valueToSend
        } else {
          // Update product-level fields in the first orderProduct (since we're showing single product details)
          if (updatedSelectedOrder.orderProducts && updatedSelectedOrder.orderProducts.length > 0) {
            updatedSelectedOrder.orderProducts[0] = {
              ...updatedSelectedOrder.orderProducts[0],
              [field]: valueToSend
            }
          }
          // Also update the order-level etape field for the ProgressStepper
          if (field === 'etape') {
            updatedSelectedOrder.etape = valueToSend
          }
        }
        
        setSelectedOrder(updatedSelectedOrder)
      }

      // Clear editing state
      const editKey = `${orderProductId}-${field}`
      setInlineEditing({ ...inlineEditing, [editKey]: false })
      setTempValues({ ...tempValues, [editKey]: null })

      // Refresh stats if status changed
      if (field === 'statut') {
        fetchStats()
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour')
      cancelInlineEdit(orderProductId, field)
    }
  }

  // Handle problème technique status change with issue description
  const saveProblemeEdit = async (orderProductId, newValue, issueDescription) => {
    try {
      // Find the order product row to get orderId and productId
      const orderProductRow = orderProductRows.find(row => row.orderProductId === orderProductId)
      if (!orderProductRow) return

      // Append new issue to existing comments
      const existingComments = orderProductRow.commentaires || ''
      const newComments = existingComments 
        ? `${existingComments}\n\n[Problème technique] ${issueDescription}`
        : `[Problème technique] ${issueDescription}`

      // Update both status and commentaires
      const updateData = {
        statut: newValue,
        commentaires: newComments
      }

      // Use the actual product_id, not the orderProduct.id
      await orderAPI.updateOrderProduct(orderProductRow.orderId, orderProductRow.product_id, updateData)

      // Update local state
      setOrderProductRows(orderProductRows.map(row => 
        row.orderProductId === orderProductId ? { 
          ...row, 
          statut: newValue,
          commentaires: newComments
        } : row
      ))

      // Update selectedOrder if modal is open and it's the same order
      if (selectedOrder && showViewModal && orderProductRow.orderId === selectedOrder.id) {
        const updatedSelectedOrder = { ...selectedOrder }
        
        // Update product-level fields in the first orderProduct
        if (updatedSelectedOrder.orderProducts && updatedSelectedOrder.orderProducts.length > 0) {
          updatedSelectedOrder.orderProducts[0] = {
            ...updatedSelectedOrder.orderProducts[0],
            statut: newValue,
            commentaires: newComments
          }
        }
        
        setSelectedOrder(updatedSelectedOrder)
      }

      // Clear editing state
      const editKey = `${orderProductId}-statut`
      setInlineEditing({ ...inlineEditing, [editKey]: false })
      setTempValues({ ...tempValues, [editKey]: null })

      // Refresh stats since status changed
      fetchStats()
    } catch (err) {
      setError('Erreur lors de la mise à jour')
      cancelInlineEdit(orderProductId, 'statut')
    }
  }

  // Render inline editing components
  const renderInlineText = (orderProductRow, field, displayValue) => {
    const editKey = `${orderProductRow.orderProductId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      const inputType = field === 'commentaires' ? 'textarea' : 'text'
      
      if (inputType === 'textarea') {
        return (
          <div className="inline-edit">
            <textarea
              value={tempValue || ''}
              onChange={(e) => handleTempValueChange(orderProductRow.orderProductId, field, e.target.value)}
              onBlur={() => saveInlineEdit(orderProductRow.orderProductId, field, tempValue)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  saveInlineEdit(orderProductRow.orderProductId, field, tempValue)
                } else if (e.key === 'Escape') {
                  cancelInlineEdit(orderProductRow.orderProductId, field)
                }
              }}
              className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full resize-none h-20"
              autoFocus
              placeholder="Ctrl+Enter pour sauvegarder"
            />
          </div>
        )
      }
      
      return (
        <div className="inline-edit">
          <input
            type="text"
            value={tempValue || ''}
            onChange={(e) => handleTempValueChange(orderProductRow.orderProductId, field, e.target.value)}
            onBlur={() => saveInlineEdit(orderProductRow.orderProductId, field, tempValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveInlineEdit(orderProductRow.orderProductId, field, tempValue)
              } else if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, field)
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full"
            autoFocus
          />
        </div>
      )
    }

    const fieldEditable = isFieldEditable(field)

    // Special handling for commentaires field
    if (field === 'commentaires') {
      const truncatedValue = displayValue && displayValue.length > 50 
        ? displayValue.substring(0, 47) + '...' 
        : displayValue

      return (
        <div 
          className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
          onClick={() => handleInlineEdit(orderProductRow.orderProductId, field, orderProductRow[field] || '')}
          title={!fieldEditable ? "Lecture seule" : `${displayValue || 'Cliquer pour modifier'}`}
        >
          <div className="flex items-center justify-between">
            <span className="truncate">{truncatedValue}</span>
            {fieldEditable && (
              <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
          </div>
        </div>
      )
    }

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, field, orderProductRow[field] || '')}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{displayValue}</span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  const renderInlineNumber = (orderProductRow, field, displayValue, unit = '') => {
    const editKey = `${orderProductRow.orderProductId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
          <input
            type="number"
            value={tempValue || ''}
            onChange={(e) => handleTempValueChange(orderProductRow.orderProductId, field, e.target.value)}
            onBlur={() => saveInlineEdit(orderProductRow.orderProductId, field, tempValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveInlineEdit(orderProductRow.orderProductId, field, tempValue)
              } else if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, field)
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-20"
            autoFocus
            min="0"
          />
        </div>
      )
    }

    const fieldEditable = isFieldEditable(field)

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, field, orderProductRow[field] || '')}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{displayValue}{unit}</span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  const renderInlineDate = (orderProductRow, field) => {
    const editKey = `${orderProductRow.orderProductId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
          <input
            type="datetime-local"
            value={tempValue || ''}
            onChange={(e) => handleTempValueChange(orderProductRow.orderProductId, field, e.target.value)}
            onBlur={() => saveInlineEdit(orderProductRow.orderProductId, field, tempValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveInlineEdit(orderProductRow.orderProductId, field, tempValue)
              } else if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, field)
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        </div>
      )
    }

    const fieldEditable = isFieldEditable(field)

    // Helper function to format date for datetime-local input
    const formatDateTimeLocal = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      // Format as YYYY-MM-DDTHH:MM (required format for datetime-local)
      return date.toISOString().slice(0, 16)
    }

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, field, formatDateTimeLocal(orderProductRow[field]))}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{formatDate(orderProductRow[field])}</span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  const renderInlineSelect = (orderProductRow, field, options) => {
    const editKey = `${orderProductRow.orderProductId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(orderProductRow.orderProductId, field, newValue)
              saveInlineEdit(orderProductRow.orderProductId, field, newValue)
            }}
            onBlur={() => cancelInlineEdit(orderProductRow.orderProductId, field)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, field)
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          >
            <option value="">-</option>
            {options.map(option => (
              <option key={option.value || option} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        </div>
      )
    }

    const fieldEditable = isFieldEditable(field)

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, field, orderProductRow[field])}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{orderProductRow[field] || '-'}</span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  const renderInlineBat = (orderProductRow) => {
    const editKey = `${orderProductRow.orderProductId}-bat`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(orderProductRow.orderProductId, 'bat', newValue)
              saveInlineEdit(orderProductRow.orderProductId, 'bat', newValue)
            }}
            onBlur={() => cancelInlineEdit(orderProductRow.orderProductId, 'bat')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, 'bat')
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          >
            <option value="">-</option>
            {batOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )
    }

    const fieldEditable = isFieldEditable('bat')
    const batValue = orderProductRow.bat

    // Get background color based on BAT value
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
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:opacity-80 px-2 py-1 rounded transition-all duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, 'bat', orderProductRow.bat)}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBatBackgroundClass(batValue)}`}>
            {getBatLabel(batValue)}
          </span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  const renderInlineAtelier = (orderProductRow) => {
    const editKey = `${orderProductRow.orderProductId}-atelier_concerne`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(orderProductRow.orderProductId, 'atelier_concerne', newValue)
              saveInlineEdit(orderProductRow.orderProductId, 'atelier_concerne', newValue)
            }}
            onBlur={() => cancelInlineEdit(orderProductRow.orderProductId, 'atelier_concerne')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, 'atelier_concerne')
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          >
            <option value="">-</option>
            {atelierOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )
    }

    const fieldEditable = isFieldEditable('atelier_concerne')
    const atelierValue = orderProductRow.atelier_concerne

    // Get background color based on atelier value
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
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:opacity-80 px-2 py-1 rounded transition-all duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, 'atelier_concerne', orderProductRow.atelier_concerne)}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAtelierBackgroundClass(atelierValue)}`}>
            {atelierValue || '-'}
          </span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  const renderInlineStatus = (orderProductRow) => {
    const editKey = `${orderProductRow.orderProductId}-statut`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(orderProductRow.orderProductId, 'statut', newValue)
              if (newValue === 'livre' || newValue === 'annule') {
                setPendingStatusChange({ orderProductId: orderProductRow.orderProductId, newValue })
                setShowStatusConfirmDialog(true)
              } else if (newValue === 'problem_technique') {
                setPendingProblemeChange({ orderProductId: orderProductRow.orderProductId, newValue })
                setProblemeDescription('')
                setShowProblemeDialog(true)
              } else {
                saveInlineEdit(orderProductRow.orderProductId, 'statut', newValue)
              }
            }}
            onBlur={() => cancelInlineEdit(orderProductRow.orderProductId, 'statut')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, 'statut')
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          >
            {statusOptions.map(status => (
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
        <div className="flex items-center gap-2">
          {getStatusBadge(orderProductRow.statut)}
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  const renderInlineInfograph = (orderProductRow) => {
    const editKey = `${orderProductRow.orderProductId}-infograph_en_charge`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(orderProductRow.orderProductId, 'infograph_en_charge', newValue)
              saveInlineEdit(orderProductRow.orderProductId, 'infograph_en_charge', newValue)
            }}
            onBlur={() => cancelInlineEdit(orderProductRow.orderProductId, 'infograph_en_charge')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, 'infograph_en_charge')
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full"
            autoFocus
          >
            <option value="">-</option>
            {infographUsers.map(user => (
              <option key={user.id} value={user.username}>
                {user.username}
              </option>
            ))}
          </select>
        </div>
      )
    }

    const fieldEditable = isFieldEditable('infograph_en_charge')

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, 'infograph_en_charge', orderProductRow.infograph_en_charge)}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{orderProductRow.infograph_en_charge || '-'}</span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  const renderInlineAgentImpression = (orderProductRow) => {
    const editKey = `${orderProductRow.orderProductId}-agent_impression`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(orderProductRow.orderProductId, 'agent_impression', newValue)
              saveInlineEdit(orderProductRow.orderProductId, 'agent_impression', newValue)
            }}
            onBlur={() => cancelInlineEdit(orderProductRow.orderProductId, 'agent_impression')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, 'agent_impression')
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full"
            autoFocus
          >
            <option value="">-</option>
            {atelierUsers.map(user => (
              <option key={user.id} value={user.username}>
                {user.username}
              </option>
            ))}
          </select>
        </div>
      )
    }

    const fieldEditable = isFieldEditable('agent_impression')

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, 'agent_impression', orderProductRow.agent_impression)}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{orderProductRow.agent_impression || '-'}</span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  const renderInlinePackFinAnnee = (orderProductRow) => {
    const editKey = `${orderProductRow.orderProductId}-pack_fin_annee`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value === 'true'
              handleTempValueChange(orderProductRow.orderProductId, 'pack_fin_annee', newValue)
              saveInlineEdit(orderProductRow.orderProductId, 'pack_fin_annee', newValue)
            }}
            onBlur={() => cancelInlineEdit(orderProductRow.orderProductId, 'pack_fin_annee')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, 'pack_fin_annee')
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          >
            <option value="false">Non</option>
            <option value="true">Oui</option>
          </select>
        </div>
      )
    }

    const fieldEditable = isFieldEditable('pack_fin_annee')
    const packValue = orderProductRow.pack_fin_annee

    // Get background color based on pack value
    const getPackBackgroundClass = (value) => {
      if (value === true || value === 'true') {
        return 'bg-purple-100 text-purple-800 border border-purple-200'
      } else {
        return 'bg-gray-100 text-gray-800 border border-gray-200'
      }
    }

    const getPackLabel = (value) => {
      return (value === true || value === 'true') ? 'Oui' : 'Non'
    }

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:opacity-80 px-2 py-1 rounded transition-all duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, 'pack_fin_annee', orderProductRow.pack_fin_annee)}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPackBackgroundClass(packValue)}`}>
            {getPackLabel(packValue)}
          </span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  const renderInlineEtape = (orderProductRow) => {
    const editKey = `${orderProductRow.orderProductId}-etape`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    // Get dynamic options based on atelier_concerne
    const dynamicEtapeOptions = getEtapeOptionsByAtelier(orderProductRow.atelier_concerne)

    if (isEditing) {
      return (
        <div className="inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(orderProductRow.orderProductId, 'etape', newValue)
              saveInlineEdit(orderProductRow.orderProductId, 'etape', newValue)
            }}
            onBlur={() => cancelInlineEdit(orderProductRow.orderProductId, 'etape')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, 'etape')
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          >
            <option value="">-</option>
            {dynamicEtapeOptions.map(etape => (
              <option key={etape} value={etape}>
                {etape}
              </option>
            ))}
          </select>
        </div>
      )
    }

    const fieldEditable = isFieldEditable('etape')

    // If no options available for this atelier, show as read-only
    if (dynamicEtapeOptions.length === 0) {
      return (
        <div className="px-2 py-1 inline-edit">
          <span className="text-gray-400">-</span>
        </div>
      )
    }

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, 'etape', orderProductRow.etape)}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{orderProductRow.etape || '-'}</span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  // Handle row click to open modal
  const handleRowClick = (orderProductRow, event) => {
    if (event.target.closest('.inline-edit') || event.target.closest('.action-button')) {
      return
    }
    
    // Create a mock order object for the modal
    const mockOrder = {
      id: orderProductRow.orderId,
      numero_affaire: orderProductRow.numero_affaire,
      numero_dm: orderProductRow.numero_dm,
      numero_pms: orderProductRow.numero_pms,
      client: orderProductRow.client_info,
      clientInfo: orderProductRow.clientInfo,
      commercial_en_charge: orderProductRow.commercial_en_charge,
      date_limite_livraison_attendue: orderProductRow.date_limite_livraison_attendue,
      statut: orderProductRow.statut,
      etape: orderProductRow.etape,
      createdAt: orderProductRow.createdAt,
      updatedAt: orderProductRow.updatedAt,
      orderProducts: [{
        id: orderProductRow.orderProductId,
        product_id: orderProductRow.product_id,
        productInfo: { name: orderProductRow.product_name },
        product: { name: orderProductRow.product_name },
        quantity: orderProductRow.quantity,
        numero_pms: orderProductRow.numero_pms,
        statut: orderProductRow.statut,
        etape: orderProductRow.etape,
        atelier_concerne: orderProductRow.atelier_concerne,
        infograph_en_charge: orderProductRow.infograph_en_charge,
        agent_impression: orderProductRow.agent_impression,
        date_limite_livraison_estimee: orderProductRow.date_limite_livraison_estimee,
        estimated_work_time_minutes: orderProductRow.estimated_work_time_minutes,
        bat: orderProductRow.bat,
        express: orderProductRow.express,
        pack_fin_annee: orderProductRow.pack_fin_annee,
        commentaires: orderProductRow.commentaires,
        finitions: orderProductRow.finitions || [], // Legacy finitions for backward compatibility
        orderProductFinitions: orderProductRow.orderProductFinitions || [] // New finitions structure
      }]
    }
    
    setSelectedOrder(mockOrder)
    setShowViewModal(true)
  }

  // CRUD operations
  const handleCreateOrder = () => {
    setSelectedOrder(null)
    setShowCreateModal(true)
  }

  const handleEditOrder = (orderProductRow) => {
    const mockOrder = {
      id: orderProductRow.orderId,
      numero_affaire: orderProductRow.numero_affaire,
      numero_dm: orderProductRow.numero_dm,
      client: orderProductRow.client_info,
      clientInfo: orderProductRow.clientInfo,
      commercial_en_charge: orderProductRow.commercial_en_charge,
      date_limite_livraison_attendue: orderProductRow.date_limite_livraison_attendue,
      statut: orderProductRow.statut,
      etape: orderProductRow.etape,
      createdAt: orderProductRow.createdAt,
      updatedAt: orderProductRow.updatedAt,
      orderProducts: [{
        id: orderProductRow.orderProductId,
        product_id: orderProductRow.product_id,
        productInfo: { name: orderProductRow.product_name },
        product: { name: orderProductRow.product_name },
        quantity: orderProductRow.quantity,
        unit_price: orderProductRow.unit_price,
        numero_pms: orderProductRow.numero_pms,
        infograph_en_charge: orderProductRow.infograph_en_charge,
        agent_impression: orderProductRow.agent_impression,
        date_limite_livraison_estimee: orderProductRow.date_limite_livraison_estimee,
        etape: orderProductRow.etape,
        atelier_concerne: orderProductRow.atelier_concerne,
        estimated_work_time_minutes: orderProductRow.estimated_work_time_minutes,
        bat: orderProductRow.bat,
        express: orderProductRow.express,
        pack_fin_annee: orderProductRow.pack_fin_annee,
        commentaires: orderProductRow.commentaires,
        statut: orderProductRow.statut,
        finitions: orderProductRow.finitions || [], // Legacy finitions for backward compatibility
        orderProductFinitions: orderProductRow.orderProductFinitions || [] // New finitions structure
      }]
    }
    setSelectedOrder(mockOrder)
    setShowEditModal(true)
  }

  const handleDeleteOrder = async (orderId) => {
    setOrderToDelete(orderId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteOrder = async () => {
    if (orderToDelete) {
      try {
        await orderAPI.deleteOrder(orderToDelete)
        fetchOrders(pagination.currentPage)
        fetchStats()
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

  // Effects
  useEffect(() => {
    fetchOrders()
    fetchStats()
    fetchUsersByRole()
  }, [filters])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // WebSocket listeners
  useEffect(() => {
    if (!connected) return

    const unsubscribeOrderCreated = subscribe('orderCreated', (newOrder) => {
      if (newOrder.statut !== 'annule' && newOrder.statut !== 'livre') {
        fetchOrders(pagination.currentPage)
        fetchStats()
      }
    })

    const unsubscribeOrderUpdated = subscribe('orderUpdated', (updatedOrder) => {
      fetchOrders(pagination.currentPage)
      fetchStats()
    })

    const unsubscribeOrderDeleted = subscribe('orderDeleted', (deletedOrderData) => {
      fetchOrders(pagination.currentPage)
      fetchStats()
    })

    return () => {
      unsubscribeOrderCreated()
      unsubscribeOrderUpdated()
      unsubscribeOrderDeleted()
    }
  }, [connected, subscribe, pagination.currentPage])

  if (loading && orderProductRows.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement des commandes...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
            <WebSocketStatus />
          </div>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
            <div className="text-sm text-gray-600">Total actives</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
            <div className="text-2xl font-bold text-yellow-600">{stats.problem_technique || 0}</div>
            <div className="text-sm text-gray-600">Problème technique</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-600">{stats.en_cours || 0}</div>
            <div className="text-sm text-gray-600">En cours</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
            <div className="text-2xl font-bold text-red-600">
              {sortedOrderProductRows.filter(row => getOrderUrgency(row) === 0).length}
            </div>
            <div className="text-sm text-gray-600">En retard</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3 flex-1">
              {/* PMS Search Field */}
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

              {/* Status Filter */}
              <select
                value={filters.statut}
                onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Tous les statuts</option>
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>

              {/* Commercial Filter */}
              <input
                type="text"
                placeholder="Commercial"
                value={filters.commercial}
                onChange={(e) => setFilters({ ...filters, commercial: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />

              {/* Client Filter */}
              <input
                type="text"
                placeholder="Client"
                value={filters.client}
                onChange={(e) => setFilters({ ...filters, client: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />

              {/* Infograph Filter */}
              <input
                type="text"
                placeholder="Infographe"
                value={filters.infograph}
                onChange={(e) => setFilters({ ...filters, infograph: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />

              {/* Workshop Filter */}
              <select
                value={filters.atelier}
                onChange={(e) => setFilters({ ...filters, atelier: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Tous les ateliers</option>
                {atelierOptions.map(atelier => (
                  <option key={atelier} value={atelier}>
                    {atelier}
                  </option>
                ))}
              </select>

              {/* Agent Impression Filter */}
              <input
                type="text"
                placeholder="Agent impression"
                value={filters.agent_impression}
                onChange={(e) => setFilters({ ...filters, agent_impression: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />

              {/* Etape Filter */}
              <select
                value={filters.etape}
                onChange={(e) => setFilters({ ...filters, etape: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Toutes les étapes</option>
                {etapeOptions.map(etape => (
                  <option key={etape} value={etape}>
                    {etape}
                  </option>
                ))}
              </select>

              {/* Express Filter */}
              <select
                value={filters.express || ''}
                onChange={(e) => setFilters({ ...filters, express: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Toutes les urgences</option>
                <option value="oui">Express uniquement</option>
                <option value="non">Non express</option>
              </select>

              {/* BAT Filter */}
              <select
                value={filters.bat || ''}
                onChange={(e) => setFilters({ ...filters, bat: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Tous les BAT</option>
                <option value="avec">Avec BAT</option>
                <option value="sans">Sans BAT</option>
              </select>

              {/* Pack Fin d'Année Filter */}
              <select
                value={filters.pack_fin_annee || ''}
                onChange={(e) => setFilters({ ...filters, pack_fin_annee: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Pack fin d'année</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>

              {/* Clear Filters */}
              {Object.values(filters).some(v => v !== '' && v !== 'all') && (
                <button
                  onClick={() => setFilters({
                    statut: '',
                    commercial: '',
                    client: '',
                    atelier: '',
                    infograph: '',
                    agent_impression: '',
                    etape: '',
                    express: '',
                    bat: '',
                    pack_fin_annee: '',
                    search: '',
                    date_from: '',
                    date_to: '',
                    timeFilter: 'all'
                  })}
                  className="text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition-colors duration-200"
                >
                  Effacer filtres
                </button>
              )}
            </div>
            
            {canCreateOrders() && (
              <div className="flex-shrink-0">
                <Button onClick={handleCreateOrder}>
                  Nouvelle commande
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Urgency Legend */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Légende:</h3>
        
        {/* Express Orders Section */}
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-yellow-700 mb-2 uppercase tracking-wider">Commandes Express (priorité absolue)</h4>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-50 border-l-2 border-yellow-500 rounded"></div>
              <span className="text-gray-700">Express</span>
            </div>
          </div>
        </div>

        {/* Regular Orders Section */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Urgences des commandes régulières</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 border-l-2 border-red-500 rounded"></div>
              <span className="text-gray-700">En retard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-200 border-l-2 border-orange-500 rounded"></div>
              <span className="text-gray-700">≤ 30min avant de devoir commencer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 border-l-2 border-yellow-500 rounded"></div>
              <span className="text-gray-700">≤ 1h avant de devoir commencer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border-l-2 border-gray-300 rounded"></div>
              <span className="text-gray-700">Temps suffisant disponible</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* For infograph/atelier: Atelier - Client - Produit - Quantity - BAT - Express - Graphiste - PMS - Etape - Agent impression - Statut - Délais */}
                {visibleColumns.atelier_concerne && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atelier
                  </th>
                )}
                {visibleColumns.client_info && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                )}
                {visibleColumns.product_name && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produit
                  </th>
                )}
                {visibleColumns.quantity && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantité
                  </th>
                )}
                {visibleColumns.bat && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    BAT
                  </th>
                )}
                {visibleColumns.express && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Express
                  </th>
                )}
                {visibleColumns.pack_fin_annee && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pack fin d'année
                  </th>
                )}
                {visibleColumns.infograph_en_charge && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Graphiste
                  </th>
                )}
                {visibleColumns.numero_pms && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° PMS
                  </th>
                )}
                {visibleColumns.etape && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Étape
                  </th>
                )}
                {visibleColumns.agent_impression && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent impression
                  </th>
                )}
                {visibleColumns.statut && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                )}
                {visibleColumns.date_limite_livraison_estimee && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Délais
                  </th>
                )}
                {visibleColumns.date_limite_livraison_client && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Délai Client
                  </th>
                )}
                {/* Other columns for non-infograph/atelier roles */}
                {visibleColumns.numero_affaire && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° Affaire
                  </th>
                )}
                {visibleColumns.numero_dm && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° DM
                  </th>
                )}
                {visibleColumns.commercial_en_charge && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commercial
                  </th>
                )}
                {visibleColumns.estimated_work_time_minutes && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temps (min)
                  </th>
                )}
                {visibleColumns.commentaires && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commentaires
                  </th>
                )}
                {canDeleteOrders() && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Express Orders Section */}
              {groupedOrderProductRows.expressOrders.length > 0 && (
                <>
                  {/* Express Orders Header */}
                  <tr className="bg-yellow-100">
                    <td 
                      colSpan={Object.values(visibleColumns).filter(Boolean).length + (canDeleteOrders() ? 1 : 0)}
                      className="px-6 py-3 text-left text-sm font-bold text-yellow-800 uppercase tracking-wider border-l-4 border-yellow-500"
                    >
                      🚀 Commandes Express ({groupedOrderProductRows.expressOrders.length})
                    </td>
                  </tr>
                  
                  {/* Express Orders Rows */}
                  {groupedOrderProductRows.expressOrders.map((row) => (
                    <tr 
                      key={`express-${row.orderId}-${row.orderProductId}`}
                      className={`transition-colors duration-200 cursor-pointer ${getRowBackgroundClass(row)}`}
                      onClick={(e) => handleRowClick(row, e)}
                    >
                      {/* For infograph/atelier: Atelier - Client - Produit - Quantity - BAT - Express - Graphiste - PMS - Etape - Agent impression - Statut - Délais */}
                      {visibleColumns.atelier_concerne && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineAtelier(row)}
                        </td>
                      )}
                      {visibleColumns.client_info && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {row.client_info}
                        </td>
                      )}
                      {visibleColumns.product_name && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {row.product_name}
                        </td>
                      )}
                      {visibleColumns.quantity && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineNumber(row, 'quantity', row.quantity)}
                        </td>
                      )}
                      {visibleColumns.bat && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineBat(row)}
                        </td>
                      )}
                      {visibleColumns.express && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineSelect(row, 'express', expressOptions)}
                        </td>
                      )}
                      {visibleColumns.pack_fin_annee && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlinePackFinAnnee(row)}
                        </td>
                      )}
                      {visibleColumns.infograph_en_charge && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineInfograph(row)}
                        </td>
                      )}
                      {visibleColumns.numero_pms && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineText(row, 'numero_pms', row.numero_pms)}
                        </td>
                      )}
                      {visibleColumns.etape && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineEtape(row)}
                        </td>
                      )}
                      {visibleColumns.agent_impression && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineAgentImpression(row)}
                        </td>
                      )}
                      {visibleColumns.statut && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineStatus(row)}
                        </td>
                      )}
                      {visibleColumns.date_limite_livraison_estimee && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineDate(row, 'date_limite_livraison_estimee')}
                        </td>
                      )}
                      {visibleColumns.date_limite_livraison_client && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineDate(row, 'date_limite_livraison_attendue')}
                        </td>
                      )}
                      {/* Other columns for non-infograph/atelier roles */}
                      {visibleColumns.numero_affaire && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineText(row, 'numero_affaire', row.numero_affaire)}
                        </td>
                      )}
                      {visibleColumns.numero_dm && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineText(row, 'numero_dm', row.numero_dm)}
                        </td>
                      )}
                      {visibleColumns.commercial_en_charge && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {row.commercial_en_charge}
                        </td>
                      )}
                      {visibleColumns.estimated_work_time_minutes && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineNumber(row, 'estimated_work_time_minutes', row.estimated_work_time_minutes, ' min')}
                        </td>
                      )}
                      {visibleColumns.commentaires && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineText(row, 'commentaires', row.commentaires || '-')}
                        </td>
                      )}
                      {canDeleteOrders() && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
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
                </>
              )}

              {/* Regular Orders Section */}
              {groupedOrderProductRows.regularOrders.length > 0 && (
                <>
                  {/* Regular Orders Header (only if there are express orders above) */}
                  {groupedOrderProductRows.expressOrders.length > 0 && (
                    <tr className="bg-gray-100">
                      <td 
                        colSpan={Object.values(visibleColumns).filter(Boolean).length + (canDeleteOrders() ? 1 : 0)}
                        className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider border-l-4 border-gray-400"
                      >
                        📋 Commandes Régulières ({groupedOrderProductRows.regularOrders.length})
                      </td>
                    </tr>
                  )}
                  
                  {/* Regular Orders Rows */}
                  {groupedOrderProductRows.regularOrders.map((row) => (
                    <tr 
                      key={`regular-${row.orderId}-${row.orderProductId}`}
                      className={`transition-colors duration-200 cursor-pointer ${getRowBackgroundClass(row)}`}
                      onClick={(e) => handleRowClick(row, e)}
                    >
                      {/* For infograph/atelier: Atelier - Client - Produit - Quantity - BAT - Express - Graphiste - PMS - Etape - Agent impression - Statut - Délais */}
                      {visibleColumns.atelier_concerne && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineAtelier(row)}
                        </td>
                      )}
                      {visibleColumns.client_info && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {row.client_info}
                        </td>
                      )}
                      {visibleColumns.product_name && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {row.product_name}
                        </td>
                      )}
                      {visibleColumns.quantity && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineNumber(row, 'quantity', row.quantity)}
                        </td>
                      )}
                      {visibleColumns.bat && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineBat(row)}
                        </td>
                      )}
                      {visibleColumns.express && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineSelect(row, 'express', expressOptions)}
                        </td>
                      )}
                      {visibleColumns.pack_fin_annee && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlinePackFinAnnee(row)}
                        </td>
                      )}
                      {visibleColumns.infograph_en_charge && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineInfograph(row)}
                        </td>
                      )}
                      {visibleColumns.numero_pms && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineText(row, 'numero_pms', row.numero_pms)}
                        </td>
                      )}
                      {visibleColumns.etape && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineEtape(row)}
                        </td>
                      )}
                      {visibleColumns.agent_impression && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineAgentImpression(row)}
                        </td>
                      )}
                      {visibleColumns.statut && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineStatus(row)}
                        </td>
                      )}
                      {visibleColumns.date_limite_livraison_estimee && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineDate(row, 'date_limite_livraison_estimee')}
                        </td>
                      )}
                      {visibleColumns.date_limite_livraison_client && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineDate(row, 'date_limite_livraison_attendue')}
                        </td>
                      )}
                      {/* Other columns for non-infograph/atelier roles */}
                      {visibleColumns.numero_affaire && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineText(row, 'numero_affaire', row.numero_affaire)}
                        </td>
                      )}
                      {visibleColumns.numero_dm && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineText(row, 'numero_dm', row.numero_dm)}
                        </td>
                      )}
                      {visibleColumns.commercial_en_charge && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {row.commercial_en_charge}
                        </td>
                      )}
                      {visibleColumns.estimated_work_time_minutes && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineNumber(row, 'estimated_work_time_minutes', row.estimated_work_time_minutes, ' min')}
                        </td>
                      )}
                      {visibleColumns.commentaires && (
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {renderInlineText(row, 'commentaires', row.commentaires || '-')}
                        </td>
                      )}
                      {canDeleteOrders() && (
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
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
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => fetchOrders(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                onClick={() => fetchOrders(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
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
                      onClick={() => fetchOrders(i + 1)}
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

      {/* Modals */}
      {showViewModal && selectedOrder && (
        <OrderViewModal
          order={selectedOrder}
          onClose={() => {
            setShowViewModal(false)
            setSelectedOrder(null)
          }}
          onEdit={() => {
            setShowViewModal(false)
            setShowEditModal(true)
          }}
          formatDate={formatDate}
          getStatusBadge={getStatusBadge}
          etapeOptions={etapeOptions}
        />
      )}

      {(showCreateModal || showEditModal) && (
        <OrderModal
          order={selectedOrder}
          onClose={() => {
            setShowCreateModal(false)
            setShowEditModal(false)
            setSelectedOrder(null)
          }}
          onSave={() => {
            fetchOrders(pagination.currentPage)
            fetchStats()
            setShowCreateModal(false)
            setShowEditModal(false)
            setSelectedOrder(null)
          }}
          statusOptions={statusOptions}
          atelierOptions={atelierOptions}
          etapeOptions={etapeOptions}
          batOptions={batOptions}
          expressOptions={expressOptions}
        />
      )}

      <AlertDialog
        isOpen={showDeleteDialog}
        onClose={cancelDeleteOrder}
        onConfirm={confirmDeleteOrder}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      />

      {/* Status change confirmation dialog */}
      {showStatusConfirmDialog && pendingStatusChange && (
        <AlertDialog
          isOpen={showStatusConfirmDialog}
          onClose={() => {
            setShowStatusConfirmDialog(false)
            setPendingStatusChange(null)
            // Cancel inline edit as well
            if (pendingStatusChange) {
              cancelInlineEdit(pendingStatusChange.orderProductId, 'statut')
            }
          }}
          onConfirm={() => {
            if (pendingStatusChange) {
              saveInlineEdit(pendingStatusChange.orderProductId, 'statut', pendingStatusChange.newValue)
            }
            setShowStatusConfirmDialog(false)
            setPendingStatusChange(null)
          }}
          title={pendingStatusChange?.newValue === 'livre' ? 'Confirmer la livraison' : 'Confirmer l\'annulation'}
          message={
            pendingStatusChange?.newValue === 'livre'
              ? 'Êtes-vous sûr de vouloir marquer cette commande comme livrée ? Cette action est irréversible.'
              : 'Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.'
          }
          confirmText="Confirmer"
          cancelText="Annuler"
          type="warning"
        />
      )}

      {/* Problème technique dialog */}
      {showProblemeDialog && pendingProblemeChange && (
        <AlertDialog
          isOpen={showProblemeDialog}
          onClose={() => {
            setShowProblemeDialog(false)
            setPendingProblemeChange(null)
            setProblemeDescription('')
            // Cancel inline edit as well
            if (pendingProblemeChange) {
              cancelInlineEdit(pendingProblemeChange.orderProductId, 'statut')
            }
          }}
          onConfirm={() => {
            if (pendingProblemeChange && problemeDescription.trim()) {
              saveProblemeEdit(pendingProblemeChange.orderProductId, pendingProblemeChange.newValue, problemeDescription.trim())
              setShowProblemeDialog(false)
              setPendingProblemeChange(null)
              setProblemeDescription('')
            }
          }}
          title="Problème technique"
          message={
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Veuillez décrire le problème technique rencontré :
              </p>
              <textarea
                value={problemeDescription}
                onChange={(e) => setProblemeDescription(e.target.value)}
                placeholder="Décrivez le problème..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none h-24 text-sm"
                autoFocus
              />
            </div>
          }
          confirmText="Confirmer"
          cancelText="Annuler"
          type="warning"
          confirmDisabled={!problemeDescription.trim()}
        />
      )}
    </div>
  )
}

export default DashboardPageClean
