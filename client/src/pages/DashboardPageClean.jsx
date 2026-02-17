import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { orderAPI, userAPI } from '../utils/api'
import Button from '../components/ButtonComponent'
import Input from '../components/InputComponent'
import AlertDialog from '../components/AlertDialog'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../contexts/WebSocketContext'
// import { usePriorityNotifications } from '../hooks/usePriorityNotifications'
import { useInfographNotifications } from '../hooks/useInfographNotifications'
import { useAtelierNotifications } from '../hooks/useAtelierNotifications'
import { useCommercialNotifications } from '../hooks/useCommercialNotifications'
import OrderModal from '../components/OrderModal'
import OrderViewModal from '../components/OrderViewModal'
import WebSocketStatus from '../components/WebSocketStatus'
import RoleBasedStats from '../components/RoleBasedStats'

// Multi-Select Dropdown Component
const MultiSelectDropdown = ({ options, selectedValues, onChange, placeholder, className }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const handleToggle = (value) => {
    onChange(value)
  }
  
  const selectedCount = selectedValues.length
  const displayText = selectedCount === 0 
    ? placeholder 
    : selectedCount === 1 
      ? options.find(opt => opt.value === selectedValues[0])?.label || selectedValues[0]
      : `${selectedCount} sélectionné(s)`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${className} flex items-center justify-between w-full text-left focus:outline-none`}
      >
        <span className={selectedCount === 0 ? 'text-gray-500' : 'text-gray-900'}>
          {displayText}
        </span>
        <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value)
              return (
                <label
                  key={option.value}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(option.value)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">{option.label}</span>
                </label>
              )
            })}
            
            {selectedValues.length > 0 && (
              <div className="border-t border-gray-200 px-3 py-2">
                <button
                  onClick={() => {
                    selectedValues.forEach(value => onChange(value))
                    setIsOpen(false)
                  }}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Tout désélectionner
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const DashboardPageClean = () => {
  const { user } = useAuth()
  const { subscribe, connected } = useWebSocket()
  
  // State management
  const [orderProductRows, setOrderProductRows] = useState([])
  const [allOrdersForNotifications, setAllOrdersForNotifications] = useState([]) // Unfiltered orders for notifications
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({})
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedOrderProduct, setSelectedOrderProduct] = useState(null)
  
  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null) // Changed from orderToDelete to itemToDelete
  
  // Enhanced Filter System with persistence and multi-select support
  const [filters, setFilters] = useState(() => {
    // Load filters from localStorage on component initialization
    const savedFilters = localStorage.getItem('dashboard-filters')
    return savedFilters ? JSON.parse(savedFilters) : {
      search: '',
      statut: [], // Multi-select array
      commercial: [], // Multi-select array for commercial users
      client: '',
      atelier: [], // Multi-select array
      infograph: [], // Multi-select array for infograph users
      agent_impression: [], // Multi-select array for atelier users
      machine_impression: '',
      etape: [], // Multi-select array
      express: '',
      bat: '',
      pack_fin_annee: '',
      type_sous_traitance: [],
      date_from: '',
      date_to: ''
    }
  })

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('dashboard-filters', JSON.stringify(filters))
  }, [filters])

  // Check if any filters are active (including arrays)
  const hasActiveFilters = Object.values(filters).some(value => {
    if (Array.isArray(value)) {
      return value.length > 0
    }
    return value !== '' && value !== null && value !== undefined
  })

  // Clear all filters
  const clearAllFilters = () => {
    const clearedFilters = {
      search: '',
      statut: [],
      commercial: [],
      client: '',
      atelier: [],
      infograph: [],
      agent_impression: [],
      machine_impression: '',
      etape: [],
      express: '',
      bat: '',
      pack_fin_annee: '',
      type_sous_traitance: [],
      date_from: '',
      date_to: ''
    }
    setFilters(clearedFilters)
    setSearchInput('') // Also clear the search input
  }

  // Debounced search for better performance
  const [searchInput, setSearchInput] = useState(filters.search)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilter('search', searchInput)
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchInput])

  // Update search input when filters change externally (like clearing filters)
  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  // Update individual filter
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Handle multi-select filter updates
  const toggleMultiSelectFilter = (key, value) => {
    setFilters(prev => {
      const currentArray = prev[key] || []
      const isSelected = currentArray.includes(value)
      
      if (isSelected) {
        // Remove from array
        return { ...prev, [key]: currentArray.filter(item => item !== value) }
      } else {
        // Add to array
        return { ...prev, [key]: [...currentArray, value] }
      }
    })
  }
  
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
  
  // Finition validation error dialog
  const [showFinitionErrorDialog, setShowFinitionErrorDialog] = useState(false)
  const [finitionErrorMessage, setFinitionErrorMessage] = useState('')
  
  // Users for dropdowns
  const [infographUsers, setInfographUsers] = useState([])
  const [atelierUsers, setAtelierUsers] = useState([])
  const [commercialUsers, setCommercialUsers] = useState([])
  
  // Time-based refresh
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Options arrays
  const statusOptions = [
    { value: 'problem_technique', label: 'Problème technique' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'attente_validation', label: 'Attente de validation' },
    { value: 'modification', label: 'Modification' },
    { value: 'termine', label: 'Terminé' },
    { value: 'livre', label: 'Livré' },
    { value: 'annule', label: 'Annulé' }
  ]
  
  const atelierOptions = ['petit format', 'grand format', 'sous-traitance', 'service crea']
  
  // All users can now filter by any etape
  const etapeOptions = ['conception', 'pré-presse', 'travail graphique', 'impression', 'finition', 'en production', 'controle qualité']
  
  // Helper function to get etape options based on atelier_concerne
  const getEtapeOptionsByAtelier = (atelierConcerne) => {
    if (!atelierConcerne) return []
    
    const atelier = atelierConcerne.toLowerCase()
    
    if (atelier === 'petit format' || atelier === 'grand format') {
      return ['pré-presse', 'impression', 'finition']
    } else if (atelier === 'service crea') {
      return ['travail graphique', 'conception']
    } else if (atelier === 'sous-traitance') {
      return ['pré-presse', 'en production', 'controle qualité']
    }
    
    // Default fallback
    return etapeOptions
  }

  // Helper function to get status options based on atelier_concerne
  const getStatusOptionsByAtelier = (atelierConcerne) => {
    if (!atelierConcerne) {
      // Return standard options for no atelier specified
      return [
        { value: 'problem_technique', label: 'Problème technique' },
        { value: 'en_cours', label: 'En cours' },
        { value: 'termine', label: 'Terminé' },
        { value: 'livre', label: 'Livré' },
        { value: 'annule', label: 'Annulé' }
      ]
    }
    
    const atelier = atelierConcerne.toLowerCase()
    
    if (atelier === 'service crea') {
      return [
        { value: 'en_cours', label: 'En cours' },
        { value: 'attente_validation', label: 'Attente de validation' },
        { value: 'modification', label: 'Modification' },
        { value: 'termine', label: 'Terminé' },
        { value: 'livre', label: 'Livré' },
        { value: 'annule', label: 'Annulé' },
        { value: 'problem_technique', label: 'Problème technique' }
      ]
    }
    
    // For all other ateliers (petit format, grand format, sous-traitance), return standard options
    return [
      { value: 'problem_technique', label: 'Problème technique' },
      { value: 'en_cours', label: 'En cours' },
      { value: 'termine', label: 'Terminé' },
      { value: 'livre', label: 'Livré' },
      { value: 'annule', label: 'Annulé' }
    ]
  }

  // Helper function to check if order product has finitions
  const hasFinitions = (orderProductRow) => {
    // Check new finitions structure first
    if (orderProductRow.orderProductFinitions && orderProductRow.orderProductFinitions.length > 0) {
      return true
    }
    
    // Check legacy finitions field
    if (orderProductRow.finitions && orderProductRow.finitions.length > 0) {
      return true
    }
    
    return false
  }

  // Helper function to check if 'termine' status can be selected
  const canSelectTermineStatus = (atelierConcerne, etape, userRole = null, orderProductRow = null) => {
    // Special case: infograph users can always select 'termine' for 'service crea'
    if (userRole === 'infograph' && atelierConcerne === 'service crea') {
      return true
    }
    
    // If atelier is 'sous-traitance', check if 'controle qualité' etape is done
    if (atelierConcerne === 'sous-traitance') {
      return etape === 'controle qualité'
    }
    
    // For ateliers that require finitions: petit format, grand format, sous-traitance
    if (['petit format', 'grand format', 'sous-traitance'].includes(atelierConcerne)) {
      // Check if finitions are added (only if orderProductRow is provided)
      if (orderProductRow && !hasFinitions(orderProductRow)) {
        return false // Cannot mark as 'termine' without finitions
      }
    }
    
    // For other ateliers (petit format, grand format, service crea), check if finitions are done
    if (['petit format', 'grand format', 'service crea'].includes(atelierConcerne)) {
      return etape === 'finition'
    }
    
    // Default case - allow completion if we don't have specific rules
    return true
  }

  // Helper function to filter status options based on user role and business rules
  const getStatusOptionsByRole = (atelierConcerne, currentStatus = null, currentEtape = null) => {
    const baseOptions = getStatusOptionsByAtelier(atelierConcerne)
    
    // If user is commercial, show current status + allowed changes
    if (user?.role === 'commercial') {
      const commercialOptions = []
      
      // Always include the current status first (if it exists)
      if (currentStatus) {
        const currentOption = baseOptions.find(option => option.value === currentStatus)
        if (currentOption) {
          commercialOptions.push(currentOption)
        }
      }
      
      // Add 'livre' option only if current status is 'termine'
      if (currentStatus === 'termine') {
        const livreOption = baseOptions.find(option => option.value === 'livre')
        if (livreOption && !commercialOptions.some(opt => opt.value === 'livre')) {
          commercialOptions.push(livreOption)
        }
      }
      
      // Always add 'annule' option (commercial can cancel from any status)
      const annuleOption = baseOptions.find(option => option.value === 'annule')
      if (annuleOption && !commercialOptions.some(opt => opt.value === 'annule')) {
        commercialOptions.push(annuleOption)
      }
      
      return commercialOptions
    }
    
    // For atelier and infograph roles, filter out 'livre' status
    const filteredOptions = baseOptions.filter(option => {
      // Filter out 'livre' status for atelier and infograph users
      if (option.value === 'livre' && (user?.role === 'atelier' || user?.role === 'infograph')) {
        // Only show 'livre' if it's the current status (to display current state)
        return currentStatus === 'livre'
      }
      
      // If it's the 'termine' status, check if it can be selected
      if (option.value === 'termine') {
        return canSelectTermineStatus(atelierConcerne, currentEtape, user?.role, null) // Pass null since we don't have orderProductRow in filter context
      }
      
      return true
    })
    
    return filteredOptions
  }
  
  const batOptions = [
    { value: 'avec', label: 'Avec' },
    { value: 'sans', label: 'Sans' },
    { value: 'valider', label: 'BAT Valider' }
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

  // Priority notifications - use unfiltered orders to avoid false notifications from filtering
  const ordersForNotifications = convertToOrdersFormat(allOrdersForNotifications)
  // const { checkUrgentOrders } = usePriorityNotifications(ordersForNotifications)

  // Role-specific notifications for etape changes
  useInfographNotifications()
  useAtelierNotifications()
  useCommercialNotifications()

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
        date_limite_livraison_client: false, // Hidden for commercial users
        statut: true,
        etape: true,
        atelier_concerne: true,  // Show for commercial users
        infograph_en_charge: true,  // Show for commercial users
        date_limite_livraison_estimee: true, // Show product order date
        estimated_work_time_minutes: false,
        bat: true,  // Show for commercial users
        express: false, // Hidden for all roles
        pack_fin_annee: false,
        type_sous_traitance: true,  // Show for commercial users
        commentaires: false
      }
    } else if (user?.role === 'infograph') {
      // For infograph users: Atelier - Client - Produit - Quantity - BAT - Commercial - Graphiste - PMS - Etape - Agent impression - Statut - Délais - type sous traitance
      return {
        numero_affaire: false,
        numero_dm: false,
        client_info: true,
        commercial_en_charge: true, // Show for infograph
        product_name: true,
        quantity: true,
        numero_pms: true,
        date_limite_livraison_attendue: false,
        date_limite_livraison_client: false, // Hidden for infograph
        statut: true,
        etape: true,
        atelier_concerne: true,
        infograph_en_charge: true,
        agent_impression: true,
        machine_impression: false, // Not visible to infograph users
        date_limite_livraison_estimee: true, // Show product order date
        estimated_work_time_minutes: false,
        bat: true,
        express: false, // Hidden for all roles
        pack_fin_annee: false,
        type_sous_traitance: true, // Show for infograph users
        commentaires: false
      }
    } else if (user?.role === 'atelier') {
      // For atelier users: Atelier - Client - Produit - Quantity - BAT - Graphiste - PMS - Etape - Agent impression - Machine impression - Statut - Délais client - Type sous-traitance
      return {
        numero_affaire: false,
        numero_dm: false,
        client_info: true,
        commercial_en_charge: false,
        product_name: true,
        quantity: true,
        numero_pms: true,
        date_limite_livraison_attendue: false,
        date_limite_livraison_client: false, // Hidden for atelier
        statut: true,
        etape: true,
        atelier_concerne: true,
        infograph_en_charge: true,
        agent_impression: true,
        machine_impression: true, // Visible to atelier users
        date_limite_livraison_estimee: true, // Show product order date
        estimated_work_time_minutes: false,
        bat: true,
        express: false, // Hidden for all roles
        pack_fin_annee: false,
        type_sous_traitance: true, // Visible to atelier users
        commentaires: false
      }
    } else {
      // Admin and other roles see everything except délais
      return {
        numero_affaire: true,
        numero_dm: true,
        client_info: true,
        commercial_en_charge: true,
        product_name: true,
        quantity: true,
        numero_pms: true,
        date_limite_livraison_attendue: true,
        date_limite_livraison_client: false, // Admin sees both dates but simplified
        statut: true,
        etape: true,
        atelier_concerne: true,
        infograph_en_charge: true,
        agent_impression: true,
        machine_impression: true,
        date_limite_livraison_estimee: true, // Show product order date
        estimated_work_time_minutes: true,
        bat: true,
        express: false, // Hidden for all roles
        pack_fin_annee: false,
        type_sous_traitance: true,
        commentaires: true
      }
    }
  }

  const visibleColumns = getVisibleColumns()

  // Get commercial column order - the specific order requested for commercial role
  const getCommercialColumnOrder = () => {
    return [
      'atelier_concerne',      // Atelier
      'client_info',           // client
      'product_name',          // Produit
      'quantity',              // Quantité
      'bat',                   // BAT
      'commercial_en_charge',  // commercial
      'infograph_en_charge',   // graphiste
      'numero_dm',             // DM
      'etape',                 // Etape
      'statut',                // statut
      'date_limite_livraison_estimee', // Délai
      'type_sous_traitance'    // Type sous-traitance
    ]
  }

  // Get infograph column order - the specific order requested for infograph role
  const getInfographColumnOrder = () => {
    return [
      'atelier_concerne',      // Atelier
      'client_info',           // Client
      'product_name',          // Produit
      'quantity',              // Quantité
      'bat',                   // BAT
      'commercial_en_charge',  // Commercial
      'infograph_en_charge',   // Graphiste
      'numero_pms',            // N° PMS
      'etape',                 // Étape
      'agent_impression',      // Agent impression
      'statut',                // Statut
      'date_limite_livraison_estimee', // Délai
      'type_sous_traitance'    // Type sous-traitance
    ]
  }

  // Render table header for commercial role in specific order
  const renderCommercialTableHeader = () => {
    const columnOrder = getCommercialColumnOrder()
    const headerMap = {
      'atelier_concerne': 'Atelier',
      'client_info': 'Client',
      'product_name': 'Produit',
      'quantity': 'Quantité',
      'bat': 'BAT',
      'commercial_en_charge': 'Commercial',
      'infograph_en_charge': 'Graphiste',
      'numero_dm': 'DM',
      'etape': 'Étape',
      'statut': 'Statut',
      'date_limite_livraison_estimee': 'Délai',
      'type_sous_traitance': 'Type sous-traitance'
    }

    return (
      <>
        {columnOrder.map(columnKey => (
          visibleColumns[columnKey] && (
            <th key={columnKey} className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
              {headerMap[columnKey]}
            </th>
          )
        ))}
        {canDeleteOrders() && (
          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
            Actions
          </th>
        )}
      </>
    )
  }

  // Render table header for infograph role in specific order
  const renderInfographTableHeader = () => {
    const columnOrder = getInfographColumnOrder()
    const headerMap = {
      'atelier_concerne': 'Atelier',
      'client_info': 'Client',
      'product_name': 'Produit',
      'quantity': 'Quantité',
      'bat': 'BAT',
      'commercial_en_charge': 'Commercial',
      'infograph_en_charge': 'Graphiste',
      'numero_pms': 'N° PMS',
      'etape': 'Étape',
      'agent_impression': 'Agent impression',
      'statut': 'Statut',
      'date_limite_livraison_estimee': 'Délai',
      'type_sous_traitance': 'Type sous-traitance'
    }

    return (
      <>
        {columnOrder.map(columnKey => (
          visibleColumns[columnKey] && (
            <th key={columnKey} className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
              {headerMap[columnKey]}
            </th>
          )
        ))}
        {canDeleteOrders() && (
          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
            Actions
          </th>
        )}
      </>
    )
  }

  // Render table row for commercial role in specific order
  const renderCommercialTableRow = (row) => {
    const columnOrder = getCommercialColumnOrder()

    return (
      <>
        {columnOrder.map(columnKey => {
          if (!visibleColumns[columnKey]) return null
          
          return (
            <td key={columnKey} className={columnKey === 'client_info' ? 'px-2 py-0.5 text-sm text-gray-900 max-w-xs overflow-hidden' : 'px-2 py-0.5 whitespace-nowrap text-sm text-gray-900'}>
              {(() => {
                switch (columnKey) {
                  case 'atelier_concerne':
                    return renderInlineAtelier(row)
                  case 'client_info':
                    return renderClientInfoWithBadge(row)
                  case 'product_name':
                    return row.product_name
                  case 'quantity':
                    return renderInlineNumber(row, 'quantity', row.quantity)
                  case 'bat':
                    return renderInlineBat(row)
                  case 'commercial_en_charge':
                    return row.commercial_en_charge
                  case 'infograph_en_charge':
                    return renderInlineInfograph(row)
                  case 'numero_dm':
                    return renderInlineText(row, 'numero_dm', row.numero_dm)
                  case 'etape':
                    return renderInlineEtape(row)
                  case 'statut':
                    return renderInlineStatus(row)
                  case 'date_limite_livraison_estimee':
                    return renderInlineDate(row, 'date_limite_livraison_estimee')
                  case 'type_sous_traitance':
                    return renderInlineSousTraitance(row)
                  default:
                    return '-'
                }
              })()}
            </td>
          )
        })}
        {canDeleteOrders() && (
          <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
            <div className="flex items-center gap-2 action-button">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteOrder(row)
                }}
                className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-xs"
              >
                Supprimer
              </button>
            </div>
          </td>
        )}
      </>
    )
  }

  // Render table row for infograph role in specific order
  const renderInfographTableRow = (row) => {
    const columnOrder = getInfographColumnOrder()

    return (
      <>
        {columnOrder.map(columnKey => {
          if (!visibleColumns[columnKey]) return null
          
          return (
            <td key={columnKey} className={columnKey === 'client_info' ? 'px-2 py-0.5 text-sm text-gray-900 max-w-xs overflow-hidden' : 'px-2 py-0.5 whitespace-nowrap text-sm text-gray-900'}>
              {(() => {
                switch (columnKey) {
                  case 'atelier_concerne':
                    return renderInlineAtelier(row)
                  case 'client_info':
                    return renderClientInfoWithBadge(row)
                  case 'product_name':
                    return row.product_name
                  case 'quantity':
                    return renderInlineNumber(row, 'quantity', row.quantity)
                  case 'bat':
                    return renderInlineBat(row)
                  case 'commercial_en_charge':
                    return row.commercial_en_charge
                  case 'infograph_en_charge':
                    return renderInlineInfograph(row)
                  case 'numero_pms':
                    return renderInlineText(row, 'numero_pms', row.numero_pms)
                  case 'etape':
                    return renderInlineEtape(row)
                  case 'agent_impression':
                    return renderInlineAgentImpression(row)
                  case 'statut':
                    return renderInlineStatus(row)
                  case 'date_limite_livraison_client':
                    return renderInlineDate(row, 'date_limite_livraison_attendue')
                  case 'date_limite_livraison_estimee':
                    return renderInlineDate(row, 'date_limite_livraison_estimee')
                  case 'type_sous_traitance':
                    return renderInlineSousTraitance(row)
                  default:
                    return '-'
                }
              })()}
            </td>
          )
        })}
        {canDeleteOrders() && (
          <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
            <div className="flex items-center gap-2 action-button">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteOrder(row)
                }}
                className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-xs"
              >
                Supprimer
              </button>
            </div>
          </td>
        )}
      </>
    )
  }

  // Get the correct column count for the current user role
  const getColumnCount = () => {
    if (user?.role === 'commercial') {
      const commercialColumnOrder = getCommercialColumnOrder()
      const visibleCommercialColumns = commercialColumnOrder.filter(columnKey => visibleColumns[columnKey])
      return visibleCommercialColumns.length + (canDeleteOrders() ? 1 : 0)
    } else if (user?.role === 'infograph') {
      const infographColumnOrder = getInfographColumnOrder()
      const visibleInfographColumns = infographColumnOrder.filter(columnKey => visibleColumns[columnKey])
      return visibleInfographColumns.length + (canDeleteOrders() ? 1 : 0)
    }
    return Object.values(visibleColumns).filter(Boolean).length + (canDeleteOrders() ? 1 : 0)
  }

  // Fetch orders and flatten to order-product rows - with persistent filters
  const fetchOrders = useCallback(async (preserveFilters = true) => {
    try {
      setLoading(true)
      
      // Create params object from current filters, removing empty values
      const params = {}
      Object.keys(filters).forEach(key => {
        const value = filters[key]
        if (Array.isArray(value)) {
          // For array filters, convert to comma-separated string if not empty
          if (value.length > 0) {
            // Special handling for infograph filter with "nothing" value
            if (key === 'infograph') {
              const hasNothingFilter = value.includes('nothing')
              const userFilters = value.filter(f => f !== 'nothing')
              
              if (hasNothingFilter && userFilters.length === 0) {
                // Only "nothing" is selected - send special parameter
                params['infograph_null'] = 'true'
              } else if (hasNothingFilter && userFilters.length > 0) {
                // Both "nothing" and users are selected - send users + null flag
                params[key] = userFilters.join(',')
                params['infograph_null'] = 'true'
              } else {
                // Only users are selected - normal behavior
                params[key] = value.join(',')
              }
            } else {
              params[key] = value.join(',')
            }
          }
        } else {
          // For string filters, only add if not empty
          if (value && value !== '' && value !== null && value !== undefined) {
            params[key] = value
          }
        }
      })
      
      // Get filtered orders for display
      const response = await orderAPI.getOrders(params)
      
      // Also get all orders (unfiltered) for notifications - but only if no filters are active
      // This prevents unnecessary API calls when filters are active
      const hasActiveFiltersCheck = Object.values(filters).some(value => {
        if (Array.isArray(value)) {
          return value.length > 0
        }
        return value !== '' && value !== null && value !== undefined
      })
      
      let allOrdersResponse = response // Default to filtered response
      if (!hasActiveFiltersCheck) {
        // If no filters are active, the response already contains all orders
        allOrdersResponse = response
      } else {
        // If filters are active, get unfiltered orders for notifications
        try {
          allOrdersResponse = await orderAPI.getOrders({}) // No params = all orders
        } catch (err) {
          console.warn('Could not fetch unfiltered orders for notifications:', err)
          allOrdersResponse = response // Fallback to filtered orders
        }
      }
      
      // Flatten filtered orders to order-product rows for display
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
              order_express_pending: order.express_pending, // Order-level express pending flag
              
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
              machine_impression: orderProduct.machine_impression,
              date_limite_livraison_estimee: orderProduct.date_limite_livraison_estimee,
              estimated_work_time_minutes: orderProduct.estimated_work_time_minutes,
              bat: orderProduct.bat,
              express: orderProduct.express, // Product-level express status
              pack_fin_annee: orderProduct.pack_fin_annee,
              type_sous_traitance: orderProduct.type_sous_traitance,
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
      
      // Flatten all orders for notifications
      const allOrdersFlat = []
      allOrdersResponse.orders.forEach(order => {
        if (order.orderProducts && order.orderProducts.length > 0) {
          order.orderProducts.forEach(orderProduct => {
            const productStatus = orderProduct.statut || order.statut
            
            allOrdersFlat.push({
              orderProductId: orderProduct.id,
              orderId: order.id,
              numero_affaire: order.numero_affaire,
              numero_dm: order.numero_dm,
              numero_pms: orderProduct.numero_pms,
              client_info: order.clientInfo?.nom || order.client,
              commercial_en_charge: order.commercial_en_charge,
              date_limite_livraison_attendue: order.date_limite_livraison_attendue,
              statut: productStatus,
              etape: orderProduct.etape,
              express: orderProduct.express,
              createdAt: order.createdAt,
              updatedAt: order.updatedAt
            })
          })
        }
      })
      
      setOrderProductRows(flatRows)
      setAllOrdersForNotifications(allOrdersFlat)
    } catch (err) {
      setError('Erreur lors du chargement des commandes')
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await orderAPI.getOrderStats()
      setStats(response.stats)
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }, [])

  // Fetch users by role for dropdowns
  const fetchUsersByRole = useCallback(async () => {
    try {
      const [infographResponse, atelierResponse, commercialResponse] = await Promise.all([
        userAPI.getUsers({ role: 'infograph' }),
        userAPI.getUsers({ role: 'atelier' }),
        userAPI.getUsers({ role: 'commercial' })
      ])
      setInfographUsers(infographResponse.users || [])
      setAtelierUsers(atelierResponse.users || [])
      setCommercialUsers(commercialResponse.users || [])
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }, [])

  // Calculate urgency for sorting and coloring
  const getOrderUrgency = (orderProductRow) => {
    const { statut, date_limite_livraison_estimee } = orderProductRow
    
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
    
    // Calculate time until deadline (positive = time left, negative = overdue)
    const timeUntilDeadline = deadline - now
    
    // Determine urgency level based on actual deadline
    if (timeUntilDeadline <= 0) {
      return 0 // Most urgent - past deadline (RED)
    } else if (timeUntilDeadline > 0 && timeUntilDeadline <= 30 * 60 * 1000) {
      return 1 // Very urgent - 30 minutes or less until deadline (ORANGE)
    } else if (timeUntilDeadline > 30 * 60 * 1000 && timeUntilDeadline <= 60 * 60 * 1000) {
      return 2 // Urgent - 1 hour or less until deadline (YELLOW)
    } else {
      return 4 // Normal - more than 1 hour until deadline (GRAY)
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
      
      // If both are express orders, prioritize those with client surplace (null delivery date)
      if (isExpressA && isExpressB) {
        // Check for null date_limite_livraison_estimee (client surplace)
        const isClientSurplaceA = !a.date_limite_livraison_estimee || a.date_limite_livraison_estimee === null
        const isClientSurplaceB = !b.date_limite_livraison_estimee || b.date_limite_livraison_estimee === null
        
        // Client surplace express orders go first
        if (isClientSurplaceA && !isClientSurplaceB) return -1
        if (!isClientSurplaceA && isClientSurplaceB) return 1
        
        // If both are client surplace or both have delivery dates, continue with normal sorting
      }
      
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
        case 0: return 'bg-red-200 hover:bg-red-300 border-l-4 border-yellow-500' // Express past deadline
        case 1: return 'bg-orange-200 hover:bg-orange-300 border-l-4 border-yellow-500' // Express 30min until deadline
        case 2: return 'bg-yellow-200 hover:bg-yellow-300 border-l-4 border-yellow-500' // Express 1h until deadline
        case 3: return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500' // Express medium urgency
        case 4: return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500' // Express normal
        case 5:
        default: return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500' // Express least urgent
      }
    }
    
    // Non-express orders use regular styling
    switch (urgency) {
      case 0: return 'bg-red-200 hover:bg-red-300 border-l-4 border-red-500' // Past deadline
      case 1: return 'bg-orange-200 hover:bg-orange-300 border-l-4 border-orange-500' // 30min until deadline
      case 2: return 'bg-yellow-200 hover:bg-yellow-300 border-l-4 border-yellow-500' // 1h until deadline
      case 3: return 'bg-gray-50 hover:bg-gray-100' // Medium urgency - no deadline set
      case 4: return 'bg-gray-50 hover:bg-gray-100' // Normal - more than 1h until deadline
      case 5:
      default: return 'bg-gray-50 hover:bg-gray-100' // Least urgent or default
    }
  }

  // Status badge component
  const getStatusBadge = (status) => {
    const statusConfig = {
      'problem_technique': { label: 'Problème technique', color: 'bg-yellow-100 text-yellow-800' },
      'en_cours': { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      'attente_validation': { label: 'Attente de validation', color: 'bg-orange-100 text-orange-800' },
      'modification': { label: 'Modification', color: 'bg-indigo-100 text-indigo-800' },
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
    if (!dateString) return <span className="font-bold">Client surplace</span>
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
        'numero_affaire', 'commercial_en_charge', 'date_limite_livraison_attendue',
        'numero_pms', 'statut', 'atelier_concerne', 
        'estimated_work_time_minutes', 'bat', 'express', 'pack_fin_annee', 'commentaires', 'finitions'
      ], // Commercial can edit most fields except quantity, infograph_en_charge, numero_dm, etape, and date_limite_livraison_estimee (délais)
      infograph: [
        'quantity', 'numero_pms', 'statut', 'etape', 'atelier_concerne', 
        'infograph_en_charge', 'date_limite_livraison_estimee', 
        'estimated_work_time_minutes', 'bat', 'express', 'pack_fin_annee', 'commentaires', 'finitions'
      ], // Infograph can edit product-level fields
      atelier: ['statut', 'etape', 'atelier_concerne', 'agent_impression', 'machine_impression', 'commentaires', 'date_limite_livraison_estimee', 'pack_fin_annee', 'type_sous_traitance'] // Atelier can edit limited fields including délais, machine impression, and type sous-traitance
    }
    
    const userRole = user?.role || 'guest'
    const allowedFields = editableFields[userRole] || []
    
    return allowedFields === 'all' || allowedFields.includes(field)
  }

  // Inline editing functions
  const handleInlineEdit = (orderProductId, field, currentValue, orderProductRow = null) => {
    // Check if user can edit this field
    if (!isFieldEditable(field)) {
      return // Not allowed to edit this field
    }
    
    // Special check for type_sous_traitance: only editable if atelier is 'sous-traitance'
    if (field === 'type_sous_traitance' && orderProductRow && orderProductRow.atelier_concerne !== 'sous-traitance') {
      return // Not allowed to edit type_sous_traitance when atelier is not 'sous-traitance'
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
        // Convert local datetime to ISO string for API
        valueToSend = new Date(newValue).toISOString()
      } else if (field === 'date_limite_livraison_attendue' && newValue) {
        // Convert local datetime to ISO string for API
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
        // Use the unique orderProductId to identify the specific order product
        await orderAPI.updateOrderProduct(orderProductRow.orderId, orderProductRow.orderProductId, { [field]: valueToSend })
      }

      // Update local state to avoid losing filters
      if (field === 'statut' && (newValue === 'annule' || newValue === 'livre')) {
        // Remove the order product from display but keep filters
        setOrderProductRows(orderProductRows.filter(row => row.orderProductId !== orderProductId))
      } else {
        // Update the specific row in local state
        setOrderProductRows(prevRows => 
          prevRows.map(row => 
            row.orderProductId === orderProductId ? { ...row, [field]: valueToSend } : row
          )
        )
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

      // Refresh stats if status changed (but don't refetch orders to preserve filters)
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

      // Use the unique orderProductId to identify the specific order product
      await orderAPI.updateOrderProduct(orderProductRow.orderId, orderProductRow.orderProductId, updateData)

      // Update local state to preserve filters
      setOrderProductRows(prevRows => 
        prevRows.map(row => 
          row.orderProductId === orderProductId ? { 
            ...row, 
            statut: newValue,
            commentaires: newComments
          } : row
        )
      )

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

      // Refresh stats since status changed (but don't refetch orders to preserve filters)
      fetchStats()
    } catch (err) {
      setError('Erreur lors de la mise à jour')
      cancelInlineEdit(orderProductId, 'statut')
    }
  }

  // Render client info with express pending badge
  const renderClientInfoWithBadge = (row) => {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium truncate" title={row.client_info}>{row.client_info}</span>
        {row.order_express_pending && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-400 rounded whitespace-nowrap" title="Express en attente">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Express
          </span>
        )}
        {user?.role === 'admin' && row.order_express_pending && (
          <div className="inline-flex items-center gap-1">
            <button
              onClick={(e) => handleApproveExpress(row, e)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-green-600 text-white border border-green-700 rounded hover:bg-green-700 transition-colors"
              title="Approuver express"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={(e) => handleRejectExpress(row, e)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-red-600 text-white border border-red-700 rounded hover:bg-red-700 transition-colors"
              title="Rejeter express"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    )
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
      // Adjust for timezone offset to get local time
      const timezoneOffset = date.getTimezoneOffset() * 60000
      const localDate = new Date(date.getTime() - timezoneOffset)
      return localDate.toISOString().slice(0, 16)
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
      } else if (value === 'valider') {
        return 'bg-blue-100 text-blue-800 border border-blue-200'
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

    // Get dynamic status options based on atelier_concerne, user role, and current etape
    const dynamicStatusOptions = getStatusOptionsByRole(orderProductRow.atelier_concerne, orderProductRow.statut, orderProductRow.etape)

    if (isEditing) {
      return (
        <div className="inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              const currentValue = orderProductRow.statut
              
              // For commercial users, add validation
              if (user?.role === 'commercial') {
                // If they select the same value as current, just cancel edit
                if (newValue === currentValue) {
                  cancelInlineEdit(orderProductRow.orderProductId, 'statut')
                  return
                }
                 
                // Only allow changing TO 'livre' or 'annule'
                if (newValue !== 'livre' && newValue !== 'annule') {
                  cancelInlineEdit(orderProductRow.orderProductId, 'statut')
                  return
                }
                
                // Additional restriction: can only change to 'livre' if current status is 'termine'
                if (newValue === 'livre' && currentValue !== 'termine') {
                  setFinitionErrorMessage('Vous ne pouvez changer le statut vers "livré" que si le statut actuel est "terminé".')
                  setShowFinitionErrorDialog(true)
                  cancelInlineEdit(orderProductRow.orderProductId, 'statut')
                  return
                }
              }
              
              // Validation for atelier and infograph users - cannot change to 'livre'
              if (newValue === 'livre' && (user?.role === 'atelier' || user?.role === 'infograph')) {
                setFinitionErrorMessage('Vous n\'avez pas l\'autorisation de changer le statut vers "livré". Seuls les administrateurs et commerciaux peuvent effectuer cette action.')
                setShowFinitionErrorDialog(true)
                cancelInlineEdit(orderProductRow.orderProductId, 'statut')
                return
              }
              
              // Additional validation for 'termine' status
              if (newValue === 'termine' && !canSelectTermineStatus(orderProductRow.atelier_concerne, orderProductRow.etape, user?.role, orderProductRow)) {
                let errorMessage = 'Impossible de marquer comme terminé. '
                
                if (orderProductRow.atelier_concerne === 'sous-traitance') {
                  errorMessage += 'L\'étape "contrôle qualité" doit être terminée.'
                } else if (['petit format', 'grand format', 'sous-traitance'].includes(orderProductRow.atelier_concerne) && !hasFinitions(orderProductRow)) {
                  errorMessage += 'Une finition doit être ajoutée avant de marquer comme terminé.'
                } else {
                  errorMessage += 'L\'étape "finition" doit être terminée.'
                }
                
                setFinitionErrorMessage(errorMessage)
                setShowFinitionErrorDialog(true)
                cancelInlineEdit(orderProductRow.orderProductId, 'statut')
                return
              }
              
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
            {dynamicStatusOptions.map(status => (
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

  const renderInlineMachineImpression = (orderProductRow) => {
    const editKey = `${orderProductRow.orderProductId}-machine_impression`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
          <input
            type="text"
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(orderProductRow.orderProductId, 'machine_impression', newValue)
            }}
            onBlur={() => {
              const finalValue = tempValues[editKey] || ''
              saveInlineEdit(orderProductRow.orderProductId, 'machine_impression', finalValue)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const finalValue = e.target.value
                saveInlineEdit(orderProductRow.orderProductId, 'machine_impression', finalValue)
              } else if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, 'machine_impression')
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full"
            placeholder="Nom de la machine"
            autoFocus
          />
        </div>
      )
    }

    const fieldEditable = isFieldEditable('machine_impression')

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, 'machine_impression', orderProductRow.machine_impression)}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{orderProductRow.machine_impression || '-'}</span>
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

  const renderInlineSousTraitance = (orderProductRow) => {
    const editKey = `${orderProductRow.orderProductId}-type_sous_traitance`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(orderProductRow.orderProductId, 'type_sous_traitance', newValue)
              saveInlineEdit(orderProductRow.orderProductId, 'type_sous_traitance', newValue)
            }}
            onBlur={() => cancelInlineEdit(orderProductRow.orderProductId, 'type_sous_traitance')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, 'type_sous_traitance')
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          >
            <option value="">-</option>
            {sousTraitanceOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )
    }

    const fieldEditable = isFieldEditable('type_sous_traitance') && orderProductRow.atelier_concerne === 'sous-traitance'

    const getTitle = () => {
      if (!isFieldEditable('type_sous_traitance')) {
        return "Lecture seule"
      }
      if (orderProductRow.atelier_concerne !== 'sous-traitance') {
        return "Non modifiable - L'atelier doit être 'sous-traitance'"
      }
      return "Cliquer pour modifier"
    }

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, 'type_sous_traitance', orderProductRow.type_sous_traitance, orderProductRow)}
        title={getTitle()}
      >
        <div className="flex items-center justify-between">
          <span>{orderProductRow.type_sous_traitance || '-'}</span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              
              // Validation: graphiste must be assigned before changing to 'impression' etape
              if ((newValue === 'impression' || newValue === 'en production') && !orderProductRow.infograph_en_charge) {
                setFinitionErrorMessage('Vous devez sélectionner un graphiste avant de passer à l\'étape "impression".')
                setShowFinitionErrorDialog(true)
                cancelInlineEdit(orderProductRow.orderProductId, 'etape')
                return
              }
              
              // Validation: agent impression must be assigned before changing to 'finition' etape
              if (newValue === 'finition' && !orderProductRow.agent_impression) {
                setFinitionErrorMessage('Vous devez sélectionner un agent impression avant de passer à l\'étape "finition".')
                setShowFinitionErrorDialog(true)
                cancelInlineEdit(orderProductRow.orderProductId, 'etape')
                return
              }
              
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
  const handleRowClick = async (orderProductRow, event) => {
    if (event.target.closest('.inline-edit') || event.target.closest('.action-button')) {
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

  // CRUD operations
  const handleCreateOrder = () => {
    setSelectedOrder(null)
    setShowCreateModal(true)
  }

  const handleEditOrder = async (orderProductRow) => {
    try {
      // Fetch the complete order with all products from the API
      const response = await orderAPI.getOrder(orderProductRow.orderId)
      if (response && response.order) {
        setSelectedOrder(response.order)
        setShowEditModal(true)
      } else {
        console.error('Failed to fetch order details')
        setError('Erreur lors du chargement des détails de la commande')
      }
    } catch (error) {
      console.error('Error fetching order for edit:', error)
      setError('Erreur lors du chargement des détails de la commande')
    }
  }

  const handleDeleteOrder = async (orderProductRow) => {
    // Set the item to delete with both order and product information
    setItemToDelete({
      type: 'orderProduct',
      orderId: orderProductRow.orderId,
      orderProductId: orderProductRow.orderProductId, // Use orderProductId instead of product_id
      productName: orderProductRow.product_name,
      clientName: orderProductRow.client_info
    })
    setShowDeleteDialog(true)
  }

  const confirmDeleteOrder = async () => {
    if (itemToDelete) {
      try {
        if (itemToDelete.type === 'orderProduct') {
          // Delete specific order product
          const response = await orderAPI.deleteOrderProduct(itemToDelete.orderId, itemToDelete.orderProductId)
          
          if (response.orderDeleted) {
            // Entire order was deleted because it was the last product
            setOrderProductRows(prev => prev.filter(row => row.orderId !== itemToDelete.orderId))
          } else {
            // Only the specific product was deleted
            setOrderProductRows(prev => prev.filter(row => 
              !(row.orderId === itemToDelete.orderId && row.orderProductId === itemToDelete.orderProductId)
            ))
          }
        } else {
          // Delete entire order (fallback for full order deletion)
          await orderAPI.deleteOrder(itemToDelete.orderId)
          setOrderProductRows(prev => prev.filter(row => row.orderId !== itemToDelete.orderId))
        }
        
        // Refresh stats
        fetchStats()
        setShowDeleteDialog(false)
        setItemToDelete(null)
      } catch (err) {
        setError('Erreur lors de la suppression')
        setShowDeleteDialog(false)
        setItemToDelete(null)
      }
    }
  }

  const cancelDeleteOrder = () => {
    setShowDeleteDialog(false)
    setItemToDelete(null)
  }

  // Handler for approving express request
  const handleApproveExpress = async (orderProductRow, e) => {
    e.stopPropagation() // Prevent row click
    
    try {
      await orderAPI.approveExpressRequest(orderProductRow.orderId)
      
      // Update local state - set all products of this order to express='oui' and clear pending flag
      setOrderProductRows(prev => prev.map(row => 
        row.orderId === orderProductRow.orderId
          ? { ...row, express: 'oui', order_express_pending: false }
          : row
      ))
      
      // Refresh stats
      fetchStats()
    } catch (err) {
      console.error('Error approving express request:', err)
      setError('Erreur lors de l\'approbation de la demande express')
    }
  }

  // Handler for rejecting express request
  const handleRejectExpress = async (orderProductRow, e) => {
    e.stopPropagation() // Prevent row click
    
    try {
      await orderAPI.rejectExpressRequest(orderProductRow.orderId)
      
      // Update local state - clear pending flag, products remain express='non'
      setOrderProductRows(prev => prev.map(row => 
        row.orderId === orderProductRow.orderId
          ? { ...row, order_express_pending: false }
          : row
      ))
      
      // Refresh stats
      fetchStats()
    } catch (err) {
      console.error('Error rejecting express request:', err)
      setError('Erreur lors du rejet de la demande express')
    }
  }

  // Effects - Load data when filters change
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders]) // Only depend on fetchOrders, which depends on filters

  // Load stats and users once on mount
  useEffect(() => {
    fetchStats()
    fetchUsersByRole()
  }, [fetchStats, fetchUsersByRole])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // WebSocket listeners - with proper filter preservation to prevent unwanted rows appearing
  useEffect(() => {
    if (!connected) return

    // Helper function to check if a row matches current filters
    const rowMatchesFilters = (row) => {
      // If no filters are active, all rows match
      if (!hasActiveFilters) return true
      
      // Check each filter
      if (filters.search && row.numero_pms && !row.numero_pms.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      
      if (filters.client && row.client_info && !row.client_info.toLowerCase().includes(filters.client.toLowerCase())) {
        return false
      }
      
      if (filters.commercial.length > 0 && (!row.commercial_en_charge || !filters.commercial.includes(row.commercial_en_charge))) {
        return false
      }
      
      if (filters.infograph.length > 0) {
        const hasNothingFilter = filters.infograph.includes('nothing')
        const hasUserFilters = filters.infograph.filter(f => f !== 'nothing')
        
        let matchesInfographFilter = false
        
        // Check if "nothing" filter matches (no infograph assigned - null, undefined, or empty string)
        if (hasNothingFilter && (row.infograph_en_charge === null || row.infograph_en_charge === undefined || row.infograph_en_charge === '' || (typeof row.infograph_en_charge === 'string' && row.infograph_en_charge.trim() === ''))) {
          matchesInfographFilter = true
        }
        
        // Check if any user filter matches
        if (hasUserFilters.length > 0 && row.infograph_en_charge && hasUserFilters.includes(row.infograph_en_charge)) {
          matchesInfographFilter = true
        }
        
        if (!matchesInfographFilter) {
          return false
        }
      }
      
      if (filters.agent_impression.length > 0 && (!row.agent_impression || !filters.agent_impression.includes(row.agent_impression))) {
        return false
      }
      
      if (filters.atelier.length > 0 && (!row.atelier_concerne || !filters.atelier.includes(row.atelier_concerne))) {
        return false
      }
      
      if (filters.etape.length > 0 && (!row.etape || !filters.etape.includes(row.etape))) {
        return false
      }
      
      if (filters.statut.length > 0 && (!row.statut || !filters.statut.includes(row.statut))) {
        return false
      }
      
      if (filters.type_sous_traitance.length > 0 && (!row.type_sous_traitance || !filters.type_sous_traitance.includes(row.type_sous_traitance))) {
        return false
      }
      
      if (filters.express && row.express !== filters.express) {
        return false
      }
      
      if (filters.bat && row.bat !== filters.bat) {
        return false
      }
      
      if (filters.pack_fin_annee && String(row.pack_fin_annee) !== filters.pack_fin_annee) {
        return false
      }
      
      if (filters.machine_impression && row.machine_impression && !row.machine_impression.toLowerCase().includes(filters.machine_impression.toLowerCase())) {
        return false
      }
      
      // Date filters
      if (filters.date_from) {
        const dateFrom = new Date(filters.date_from)
        const rowDate = new Date(row.date_limite_livraison_attendue)
        if (rowDate < dateFrom) return false
      }
      
      if (filters.date_to) {
        const dateTo = new Date(filters.date_to)
        const rowDate = new Date(row.date_limite_livraison_attendue)
        if (rowDate > dateTo) return false
      }
      
      return true
    }

    const unsubscribeOrderCreated = subscribe('orderCreated', (newOrder) => {
      // Only update stats for new orders, don't add to filtered view unless it matches filters
      fetchStats()
      
      // If no filters active, we can safely add the new order
      if (!hasActiveFilters && newOrder.statut !== 'annule' && newOrder.statut !== 'livre') {
        if (newOrder.orderProducts && newOrder.orderProducts.length > 0) {
          const newFlatRows = []
          newOrder.orderProducts.forEach(orderProduct => {
            const productStatus = orderProduct.statut || newOrder.statut
            
            const newRow = {
              orderProductId: orderProduct.id,
              orderId: newOrder.id,
              numero_affaire: newOrder.numero_affaire,
              numero_dm: newOrder.numero_dm,
              client_info: newOrder.clientInfo?.nom || newOrder.client,
              commercial_en_charge: newOrder.commercial_en_charge,
              date_limite_livraison_attendue: newOrder.date_limite_livraison_attendue,
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
              clientInfo: newOrder.clientInfo || { nom: newOrder.client },
              createdAt: newOrder.createdAt,
              updatedAt: newOrder.updatedAt
            }
            newFlatRows.push(newRow)
          })
          
          // Add to existing orders only if no filters active
          setOrderProductRows(prev => [...newFlatRows, ...prev])
        }
      }
      // If filters are active, don't add new rows to prevent filter corruption
      // The user will see the new order when they refresh or clear filters
    })

    const unsubscribeOrderUpdated = subscribe('orderUpdated', (updatedOrder) => {
      // Always remove old versions of this order's products first
      setOrderProductRows(prev => {
        const filteredRows = prev.filter(row => row.orderId !== updatedOrder.id)
        
        // Process each product individually, checking PRODUCT-level status
        if (updatedOrder.orderProducts && updatedOrder.orderProducts.length > 0) {
          
          const updatedFlatRows = []
          updatedOrder.orderProducts.forEach(orderProduct => {
            const productStatus = orderProduct.statut || updatedOrder.statut
            
            // Skip products that are delivered or cancelled at the PRODUCT level
            if (productStatus === 'livre' || productStatus === 'annule') {
              return // Don't add this product to the dashboard
            }
            
            const updatedRow = {
              orderProductId: orderProduct.id,
              orderId: updatedOrder.id,
              numero_affaire: updatedOrder.numero_affaire,
              numero_dm: updatedOrder.numero_dm,
              client_info: updatedOrder.clientInfo?.nom || updatedOrder.client,
              commercial_en_charge: updatedOrder.commercial_en_charge,
              date_limite_livraison_attendue: updatedOrder.date_limite_livraison_attendue,
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
              clientInfo: updatedOrder.clientInfo || { nom: updatedOrder.client },
              createdAt: updatedOrder.createdAt,
              updatedAt: updatedOrder.updatedAt
            }
            
            // Only add the row if it matches current filters
            if (rowMatchesFilters(updatedRow)) {
              updatedFlatRows.push(updatedRow)
            }
          })
          
          return [...updatedFlatRows, ...filteredRows]
        }
        
        return filteredRows
      })
      
      // Update stats
      fetchStats()
    })

    const unsubscribeOrderDeleted = subscribe('orderDeleted', (deletedOrderData) => {
      // Remove deleted order from local state
      setOrderProductRows(prev => prev.filter(row => row.orderId !== deletedOrderData.orderId))
      // Update stats
      fetchStats()
    })

    return () => {
      unsubscribeOrderCreated()
      unsubscribeOrderUpdated()
      unsubscribeOrderDeleted()
    }
  }, [connected, subscribe, hasActiveFilters, filters])

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

        {/* Role-based Statistics Section */}
        <div className="mb-6">
          <RoleBasedStats />
        </div>

        {/* Restored Original Filter System with Persistence */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 filter-section">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3 flex-1">
              {/* 1. Search Field - Recherche par N° PMS */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher par N° PMS"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
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
                onChange={(e) => updateFilter('client', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />

              {/* 3. Commercial Filter - Multi-select dropdown */}
              <MultiSelectDropdown
                options={commercialUsers.map(user => ({ value: user.username, label: user.username }))}
                selectedValues={filters.commercial}
                onChange={(value) => toggleMultiSelectFilter('commercial', value)}
                placeholder="Commercial"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-32"
              />

              {/* 4. Infograph Filter - Multi-select dropdown */}
              <MultiSelectDropdown
                options={[
                  { value: 'nothing', label: 'Aucun graphiste assigné' },
                  ...infographUsers.map(user => ({ value: user.username, label: user.username }))
                ]}
                selectedValues={filters.infograph}
                onChange={(value) => toggleMultiSelectFilter('infograph', value)}
                placeholder="Infographe"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-32"
              />

              {/* 5. Agent Impression Filter - Multi-select dropdown */}
              <MultiSelectDropdown
                options={atelierUsers.map(user => ({ value: user.username, label: user.username }))}
                selectedValues={filters.agent_impression}
                onChange={(value) => toggleMultiSelectFilter('agent_impression', value)}
                placeholder="Agent impression"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-32"
              />

              {/* 6. Workshop Filter - Tous les ateliers - Multi-select */}
              <MultiSelectDropdown
                options={atelierOptions.map(atelier => ({ value: atelier, label: atelier }))}
                selectedValues={filters.atelier}
                onChange={(value) => toggleMultiSelectFilter('atelier', value)}
                placeholder="Tous les ateliers"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-40"
              />

              {/* 7. Etape Filter - Toutes les étapes - Multi-select */}
              <MultiSelectDropdown
                options={etapeOptions.map(etape => ({ value: etape, label: etape }))}
                selectedValues={filters.etape}
                onChange={(value) => toggleMultiSelectFilter('etape', value)}
                placeholder="Toutes les étapes"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-40"
              />

              {/* 8. Status Filter - Tous les statuts - Multi-select */}
              <MultiSelectDropdown
                options={statusOptions}
                selectedValues={filters.statut}
                onChange={(value) => toggleMultiSelectFilter('statut', value)}
                placeholder="Tous les statuts"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-40"
              />

              {/* 9. Type Sous-traitance Filter - Multi-select */}
              <MultiSelectDropdown
                options={sousTraitanceOptions}
                selectedValues={filters.type_sous_traitance}
                onChange={(value) => toggleMultiSelectFilter('type_sous_traitance', value)}
                placeholder="Type sous-traitance"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-40"
              />

              {/* 10. Express Filter - Toutes les urgences */}
              <select
                value={filters.express}
                onChange={(e) => updateFilter('express', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Toutes les urgences</option>
                <option value="oui">Express uniquement</option>
                <option value="non">Non express</option>
              </select>

              {/* 11. BAT Filter - Tous les BAT */}
              <select
                value={filters.bat}
                onChange={(e) => updateFilter('bat', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Tous les BAT</option>
                <option value="avec">Avec BAT</option>
                <option value="sans">Sans BAT</option>
              </select>

              {/* 12. Pack Fin d'Année Filter */}
              <select
                value={filters.pack_fin_annee}
                onChange={(e) => updateFilter('pack_fin_annee', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Pack fin d'année</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>

              {/* Machine Impression Filter - Only visible for admin and atelier users */}
              {(user?.role === 'admin' || user?.role === 'atelier') && (
                <input
                  type="text"
                  placeholder="Machine impression"
                  value={filters.machine_impression}
                  onChange={(e) => updateFilter('machine_impression', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              )}

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
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

      {/* Main Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#00AABB]">
              <tr>
                {user?.role === 'commercial' ? (
                  renderCommercialTableHeader()
                ) : user?.role === 'infograph' ? (
                  renderInfographTableHeader()
                ) : (
                  <>
                    {/* For atelier: atelier, client, produit, quantité, bat, graphiste, pms, agent impression, machine impression, étape, status, délais, type sous traitance */}
                    {/* For infograph: Atelier - Client - Produit - Quantity - BAT - Graphiste - PMS - Etape - Agent impression - Statut - Délais */}
                    {visibleColumns.atelier_concerne && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Atelier
                      </th>
                    )}
                    {visibleColumns.client_info && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Client
                      </th>
                    )}
                    {visibleColumns.product_name && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Produit
                      </th>
                    )}
                    {visibleColumns.quantity && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Quantité
                      </th>
                    )}
                    {visibleColumns.bat && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        BAT
                      </th>
                    )}
                    {visibleColumns.infograph_en_charge && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Graphiste
                      </th>
                    )}
                    {visibleColumns.numero_pms && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        N° PMS
                      </th>
                    )}
                    {visibleColumns.agent_impression && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Agent impression
                      </th>
                    )}
                    {visibleColumns.machine_impression && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Machine impression
                      </th>
                    )}
                    {visibleColumns.etape && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Étape
                      </th>
                    )}
                    {visibleColumns.statut && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Statut
                      </th>
                    )}
                    {visibleColumns.date_limite_livraison_estimee && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Délai produit
                      </th>
                    )}
                    {visibleColumns.date_limite_livraison_client && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Délai client
                      </th>
                    )}
                    {visibleColumns.type_sous_traitance && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Type sous-traitance
                      </th>
                    )}
                    {/* Other columns for non-infograph/atelier roles */}
                    {visibleColumns.numero_affaire && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        N° Affaire
                      </th>
                    )}
                    {visibleColumns.numero_dm && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        N° DM
                      </th>
                    )}
                    {visibleColumns.commercial_en_charge && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Commercial
                      </th>
                    )}
                    {visibleColumns.estimated_work_time_minutes && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Temps (min)
                      </th>
                    )}
                    {visibleColumns.commentaires && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Commentaires
                      </th>
                    )}
                    {visibleColumns.express && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Express
                      </th>
                    )}
                    {visibleColumns.pack_fin_annee && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Pack fin d'année
                      </th>
                    )}
                    {canDeleteOrders() && (
                      <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Loading State */}
              {loading && orderProductRows.length === 0 ? (
                <tr>
                  <td 
                    colSpan={getColumnCount()}
                    className="px-6 py-12 text-center"
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-gray-500">Chargement des commandes...</p>
                    </div>
                  </td>
                </tr>
              ) : 
              /* No Results State */
              sortedOrderProductRows.length === 0 ? (
                <tr>
                  <td 
                    colSpan={getColumnCount()}
                    className="px-6 py-12 text-center"
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="text-gray-500">
                        <p className="text-lg font-medium">Aucun résultat trouvé</p>
                        {hasActiveFilters ? (
                          <div className="mt-2 space-y-2">
                            <p className="text-sm">Aucune commande ne correspond aux filtres sélectionnés.</p>
                            <button
                              onClick={clearAllFilters}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors duration-200"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Effacer tous les filtres
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm mt-2">Il n'y a aucune commande dans le système.</p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {/* Express Orders Section */}
                  {groupedOrderProductRows.expressOrders.length > 0 && (
                    <>
                      {/* Express Orders Header */}
                      <tr className="bg-yellow-100">
                        <td 
                          colSpan={getColumnCount()}
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
                      {user?.role === 'commercial' ? (
                        renderCommercialTableRow(row)
                      ) : user?.role === 'infograph' ? (
                        renderInfographTableRow(row)
                      ) : (
                        <>
                          {/* For atelier: atelier, client, produit, quantité, bat, graphiste, pms, agent impression, machine impression, étape, status, délais, type sous traitance */}
                          {/* For infograph: Atelier - Client - Produit - Quantity - BAT - Graphiste - PMS - Etape - Agent impression - Statut - Délais */}
                          {visibleColumns.atelier_concerne && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineAtelier(row)}
                            </td>
                          )}
                          {visibleColumns.client_info && (
                            <td className="px-2 py-0.5 text-sm text-gray-900">
                              {renderClientInfoWithBadge(row)}
                            </td>
                          )}
                          {visibleColumns.product_name && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {row.product_name}
                            </td>
                          )}
                          {visibleColumns.quantity && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineNumber(row, 'quantity', row.quantity)}
                            </td>
                          )}
                          {visibleColumns.bat && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineBat(row)}
                            </td>
                          )}
                          {visibleColumns.infograph_en_charge && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineInfograph(row)}
                            </td>
                          )}
                          {visibleColumns.numero_pms && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineText(row, 'numero_pms', row.numero_pms)}
                            </td>
                          )}
                          {visibleColumns.agent_impression && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineAgentImpression(row)}
                            </td>
                          )}
                          {visibleColumns.machine_impression && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineMachineImpression(row)}
                            </td>
                          )}
                          {visibleColumns.etape && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineEtape(row)}
                            </td>
                          )}
                          {visibleColumns.statut && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineStatus(row)}
                            </td>
                          )}
                          {visibleColumns.date_limite_livraison_estimee && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineDate(row, 'date_limite_livraison_estimee')}
                            </td>
                          )}
                          {visibleColumns.date_limite_livraison_client && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineDate(row, 'date_limite_livraison_attendue')}
                            </td>
                          )}
                          {visibleColumns.type_sous_traitance && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineSousTraitance(row)}
                            </td>
                          )}
                          {/* Other columns for non-infograph/atelier roles */}
                          {visibleColumns.numero_affaire && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineText(row, 'numero_affaire', row.numero_affaire)}
                            </td>
                          )}
                          {visibleColumns.numero_dm && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineText(row, 'numero_dm', row.numero_dm)}
                            </td>
                          )}
                          {visibleColumns.commercial_en_charge && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {row.commercial_en_charge}
                            </td>
                          )}
                          {visibleColumns.estimated_work_time_minutes && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineNumber(row, 'estimated_work_time_minutes', row.estimated_work_time_minutes, ' min')}
                            </td>
                          )}
                          {visibleColumns.commentaires && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineText(row, 'commentaires', row.commentaires || '-')}
                            </td>
                          )}
                          {visibleColumns.express && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineSelect(row, 'express', expressOptions)}
                            </td>
                          )}
                          {visibleColumns.pack_fin_annee && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlinePackFinAnnee(row)}
                            </td>
                          )}
                          {canDeleteOrders() && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center gap-2 action-button">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteOrder(row)
                                  }}
                                  className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-xs"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          )}
                        </>
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
                        colSpan={getColumnCount()}
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
                      {user?.role === 'commercial' ? (
                        renderCommercialTableRow(row)
                      ) : user?.role === 'infograph' ? (
                        renderInfographTableRow(row)
                      ) : (
                        <>
                          {/* For atelier: atelier, client, produit, quantité, bat, graphiste, pms, agent impression, machine impression, étape, status, délais, type sous traitance */}
                          {/* For infograph: Atelier - Client - Produit - Quantity - BAT - Graphiste - PMS - Etape - Agent impression - Statut - Délais */}
                          {visibleColumns.atelier_concerne && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineAtelier(row)}
                            </td>
                          )}
                          {visibleColumns.client_info && (
                            <td className="px-2 py-0.5 text-sm text-gray-900">
                              {renderClientInfoWithBadge(row)}
                            </td>
                          )}
                          {visibleColumns.product_name && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {row.product_name}
                            </td>
                          )}
                          {visibleColumns.quantity && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineNumber(row, 'quantity', row.quantity)}
                            </td>
                          )}
                          {visibleColumns.bat && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineBat(row)}
                            </td>
                          )}
                          {visibleColumns.infograph_en_charge && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineInfograph(row)}
                            </td>
                          )}
                          {visibleColumns.numero_pms && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineText(row, 'numero_pms', row.numero_pms)}
                            </td>
                          )}
                          {visibleColumns.agent_impression && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineAgentImpression(row)}
                            </td>
                          )}
                          {visibleColumns.machine_impression && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineMachineImpression(row)}
                            </td>
                          )}
                          {visibleColumns.etape && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineEtape(row)}
                            </td>
                          )}
                          {visibleColumns.statut && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineStatus(row)}
                            </td>
                          )}
                          {visibleColumns.date_limite_livraison_estimee && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineDate(row, 'date_limite_livraison_estimee')}
                            </td>
                          )}
                          {visibleColumns.date_limite_livraison_client && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineDate(row, 'date_limite_livraison_attendue')}
                            </td>
                          )}
                          {visibleColumns.type_sous_traitance && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineSousTraitance(row)}
                            </td>
                          )}
                          {/* Other columns for non-infograph/atelier roles */}
                          {visibleColumns.numero_affaire && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineText(row, 'numero_affaire', row.numero_affaire)}
                            </td>
                          )}
                          {visibleColumns.numero_dm && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineText(row, 'numero_dm', row.numero_dm)}
                            </td>
                          )}
                          {visibleColumns.commercial_en_charge && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {row.commercial_en_charge}
                            </td>
                          )}
                          {visibleColumns.estimated_work_time_minutes && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineNumber(row, 'estimated_work_time_minutes', row.estimated_work_time_minutes, ' min')}
                            </td>
                          )}
                          {visibleColumns.commentaires && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineText(row, 'commentaires', row.commentaires || '-')}
                            </td>
                          )}
                          {visibleColumns.express && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlineSelect(row, 'express', expressOptions)}
                            </td>
                          )}
                          {visibleColumns.pack_fin_annee && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              {renderInlinePackFinAnnee(row)}
                            </td>
                          )}
                          {canDeleteOrders() && (
                            <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center gap-2 action-button">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteOrder(row)
                                  }}
                                  className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-xs"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))}
                </>
              )}
              </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showViewModal && selectedOrder && (
        <OrderViewModal
          order={selectedOrder}
          selectedOrderProduct={selectedOrderProduct}
          onClose={() => {
            setShowViewModal(false)
            setSelectedOrder(null)
            setSelectedOrderProduct(null)
          }}
          onEdit={() => {
            setShowViewModal(false)
            setShowEditModal(true)
            // Keep selectedOrderProduct when transitioning from view to edit
          }}
          formatDate={formatDate}
          getStatusBadge={getStatusBadge}
          etapeOptions={etapeOptions}
        />
      )}

      {(showCreateModal || showEditModal) && (
        <OrderModal
          order={selectedOrder}
          selectedOrderProduct={selectedOrderProduct}
          onClose={() => {
            setShowCreateModal(false)
            setShowEditModal(false)
            setSelectedOrder(null)
            setSelectedOrderProduct(null)
          }}
          onSave={() => {
            // Refresh data without resetting filters
            fetchOrders()
            fetchStats()
            setShowCreateModal(false)
            setShowEditModal(false)
            setSelectedOrder(null)
            setSelectedOrderProduct(null)
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
        message={
          itemToDelete ? 
            `Êtes-vous sûr de vouloir supprimer le produit "${itemToDelete.productName}" de la commande pour ${itemToDelete.clientName} ? Cette action est irréversible.` 
            : "Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible."
        }
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

      {/* Finition validation error dialog */}
      <AlertDialog
        isOpen={showFinitionErrorDialog}
        onClose={() => {
          setShowFinitionErrorDialog(false)
          setFinitionErrorMessage('')
        }}
        onConfirm={() => {
          setShowFinitionErrorDialog(false)
          setFinitionErrorMessage('')
        }}
        title="Validation impossible"
        message={finitionErrorMessage}
        confirmText="Compris"
        type="error"
        showCancel={false}
      />
    </div>
  )
}

export default DashboardPageClean
