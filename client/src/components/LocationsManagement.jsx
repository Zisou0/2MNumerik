import { useState, useEffect } from 'react'
import AlertDialog from './AlertDialog'

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    console.log('[DEBUG] Using VITE_API_URL:', import.meta.env.VITE_API_URL)
    return import.meta.env.VITE_API_URL
  }
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const url = `http://${window.location.hostname}:3001/api`
    console.log('[DEBUG] Using hostname detection:', url)
    return url
  }
  console.log('[DEBUG] Using localhost default')
  return 'http://localhost:3001/api'
}

const API_BASE_URL = getApiBaseUrl()
console.log('[DEBUG] LocationsManagement - Final API_BASE_URL:', API_BASE_URL)

function LocationsManagement() {
  const [locations, setLocations] = useState([])
  const [locationTypes, setLocationTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' or 'edit'
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Pagination and search states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLocations, setTotalLocations] = useState(0)
  const locationsPerPage = 10 // Hardcoded to 10 locations per page
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('ASC')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: ''
  })

  // Type labels mapping
  const getTypeLabel = (type) => {
    const typeMap = {
      'main_depot': 'Dépôt Principal',
      'workshop': 'Atelier',
      'store': 'Magasin',
      'supplier': 'Fournisseur',
      'customer': 'Client'
    }
    return typeMap[type] || type
  }

  // Get type badge color
  const getTypeBadgeColor = (type) => {
    const colorMap = {
      'main_depot': 'bg-blue-100 text-blue-800',
      'workshop': 'bg-green-100 text-green-800',
      'store': 'bg-purple-100 text-purple-800',
      'supplier': 'bg-orange-100 text-orange-800',
      'customer': 'bg-gray-100 text-gray-800'
    }
    return colorMap[type] || 'bg-gray-100 text-gray-800'
  }

  // Fetch location types
  const fetchLocationTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/locations/types`)
      if (!response.ok) {
        throw new Error('Failed to fetch location types')
      }
      const types = await response.json()
      setLocationTypes(types)
    } catch (err) {
      setError(err.message)
    }
  }

  // Fetch locations from API
  const fetchLocations = async (page = currentPage, search = searchTerm, type = typeFilter) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10', // Hardcoded to 10
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(type && { type })
      })
      
      const response = await fetch(`${API_BASE_URL}/locations?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch locations')
      }

      const data = await response.json()
      setLocations(data.locations)
      setTotalLocations(data.totalCount)
      setTotalPages(data.totalPages)
      setCurrentPage(page)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Create new location
  const createLocation = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create location')
      }

      await fetchLocations()
      closeModal()
    } catch (err) {
      setError(err.message)
    }
  }

  // Update location
  const updateLocation = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/locations/${selectedLocation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update location')
      }

      await fetchLocations()
      closeModal()
    } catch (err) {
      setError(err.message)
    }
  }

  // Delete location
  const handleDeleteClick = (location) => {
    setDeleteConfirm(location)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      const response = await fetch(`${API_BASE_URL}/locations/${deleteConfirm.id}`, {
        method: 'DELETE',
        credentials: 'include' // Include cookies
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete location')
      }

      await fetchLocations()
      setDeleteConfirm(null)
    } catch (err) {
      setError(err.message)
      setDeleteConfirm(null)
    }
  }

  // Modal management
  const openCreateModal = () => {
    setModalMode('create')
    setSelectedLocation(null)
    setFormData({ name: '', type: '' })
    setShowModal(true)
  }

  const openEditModal = (location) => {
    setModalMode('edit')
    setSelectedLocation(location)
    setFormData({
      name: location.name,
      type: location.type
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedLocation(null)
    setFormData({ name: '', type: '' })
  }

  // Pagination handlers
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchLocations(page, searchTerm, typeFilter)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchLocations(1, searchTerm, typeFilter) // Reset to page 1 when searching
  }

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value)
    if (e.target.value === '') {
      fetchLocations(1, '', typeFilter) // Reset search when input is cleared
    }
  }

  const handleTypeFilterChange = (e) => {
    setTypeFilter(e.target.value)
    fetchLocations(1, searchTerm, e.target.value) // Reset to page 1 when filtering
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (modalMode === 'create') {
      createLocation()
    } else {
      updateLocation()
    }
  }

  // Load locations and types on component mount
  useEffect(() => {
    fetchLocationTypes()
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
          <h2 className="text-xl font-semibold text-gray-800">Gestion des Emplacements</h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalLocations} emplacement(s) configuré(s)
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#00AABB] text-white px-4 py-2 rounded-lg hover:bg-[#008899] transition-colors flex items-center"
        >
          <span className="mr-2">+</span>
          Nouvel Emplacement
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Rechercher un emplacement..."
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
        <div>
          <select
            value={typeFilter}
            onChange={handleTypeFilterChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
          >
            <option value="">Tous les types</option>
            {locationTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Locations table */}
      {locations.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl">📍</span>
          <p className="text-gray-500 mt-4">Aucun emplacement trouvé</p>
          <p className="text-sm text-gray-400 mt-2">Créez votre premier emplacement pour commencer</p>
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
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock (Lots)
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
              {locations.map((location) => (
                <tr key={location.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{location.name}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeColor(location.type)}`}>
                      {getTypeLabel(location.type)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {location.lotLocations && location.lotLocations.length > 0 ? (
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {location.lotLocations.length} lot{location.lotLocations.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          {location.lotLocations.reduce((sum, ll) => sum + ll.quantity, 0)} unités
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Aucun stock</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {new Date(location.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(location)}
                      className="text-[#00AABB] hover:text-[#008899] mr-3"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteClick(location)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Affichage {((currentPage - 1) * 10) + 1} à {Math.min(currentPage * 10, totalLocations)} sur {totalLocations} emplacements
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {modalMode === 'create' ? 'Nouvel Emplacement' : 'Modifier Emplacement'}
              </h3>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'emplacement *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                    placeholder="Ex: Dépôt Central"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type d'emplacement *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                  >
                    <option value="">Sélectionner un type</option>
                    {locationTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
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
          message={`Êtes-vous sûr de vouloir supprimer l'emplacement "${deleteConfirm.name}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}
    </div>
  )
}

export default LocationsManagement