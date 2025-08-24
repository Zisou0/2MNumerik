import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { orderAPI, productAPI, apiCall } from '../utils/api'
import Button from './ButtonComponent'
import Input from './InputComponent'
import ClientSearch from './ClientSearch'

const OrderModal = ({ order, onClose, onSave, statusOptions, atelierOptions, etapeOptions, batOptions, expressOptions }) => {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1) // 1 = Order Info, 2 = Product Info
  
  // Order-level form data
  const [orderFormData, setOrderFormData] = useState({
    numero_affaire: '',
    numero_dm: '',
    client: '',
    client_id: null,
    commercial_en_charge: '',
    date_limite_livraison_attendue: '',
    statut: 'en_cours'
  })
  
  // Product selection and product-specific data
  const [selectedProducts, setSelectedProducts] = useState([])
  const [availableProducts, setAvailableProducts] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [loading, setLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Finition search state - object with keys as `${productIndex}-${finitionId}` for each product
  const [finitionSearchStates, setFinitionSearchStates] = useState({})
  
  // Refs for click-outside functionality
  const finitionSearchRefs = useRef({})

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
          date_limite_livraison_attendue: true,
          statut: true
        },
        // Step 2: Product level fields visible to commercial
        productLevel: {
          numero_pms: false,
          infograph_en_charge: false,
          agent_impression: false,
          date_limite_livraison_estimee: false,
          etape: true,
          atelier_concerne: true,
          estimated_work_time_minutes: false,
          bat: true,
          express: true,
          pack_fin_annee: true,
          commentaires: true,
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
          date_limite_livraison_attendue: false,
          statut: true
        },
        // Step 2: Product level fields visible to infograph
        productLevel: {
          numero_pms: true,
          infograph_en_charge: true,
          agent_impression: true,
          date_limite_livraison_estimee: false,
          etape: true,
          atelier_concerne: true,
          estimated_work_time_minutes: true,
          bat: true,
          express: true,
          commentaires: true,
          finitions: true
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
          date_limite_livraison_attendue: true,
          statut: true
        },
        productLevel: {
          numero_pms: true,
          infograph_en_charge: true,
          agent_impression: true,
          date_limite_livraison_estimee: false,
          etape: true,
          atelier_concerne: true,
          estimated_work_time_minutes: true,
          bat: true,
          express: true,
          commentaires: true,
          finitions: true
        }
      }
    }
  }

  const visibleFields = getVisibleFields()

  // Fetch available products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true)
        const response = await productAPI.getProducts()
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

  useEffect(() => {
    if (order) {
      // Editing existing order
      setOrderFormData({
        numero_affaire: order.numero_affaire || '',
        numero_dm: order.numero_dm || '',
        client: order.client || '',
        client_id: order.client_id || null,
        commercial_en_charge: order.commercial_en_charge || '',
        date_limite_livraison_attendue: order.date_limite_livraison_attendue ? 
          new Date(order.date_limite_livraison_attendue).toISOString().slice(0, 16) : '',
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
        const orderProducts = order.orderProducts.map(orderProduct => {
          // Convert finitions data - handle both old and new format
          let finitions = [];
          if (orderProduct.orderProductFinitions && orderProduct.orderProductFinitions.length > 0) {
            // New format - convert to the format expected by the form
            finitions = orderProduct.orderProductFinitions.map(opf => {
              const converted = {
                finition_id: opf.finition_id,
                finition_name: opf.finition?.name || 'Finition',
                assigned_agents: opf.assigned_agents || [],
                start_date: opf.start_date ? new Date(opf.start_date).toISOString().slice(0, 16) : '',
                end_date: opf.end_date ? new Date(opf.end_date).toISOString().slice(0, 16) : '',
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
            productId: orderProduct.product_id,
            quantity: orderProduct.quantity || 1,
            unitPrice: orderProduct.unit_price || null,
            // Product-specific fields
            numero_pms: orderProduct.numero_pms || '',
            infograph_en_charge: orderProduct.infograph_en_charge || '',
            agent_impression: orderProduct.agent_impression || '',
            date_limite_livraison_estimee: orderProduct.date_limite_livraison_estimee ? 
              new Date(orderProduct.date_limite_livraison_estimee).toISOString().slice(0, 16) : '',
            etape: orderProduct.etape || '',
            atelier_concerne: orderProduct.atelier_concerne || '',
            estimated_work_time_minutes: orderProduct.estimated_work_time_minutes || '',
            bat: orderProduct.bat || '',
            express: orderProduct.express || '',
            pack_fin_annee: orderProduct.pack_fin_annee || '',
            commentaires: orderProduct.commentaires || '',
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
  }, [order, user])

  // Handle click outside for finition search dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(finitionSearchStates).forEach(key => {
        const ref = finitionSearchRefs.current[key]
        if (ref && !ref.contains(event.target) && finitionSearchStates[key]?.isOpen) {
          const productIndex = parseInt(key.split('-')[1])
          closeFinitionSearch(productIndex)
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [finitionSearchStates])

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

  // Helper function to map atelier options to product atelier_type
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
    
    return availableProducts.filter(product => product.atelier_type === atelierType)
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
      date_limite_livraison_estimee: orderFormData.date_limite_livraison_attendue || '',
      etape: 'pré-presse',
      atelier_concerne: '',
      estimated_work_time_minutes: '',
      bat: '',
      express: '',
      pack_fin_annee: '',
      commentaires: '',
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
        updated[index] = { ...updated[index], etape: 'pre-press' }
      } else if (value === 'service crea') {
        // For service crea, don't auto-set etape, let user choose between 'conception' and 'travail graphique'
        updated[index] = { ...updated[index], etape: '' }
      } else if (value === 'sous-traitance') {
        // For sous-traitance, remove etape completely
        updated[index] = { ...updated[index], etape: '' }
      }
    }
    
    setSelectedProducts(updated)
  }

  // Helper function to get available etape options based on atelier
  const getEtapeOptionsForAtelier = (atelierConcerne) => {
    if (atelierConcerne === 'petit format' || atelierConcerne === 'grand format') {
      return [
        { value: 'pre-press', label: 'Pre-press' },
        { value: 'impression', label: 'Impression' },
        { value: 'finition', label: 'Finition' }
      ]
    } else if (atelierConcerne === 'service crea') {
      return [
        { value: 'conception', label: 'Conception' },
        { value: 'travail graphique', label: 'Travail graphique' }
      ]
    } else if (atelierConcerne === 'sous-traitance') {
      return [] // No etape for sous-traitance
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
    if (user?.role === 'commercial') return
    
    const updated = [...selectedProducts]
    updated[productIndex] = {
      ...updated[productIndex],
      finitions: updated[productIndex].finitions.filter(f => f.finition_id !== finitionId)
    }
    setSelectedProducts(updated)
  }

  const updateProductFinition = (productIndex, finitionId, field, value) => {
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
        isOpen: searchTerm.length > 0,
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
        setError(`Produit ${i + 1}: Veuillez sélectionner l'option BAT (avec/sans)`)
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
        commercial_en_charge: orderFormData.commercial_en_charge || user?.username || '',
        client_id: selectedClient?.id || null,
        // Product data
        products: cleanProducts
      }
      
      if (order) {
        await orderAPI.updateOrder(order.id, submitData)
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 ease-out overflow-y-auto h-full w-full z-50 animate-in fade-in">
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
                  </h3>
                  <p className="text-blue-100 text-sm mt-1 font-medium">
                    {order ? `Commande ${order.numero_pms}` : 'Créer une nouvelle commande dans le système'}
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
                    
                    {visibleFields.orderLevel.date_limite_livraison_attendue && (
                      <Input
                        label="Date limite de livraison attendue"
                        type="datetime-local"
                        value={orderFormData.date_limite_livraison_attendue}
                        onChange={(e) => handleOrderFormChange('date_limite_livraison_attendue', e.target.value)}
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
                        <h4 className="text-lg font-semibold text-gray-800">Sélection et configuration des produits</h4>
                        <div className="flex-1 h-px bg-gradient-to-r from-green-200 to-transparent"></div>
                      </div>
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
                    </div>

                    {productsLoading ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500">Chargement des produits...</div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedProducts.length === 0 ? (
                          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <div className="text-gray-500 mb-2">Aucun produit sélectionné</div>
                            <button
                              type="button"
                              onClick={addProduct}
                              className="text-green-600 hover:text-green-700 font-medium"
                            >
                              Cliquez ici pour ajouter votre premier produit
                            </button>
                          </div>
                        ) : (
                          selectedProducts.map((product, index) => (
                            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="font-medium text-gray-800">Produit {index + 1}</h5>
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
                              </div>
                              
                              {/* Atelier concerné field - moved to top and made required */}
                              {visibleFields.productLevel.atelier_concerne && (
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

                              {/* Basic Product Selection */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Produit *
                                  </label>
                                  <select
                                    value={product.productId}
                                    onChange={(e) => updateProduct(index, 'productId', parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    required
                                    disabled={!product.atelier_concerne}
                                  >
                                    <option value="">
                                      {!product.atelier_concerne 
                                        ? "Sélectionnez d'abord un atelier" 
                                        : "Sélectionner un produit"}
                                    </option>
                                    {product.atelier_concerne && getFilteredProducts(product.atelier_concerne).map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} ({p.estimated_creation_time}h)
                                      </option>
                                    ))}
                                  </select>
                                  {product.atelier_concerne && getFilteredProducts(product.atelier_concerne).length === 0 && (
                                    <p className="mt-1 text-sm text-orange-600">
                                      Aucun produit disponible pour l'atelier "{product.atelier_concerne}"
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Quantité *
                                  </label>
                                  <input
                                    type="number"
                                    value={product.quantity}
                                    onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    min="1"
                                    required
                                    placeholder="Ex: 1000"
                                  />
                                </div>
                              </div>

                              {/* Product-specific fields */}
                              <div className="border-t border-gray-200 pt-6">
                                <h6 className="text-sm font-medium text-gray-700 mb-4">Configuration spécifique du produit</h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                  
                                  {/* Date limite estimée is now automatically populated from order's date_limite_livraison_attendue */}
                                  
                                  {visibleFields.productLevel.etape && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Étape
                                        {product.atelier_concerne === 'sous-traitance' && (
                                          <span className="text-gray-500 text-sm ml-2">(Non applicable pour sous-traitance)</span>
                                        )}
                                      </label>
                                      {product.atelier_concerne === 'sous-traitance' ? (
                                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                                          Aucune étape requise
                                        </div>
                                      ) : (
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
                                      )}
                                      {(product.atelier_concerne === 'petit format' || product.atelier_concerne === 'grand format') && !product.etape && (
                                        <p className="mt-1 text-sm text-blue-600">
                                          Étape par défaut: "Pre-press". Vous pouvez changer vers "Impression" ou "Finition" selon l'avancement.
                                        </p>
                                      )}
                                      {product.atelier_concerne === 'service crea' && !product.etape && (
                                        <p className="mt-1 text-sm text-orange-600">
                                          Veuillez choisir entre "Conception" et "Travail graphique"
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
                                </div>
                                
                                {/* Finitions section */}
                                {visibleFields.productLevel.finitions && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Finitions
                                    </label>
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
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                          {finitionSearchStates[getFinitionSearchKey(index)].filteredFinitions.map((finition) => (
                                            <button
                                              key={finition.id}
                                              type="button"
                                              onClick={() => selectFinitionFromSearch(index, finition)}
                                              className="w-full px-3 py-2 text-left hover:bg-green-50 hover:text-green-800 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="font-medium">{finition.name}</span>
                                                {finition.productFinition?.additional_cost > 0 && (
                                                  <span className="text-sm text-gray-500">
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
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                                          <div className="text-center text-gray-500">
                                            <svg className="w-6 h-6 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <p className="text-sm">Aucune finition trouvée pour "{finitionSearchStates[getFinitionSearchKey(index)].searchTerm}"</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    {product.finitions && product.finitions.length > 0 && (
                                      <div className="mt-2 space-y-3">
                                        {product.finitions.map((finition) => (
                                          <div key={finition.finition_id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-green-800 font-medium">{finition.finition_name}</span>
                                              <button
                                                type="button"
                                                onClick={() => removeFinitionFromProduct(index, finition.finition_id)}
                                                className="text-red-500 hover:text-red-700"
                                              >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                              </button>
                                            </div>
                                            
                                            {/* Assignment and Date Fields */}
                                            {user?.role !== 'commercial' && (
                                              <div className="space-y-4 mt-4">
                                                {/* Assigned Agents - Beautiful Checklist */}
                                                <div>
                                                  <label className="block text-sm font-medium text-gray-700 mb-3">
                                                    Agents assignés
                                                  </label>
                                                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                    {availableUsers.filter(user => user.role === 'atelier').length === 0 ? (
                                                      <div className="text-center py-4 text-gray-500">
                                                        <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                        </svg>
                                                        <p className="text-sm">Aucun agent d'atelier disponible</p>
                                                      </div>
                                                    ) : (
                                                      <div className="grid grid-cols-1 gap-2">
                                                        {availableUsers.filter(user => user.role === 'atelier').map(atelierUser => {
                                                          const isSelected = (finition.assigned_agents || []).includes(atelierUser.id)
                                                          return (
                                                            <label
                                                              key={atelierUser.id}
                                                              className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                                                isSelected
                                                                  ? 'bg-blue-50 border-blue-300 shadow-sm'
                                                                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                                              }`}
                                                            >
                                                              <div className="flex items-center">
                                                                <input
                                                                  type="checkbox"
                                                                  checked={isSelected}
                                                                  onChange={(e) => {
                                                                    const currentAgents = finition.assigned_agents || []
                                                                    let newAgents
                                                                    if (e.target.checked) {
                                                                      newAgents = [...currentAgents, atelierUser.id]
                                                                    } else {
                                                                      newAgents = currentAgents.filter(id => id !== atelierUser.id)
                                                                    }
                                                                    updateFinitionAssignedAgents(index, finition.finition_id, newAgents)
                                                                  }}
                                                                  className="sr-only"
                                                                />
                                                                <div className={`flex-shrink-0 w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-all duration-200 ${
                                                                  isSelected
                                                                    ? 'bg-blue-600 border-blue-600'
                                                                    : 'border-gray-300'
                                                                }`}>
                                                                  {isSelected && (
                                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                  )}
                                                                </div>
                                                                <div className="flex items-center">
                                                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                                                                    isSelected
                                                                      ? 'bg-blue-100 text-blue-700'
                                                                      : 'bg-gray-100 text-gray-600'
                                                                  }`}>
                                                                    {atelierUser.username.charAt(0).toUpperCase()}
                                                                  </div>
                                                                  <div>
                                                                    <p className={`text-sm font-medium ${
                                                                      isSelected ? 'text-blue-900' : 'text-gray-900'
                                                                    }`}>
                                                                      {atelierUser.username}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">Agent d'atelier</p>
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            </label>
                                                          )
                                                        })}
                                                      </div>
                                                    )}
                                                  </div>
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
                                                  
                                                  {/* End Date */}
                                                  <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
                                                    <input
                                                      type="datetime-local"
                                                      value={finition.end_date || ''}
                                                      onChange={(e) => {
                                                        updateFinitionDates(index, finition.finition_id, finition.start_date, e.target.value)
                                                      }}
                                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                                    />
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