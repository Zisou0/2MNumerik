import React, { useState, useEffect } from 'react'
import { productAPI, finitionAPI } from '../utils/api'
import Input from '../components/InputComponent'
import Button from '../components/ButtonComponent'
import AlertDialog from '../components/AlertDialog'
import Pagination from '../components/Pagination'

const ProductsPage = () => {
  const [products, setProducts] = useState([])
  const [finitions, setFinitions] = useState([])
  const [loading, setLoading] = useState(true)
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
  

  
  const [formData, setFormData] = useState({
    name: '',
    estimated_creation_time: ''
  })

  const [finitionFormData, setFinitionFormData] = useState({
    finitionId: '',
    is_default: false,
    additional_cost: 0,
    additional_time: 0
  })

  const [finitionManagementData, setFinitionManagementData] = useState({
    name: '',
    description: '',
    price_modifier: 0,
    time_modifier: 0,
    active: true
  })

  // Load products and finitions on component mount
  useEffect(() => {
    loadProducts()
    loadFinitions()
  }, [])

  const loadProducts = async (page = 1) => {
    try {
      setLoading(true)
      const params = { page, limit: 10 }
      
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
    }
  }

  const loadFinitions = async (page = 1) => {
    try {
      const params = { page, limit: 10 }
      
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

  // Pagination handlers
  const handleProductsPageChange = (page) => {
    loadProducts(page)
  }

  const handleFinitionsPageChange = (page) => {
    loadFinitions(page)
  }



  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      estimated_creation_time: ''
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
      loadProducts(productsPagination.currentPage)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      estimated_creation_time: product.estimated_creation_time
    })
    setShowModal(true)
  }

  const handleDelete = async (productId) => {
    try {
      await productAPI.deleteProduct(productId)
      setSuccess('Produit supprimé avec succès')
      setDeleteConfirm(null)
      loadProducts(productsPagination.currentPage)
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
    
    // Reset form
    setFinitionFormData({
      finitionId: '',
      is_default: false,
      additional_cost: 0,
      additional_time: 0
    })
    
    setShowFinitionModal(true)
  }

  const handleFinitionInputChange = (e) => {
    const { id, value, type, checked } = e.target
    setFinitionFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
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
        finitionFormData.finitionId,
        {
          is_default: finitionFormData.is_default,
          additional_cost: parseFloat(finitionFormData.additional_cost) || 0,
          additional_time: parseInt(finitionFormData.additional_time) || 0
        }
      )
      
      setSuccess('Finition ajoutée avec succès')
      loadProducts(productsPagination.currentPage) // Reload to get updated data
      
      // Update local state
      const addedFinition = allFinitions.find(f => f.id === parseInt(finitionFormData.finitionId))
      if (addedFinition) {
        const newFinition = {
          ...addedFinition,
          productFinition: {
            is_default: finitionFormData.is_default,
            additional_cost: parseFloat(finitionFormData.additional_cost) || 0,
            additional_time: parseInt(finitionFormData.additional_time) || 0
          }
        }
        setProductFinitions([...productFinitions, newFinition])
        setAvailableFinitions(availableFinitions.filter(f => f.id !== parseInt(finitionFormData.finitionId)))
      }
      
      // Reset form
      setFinitionFormData({
        finitionId: '',
        is_default: false,
        additional_cost: 0,
        additional_time: 0
      })
    } catch (err) {
      setError('Erreur lors de l\'ajout de la finition: ' + err.message)
    }
  }

  const handleRemoveFinition = async (finitionId) => {
    try {
      await finitionAPI.removeFinitionFromProduct(selectedProduct.id, finitionId)
      setSuccess('Finition supprimée avec succès')
      loadProducts(productsPagination.currentPage) // Reload to get updated data
      
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

  const toggleDefaultFinition = async (finitionId, currentDefault) => {
    try {
      await finitionAPI.updateProductFinition(
        selectedProduct.id,
        finitionId,
        { is_default: !currentDefault }
      )
      setSuccess('Finition mise à jour avec succès')
      loadProducts(productsPagination.currentPage) // Reload to get updated data
      
      // Update local state
      setProductFinitions(productFinitions.map(f => ({
        ...f,
        productFinition: {
          ...f.productFinition,
          is_default: f.id === finitionId ? !currentDefault : false
        }
      })))
    } catch (err) {
      setError('Erreur lors de la mise à jour de la finition: ' + err.message)
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
      price_modifier: 0,
      time_modifier: 0,
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
      loadFinitions(finitionsPagination.currentPage)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEditFinition = (finition) => {
    setEditingFinition(finition)
    setFinitionManagementData({
      name: finition.name,
      description: finition.description || '',
      price_modifier: finition.price_modifier || 0,
      time_modifier: finition.time_modifier || 0,
      active: finition.active
    })
    setShowFinitionManagementModal(true)
  }

  const handleDeleteFinition = async (finitionId) => {
    try {
      await finitionAPI.deleteFinition(finitionId)
      setSuccess('Finition supprimée avec succès')
      setFinitionDeleteConfirm(null)
      loadFinitions(finitionsPagination.currentPage)
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
      loadFinitions(1)
    } else {
      // Load products if tab is switched to 'products'
      loadProducts(1)
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
                    {product.finitions && product.finitions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.finitions.slice(0, 3).map((finition) => (
                          <span 
                            key={finition.id} 
                            className={`px-2 py-1 text-xs rounded-full ${
                              finition.productFinition?.is_default 
                                ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                                : 'bg-gray-100 text-gray-800'
                            }`}
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
            <div className="text-center py-8 text-gray-500">
              Aucun produit trouvé
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
                    <p><span className="font-medium">Créé le:</span> {new Date(product.createdAt).toLocaleDateString('fr-FR')}</p>
                    <div>
                      <span className="font-medium">Finitions:</span>
                      {product.finitions && product.finitions.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.finitions.map((finition) => (
                            <span 
                              key={finition.id} 
                              className={`px-2 py-1 text-xs rounded-full ${
                                finition.productFinition?.is_default 
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}
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
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
              Aucun produit trouvé
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
                  Coût additionnel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Temps additionnel
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
                    {finition.price_modifier}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {finition.time_modifier} min
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
            <div className="text-center py-8 text-gray-500">
              Aucune finition trouvée
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
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {finition.price_modifier}€
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">ID:</span> {finition.id}</p>
                    <p><span className="font-medium">Coût additionnel:</span> {finition.price_modifier}€</p>
                    <p><span className="font-medium">Temps additionnel:</span> {finition.time_modifier} min</p>
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
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
              Aucune finition trouvée
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
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              finition.productFinition?.is_default 
                                ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {finition.name}
                            </span>
                            {finition.productFinition?.is_default && (
                              <span className="ml-2 text-xs text-blue-600 font-medium">Par défaut</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {finition.productFinition?.additional_cost > 0 && (
                              <span className="mr-3">+{finition.productFinition.additional_cost}€</span>
                            )}
                            {finition.productFinition?.additional_time > 0 && (
                              <span>+{finition.productFinition.additional_time}min</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleDefaultFinition(finition.id, finition.productFinition?.is_default)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              finition.productFinition?.is_default
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {finition.productFinition?.is_default ? 'Retirer défaut' : 'Définir défaut'}
                          </button>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Finition
                        </label>
                        <select
                          id="finitionId"
                          value={finitionFormData.finitionId}
                          onChange={handleFinitionInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Sélectionner une finition</option>
                          {availableFinitions.map((finition) => (
                            <option key={finition.id} value={finition.id}>
                              {finition.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_default"
                          checked={finitionFormData.is_default}
                          onChange={handleFinitionInputChange}
                          className="mr-2"
                        />
                        <label htmlFor="is_default" className="text-sm text-gray-700">
                          Par défaut
                        </label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Coût additionnel (€)"
                        type="number"
                        id="additional_cost"
                        value={finitionFormData.additional_cost}
                        onChange={handleFinitionInputChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                      <Input
                        label="Temps additionnel (min)"
                        type="number"
                        id="additional_time"
                        value={finitionFormData.additional_time}
                        onChange={handleFinitionInputChange}
                        placeholder="0"
                        min="0"
                      />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Modificateur de prix (€)"
                    type="number"
                    id="price_modifier"
                    value={finitionManagementData.price_modifier}
                    onChange={(e) => setFinitionManagementData({ ...finitionManagementData, price_modifier: parseFloat(e.target.value) })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <Input
                    label="Modificateur de temps (min)"
                    type="number"
                    id="time_modifier"
                    value={finitionManagementData.time_modifier}
                    onChange={(e) => setFinitionManagementData({ ...finitionManagementData, time_modifier: parseInt(e.target.value) })}
                    placeholder="0"
                    min="0"
                  />
                </div>

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
