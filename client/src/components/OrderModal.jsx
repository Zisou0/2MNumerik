import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { orderAPI, productAPI, supplierAPI, apiCall } from '../utils/api'
import Button from './ButtonComponent'
import Input from './InputComponent'
import ClientSearch from './ClientSearch'
import AgentSelector from './AgentSelector'

const OrderModal = ({ order, onClose, onSave, statusOptions, atelierOptions, etapeOptions, batOptions, expressOptions, selectedOrderProduct = null }) => {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1) // 1 = Order Info, 2 = Product Info
  
  // Helper function to convert date to local datetime-local format without timezone issues
  const toLocalDateTimeString = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    // Adjust for timezone offset to get local time
    const timezoneOffset = date.getTimezoneOffset() * 60000
    const localDate = new Date(date.getTime() - timezoneOffset)
    return localDate.toISOString().slice(0, 16)
  }

  // Helper function to get today's date at 00:00 in local datetime-local format
  const getTodayAt00 = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set time to 00:00:00.000
    const timezoneOffset = today.getTimezoneOffset() * 60000
    const localDate = new Date(today.getTime() - timezoneOffset)
    return localDate.toISOString().slice(0, 16)
  }

  // Helper function to convert datetime-local string to ISO string for API
  const toISOString = (localDateTimeString) => {
    if (!localDateTimeString) return ''
    // Create date from local datetime string (this treats it as local time)
    const date = new Date(localDateTimeString)
    return date.toISOString()
  }
  
  // Order-level form data
  const [orderFormData, setOrderFormData] = useState({
    numero_affaire: '',
    numero_dm: '',
    client: '',
    client_id: null,
    commercial_en_charge: '',
    date_limite_livraison_estimee: '',
    statut: 'en_cours'
  })
  
  // Product selection and product-specific data
  const [selectedProducts, setSelectedProducts] = useState([])
  const [availableProducts, setAvailableProducts] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [availableSuppliers, setAvailableSuppliers] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [loading, setLoading] = useState(false)

  // Type sous-traitance options
  const typeSousTraitanceOptions = [
    { value: 'Offset', label: 'Offset' },
    { value: 'Sérigraphie', label: 'Sérigraphie' },
    { value: 'Objet publicitaire', label: 'Objet publicitaire' },
    { value: 'Autre', label: 'Autre' }
  ]
  const [productsLoading, setProductsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Finition search state - object with keys as `${productIndex}-${finitionId}` for each product
  const [finitionSearchStates, setFinitionSearchStates] = useState({})
  
  // Product search state - object with keys as `product-${productIndex}` for each product
  const [productSearchStates, setProductSearchStates] = useState({})
  
  // Supplier search state - object with keys as `supplier-${productIndex}` for each product
  const [supplierSearchStates, setSupplierSearchStates] = useState({})
  
  // Refs for click-outside functionality
  const finitionSearchRefs = useRef({})
  const productSearchRefs = useRef({})
  const supplierSearchRefs = useRef({})

  // Get fields visible for current user role
  const getVisibleFields = () => {
    if (user?.role === 'commercial') {
      return {
        // Step 1: Order level fields visible to commercial
        orderLevel: {
          numero_affaire: true,
          numero_dm: true,
          client: true,
          commercial_en_charge: false, // Auto-populated
          date_limite_livraison_estimee: true,
          statut: true
        },
        // Step 2: Product level fields visible to commercial
        productLevel: {
          numero_pms: false,
          infograph_en_charge: false,
          agent_impression: false,
          machine_impression: false,
          date_limite_livraison_estimee: false, // Hidden from modal editing
          etape: true,
          atelier_concerne: true,
          estimated_work_time_minutes: false,
          bat: true,
          express: true,
          pack_fin_annee: true,
          commentaires: true,
          type_sous_traitance: true, // Visible to commercial users for sous-traitance
          supplier_selection: true, // Add supplier selection for commercial users
          finitions: false
        }
      }
    } else if (user?.role === 'infograph') {
      return {
        // Step 1: Order level fields visible to infograph (read-only)
        orderLevel: {
          numero_affaire: false,
          numero_dm: false,
          client: true,
          commercial_en_charge: false,
          date_limite_livraison_estimee: false,
          statut: true
        },
        // Step 2: Product level fields visible to infograph
        productLevel: {
          numero_pms: true,
          infograph_en_charge: true,
          agent_impression: false, // Hidden from infograph users
          machine_impression: false, // Hidden from infograph users
          date_limite_livraison_estimee: false,
          etape: true,
          atelier_concerne: true,
          estimated_work_time_minutes: false, // Hidden from infograph users
          bat: true,
          express: true,
          commentaires: true,
          type_sous_traitance: false, // Hidden from infograph users
          supplier_selection: false, // Hidden from infograph users
          finitions: true
        }
      }
    } else if (user?.role === 'atelier') {
      return {
        // Step 1: Order level fields visible to atelier (read-only)
        orderLevel: {
          numero_affaire: false,
          numero_dm: false,
          client: true,
          commercial_en_charge: false,
          date_limite_livraison_estimee: false,
          statut: false // Read-only for atelier
        },
        // Step 2: Product level fields visible to atelier (read-only except finitions)
        productLevel: {
          numero_pms: false, // Read-only for atelier
          infograph_en_charge: false, // Read-only for atelier
          agent_impression: false, // Read-only for atelier
          date_limite_livraison_estimee: false,
          etape: false, // Read-only for atelier
          atelier_concerne: false, // Read-only for atelier
          estimated_work_time_minutes: false, // Read-only for atelier
          bat: false, // Read-only for atelier
          express: false, // Read-only for atelier
          commentaires: false, // Read-only for atelier
          type_sous_traitance: false, // Read-only for atelier
          supplier_selection: false, // Read-only for atelier
          finitions: true // Only editable field for atelier
        }
      }
    } else {
      // Admin and other roles see everything
      return {
        orderLevel: {
          numero_affaire: true,
          numero_dm: true,
          client: true,
          commercial_en_charge: false, // Auto-populated
          date_limite_livraison_estimee: true,
          statut: true
        },
        productLevel: {
          numero_pms: true,
          infograph_en_charge: true,
          agent_impression: true,
          machine_impression: true,
          date_limite_livraison_estimee: false,
          etape: true,
          atelier_concerne: true,
          estimated_work_time_minutes: true,
          bat: true,
          express: true,
          pack_fin_annee: true,
          commentaires: true,
          type_sous_traitance: true, // Visible to admin
          supplier_selection: true, // Visible to admin
          finitions: true
        }
      }
    }
  }

  const visibleFields = getVisibleFields()

  // Helper function to determine if a field should be read-only for the current user
  const isFieldReadOnly = (fieldType, fieldName) => {
    if (user?.role === 'atelier') {
      // For atelier users, only finitions section is editable
      if (fieldType === 'productLevel' && fieldName === 'finitions') {
        return false // Editable
      }
      return true // All other fields are read-only
    }
    // For other roles, implement existing logic or return false for editable
    return false
  }

  // Fetch available products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true)
        // Request all products by setting a high limit to avoid pagination issues
        const response = await productAPI.getProducts({ limit: 1000 })
        setAvailableProducts(response.products || [])
      } catch (err) {
        console.error('Error fetching products:', err)
        setError('Erreur lors du chargement des produits')
      } finally {
        setProductsLoading(false)
      }
    }

    fetchProducts()
    fetchUsers()
    fetchSuppliers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await apiCall('/users', 'GET')
      // Store all users for different roles
      setAvailableUsers(response.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await supplierAPI.getSuppliers({ active: 'true' })
      setAvailableSuppliers(response.suppliers || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  useEffect(() => {
    if (order) {
      // Editing existing order
      setOrderFormData({
        numero_affaire: order.numero_affaire || '',
        numero_dm: order.numero_dm || '',
        client: order.client || '',
        client_id: order.client_id || null,
        commercial_en_charge: order.commercial_en_charge || '',
        date_limite_livraison_estimee: order.date_limite_livraison_estimee ? 
          toLocalDateTimeString(order.date_limite_livraison_estimee) : '',
        statut: order.statut || 'en_cours'
      })
      
      // Set selected client from order data
      if (order.clientInfo) {
        setSelectedClient(order.clientInfo)
      } else if (order.client && !order.client_id) {
        setSelectedClient(null)
      }
      
      // If editing existing order with products, populate selectedProducts
      if (order.orderProducts && order.orderProducts.length > 0) {
        // If a specific order product is selected, only show that one
        const productsToEdit = selectedOrderProduct 
          ? order.orderProducts.filter(op => op.id === selectedOrderProduct.id)
          : order.orderProducts;
          
        const orderProducts = productsToEdit.map(orderProduct => {
          // Convert finitions data - handle both old and new format
          let finitions = [];
          if (orderProduct.orderProductFinitions && orderProduct.orderProductFinitions.length > 0) {
            // New format - convert to the format expected by the form
            finitions = orderProduct.orderProductFinitions.map(opf => {
              const converted = {
                finition_id: opf.finition_id,
                finition_name: opf.finition?.name || 'Finition',
                assigned_agents: opf.assigned_agents || [],
                start_date: opf.start_date ? toLocalDateTimeString(opf.start_date) : '',
                end_date: opf.end_date ? toLocalDateTimeString(opf.end_date) : '',
                additional_cost: 0, // These fields aren't in the simplified structure
                additional_time: 0
              }
              return converted
            })
          } else if (orderProduct.finitions && orderProduct.finitions.length > 0) {
            // Old format - keep as is
            finitions = orderProduct.finitions
          }

          return {
            orderProductId: orderProduct.id, // Preserve unique OrderProduct ID for existing products
            productId: orderProduct.product_id,
            quantity: orderProduct.quantity || 1,
            unitPrice: orderProduct.unit_price || null,
            // Product-specific fields
            numero_pms: orderProduct.numero_pms || '',
            infograph_en_charge: orderProduct.infograph_en_charge || '',
            agent_impression: orderProduct.agent_impression || '',
            machine_impression: orderProduct.machine_impression || '',
            date_limite_livraison_estimee: orderProduct.date_limite_livraison_estimee ? 
              toLocalDateTimeString(orderProduct.date_limite_livraison_estimee) : '',
            etape: orderProduct.etape || '',
            atelier_concerne: orderProduct.atelier_concerne || '',
            estimated_work_time_minutes: orderProduct.estimated_work_time_minutes || '',
            bat: orderProduct.bat || '',
            express: orderProduct.express || '',
            pack_fin_annee: orderProduct.pack_fin_annee !== undefined ? orderProduct.pack_fin_annee.toString() : '',
            commentaires: orderProduct.commentaires || '',
            type_sous_traitance: orderProduct.type_sous_traitance || '',
            supplier_id: orderProduct.supplier_id || null,
            finitions: finitions
          }
        })
        setSelectedProducts(orderProducts)
        setCurrentStep(2) // Go directly to product step if editing
      }
    } else {
      // For new orders, automatically set the commercial to the current authenticated user
      setOrderFormData(prev => ({
        ...prev,
        commercial_en_charge: user?.username || ''
      }))
    }
  }, [order, user, selectedOrderProduct])

  // Handle click outside for finition and product search dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Handle finition search dropdowns
      Object.keys(finitionSearchStates).forEach(key => {
        const ref = finitionSearchRefs.current[key]
        if (ref && !ref.contains(event.target) && finitionSearchStates[key]?.isOpen) {
          const productIndex = parseInt(key.split('-')[1])
          closeFinitionSearch(productIndex)
        }
      })
      
      // Handle supplier search dropdowns
      Object.keys(supplierSearchStates).forEach(key => {
        const ref = supplierSearchRefs.current[key]
        if (ref && !ref.contains(event.target) && supplierSearchStates[key]?.isOpen) {
          const productIndex = parseInt(key.split('-')[1])
          closeSupplierSearch(productIndex)
        }
      })
      
      // Handle product search dropdowns
      Object.keys(productSearchStates).forEach(key => {
        const ref = productSearchRefs.current[key]
        if (ref && !ref.contains(event.target) && productSearchStates[key]?.isOpen) {
          const productIndex = parseInt(key.split('-')[2]) // product-search-{index}
          closeProductSearch(productIndex)
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [finitionSearchStates, productSearchStates, supplierSearchStates])

  // Handler functions
  const handleOrderFormChange = (field, value) => {
    setOrderFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleClientSelect = (client) => {
    setSelectedClient(client)
    if (client) {
      setOrderFormData(prev => ({
        ...prev,
        client: client.nom,
        client_id: client.id
      }))
    } else {
      setOrderFormData(prev => ({
        ...prev,
        client: '',
        client_id: null
      }))
    }
  }

  // Helper function to map atelier options to product atelier_types
  const mapAtelierToType = (atelierOption) => {
    const mapping = {
      'petit format': 'petit_format',
      'grand format': 'grand_format', 
      'sous-traitance': 'sous_traitance',
      'service crea': 'service_crea'
    }
    return mapping[atelierOption] || null
  }

  // Helper function to get filtered products based on selected atelier
  const getFilteredProducts = (selectedAtelier) => {
    if (!selectedAtelier) return []
    
    const atelierType = mapAtelierToType(selectedAtelier)
    if (!atelierType) return availableProducts
    
    // Check if the product has the selected atelier in its atelier_types array
    return availableProducts.filter(product => {
      // Handle both old single atelier_type and new multiple atelier_types
      if (product.atelier_types && Array.isArray(product.atelier_types)) {
        return product.atelier_types.includes(atelierType)
      } else if (product.atelier_type) {
        // Fallback for products that might still have the old single atelier_type
        return product.atelier_type === atelierType
      }
      return false
    })
  }

  const addProduct = () => {
    const newProduct = { 
      productId: '', 
      quantity: 1, 
      unitPrice: null, 
      // Product-specific fields
      numero_pms: '',
      infograph_en_charge: '',
      agent_impression: '',
      date_limite_livraison_estimee: orderFormData.date_limite_livraison_estimee || getTodayAt00(),
      etape: 'pré-presse',
      atelier_concerne: '',
      estimated_work_time_minutes: '',
      bat: '',
      express: '',
      pack_fin_annee: 'false',
      commentaires: '',
      type_sous_traitance: '',
      supplier_id: '',
      supplier_name: '', // For display purposes
      finitions: []
    }
    setSelectedProducts([...selectedProducts, newProduct])
  }

  const removeProduct = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index))
  }

  const updateProduct = (index, field, value) => {
    const updated = [...selectedProducts]
    updated[index] = { ...updated[index], [field]: value }
    
    // Auto-set etape based on atelier_concerne
    if (field === 'atelier_concerne') {
      if (value === 'petit format' || value === 'grand format') {
        updated[index] = { ...updated[index], etape: 'pré-presse' }
      } else if (value === 'service crea') {
        // For service crea, don't auto-set etape, let user choose between 'conception' and 'travail graphique'
        updated[index] = { ...updated[index], etape: '' }
      } else if (value === 'sous-traitance') {
        // For sous-traitance, set default etape to pré-presse
        updated[index] = { ...updated[index], etape: 'pré-presse' }
      }
      
      // Clear product search when atelier changes
      const productSearchKey = getProductSearchKey(index)
      setProductSearchStates(prev => ({
        ...prev,
        [productSearchKey]: {
          searchTerm: '',
          isOpen: false,
          filteredProducts: []
        }
      }))
    }
    
    // Update product search display name when productId changes
    if (field === 'productId') {
      const productSearchKey = getProductSearchKey(index)
      const selectedProduct = availableProducts.find(p => p.id === value)
      setProductSearchStates(prev => ({
        ...prev,
        [productSearchKey]: {
          searchTerm: selectedProduct ? selectedProduct.name : '',
          isOpen: false,
          filteredProducts: []
        }
      }))
    }
    
    setSelectedProducts(updated)
  }

  // Helper function to get available etape options based on atelier
  const getEtapeOptionsForAtelier = (atelierConcerne) => {
    if (atelierConcerne === 'petit format' || atelierConcerne === 'grand format') {
      return [
        { value: 'pré-presse', label: 'Pré-presse' },
        { value: 'impression', label: 'Impression' },
        { value: 'finition', label: 'Finition' }
      ]
    } else if (atelierConcerne === 'service crea') {
      return [
        { value: 'conception', label: 'Conception' },
        { value: 'travail graphique', label: 'Travail graphique' }
      ]
    } else if (atelierConcerne === 'sous-traitance') {
      return [
        { value: 'pré-presse', label: 'Pré-presse' },
        { value: 'en production', label: 'En production' },
        { value: 'controle qualité', label: 'Contrôle qualité' }
      ]
    }
    return etapeOptions.map(etape => ({ value: etape, label: etape }))
  }

  // Step navigation
  const goToNextStep = () => {
    if (currentStep === 1) {
      // Validate order form before proceeding
      if (!orderFormData.client) {
        setError('Veuillez sélectionner un client')
        return
      }
      setCurrentStep(2)
      setError('')
      
      // Add first product if none exist
      if (selectedProducts.length === 0) {
        addProduct()
      }
    }
  }

  const goToPreviousStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
      setError('')
    }
  }

  // Finition-related functions
  const addFinitionToProduct = (productIndex, finitionId) => {
    // Only commercial users are restricted from adding finitions
    if (user?.role === 'commercial') return
    
    const selectedProduct = availableProducts.find(p => p.id === selectedProducts[productIndex].productId)
    const finition = selectedProduct?.finitions?.find(f => f.id === parseInt(finitionId))
    if (!finition) return

    const updated = [...selectedProducts]
    const productFinitions = updated[productIndex].finitions || []
    
    if (productFinitions.some(f => f.finition_id === finition.id)) {
      return
    }

  const newFinition = {
    finition_id: finition.id,
    finition_name: finition.name,
    additional_cost: finition.productFinition?.additional_cost || 0,
    additional_time: finition.productFinition?.additional_time || 0,
    assigned_agents: [],
    start_date: null,
    end_date: null
  }

    updated[productIndex] = {
      ...updated[productIndex],
      finitions: [...productFinitions, newFinition]
    }
    setSelectedProducts(updated)
  }

  const getAvailableFinitionsForProduct = (productId) => {
    const product = availableProducts.find(p => p.id === productId)
    return product?.finitions || []
  }

  const removeFinitionFromProduct = (productIndex, finitionId) => {
    // Only commercial users are restricted from removing finitions
    if (user?.role === 'commercial') return
    
    const updated = [...selectedProducts]
    updated[productIndex] = {
      ...updated[productIndex],
      finitions: updated[productIndex].finitions.filter(f => f.finition_id !== finitionId)
    }
    setSelectedProducts(updated)
  }

  const updateProductFinition = (productIndex, finitionId, field, value) => {
    // Only commercial users are restricted from updating finitions
    if (user?.role === 'commercial') return
    
    const updated = [...selectedProducts]
    updated[productIndex] = {
      ...updated[productIndex],
      finitions: updated[productIndex].finitions.map(f => 
        f.finition_id === finitionId ? { ...f, [field]: value } : f
      )
    }
    setSelectedProducts(updated)
  }

  const updateFinitionAssignedAgents = (productIndex, finitionId, agents) => {
    updateProductFinition(productIndex, finitionId, 'assigned_agents', agents)
  }

  const updateFinitionDates = (productIndex, finitionId, startDate, endDate) => {
    const updated = [...selectedProducts]
    updated[productIndex] = {
      ...updated[productIndex],
      finitions: updated[productIndex].finitions.map(f => 
        f.finition_id === finitionId ? { 
          ...f, 
          start_date: startDate,
          end_date: endDate
        } : f
      )
    }
    setSelectedProducts(updated)
  }

  // Finition search helper functions
  const getFinitionSearchKey = (productIndex) => `product-${productIndex}`
  
  const initializeFinitionSearch = (productIndex) => {
    const key = getFinitionSearchKey(productIndex)
    if (!finitionSearchStates[key]) {
      setFinitionSearchStates(prev => ({
        ...prev,
        [key]: {
          searchTerm: '',
          isOpen: false,
          filteredFinitions: []
        }
      }))
    }
  }

  const updateFinitionSearch = (productIndex, searchTerm) => {
    const key = getFinitionSearchKey(productIndex)
    const availableFinitions = getAvailableFinitionsForProduct(selectedProducts[productIndex].productId)
    const filteredFinitions = availableFinitions
      .filter(finition => !selectedProducts[productIndex].finitions?.some(f => f.finition_id === finition.id))
      .filter(finition => finition.name.toLowerCase().includes(searchTerm.toLowerCase()))

    setFinitionSearchStates(prev => ({
      ...prev,
      [key]: {
        searchTerm,
        isOpen: true, // Always show dropdown when searching or clicking
        filteredFinitions
      }
    }))
  }

  const selectFinitionFromSearch = (productIndex, finition) => {
    const key = getFinitionSearchKey(productIndex)
    addFinitionToProduct(productIndex, finition.id)
    setFinitionSearchStates(prev => ({
      ...prev,
      [key]: {
        searchTerm: '',
        isOpen: false,
        filteredFinitions: []
      }
    }))
  }

  const closeFinitionSearch = (productIndex) => {
    const key = getFinitionSearchKey(productIndex)
    setFinitionSearchStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isOpen: false
      }
    }))
  }

  // Product search helper functions
  const getProductSearchKey = (productIndex) => `product-search-${productIndex}`
  
  const initializeProductSearch = (productIndex) => {
    const key = getProductSearchKey(productIndex)
    if (!productSearchStates[key]) {
      setProductSearchStates(prev => ({
        ...prev,
        [key]: {
          searchTerm: '',
          isOpen: false,
          filteredProducts: []
        }
      }))
    }
  }

  const updateProductSearch = (productIndex, searchTerm) => {
    const key = getProductSearchKey(productIndex)
    const product = selectedProducts[productIndex]
    
    if (!product.atelier_concerne) {
      return
    }

    const availableProducts = getFilteredProducts(product.atelier_concerne)
    const filteredProducts = availableProducts
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))

    setProductSearchStates(prev => ({
      ...prev,
      [key]: {
        searchTerm,
        isOpen: searchTerm.length > 0 || !product.productId,
        filteredProducts
      }
    }))
  }

  const selectProductFromSearch = (productIndex, productObj) => {
    const key = getProductSearchKey(productIndex)
    updateProduct(productIndex, 'productId', productObj.id)
    setProductSearchStates(prev => ({
      ...prev,
      [key]: {
        searchTerm: productObj.name,
        isOpen: false,
        filteredProducts: []
      }
    }))
  }

  const closeProductSearch = (productIndex) => {
    const key = getProductSearchKey(productIndex)
    setProductSearchStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isOpen: false
      }
    }))
  }

  const getSelectedProductName = (productIndex) => {
    const product = selectedProducts[productIndex]
    if (!product.productId) return ''
    
    const selectedProduct = availableProducts.find(p => p.id === product.productId)
    return selectedProduct ? selectedProduct.name : ''
  }

  // Supplier search helper functions
  const getSupplierSearchKey = (productIndex) => `supplier-${productIndex}`
  
  const initializeSupplierSearch = (productIndex) => {
    const key = getSupplierSearchKey(productIndex)
    if (!supplierSearchStates[key]) {
      // When initializing, use the current supplier name if one is selected
      const currentSupplierName = getSelectedSupplierName(productIndex)
      setSupplierSearchStates(prev => ({
        ...prev,
        [key]: {
          searchTerm: currentSupplierName,
          isOpen: false,
          filteredSuppliers: []
        }
      }))
    }
  }

  const updateSupplierSearch = (productIndex, searchTerm) => {
    const key = getSupplierSearchKey(productIndex)
    const product = selectedProducts[productIndex]

    // If user is typing and it doesn't match the current supplier name, clear the selection
    const currentSupplierName = getSelectedSupplierName(productIndex)
    if (searchTerm !== currentSupplierName && product.supplier_id) {
      updateProduct(productIndex, 'supplier_id', null)
    }

    const availableSuppliers = getFilteredSuppliers() // No need to pass type anymore
    const filteredSuppliers = availableSuppliers
      .filter(s => s.nom.toLowerCase().includes(searchTerm.toLowerCase()))

    setSupplierSearchStates(prev => ({
      ...prev,
      [key]: {
        searchTerm,
        isOpen: searchTerm.length > 0 || !product.supplier_id,
        filteredSuppliers
      }
    }))
  }

  const selectSupplierFromSearch = (productIndex, supplier) => {
    const key = getSupplierSearchKey(productIndex)
    updateProduct(productIndex, 'supplier_id', supplier.id)
    setSupplierSearchStates(prev => ({
      ...prev,
      [key]: {
        searchTerm: supplier.nom,
        isOpen: false,
        filteredSuppliers: []
      }
    }))
  }

  const closeSupplierSearch = (productIndex) => {
    const key = getSupplierSearchKey(productIndex)
    setSupplierSearchStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isOpen: false
      }
    }))
  }

  const getSelectedSupplierName = (productIndex) => {
    const product = selectedProducts[productIndex]
    if (!product.supplier_id) return ''
    
    // Convert supplier_id to number for comparison since it might be stored as string
    const supplierId = typeof product.supplier_id === 'string' ? parseInt(product.supplier_id) : product.supplier_id
    const selectedSupplier = availableSuppliers.find(s => s.id === supplierId)
    return selectedSupplier ? selectedSupplier.nom : ''
  }

  const getFilteredSuppliers = (typeSousTraitance) => {
    // Return all active suppliers regardless of type
    return availableSuppliers.filter(supplier => supplier.actif !== false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate client is selected or entered
    if (!selectedClient && !orderFormData.client.trim()) {
      setError('Veuillez sélectionner ou saisir un client')
      setLoading(false)
      return
    }

    // Validate that at least one product is selected
    if (selectedProducts.length === 0) {
      setError('Veuillez sélectionner au moins un produit')
      setLoading(false)
      return
    }

    // Validate that all selected products have valid data
    for (let i = 0; i < selectedProducts.length; i++) {
      const product = selectedProducts[i]
      if (!product.productId || !product.quantity || product.quantity <= 0) {
        setError(`Produit ${i + 1}: Veuillez sélectionner un produit et spécifier une quantité valide`)
        setLoading(false)
        return
      }

      // Validate required dropdown fields for visible fields
      if (visibleFields.productLevel.express && !product.express) {
        setError(`Produit ${i + 1}: Veuillez sélectionner si c'est express (oui/non)`)
        setLoading(false)
        return
      }

      if (visibleFields.productLevel.pack_fin_annee && !product.pack_fin_annee) {
        setError(`Produit ${i + 1}: Veuillez sélectionner l'option pack fin d'année (oui/non)`)
        setLoading(false)
        return
      }

      // Validate that atelier_concerne is always required (moved up for better UX)
      if (visibleFields.productLevel.atelier_concerne && !product.atelier_concerne) {
        setError(`Produit ${i + 1}: Veuillez sélectionner un atelier concerné`)
        setLoading(false)
        return
      }

      if (visibleFields.productLevel.bat && !product.bat) {
        setError(`Produit ${i + 1}: Veuillez sélectionner l'option BAT (avec/sans/valider)`)
        setLoading(false)
        return
      }

      // Validate supplier for sous-traitance products
      if (product.atelier_concerne === 'sous-traitance' && 
          visibleFields.productLevel.supplier_selection && 
          !product.supplier_id) {
        setError(`Produit ${i + 1}: Veuillez sélectionner un fournisseur pour la sous-traitance`)
        setLoading(false)
        return
      }

      // Optional: Validate atelier_concerne if required for certain roles
      // This validation is now redundant since we check above for all users
      // if (visibleFields.productLevel.atelier_concerne && user?.role !== 'commercial' && !product.atelier_concerne) {
      //   setError(`Produit ${i + 1}: Veuillez sélectionner un atelier concerné`)
      //   setLoading(false)
      //   return
      // }
    }

    try {
      // Clean up finitions data for commercial users
      const cleanProducts = selectedProducts.map(product => ({
        ...product,
        finitions: (user?.role === 'commercial') ? [] : product.finitions
      }))
      
      const submitData = {
        // Order-level data
        ...orderFormData,
        // Convert local datetime to ISO string for API
        date_limite_livraison_estimee: orderFormData.date_limite_livraison_estimee ? 
          toISOString(orderFormData.date_limite_livraison_estimee) : null,
        commercial_en_charge: orderFormData.commercial_en_charge || user?.username || '',
        client_id: selectedClient?.id || null,
        // Product data
        products: cleanProducts.map(product => ({
          ...product,
          // Convert any datetime fields in products
          date_limite_livraison_estimee: product.date_limite_livraison_estimee ? 
            toISOString(product.date_limite_livraison_estimee) : null,
          finitions: product.finitions?.map(finition => ({
            ...finition,
            start_date: finition.start_date ? toISOString(finition.start_date) : null,
            end_date: finition.end_date ? toISOString(finition.end_date) : null
          })) || []
        }))
      }
      
      if (order) {
        // Only support editing specific product orders, not entire orders
        if (selectedOrderProduct && selectedProducts.length === 1) {
          const product = selectedProducts[0];
          await orderAPI.updateOrderProduct(order.id, selectedOrderProduct.id, {
            productId: product.productId,
            quantity: product.quantity,
            unitPrice: product.unitPrice || null,
            numero_pms: product.numero_pms || null,
            infograph_en_charge: product.infograph_en_charge || null,
            agent_impression: product.agent_impression || null,
            machine_impression: product.machine_impression || null,
            etape: product.etape || null,
            atelier_concerne: product.atelier_concerne || null,
            estimated_work_time_minutes: product.estimated_work_time_minutes ? parseInt(product.estimated_work_time_minutes) : null,
            date_limite_livraison_estimee: product.date_limite_livraison_estimee ? 
              toISOString(product.date_limite_livraison_estimee) : null,
            bat: product.bat || null,
            express: product.express || null,
            pack_fin_annee: product.pack_fin_annee || null,
            commentaires: product.commentaires || null,
            type_sous_traitance: product.type_sous_traitance || null,
            supplier_id: product.supplier_id || null,
            finitions: product.finitions?.map(finition => ({
              ...finition,
              start_date: finition.start_date ? toISOString(finition.start_date) : null,
              end_date: finition.end_date ? toISOString(finition.end_date) : null
            })) || []
          });
        } else {
          throw new Error('Cette modal ne peut éditer que des produits individuels');
        }
      } else {
        await orderAPI.createOrder(submitData)
      }
      onSave()
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  // Remove old handleChange function

  // Handle backdrop click to close modal
  const handleBackdropClick = (e) => {
    // Only close if clicking on the backdrop itself, not on the modal content
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 ease-out overflow-y-auto h-full w-full z-50 animate-in fade-in"
      onClick={handleBackdropClick}
    >
      <div className="relative top-8 mx-auto p-0 w-11/12 max-w-5xl min-h-[calc(100vh-4rem)] animate-in slide-in-from-top-4 duration-500">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-3xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-8 py-6 text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">
                    {order ? 'Modifier la commande' : 'Nouvelle commande'}
                    {selectedOrderProduct && (
                      <span className="text-lg font-normal ml-2 text-blue-100">
                        - Produit sélectionné
                      </span>
                    )}
                  </h3>
                  <p className="text-blue-100 text-sm mt-1 font-medium">
                    {order ? (
                      selectedOrderProduct 
                        ? `Modification du produit "${selectedOrderProduct.productInfo?.name || selectedOrderProduct.product?.name || 'sans nom'}" - Commande ${order.numero_pms}`
                        : `Commande ${order.numero_pms}`
                    ) : (
                      'Créer une nouvelle commande dans le système'
                    )}
                  </p>
                </div>
              </div>
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

          {/* Content */}
          <div className="p-8">
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3 shadow-sm animate-in slide-in-from-top-2 duration-300">
                <div className="p-1 bg-red-100 rounded-lg">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Erreur de validation</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* Step Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    currentStep >= 1 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-500'
                  }`}>
                    {currentStep > 1 ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">1</span>
                    )}
                  </div>
                  <span className={`ml-3 text-sm font-medium ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-500'}`}>
                    Informations de la commande
                  </span>
                </div>
                
                <div className="flex-1 mx-4">
                  <div className={`h-1 rounded-full ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                </div>
                
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    currentStep >= 2 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-500'
                  }`}>
                    <span className="text-sm font-medium">2</span>
                  </div>
                  <span className={`ml-3 text-sm font-medium ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-500'}`}>
                    Informations des produits
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {currentStep === 1 && (
                /* Step 1: Order Information */
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg shadow-sm border border-blue-200">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">Informations générales de la commande</h4>
                    <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {visibleFields.orderLevel.numero_affaire && (
                      <Input
                        label="Numéro d'affaire"
                        value={orderFormData.numero_affaire}
                        onChange={(e) => handleOrderFormChange('numero_affaire', e.target.value)}
                        placeholder="Ex: AFF-2024-001"
                      />
                    )}
                    
                    {visibleFields.orderLevel.numero_dm && (
                      <Input
                        label="Numéro DM"
                        value={orderFormData.numero_dm}
                        onChange={(e) => handleOrderFormChange('numero_dm', e.target.value)}
                        placeholder="Ex: DM-2024-001"
                      />
                    )}
                    
                    {visibleFields.orderLevel.client && (
                      <div className="md:col-span-2">
                        <ClientSearch
                          onClientSelect={handleClientSelect}
                          selectedClient={selectedClient}
                        />
                      </div>
                    )}
                    
                    {visibleFields.orderLevel.date_limite_livraison_estimee && !order && (
                      <Input
                        label="Date limite de livraison estimée"
                        type="datetime-local"
                        value={orderFormData.date_limite_livraison_estimee || getTodayAt00()}
                        onChange={(e) => handleOrderFormChange('date_limite_livraison_estimee', e.target.value)}
                      />
                    )}
                    
                    {visibleFields.orderLevel.statut && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Statut de la commande
                        </label>
                        <select
                          value={orderFormData.statut}
                          onChange={(e) => handleOrderFormChange('statut', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {statusOptions.map(status => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {/* Info note about auto-populated commercial field */}
                    <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">Commercial automatiquement défini :</span> {user?.username || 'Utilisateur actuel'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Navigation buttons for Step 1 */}
                  <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      onClick={goToNextStep}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Suivant: Ajouter les produits
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                /* Step 2: Product Selection and Configuration */
                <div className="space-y-6">
                  {/* Product Selection Section */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg shadow-sm border border-green-200">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-800">
                          Sélection et configuration des produits
                          {selectedOrderProduct && (
                            <span className="text-blue-600 text-sm ml-2 font-normal">
                              (Édition du produit sélectionné uniquement)
                            </span>
                          )}
                          {user?.role === 'atelier' && (
                            <span className="text-orange-600 text-sm ml-2 font-normal">
                              (Mode lecture seule - Finitions uniquement modifiables)
                            </span>
                          )}
                        </h4>
                        <div className="flex-1 h-px bg-gradient-to-r from-green-200 to-transparent"></div>
                      </div>
                      {user?.role !== 'atelier' && !selectedOrderProduct && (
                        <button
                          type="button"
                          onClick={addProduct}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm font-medium shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Ajouter produit
                        </button>
                      )}
                    </div>

                    {productsLoading ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500">Chargement des produits...</div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedProducts.length === 0 ? (
                          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <div className="text-gray-500 mb-2">
                              {selectedOrderProduct 
                                ? "Erreur: Le produit sélectionné n'a pas pu être chargé"
                                : "Aucun produit sélectionné"
                              }
                            </div>
                            {!selectedOrderProduct && (
                              <button
                                type="button"
                                onClick={addProduct}
                                className="text-green-600 hover:text-green-700 font-medium"
                              >
                                Cliquez ici pour ajouter votre premier produit
                              </button>
                            )}
                          </div>
                        ) : (
                          selectedProducts.map((product, index) => (
                            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="font-medium text-gray-800">
                                  {selectedOrderProduct 
                                    ? `Produit sélectionné: ${selectedOrderProduct.productInfo?.name || selectedOrderProduct.product?.name || 'Produit sans nom'}`
                                    : `Produit ${index + 1}`
                                  }
                                </h5>
                                {user?.role !== 'atelier' && !selectedOrderProduct && (
                                  <button
                                    type="button"
                                    onClick={() => removeProduct(index)}
                                    className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors duration-200"
                                    title="Supprimer ce produit"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>                              {/* Atelier concerné field - moved to top and made required */}
                              {visibleFields.productLevel.atelier_concerne && user?.role !== 'atelier' && (
                                <div className="mb-6">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Atelier concerné *
                                  </label>
                                  <select
                                    value={product.atelier_concerne}
                                    onChange={(e) => {
                                      updateProduct(index, 'atelier_concerne', e.target.value)
                                      // Reset product selection when atelier changes
                                      if (product.productId) {
                                        updateProduct(index, 'productId', '')
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    required
                                  >
                                    <option value="">Sélectionner un atelier *</option>
                                    {atelierOptions.map(atelier => (
                                      <option key={atelier} value={atelier}>
                                        {atelier}
                                      </option>
                                    ))}
                                  </select>
                                  {!product.atelier_concerne && (
                                    <p className="mt-1 text-sm text-gray-500">
                                      Vous devez d'abord sélectionner un atelier pour voir les produits disponibles
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Read-only atelier field for atelier users */}
                              {user?.role === 'atelier' && (
                                <div className="mb-6">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Atelier concerné
                                  </label>
                                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                    {product.atelier_concerne || 'Non défini'}
                                  </div>
                                </div>
                              )}

                              {/* Basic Product Selection */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {/* Product field - editable for non-atelier, read-only for atelier */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Produit *
                                  </label>
                                  {user?.role === 'atelier' ? (
                                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                      {getSelectedProductName(index) || 'Non défini'}
                                    </div>
                                  ) : (
                                    <div 
                                      className="relative"
                                      ref={(el) => {
                                        if (el) {
                                          productSearchRefs.current[getProductSearchKey(index)] = el
                                        }
                                      }}
                                    >
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={productSearchStates[getProductSearchKey(index)]?.searchTerm || getSelectedProductName(index)}
                                          onChange={(e) => {
                                            if (!product.atelier_concerne) return
                                            initializeProductSearch(index)
                                            updateProductSearch(index, e.target.value)
                                          }}
                                          onFocus={() => {
                                            if (!product.atelier_concerne) return
                                            initializeProductSearch(index)
                                            updateProductSearch(index, productSearchStates[getProductSearchKey(index)]?.searchTerm || '')
                                          }}
                                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                          placeholder={!product.atelier_concerne 
                                            ? "Sélectionnez d'abord un atelier" 
                                            : "Rechercher un produit..."}
                                          disabled={!product.atelier_concerne}
                                          required
                                        />
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                          </svg>
                                        </div>
                                      </div>
                                      
                                      {/* Search Results Dropdown */}
                                      {productSearchStates[getProductSearchKey(index)]?.isOpen && 
                                       productSearchStates[getProductSearchKey(index)]?.filteredProducts.length > 0 && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                          {productSearchStates[getProductSearchKey(index)].filteredProducts.map((productObj) => (
                                            <button
                                              key={productObj.id}
                                              type="button"
                                              onClick={() => selectProductFromSearch(index, productObj)}
                                              className="w-full px-3 py-3 text-left hover:bg-green-50 hover:text-green-800 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="font-medium text-gray-900">{productObj.name}</span>
                                                <span className="text-sm text-blue-600 font-medium">
                                                  {productObj.estimated_creation_time}h
                                                </span>
                                              </div>
                                              {productObj.description && (
                                                <p className="text-sm text-gray-600 mt-1">{productObj.description}</p>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* No Results Message */}
                                      {productSearchStates[getProductSearchKey(index)]?.isOpen && 
                                       productSearchStates[getProductSearchKey(index)]?.searchTerm.length > 0 &&
                                       productSearchStates[getProductSearchKey(index)]?.filteredProducts.length === 0 && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                                          <div className="text-center text-gray-500">
                                            <svg className="w-6 h-6 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <p className="text-sm">Aucun produit trouvé pour "{productSearchStates[getProductSearchKey(index)].searchTerm}"</p>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Show all products when no search term and atelier selected */}
                                      {product.atelier_concerne && 
                                       (!productSearchStates[getProductSearchKey(index)]?.searchTerm || productSearchStates[getProductSearchKey(index)]?.searchTerm === '') &&
                                       productSearchStates[getProductSearchKey(index)]?.isOpen && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                          {getFilteredProducts(product.atelier_concerne).map((productObj) => (
                                            <button
                                              key={productObj.id}
                                              type="button"
                                              onClick={() => selectProductFromSearch(index, productObj)}
                                              className="w-full px-3 py-3 text-left hover:bg-green-50 hover:text-green-800 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="font-medium text-gray-900">{productObj.name}</span>
                                                <span className="text-sm text-blue-600 font-medium">
                                                  {productObj.estimated_creation_time}h
                                                </span>
                                              </div>
                                              {productObj.description && (
                                                <p className="text-sm text-gray-600 mt-1">{productObj.description}</p>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {product.atelier_concerne && getFilteredProducts(product.atelier_concerne).length === 0 && user?.role !== 'atelier' && (
                                    <p className="mt-1 text-sm text-orange-600">
                                      Aucun produit disponible pour l'atelier "{product.atelier_concerne}"
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Quantité *
                                  </label>
                                  {user?.role === 'atelier' ? (
                                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                      {product.quantity || 'Non définie'}
                                    </div>
                                  ) : (
                                    <input
                                      type="number"
                                      value={product.quantity}
                                      onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                      min="1"
                                      required
                                      placeholder="Ex: 1000"
                                    />
                                  )}
                                </div>
                              </div>

                              {/* Product-specific fields */}
                              <div className="border-t border-gray-200 pt-6">
                                <h6 className="text-sm font-medium text-gray-700 mb-4">
                                  Configuration spécifique du produit
                                  {user?.role === 'atelier' && (
                                    <span className="text-orange-600 text-xs ml-2 font-normal">
                                      (Lecture seule - Seules les finitions sont modifiables)
                                    </span>
                                  )}
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {/* Display read-only fields for atelier users */}
                                  {user?.role === 'atelier' && (
                                    <>
                                      {/* Read-only displays for atelier users */}
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Numéro PMS
                                        </label>
                                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                          {product.numero_pms || 'Non défini'}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Infographe en charge
                                        </label>
                                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                          {product.infograph_en_charge || 'Non assigné'}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Agent d'impression
                                        </label>
                                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                          {product.agent_impression || 'Non assigné'}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Étape
                                        </label>
                                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                          {product.etape || 'Non définie'}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Atelier concerné
                                        </label>
                                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                          {product.atelier_concerne || 'Non défini'}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Temps estimé (min)
                                        </label>
                                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                          {product.estimated_work_time_minutes || 'Non défini'}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          BAT
                                        </label>
                                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                          {product.bat || 'Non défini'}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Express
                                        </label>
                                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                          {product.express || 'Non défini'}
                                        </div>
                                      </div>
                                      
                                      {product.atelier_concerne === 'sous-traitance' && (
                                        <>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Type de sous-traitance
                                            </label>
                                            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                              {product.type_sous_traitance || 'Non défini'}
                                            </div>
                                          </div>
                                          
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Fournisseur
                                            </label>
                                            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                              {getSelectedSupplierName(index) || 'Non assigné'}
                                            </div>
                                          </div>
                                        </>
                                      )}
                                      
                                      <div className="md:col-span-2 lg:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Commentaires
                                        </label>
                                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 min-h-[6rem]">
                                          {product.commentaires || 'Aucun commentaire'}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  
                                  {/* Editable fields for non-atelier users */}
                                  {user?.role !== 'atelier' && (
                                    <>
                                      {visibleFields.productLevel.numero_pms && (
                                        <Input
                                          label="Numéro PMS"
                                          value={product.numero_pms}
                                          onChange={(e) => updateProduct(index, 'numero_pms', e.target.value)}
                                          placeholder="Ex: PMS-2024-001"
                                        />
                                      )}
                                      
                                      {visibleFields.productLevel.infograph_en_charge && (
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Infographe en charge
                                          </label>
                                          <select
                                            value={product.infograph_en_charge}
                                            onChange={(e) => updateProduct(index, 'infograph_en_charge', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                          >
                                            <option value="">Sélectionner un infographe</option>
                                            {availableUsers
                                              .filter(user => user.role === 'infograph')
                                              .map(user => (
                                                <option key={user.id} value={user.username}>
                                                  {user.username}
                                                </option>
                                              ))}
                                          </select>
                                        </div>
                                      )}
                                      
                                      {visibleFields.productLevel.agent_impression && (
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Agent d'impression
                                          </label>
                                          <select
                                            value={product.agent_impression}
                                            onChange={(e) => updateProduct(index, 'agent_impression', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                          >
                                            <option value="">Sélectionner un agent d'impression</option>
                                            {availableUsers
                                              .filter(user => user.role === 'atelier')
                                              .map(user => (
                                                <option key={user.id} value={user.username}>
                                                  {user.username}
                                                </option>
                                              ))}
                                          </select>
                                        </div>
                                      )}
                                      
                                      {visibleFields.productLevel.etape && (
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Étape
                                          </label>
                                          <select
                                            value={product.etape}
                                            onChange={(e) => updateProduct(index, 'etape', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                          >
                                            <option value="">
                                              {!product.atelier_concerne 
                                                ? "Sélectionnez d'abord un atelier" 
                                                : "Sélectionner une étape"}
                                            </option>
                                            {getEtapeOptionsForAtelier(product.atelier_concerne).map(option => (
                                              <option key={option.value} value={option.value}>
                                                {option.label}
                                              </option>
                                            ))}
                                          </select>
                                          {(product.atelier_concerne === 'petit format' || product.atelier_concerne === 'grand format') && !product.etape && (
                                            <p className="mt-1 text-sm text-blue-600">
                                              Étape par défaut: "Pré-presse". Vous pouvez changer vers "Impression" ou "Finition" selon l'avancement.
                                            </p>
                                          )}
                                          {product.atelier_concerne === 'service crea' && !product.etape && (
                                            <p className="mt-1 text-sm text-orange-600">
                                              Veuillez choisir entre "Conception" et "Travail graphique"
                                            </p>
                                          )}
                                          {product.atelier_concerne === 'sous-traitance' && !product.etape && (
                                            <p className="mt-1 text-sm text-purple-600">
                                              Étape par défaut: "Pré-presse". Vous pouvez changer vers "En production" ou "Contrôle qualité" selon l'avancement.
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      
                                      {visibleFields.productLevel.estimated_work_time_minutes && (
                                        <Input
                                          label="Temps de travail estimé (min)"
                                          type="number"
                                          value={product.estimated_work_time_minutes}
                                          onChange={(e) => updateProduct(index, 'estimated_work_time_minutes', parseInt(e.target.value) || '')}
                                          min="0"
                                          placeholder="Ex: 120"
                                        />
                                      )}
                                      
                                      {visibleFields.productLevel.bat && (
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            BAT *
                                          </label>
                                          <select
                                            value={product.bat}
                                            onChange={(e) => updateProduct(index, 'bat', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            required
                                          >
                                            <option value="">Sélectionner</option>
                                            {batOptions.map(option => (
                                              <option key={option.value} value={option.value}>
                                                {option.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                      
                                      {visibleFields.productLevel.express && (
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Express *
                                          </label>
                                          <select
                                            value={product.express}
                                            onChange={(e) => updateProduct(index, 'express', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            required
                                          >
                                            <option value="">Sélectionner</option>
                                            {expressOptions.map(option => (
                                              <option key={option.value} value={option.value}>
                                                {option.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                      
                                      {visibleFields.productLevel.pack_fin_annee && (
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Pack fin d'année *
                                          </label>
                                          <select
                                            value={product.pack_fin_annee}
                                            onChange={(e) => updateProduct(index, 'pack_fin_annee', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            required
                                          >
                                            <option value="">Sélectionner</option>
                                            <option value="true">Oui</option>
                                            <option value="false">Non</option>
                                          </select>
                                        </div>
                                      )}
                                      
                                      {visibleFields.productLevel.type_sous_traitance && product.atelier_concerne === 'sous-traitance' && user?.role !== 'atelier' && (
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Type de sous-traitance
                                          </label>
                                          <select
                                            value={product.type_sous_traitance || ''}
                                            onChange={(e) => {
                                              // Update both fields in a single state update
                                              const updated = [...selectedProducts]
                                              updated[index] = { 
                                                ...updated[index], 
                                                type_sous_traitance: e.target.value,
                                                supplier_id: '' // Reset supplier when type changes
                                              }
                                              setSelectedProducts(updated)
                                              
                                              // Reset supplier search state
                                              const supplierSearchKey = getSupplierSearchKey(index)
                                              setSupplierSearchStates(prev => ({
                                                ...prev,
                                                [supplierSearchKey]: {
                                                  searchTerm: '',
                                                  isOpen: false,
                                                  filteredSuppliers: []
                                                }
                                              }))
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            required
                                          >
                                            <option value="">Sélectionner le type</option>
                                            {typeSousTraitanceOptions.map(option => (
                                              <option key={option.value} value={option.value}>
                                                {option.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                      
                                      {visibleFields.productLevel.supplier_selection && 
                                       product.atelier_concerne === 'sous-traitance' && (
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Fournisseur *
                                          </label>
                                          <div 
                                            className="relative"
                                            ref={(el) => {
                                              if (el) {
                                                supplierSearchRefs.current[getSupplierSearchKey(index)] = el
                                              }
                                            }}
                                          >
                                            <div className="relative">
                                              <input
                                                type="text"
                                                value={supplierSearchStates[getSupplierSearchKey(index)]?.searchTerm ?? getSelectedSupplierName(index)}
                                                onChange={(e) => {
                                                  initializeSupplierSearch(index)
                                                  updateSupplierSearch(index, e.target.value)
                                                }}
                                                onFocus={() => {
                                                  initializeSupplierSearch(index)
                                                  // Only update search if there's no current search term
                                                  const currentSearchTerm = supplierSearchStates[getSupplierSearchKey(index)]?.searchTerm
                                                  if (currentSearchTerm === undefined || currentSearchTerm === null) {
                                                    updateSupplierSearch(index, getSelectedSupplierName(index))
                                                  }
                                                }}
                                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                placeholder="Rechercher un fournisseur..."
                                                required
                                              />
                                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                              </div>
                                            </div>
                                            
                                            {/* Supplier Search Results Dropdown */}
                                            {supplierSearchStates[getSupplierSearchKey(index)]?.isOpen && 
                                             supplierSearchStates[getSupplierSearchKey(index)]?.filteredSuppliers.length > 0 && (
                                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {supplierSearchStates[getSupplierSearchKey(index)].filteredSuppliers.map((supplier) => (
                                                  <button
                                                    key={supplier.id}
                                                    type="button"
                                                    onClick={() => selectSupplierFromSearch(index, supplier)}
                                                    className="w-full px-3 py-3 text-left hover:bg-green-50 hover:text-green-800 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                                  >
                                                    <div className="flex items-center justify-between">
                                                      <span className="font-medium text-gray-900">{supplier.nom}</span>
                                                      <div className="flex flex-wrap gap-1">
                                                        {supplier.specialites?.map((spec, idx) => (
                                                          <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                            {spec}
                                                          </span>
                                                        ))}
                                                      </div>
                                                    </div>
                                                    {supplier.telephone && (
                                                      <p className="text-sm text-gray-600 mt-1">📞 {supplier.telephone}</p>
                                                    )}
                                                    {supplier.email && (
                                                      <p className="text-sm text-gray-600">📧 {supplier.email}</p>
                                                    )}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                            
                                            {/* No Results Message */}
                                            {supplierSearchStates[getSupplierSearchKey(index)]?.isOpen && 
                                             supplierSearchStates[getSupplierSearchKey(index)]?.searchTerm.length > 0 &&
                                             supplierSearchStates[getSupplierSearchKey(index)]?.filteredSuppliers.length === 0 && (
                                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                                                <div className="text-center text-gray-500">
                                                  <svg className="w-6 h-6 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                  </svg>
                                                  <p className="text-sm">Aucun fournisseur trouvé pour "{supplierSearchStates[getSupplierSearchKey(index)].searchTerm}"</p>
                                                </div>
                                              </div>
                                            )}
                                            
                                            {/* Show all suppliers when no search term */}
                                            {(!supplierSearchStates[getSupplierSearchKey(index)]?.searchTerm || supplierSearchStates[getSupplierSearchKey(index)]?.searchTerm === '') &&
                                             supplierSearchStates[getSupplierSearchKey(index)]?.isOpen && (
                                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {getFilteredSuppliers().length === 0 ? (
                                                  <div className="p-4 text-center text-gray-500">
                                                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <p className="text-sm font-medium text-gray-600">Aucun fournisseur disponible</p>
                                                    <p className="text-xs text-gray-500 mt-1">Aucun fournisseur trouvé</p>
                                                  </div>
                                                ) : (
                                                  getFilteredSuppliers().map((supplier) => (
                                                    <button
                                                      key={supplier.id}
                                                      type="button"
                                                      onClick={() => selectSupplierFromSearch(index, supplier)}
                                                      className="w-full px-3 py-3 text-left hover:bg-green-50 hover:text-green-800 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                                    >
                                                      <div className="flex items-center justify-between">
                                                        <span className="font-medium text-gray-900">{supplier.nom}</span>
                                                        <div className="flex flex-wrap gap-1">
                                                          {supplier.specialites?.map((spec, idx) => (
                                                            <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                              {spec}
                                                            </span>
                                                          ))}
                                                        </div>
                                                      </div>
                                                      {supplier.telephone && (
                                                        <p className="text-sm text-gray-600 mt-1">📞 {supplier.telephone}</p>
                                                      )}
                                                      {supplier.email && (
                                                        <p className="text-sm text-gray-600">📧 {supplier.email}</p>
                                                      )}
                                                    </button>
                                                  ))
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          {getFilteredSuppliers().length === 0 && (
                                            <p className="mt-1 text-sm text-orange-600">
                                              Aucun fournisseur n'est disponible
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      
                                      {visibleFields.productLevel.commentaires && (
                                        <div className="md:col-span-2 lg:col-span-3">
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Commentaires
                                          </label>
                                          <textarea
                                            value={product.commentaires}
                                            onChange={(e) => updateProduct(index, 'commentaires', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            rows="3"
                                            placeholder="Commentaires ou instructions spéciales..."
                                          />
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                
                                {/* Finitions section */}
                                {visibleFields.productLevel.finitions && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Finitions
                                      {user?.role === 'atelier' && (
                                        <span className="text-green-600 text-sm ml-2 font-normal">
                                          (Section modifiable)
                                        </span>
                                      )}
                                    </label>
                                    {user?.role !== 'commercial' && (
                                      <div 
                                        className="relative"
                                        ref={(el) => {
                                          if (el) {
                                            finitionSearchRefs.current[getFinitionSearchKey(index)] = el
                                          }
                                        }}
                                      >
                                        <div className="relative">
                                          <input
                                            type="text"
                                            value={finitionSearchStates[getFinitionSearchKey(index)]?.searchTerm || ''}
                                            onChange={(e) => {
                                              if (!product.productId) return
                                              initializeFinitionSearch(index)
                                              updateFinitionSearch(index, e.target.value)
                                            }}
                                            onFocus={() => {
                                              if (!product.productId) return
                                              initializeFinitionSearch(index)
                                              updateFinitionSearch(index, finitionSearchStates[getFinitionSearchKey(index)]?.searchTerm || '')
                                            }}
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            placeholder={!product.productId 
                                              ? "Sélectionnez d'abord un produit" 
                                              : "Rechercher une finition..."}
                                            disabled={!product.productId}
                                          />
                                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                          </div>
                                        </div>
                                        
                                        {/* Search Results Dropdown */}
                                        {finitionSearchStates[getFinitionSearchKey(index)]?.isOpen && 
                                         finitionSearchStates[getFinitionSearchKey(index)]?.filteredFinitions.length > 0 && (
                                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {finitionSearchStates[getFinitionSearchKey(index)].filteredFinitions.map((finition) => (
                                              <button
                                                key={finition.id}
                                                type="button"
                                                onClick={() => selectFinitionFromSearch(index, finition)}
                                                className="w-full px-3 py-3 text-left hover:bg-green-50 hover:text-green-800 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                              >
                                                <div className="flex items-center justify-between">
                                                  <span className="font-medium text-gray-900">{finition.name}</span>
                                                  {finition.productFinition?.additional_cost > 0 && (
                                                    <span className="text-sm text-blue-600 font-medium">
                                                      +{finition.productFinition.additional_cost}€
                                                    </span>
                                                  )}
                                                </div>
                                                {finition.description && (
                                                  <p className="text-sm text-gray-600 mt-1">{finition.description}</p>
                                                )}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {/* No Results Message */}
                                        {finitionSearchStates[getFinitionSearchKey(index)]?.isOpen && 
                                         finitionSearchStates[getFinitionSearchKey(index)]?.searchTerm.length > 0 &&
                                         finitionSearchStates[getFinitionSearchKey(index)]?.filteredFinitions.length === 0 && (
                                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                                            <div className="text-center text-gray-500">
                                              <svg className="w-6 h-6 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                              </svg>
                                              <p className="text-sm">Aucune finition trouvée pour "{finitionSearchStates[getFinitionSearchKey(index)].searchTerm}"</p>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Show all finitions when no search term and productId selected */}
                                        {product.productId && 
                                         (!finitionSearchStates[getFinitionSearchKey(index)]?.searchTerm || finitionSearchStates[getFinitionSearchKey(index)]?.searchTerm === '') &&
                                         finitionSearchStates[getFinitionSearchKey(index)]?.isOpen && (
                                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {getAvailableFinitionsForProduct(product.productId)
                                              .filter(finition => !product.finitions?.some(f => f.finition_id === finition.id))
                                              .length === 0 ? (
                                              <div className="p-4 text-center text-gray-500">
                                                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                </svg>
                                                <p className="text-sm font-medium text-gray-600">Aucune finition disponible</p>
                                                <p className="text-xs text-gray-500 mt-1">Ce produit n'a pas de finitions configurées</p>
                                              </div>
                                            ) : (
                                              getAvailableFinitionsForProduct(product.productId)
                                                .filter(finition => !product.finitions?.some(f => f.finition_id === finition.id))
                                                .map((finition) => (
                                                <button
                                                  key={finition.id}
                                                  type="button"
                                                  onClick={() => selectFinitionFromSearch(index, finition)}
                                                  className="w-full px-3 py-3 text-left hover:bg-green-50 hover:text-green-800 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                                >
                                                  <div className="flex items-center justify-between">
                                                    <span className="font-medium text-gray-900">{finition.name}</span>
                                                    {finition.productFinition?.additional_cost > 0 && (
                                                      <span className="text-sm text-blue-600 font-medium">
                                                        +{finition.productFinition.additional_cost}€
                                                      </span>
                                                    )}
                                                  </div>
                                                  {finition.description && (
                                                    <p className="text-sm text-gray-600 mt-1">{finition.description}</p>
                                                  )}
                                                </button>
                                              ))
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {product.finitions && product.finitions.length > 0 && (
                                      <div className="mt-2 space-y-3">
                                        {product.finitions.map((finition) => (
                                          <div key={finition.finition_id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-green-800 font-medium">{finition.finition_name}</span>
                                              {user?.role !== 'commercial' && (
                                                <button
                                                  type="button"
                                                  onClick={() => removeFinitionFromProduct(index, finition.finition_id)}
                                                  className="text-red-500 hover:text-red-700"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                  </svg>
                                                </button>
                                              )}
                                            </div>
                                            
                                            {/* Assignment and Date Fields */}
                                            {user?.role !== 'commercial' && (
                                              <div className="space-y-4 mt-4">
                                                {/* Assigned Agents - Searchable Multi-Select */}
                                                <div>
                                                  <label className="block text-sm font-medium text-gray-700 mb-3">
                                                    Agents assignés
                                                  </label>
                                                  <AgentSelector
                                                    availableUsers={availableUsers.filter(user => user.role === 'atelier')}
                                                    selectedAgents={finition.assigned_agents || []}
                                                    onAgentsChange={(agents) => updateFinitionAssignedAgents(index, finition.finition_id, agents)}
                                                  />
                                                </div>
                                                
                                                {/* Date Fields */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  {/* Start Date */}
                                                  <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Date début</label>
                                                    <input
                                                      type="datetime-local"
                                                      value={finition.start_date || ''}
                                                      onChange={(e) => {
                                                        updateFinitionDates(index, finition.finition_id, e.target.value, finition.end_date)
                                                      }}
                                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                                    />
                                                  </div>
                                                  
                                                  {/* End Date / Terminé Button */}
                                                  <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
                                                    {finition.end_date ? (
                                                      <div className="flex items-center gap-2">
                                                        <input
                                                          type="datetime-local"
                                                          value={finition.end_date}
                                                          onChange={(e) => {
                                                            updateFinitionDates(index, finition.finition_id, finition.start_date, e.target.value)
                                                          }}
                                                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                                        />
                                                        <button
                                                          type="button"
                                                          onClick={() => {
                                                            updateFinitionDates(index, finition.finition_id, finition.start_date, '')
                                                          }}
                                                          className="px-3 py-2 text-gray-500 hover:text-red-600 transition-colors duration-200"
                                                          title="Réinitialiser"
                                                        >
                                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                          </svg>
                                                        </button>
                                                      </div>
                                                    ) : (
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const now = toLocalDateTimeString(new Date().toISOString())
                                                          updateFinitionDates(index, finition.finition_id, finition.start_date, now)
                                                        }}
                                                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
                                                      >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Marquer comme terminé
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Navigation buttons for Step 2 */}
                  <div className="flex justify-between pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      onClick={goToPreviousStep}
                      className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                    >
                      <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Précédent
                    </Button>
                    
                    <Button
                      type="submit"
                      disabled={loading || selectedProducts.length === 0}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Sauvegarde...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {order ? 'Mettre à jour' : 'Créer la commande'}
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </form>

          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderModal