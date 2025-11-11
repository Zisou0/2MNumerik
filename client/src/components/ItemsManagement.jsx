import { useState, useEffect } from 'react'
import AlertDialog from './AlertDialog'

const API_BASE_URL = 'http://localhost:3001/api'

function ItemsManagement() {
  const [items, setItems] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' or 'edit'
  const [selectedItem, setSelectedItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Pagination and search states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10 // Hardcoded to 10 items per page
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('DESC')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  
  // Stock levels state for selected locations and their minimum quantities
  const [selectedStockLevels, setSelectedStockLevels] = useState([])
  
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

  // Helper function to get location icon
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

  // Helper function to get location color scheme
  const getLocationColorScheme = (type) => {
    const colorSchemes = {
      'main_depot': 'bg-blue-100 text-blue-800 border-blue-200',
      'workshop': 'bg-orange-100 text-orange-800 border-orange-200',
      'store': 'bg-green-100 text-green-800 border-green-200',
      'supplier': 'bg-purple-100 text-purple-800 border-purple-200',
      'customer': 'bg-pink-100 text-pink-800 border-pink-200'
    }
    return colorSchemes[type] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  // Helper function to format locations display
  const formatLocationsDisplay = (stockLevels) => {
    if (!stockLevels || stockLevels.length === 0) {
      return { text: 'Aucun emplacement', isEmpty: true }
    }

    const locations = stockLevels.map(sl => ({
      icon: getLocationIcon(sl.location.type),
      name: sl.location.name,
      type: getLocationTypeLabel(sl.location.type),
      colorScheme: getLocationColorScheme(sl.location.type)
    }))

    return { locations, isEmpty: false }
  }

  // Fetch items from API
  const fetchItems = async (page = currentPage, search = searchTerm) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10', // Hardcoded to 10
        sortBy,
        sortOrder,
        ...(search && { search })
      })
      
      const response = await fetch(`${API_BASE_URL}/items?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch items')
      }

      const data = await response.json()
      console.log('API Response:', data) // Debug log
      setItems(data.items)
      setTotalItems(data.totalCount) // Backend uses 'totalCount', not 'totalItems'
      setTotalPages(data.totalPages)
      setCurrentPage(page)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch locations from API
  const fetchLocations = async () => {
    try {
      console.log('Fetching locations from:', `${API_BASE_URL}/locations`)
      const response = await fetch(`${API_BASE_URL}/locations`)
      if (!response.ok) {
        throw new Error('Failed to fetch locations')
      }

      const data = await response.json()
      console.log('Locations API Response:', data)
      setLocations(data.locations || [])
    } catch (err) {
      console.error('Error fetching locations:', err)
      // Don't set error state here as this shouldn't block the main functionality
    }
  }

  // Create new item
  const createItem = async () => {
    try {
      // Prepare request body with stock levels
      const requestBody = {
        ...formData,
        stockLevels: selectedStockLevels.map(sl => ({
          location_id: sl.locationId,
          minimum_quantity: sl.minimumQuantity
        }))
      }

      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create item')
      }

      await fetchItems()
      closeModal()
    } catch (err) {
      setError(err.message)
    }
  }

  // Update item
  const updateItem = async () => {
    try {
      // Prepare request body with stock levels
      const requestBody = {
        ...formData,
        stockLevels: selectedStockLevels.map(sl => ({
          location_id: sl.locationId,
          minimum_quantity: sl.minimumQuantity,
          quantity: sl.currentQuantity || 0 // Preserve current quantity if available
        }))
      }

      const response = await fetch(`${API_BASE_URL}/items/${selectedItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update item')
      }

      await fetchItems()
      closeModal()
    } catch (err) {
      setError(err.message)
    }
  }

  // Delete item
  const handleDeleteClick = (item) => {
    setDeleteConfirm(item)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      const response = await fetch(`${API_BASE_URL}/items/${deleteConfirm.id}`, {
        method: 'DELETE',
        credentials: 'include' // Include cookies
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete item')
      }

      await fetchItems()
      setDeleteConfirm(null)
    } catch (err) {
      setError(err.message)
      setDeleteConfirm(null)
    }
  }

  // Modal management
  const openCreateModal = () => {
    setModalMode('create')
    setSelectedItem(null)
    setFormData({ name: '', description: '' })
    
    // Initialize all locations with default minimum quantity of 0
    const allLocationStockLevels = locations.map(location => ({
      locationId: location.id.toString(),
      minimumQuantity: 0
    }))
    setSelectedStockLevels(allLocationStockLevels)
    setShowModal(true)
  }

  const openEditModal = async (item) => {
    setModalMode('edit')
    setSelectedItem(item)
    setFormData({
      name: item.name,
      description: item.description || ''
    })
    
    // Fetch full item details including stock levels
    try {
      const response = await fetch(`${API_BASE_URL}/items/${item.id}`)
      if (response.ok) {
        const itemDetails = await response.json()
        // Convert stock levels to the format used by the form
        const stockLevels = (itemDetails.stockLevels || []).map(sl => ({
          locationId: sl.location_id.toString(),
          minimumQuantity: sl.minimum_quantity,
          currentQuantity: sl.quantity // Store current quantity for reference
        }))
        setSelectedStockLevels(stockLevels)
      } else {
        // If we can't fetch details, just set empty stock levels
        setSelectedStockLevels([])
      }
    } catch (err) {
      console.error('Error fetching item details:', err)
      setSelectedStockLevels([])
    }
    
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedItem(null)
    setFormData({ name: '', description: '' })
    setSelectedStockLevels([])
  }

  // Pagination handlers
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchItems(page, searchTerm)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchItems(1, searchTerm) // Reset to page 1 when searching
  }

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value)
    if (e.target.value === '') {
      fetchItems(1, '') // Reset search when input is cleared
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (modalMode === 'create') {
      createItem()
    } else {
      updateItem()
    }
  }

  // Stock level management functions
  const addStockLevel = () => {
    setSelectedStockLevels([...selectedStockLevels, { 
      locationId: '', 
      minimumQuantity: 0 
    }])
  }

  const removeStockLevel = (index) => {
    setSelectedStockLevels(selectedStockLevels.filter((_, i) => i !== index))
  }

  const updateStockLevel = (index, field, value) => {
    const updated = [...selectedStockLevels]
    updated[index] = { ...updated[index], [field]: value }
    setSelectedStockLevels(updated)
  }

  const getAvailableLocations = (currentIndex) => {
    const selectedLocationIds = selectedStockLevels
      .map((sl, index) => index !== currentIndex ? sl.locationId : null)
      .filter(id => id !== null && id !== '')
    
    return locations.filter(location => 
      !selectedLocationIds.includes(location.id.toString()) || 
      // Include the current location being edited
      location.id.toString() === selectedStockLevels[currentIndex]?.locationId
    )
  }

  // Load items on component mount
  useEffect(() => {
    fetchItems()
    fetchLocations()
  }, []) // Empty dependency array for initial load

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00AABB]"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Gestion des Articles</h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalItems} article(s) disponible(s)
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#00AABB] text-white px-4 py-2 rounded-lg hover:bg-[#008899] transition-colors flex items-center"
        >
          <span className="mr-2">+</span>
          Nouvel Article
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={handleSearchInputChange}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#00AABB] text-white rounded-md hover:bg-[#008899] transition-colors"
          >
            Rechercher
          </button>
        </form>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Items table */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl">📦</span>
          <p className="text-gray-500 mt-4">Aucun article trouvé</p>
          <p className="text-sm text-gray-400 mt-2">Créez votre premier article pour commencer</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emplacements
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date de création
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => {
                const locationDisplay = formatLocationsDisplay(item.stockLevels)
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{item.name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-700 max-w-xs truncate">
                        {item.description || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {locationDisplay.isEmpty ? (
                        <span className="text-sm text-gray-400 italic">
                          {locationDisplay.text}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {locationDisplay.locations.map((location, index) => (
                            <span 
                              key={index}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${location.colorScheme}`}
                            >
                              <span className="mr-1">{location.icon}</span>
                              {location.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {new Date(item.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-[#00AABB] hover:text-[#008899] mr-3"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {console.log('Pagination Debug:', { totalPages, currentPage, totalItems, itemsPerPage })}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Affichage {((currentPage - 1) * 10) + 1} à {Math.min(currentPage * 10, totalItems)} sur {totalItems} articles
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Précédent
            </button>
            
            {/* Page numbers */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      currentPage === pageNum
                        ? 'bg-[#00AABB] text-white border-[#00AABB]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {modalMode === 'create' ? 'Nouvel Article' : 'Modifier Article'}
              </h3>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'article *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                    placeholder="Ex: Papier A4 Blanc"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                    placeholder="Description détaillée de l'article..."
                  />
                </div>

                {/* Stock Levels Section - Available for both create and edit modes */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      {modalMode === 'create' 
                        ? 'Quantités Minimales par Emplacement' 
                        : 'Niveaux de Stock par Emplacement'
                      }
                    </label>
                    {modalMode === 'edit' && (
                      <button
                        type="button"
                        onClick={addStockLevel}
                        disabled={selectedStockLevels.length >= locations.length}
                        className="px-3 py-1 text-sm bg-[#00AABB] text-white rounded-md hover:bg-[#008899] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + Ajouter Emplacement
                      </button>
                    )}
                  </div>
                  
                  {modalMode === 'create' && (
                    <p className="text-sm text-gray-600 mb-3">
                      Définissez la quantité minimale pour chaque emplacement. Laissez à 0 si aucun stock minimal n'est requis.
                    </p>
                  )}
                  
                  {selectedStockLevels.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      Aucun emplacement sélectionné. Vous pouvez ajouter des emplacements pour définir des quantités minimales.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedStockLevels.map((stockLevel, index) => {
                        const selectedLocation = locations.find(loc => loc.id.toString() === stockLevel.locationId)
                        
                        return (
                          <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Emplacement
                              </label>
                              {modalMode === 'create' ? (
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">{getLocationIcon(selectedLocation?.type)}</span>
                                  <div>
                                    <div className="font-medium text-sm">{selectedLocation?.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {getLocationTypeLabel(selectedLocation?.type)}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <select
                                  value={stockLevel.locationId}
                                  onChange={(e) => updateStockLevel(index, 'locationId', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                                  required
                                >
                                  <option value="">Sélectionner un emplacement</option>
                                  {getAvailableLocations(index).map((location) => (
                                    <option key={location.id} value={location.id}>
                                      {location.name} ({getLocationTypeLabel(location.type)})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {modalMode === 'edit' && stockLevel.currentQuantity !== undefined && (
                              <div className="w-32">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Quantité Actuelle
                                </label>
                                <div className="px-2 py-1 text-sm bg-gray-100 border border-gray-300 rounded-md">
                                  {stockLevel.currentQuantity}
                                </div>
                              </div>
                            )}
                            <div className="w-32">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Quantité Min.
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={stockLevel.minimumQuantity}
                                onChange={(e) => updateStockLevel(index, 'minimumQuantity', parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                                placeholder="0"
                              />
                            </div>
                            {modalMode === 'edit' && (
                              <button
                                type="button"
                                onClick={() => removeStockLevel(index)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Supprimer cet emplacement"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-[#00AABB] text-white rounded-md hover:bg-[#008899]"
                  >
                    {modalMode === 'create' ? 'Créer' : 'Modifier'}
                  </button>
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
          onConfirm={confirmDelete}
          title="Confirmer la suppression"
          message={`Êtes-vous sûr de vouloir supprimer l'article "${deleteConfirm.name}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}
    </div>
  )
}

export default ItemsManagement
