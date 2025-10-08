import React, { useState, useEffect, useCallback, useRef } from 'react'
import { productAPI, finitionAPI } from '../utils/api'
import Input from '../components/InputComponent'
import Button from '../components/ButtonComponent'
import AlertDialog from '../components/AlertDialog'
import Pagination from '../components/Pagination'

const ProductsPage = () => {
  const [products, setProducts] = useState([])
  const [finitions, setFinitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showFinitionModal, setShowFinitionModal] = useState(false)
  const [showFinitionManagementModal, setShowFinitionManagementModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingFinition, setEditingFinition] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [finitionDeleteConfirm, setFinitionDeleteConfirm] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [availableFinitions, setAvailableFinitions] = useState([])
  const [productFinitions, setProductFinitions] = useState([])
  const [allFinitions, setAllFinitions] = useState([]) // Store all finitions for modal
  const [activeTab, setActiveTab] = useState('products') // 'products' or 'finitions'

  // Search states
  const [searchTerm, setSearchTerm] = useState('')
  const [finitionSearchTerm, setFinitionSearchTerm] = useState('')
  const searchTimeoutRef = useRef(null)
  const finitionSearchTimeoutRef = useRef(null)
  
  // Pagination states
  const [productsPagination, setProductsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0
  })
  const [finitionsPagination, setFinitionsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalFinitions: 0
  })

  // Helper function to format atelier type names
  const formatAtelierType = (atelierType) => {
    const atelierTypes = {
      'petit_format': 'Petit Format',
      'grand_format': 'Grand Format', 
      'sous_traitance': 'Sous-traitance',
      'service_crea': 'Service Créa',
      'pack_fin_annee': 'Pack fin d\'année'
    }
    return atelierTypes[atelierType] || 'Non assigné'
  }

  // Get atelier type badge color
  const getAtelierTypeBadgeColor = (atelierType) => {
    const colors = {
      'petit_format': 'bg-blue-100 text-blue-800',
      'grand_format': 'bg-green-100 text-green-800',
      'sous_traitance': 'bg-orange-100 text-orange-800',
      'service_crea': 'bg-purple-100 text-purple-800',
      'pack_fin_annee': 'bg-rose-100 text-rose-800'
    }
    return colors[atelierType] || 'bg-gray-100 text-gray-800'
  }
  

  
  const [formData, setFormData] = useState({
    name: '',
    estimated_creation_time: '',
    atelier_types: []
  })

  const [finitionFormData, setFinitionFormData] = useState({
    finitionId: ''
  })

  // Finition search state
  const [finitionSearchState, setFinitionSearchState] = useState({
    searchTerm: '',
    isOpen: false,
    filteredFinitions: []
  })

  const [finitionManagementData, setFinitionManagementData] = useState({
    name: '',
    description: '',
    active: true
  })

  // Load products and finitions on component mount
  useEffect(() => {
    loadProducts()
    loadFinitions()
    
    // Cleanup timeouts on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (finitionSearchTimeoutRef.current) {
        clearTimeout(finitionSearchTimeoutRef.current)
      }
    }
  }, [])

  const loadProducts = async (page = 1, search = '') => {
    try {
      if (page === 1 && search !== searchTerm) {
        setSearchLoading(true)
      } else {
        setLoading(true)
      }
      
      const params = { page, limit: 10 }
      if (search) {
        params.search = search
      }
      
      const data = await productAPI.getProducts(params)
      setProducts(data.products || [])
      setProductsPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalProducts: 0
      })
      setError('')
    } catch (err) {
      setError('Erreur lors du chargement des produits: ' + err.message)
    } finally {
      setLoading(false)
      setSearchLoading(false)
    }
  }

  const loadFinitions = async (page = 1, search = '') => {
    try {
      const params = { page, limit: 10 }
      if (search) {
        params.search = search
      }
      
      const data = await finitionAPI.getFinitions(params)
      setFinitions(data.finitions || [])
      setFinitionsPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalFinitions: 0
      })
    } catch (err) {
      console.error('Error loading finitions:', err)
    }
  }

  // Debounced search functions
  const debouncedProductSearch = useCallback((searchValue) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      loadProducts(1, searchValue)
    }, 300) // 300ms debounce delay
  }, [])

  const debouncedFinitionSearch = useCallback((searchValue) => {
    if (finitionSearchTimeoutRef.current) {
      clearTimeout(finitionSearchTimeoutRef.current)
    }
    
    finitionSearchTimeoutRef.current = setTimeout(() => {
      loadFinitions(1, searchValue)
    }, 300) // 300ms debounce delay
  }, [])

  // Search handlers
  const handleProductSearch = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    debouncedProductSearch(value)
  }

  const handleFinitionSearch = (e) => {
    const value = e.target.value
    setFinitionSearchTerm(value)
    debouncedFinitionSearch(value)
  }

  const clearProductSearch = () => {
    setSearchTerm('')
    loadProducts(1, '')
  }

  const clearFinitionSearch = () => {
    setFinitionSearchTerm('')
    loadFinitions(1, '')
  }

  // Pagination handlers
  const handleProductsPageChange = (page) => {
    loadProducts(page, searchTerm)
  }

  const handleFinitionsPageChange = (page) => {
    loadFinitions(page, finitionSearchTerm)
  }



  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handleAtelierChange = (atelierType) => {
    setFormData(prev => ({
      ...prev,
      atelier_types: prev.atelier_types.includes(atelierType)
        ? prev.atelier_types.filter(type => type !== atelierType)
        : [...prev.atelier_types, atelierType]
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      estimated_creation_time: '',
      atelier_types: []
    })
    setEditingProduct(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (editingProduct) {
        await productAPI.updateProduct(editingProduct.id, formData)
        setSuccess('Produit mis à jour avec succès')
      } else {
        await productAPI.createProduct(formData)
        setSuccess('Produit créé avec succès')
      }
      
      resetForm()
      setShowModal(false)
      loadProducts(productsPagination.currentPage, searchTerm)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      estimated_creation_time: product.estimated_creation_time,
      atelier_types: product.atelier_types || []
    })
    setShowModal(true)
  }

  const handleDelete = async (productId) => {
    try {
      await productAPI.deleteProduct(productId)
      setSuccess('Produit supprimé avec succès')
      setDeleteConfirm(null)
      loadProducts(productsPagination.currentPage, searchTerm)
    } catch (err) {
      setError('Erreur lors de la suppression: ' + err.message)
    }
  }

  const confirmDelete = (product) => {
    setDeleteConfirm(product)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openFinitionModal = async (product) => {
    setSelectedProduct(product)
    setProductFinitions(product.finitions || [])
    
    // Get all finitions for the modal (without pagination)
    try {
      const allFinitionsData = await finitionAPI.getFinitions({ limit: 1000 })
      const allFinitions = allFinitionsData.finitions || []
      setAllFinitions(allFinitions)
      
      // Get available finitions not already associated with this product
      const productFinitionIds = (product.finitions || []).map(f => f.id)
      const available = allFinitions.filter(f => !productFinitionIds.includes(f.id))
      setAvailableFinitions(available)
    } catch (err) {
      console.error('Error loading finitions for modal:', err)
      setAvailableFinitions([])
    }
    
    // Reset form and search state
    setFinitionFormData({
      finitionId: ''
    })
    setFinitionSearchState({
      searchTerm: '',
      isOpen: false,
      filteredFinitions: []
    })
    
    setShowFinitionModal(true)
  }

  const handleFinitionInputChange = (e) => {
    const { id, value } = e.target
    setFinitionFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  // Finition search helper functions
  const updateFinitionSearch = (searchTerm) => {
    const filteredFinitions = availableFinitions
      .filter(finition => finition.name.toLowerCase().includes(searchTerm.toLowerCase()))

    setFinitionSearchState({
      searchTerm,
      isOpen: true,
      filteredFinitions
    })
  }

  const selectFinitionFromSearch = (finition) => {
    setFinitionFormData({ finitionId: finition.id })
    setFinitionSearchState({
      searchTerm: finition.name,
      isOpen: false,
      filteredFinitions: []
    })
  }

  const closeFinitionSearch = () => {
    setFinitionSearchState(prev => ({
      ...prev,
      isOpen: false
    }))
  }

  const handleAddFinition = async (e) => {
    e.preventDefault()
    if (!finitionFormData.finitionId) {
      setError('Veuillez sélectionner une finition')
      return
    }

    try {
      await finitionAPI.addFinitionToProduct(
        selectedProduct.id,
        finitionFormData.finitionId
      )
      
      setSuccess('Finition ajoutée avec succès')
      loadProducts(productsPagination.currentPage, searchTerm) // Reload to get updated data
      
      // Update local state
      const addedFinition = allFinitions.find(f => f.id === parseInt(finitionFormData.finitionId))
      if (addedFinition) {
        const newFinition = {
          ...addedFinition
        }
        setProductFinitions([...productFinitions, newFinition])
        setAvailableFinitions(availableFinitions.filter(f => f.id !== parseInt(finitionFormData.finitionId)))
      }
      
      // Reset form and search state
      setFinitionFormData({
        finitionId: ''
      })
      setFinitionSearchState({
        searchTerm: '',
        isOpen: false,
        filteredFinitions: []
      })
    } catch (err) {
      setError('Erreur lors de l\'ajout de la finition: ' + err.message)
    }
  }

  const handleRemoveFinition = async (finitionId) => {
    try {
      await finitionAPI.removeFinitionFromProduct(selectedProduct.id, finitionId)
      setSuccess('Finition supprimée avec succès')
      loadProducts(productsPagination.currentPage, searchTerm) // Reload to get updated data
      
      // Update local state
      const removedFinition = productFinitions.find(f => f.id === finitionId)
      if (removedFinition) {
        setProductFinitions(productFinitions.filter(f => f.id !== finitionId))
        setAvailableFinitions([...availableFinitions, removedFinition])
      }
    } catch (err) {
      setError('Erreur lors de la suppression de la finition: ' + err.message)
    }
  }

  // Finition Management Functions
  const handleFinitionManagementInputChange = (e) => {
    const { id, value, type, checked } = e.target
    setFinitionManagementData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }))
  }

  const resetFinitionManagementForm = () => {
    setFinitionManagementData({
      name: '',
      description: '',
      active: true
    })
    setEditingFinition(null)
  }

  const handleFinitionManagementSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (editingFinition) {
        await finitionAPI.updateFinition(editingFinition.id, finitionManagementData)
        setSuccess('Finition mise à jour avec succès')
      } else {
        await finitionAPI.createFinition(finitionManagementData)
        setSuccess('Finition créée avec succès')
      }
      
      resetFinitionManagementForm()
      setShowFinitionManagementModal(false)
      loadFinitions(finitionsPagination.currentPage, finitionSearchTerm)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEditFinition = (finition) => {
    setEditingFinition(finition)
    setFinitionManagementData({
      name: finition.name,
      description: finition.description || '',
      active: finition.active
    })
    setShowFinitionManagementModal(true)
  }

  const handleDeleteFinition = async (finitionId) => {
    try {
      await finitionAPI.deleteFinition(finitionId)
      setSuccess('Finition supprimée avec succès')
      setFinitionDeleteConfirm(null)
      loadFinitions(finitionsPagination.currentPage, finitionSearchTerm)
    } catch (err) {
      setError('Erreur lors de la suppression: ' + err.message)
    }
  }

  const confirmDeleteFinition = (finition) => {
    setFinitionDeleteConfirm(finition)
  }

  const openCreateFinitionModal = () => {
    resetFinitionManagementForm()
    setShowFinitionManagementModal(true)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'finitions') {
      // Load finitions if tab is switched to 'finitions'
      loadFinitions(1, finitionSearchTerm)
    } else {
      // Load products if tab is switched to 'products'
      loadProducts(1, searchTerm)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6  mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          {activeTab === 'products' ? 'Gestion des Produits' : 'Gestion des Finitions'}
        </h1>
        <div className="flex gap-2">
          {activeTab === 'products' ? (
            <Button onClick={openCreateModal} className="w-full sm:w-auto">
              Créer un produit
            </Button>
          ) : (
            <Button onClick={openCreateFinitionModal} className="w-full sm:w-auto">
              Créer une finition
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Produits ({productsPagination.totalProducts || 0})
            </button>
            <button
              onClick={() => setActiveTab('finitions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'finitions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Finitions ({finitionsPagination.totalFinitions || 0})
            </button>
          </nav>
        </div>
      </div>

      {/* Search Bar */}
      {activeTab === 'products' ? (
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg 
                className={`h-5 w-5 transition-colors duration-200 ${searchLoading ? 'text-blue-500' : 'text-gray-400'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={handleProductSearch}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
              placeholder="Rechercher des produits..."
            />
            {searchTerm && (
              <button
                onClick={clearProductSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {searchLoading && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-600">
              {searchLoading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2"></div>
                  Recherche en cours...
                </span>
              ) : (
                <span>
                  {productsPagination.totalProducts} résultat{productsPagination.totalProducts !== 1 ? 's' : ''} 
                  pour "{searchTerm}"
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg 
                className="h-5 w-5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={finitionSearchTerm}
              onChange={handleFinitionSearch}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
              placeholder="Rechercher des finitions..."
            />
            {finitionSearchTerm && (
              <button
                onClick={clearFinitionSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {finitionSearchTerm && (
            <div className="mt-2 text-sm text-gray-600">
              <span>
                {finitionsPagination.totalFinitions} résultat{finitionsPagination.totalFinitions !== 1 ? 's' : ''} 
                pour "{finitionSearchTerm}"
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">
          {success}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-4">
        <button
          onClick={() => handleTabChange('products')}
          className={`px-4 py-2 text-sm font-medium rounded-l-md transition-all duration-200 ${
            activeTab === 'products'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Produits
        </button>
        <button
          onClick={() => handleTabChange('finitions')}
          className={`px-4 py-2 text-sm font-medium rounded-r-md transition-all duration-200 ${
            activeTab === 'finitions'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Finitions
        </button>
      </div>

      {/* Products Table - Desktop View */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="hidden lg:block bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom du produit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Temps de création estimé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Finitions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date de création
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.estimated_creation_time} heures
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.atelier_types && product.atelier_types.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.atelier_types.map((atelierType) => (
                          <span 
                            key={atelierType}
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getAtelierTypeBadgeColor(atelierType)}`}
                          >
                            {formatAtelierType(atelierType)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                        Non assigné
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.finitions && product.finitions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.finitions.slice(0, 3).map((finition) => (
                          <span 
                            key={finition.id} 
                            className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800"
                          >
                            {finition.name}
                          </span>
                        ))}
                        {product.finitions.length > 3 && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                            +{product.finitions.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">Aucune finition</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(product.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-3 py-1 rounded transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => openFinitionModal(product)}
                      className="text-purple-600 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-3 py-1 rounded transition-colors"
                    >
                      Finitions
                    </button>
                    <button
                      onClick={() => confirmDelete(product)}
                      className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded transition-colors"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {products.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun produit trouvé</h3>
                  <p className="text-gray-500">Aucun produit ne correspond à votre recherche "{searchTerm}"</p>
                  <button
                    onClick={clearProductSearch}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Effacer la recherche
                  </button>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun produit</h3>
                  <p className="text-gray-500">Commencez par créer votre premier produit</p>
                </div>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {productsPagination.totalPages > 1 && (
            <Pagination
              currentPage={productsPagination.currentPage}
              totalPages={productsPagination.totalPages}
              onPageChange={handleProductsPageChange}
              totalItems={productsPagination.totalProducts}
            />
          )}
        </div>
        </div>
      )}

      {/* Products Cards - Mobile/Tablet View */}
      {activeTab === 'products' && (
        <div className="lg:hidden space-y-4">
          {products.map((product) => (
            <div key={product.id} className="bg-white shadow-md rounded-lg p-4 border">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {product.estimated_creation_time}h
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">ID:</span> {product.id}</p>
                    <p><span className="font-medium">Temps estimé:</span> {product.estimated_creation_time} heures</p>
                    <p><span className="font-medium">Tags:</span> 
                      {product.atelier_types && product.atelier_types.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.atelier_types.map((atelierType) => (
                            <span 
                              key={atelierType}
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getAtelierTypeBadgeColor(atelierType)}`}
                            >
                              {formatAtelierType(atelierType)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="ml-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                          Non assigné
                        </span>
                      )}
                    </p>
                    <p><span className="font-medium">Créé le:</span> {new Date(product.createdAt).toLocaleDateString('fr-FR')}</p>
                    <div>
                      <span className="font-medium">Finitions:</span>
                      {product.finitions && product.finitions.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.finitions.map((finition) => (
                            <span 
                              key={finition.id} 
                              className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800"
                            >
                              {finition.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="ml-1 text-gray-500">Aucune finition</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                <button
                  onClick={() => handleEdit(product)}
                  className="flex-1 text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-4 py-2 rounded transition-colors text-center text-sm font-medium"
                >
                  Modifier
                </button>
                <button
                  onClick={() => openFinitionModal(product)}
                  className="flex-1 text-purple-600 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-4 py-2 rounded transition-colors text-center text-sm font-medium"
                >
                  Finitions
                </button>
                <button
                  onClick={() => confirmDelete(product)}
                  className="flex-1 text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-4 py-2 rounded transition-colors text-center text-sm font-medium"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
          
          {products.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
              {searchTerm ? (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun produit trouvé</h3>
                  <p className="text-gray-500">Aucun produit ne correspond à votre recherche "{searchTerm}"</p>
                  <button
                    onClick={clearProductSearch}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Effacer la recherche
                  </button>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun produit</h3>
                  <p className="text-gray-500">Commencez par créer votre premier produit</p>
                </div>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {productsPagination.totalPages > 1 && (
            <Pagination
              currentPage={productsPagination.currentPage}
              totalPages={productsPagination.totalPages}
              onPageChange={handleProductsPageChange}
              totalItems={productsPagination.totalProducts}
            />
          )}
        </div>
      )}

      {/* Finitions Table - Desktop View */}
      {activeTab === 'finitions' && (
        <div className="space-y-4">
          <div className="hidden lg:block bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom de la finition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actif
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {finitions.map((finition) => (
                <tr key={finition.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {finition.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {finition.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {finition.active ? 'Oui' : 'Non'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditFinition(finition)}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-3 py-1 rounded transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => confirmDeleteFinition(finition)}
                      className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded transition-colors"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {finitions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {finitionSearchTerm ? (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune finition trouvée</h3>
                  <p className="text-gray-500">Aucune finition ne correspond à votre recherche "{finitionSearchTerm}"</p>
                  <button
                    onClick={clearFinitionSearch}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Effacer la recherche
                  </button>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune finition</h3>
                  <p className="text-gray-500">Commencez par créer votre première finition</p>
                </div>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {finitionsPagination.totalPages > 1 && (
            <Pagination
              currentPage={finitionsPagination.currentPage}
              totalPages={finitionsPagination.totalPages}
              onPageChange={handleFinitionsPageChange}
              totalItems={finitionsPagination.totalFinitions}
            />
          )}
        </div>
        </div>
      )}

      {/* Finitions Cards - Mobile/Tablet View */}
      {activeTab === 'finitions' && (
        <div className="lg:hidden space-y-4">
          {finitions.map((finition) => (
            <div key={finition.id} className="bg-white shadow-md rounded-lg p-4 border">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{finition.name}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      finition.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {finition.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">ID:</span> {finition.id}</p>
                    <p><span className="font-medium">Actif:</span> {finition.active ? 'Oui' : 'Non'}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                <button
                  onClick={() => handleEditFinition(finition)}
                  className="flex-1 text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-4 py-2 rounded transition-colors text-center text-sm font-medium"
                >
                  Modifier
                </button>
                <button
                  onClick={() => confirmDeleteFinition(finition)}
                  className="flex-1 text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-4 py-2 rounded transition-colors text-center text-sm font-medium"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
          
          {finitions.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
              {finitionSearchTerm ? (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune finition trouvée</h3>
                  <p className="text-gray-500">Aucune finition ne correspond à votre recherche "{finitionSearchTerm}"</p>
                  <button
                    onClick={clearFinitionSearch}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Effacer la recherche
                  </button>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune finition</h3>
                  <p className="text-gray-500">Commencez par créer votre première finition</p>
                </div>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {finitionsPagination.totalPages > 1 && (
            <Pagination
              currentPage={finitionsPagination.currentPage}
              totalPages={finitionsPagination.totalPages}
              onPageChange={handleFinitionsPageChange}
              totalItems={finitionsPagination.totalFinitions}
            />
          )}
        </div>
      )}

      {/* Create/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 transition-opacity duration-200 ease-out overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto p-5 w-full max-w-md sm:max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProduct ? 'Modifier le produit' : 'Créer un produit'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nom du produit"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Entrez le nom du produit"
                  required
                />
                
                <Input
                  label="Temps de création estimé (heures)"
                  type="number"
                  id="estimated_creation_time"
                  value={formData.estimated_creation_time}
                  onChange={handleInputChange}
                  placeholder="Entrez le temps estimé en heures"
                  required
                  min="0"
                  step="0.1"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tags
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'petit_format', label: 'Petit Format' },
                      { value: 'grand_format', label: 'Grand Format' },
                      { value: 'sous_traitance', label: 'Sous-traitance' },
                      { value: 'service_crea', label: 'Service Créa' },
                      { value: 'pack_fin_annee', label: 'Pack fin d\'année' }
                    ].map((atelier) => (
                      <label key={atelier.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.atelier_types.includes(atelier.value)}
                          onChange={() => handleAtelierChange(atelier.value)}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{atelier.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="submit" className="flex-1 order-2 sm:order-1">
                    {editingProduct ? 'Mettre à jour' : 'Créer'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="flex-1 order-1 sm:order-2"
                    onClick={() => setShowModal(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Finition Management Modal */}
      {showFinitionModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/30 transition-opacity duration-200 ease-out overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto p-5 w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Finitions pour "{selectedProduct.name}"
              </h3>
              
              {/* Current Finitions */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-3">Finitions actuelles</h4>
                {productFinitions.length > 0 ? (
                  <div className="space-y-2">
                    {productFinitions.map((finition) => (
                      <div key={finition.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                              {finition.name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRemoveFinition(finition.id)}
                            className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded transition-colors text-sm"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Aucune finition associée à ce produit</p>
                )}
              </div>

              {/* Add New Finition */}
              {availableFinitions.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Ajouter une finition</h4>
                  <form onSubmit={handleAddFinition} className="space-y-4">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Finition
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={finitionSearchState.searchTerm}
                          onChange={(e) => updateFinitionSearch(e.target.value)}
                          onFocus={() => updateFinitionSearch(finitionSearchState.searchTerm || '')}
                          onBlur={() => setTimeout(closeFinitionSearch, 200)} // Delay to allow click on dropdown
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Rechercher une finition..."
                          required={!finitionFormData.finitionId}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Search Results Dropdown */}
                      {finitionSearchState.isOpen && finitionSearchState.filteredFinitions.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {finitionSearchState.filteredFinitions.map((finition) => (
                            <button
                              key={finition.id}
                              type="button"
                              onClick={() => selectFinitionFromSearch(finition)}
                              className="w-full px-3 py-3 text-left hover:bg-blue-50 hover:text-blue-800 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">{finition.name}</span>
                              </div>
                              {finition.description && (
                                <p className="text-sm text-gray-600 mt-1">{finition.description}</p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* No Results Message */}
                      {finitionSearchState.isOpen && 
                       finitionSearchState.searchTerm.length > 0 &&
                       finitionSearchState.filteredFinitions.length === 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                          <div className="text-center text-gray-500">
                            <svg className="w-6 h-6 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p className="text-sm">Aucune finition trouvée pour "{finitionSearchState.searchTerm}"</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Show all finitions when no search term */}
                      {(!finitionSearchState.searchTerm || finitionSearchState.searchTerm === '') &&
                       finitionSearchState.isOpen && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {availableFinitions.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              <p className="text-sm font-medium text-gray-600">Aucune finition disponible</p>
                              <p className="text-xs text-gray-500 mt-1">Toutes les finitions sont déjà ajoutées</p>
                            </div>
                          ) : (
                            availableFinitions.map((finition) => (
                              <button
                                key={finition.id}
                                type="button"
                                onClick={() => selectFinitionFromSearch(finition)}
                                className="w-full px-3 py-3 text-left hover:bg-blue-50 hover:text-blue-800 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-900">{finition.name}</span>
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
                    
                    <Button type="submit" className="w-full">
                      Ajouter la finition
                    </Button>
                  </form>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setShowFinitionModal(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finition Management Modal */}
      {showFinitionManagementModal && (
        <div className="fixed inset-0 bg-black/30 transition-opacity duration-200 ease-out overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto p-5 w-full max-w-md sm:max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingFinition ? 'Modifier la finition' : 'Créer une finition'}
              </h3>
              
              <form onSubmit={handleFinitionManagementSubmit} className="space-y-4">
                <Input
                  label="Nom de la finition"
                  id="name"
                  value={finitionManagementData.name}
                  onChange={(e) => setFinitionManagementData({ ...finitionManagementData, name: e.target.value })}
                  placeholder="Entrez le nom de la finition"
                  required
                />
                
                <Input
                  label="Description"
                  id="description"
                  value={finitionManagementData.description}
                  onChange={(e) => setFinitionManagementData({ ...finitionManagementData, description: e.target.value })}
                  placeholder="Entrez une description de la finition"
                  required
                />

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={finitionManagementData.active}
                    onChange={(e) => setFinitionManagementData({ ...finitionManagementData, active: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="active" className="text-sm text-gray-700">
                    Actif
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="submit" className="flex-1 order-2 sm:order-1">
                    {editingFinition ? 'Mettre à jour' : 'Créer'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="flex-1 order-1 sm:order-2"
                    onClick={() => setShowFinitionManagementModal(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <AlertDialog
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          title="Confirmer la suppression"
          message={`Êtes-vous sûr de vouloir supprimer le produit "${deleteConfirm.name}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}

      {/* Finition Delete Confirmation Modal */}
      {finitionDeleteConfirm && (
        <AlertDialog
          isOpen={true}
          onClose={() => setFinitionDeleteConfirm(null)}
          onConfirm={() => handleDeleteFinition(finitionDeleteConfirm.id)}
          title="Confirmer la suppression"
          message={`Êtes-vous sûr de vouloir supprimer la finition "${finitionDeleteConfirm.name}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}
    </div>
  )
}

export default ProductsPage
