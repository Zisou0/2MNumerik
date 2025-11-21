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
console.log('[DEBUG] LotsManagement - Final API_BASE_URL:', API_BASE_URL)

function LotsManagement() {
  const [lots, setLots] = useState([])
  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [selectedLot, setSelectedLot] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Pagination and filters
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const lotsPerPage = 10
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterItem, setFilterItem] = useState('all')
  const [showExpiringOnly, setShowExpiringOnly] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    lot_number: '',
    item_id: '',
    supplier_id: '',
    manufacturing_date: '',
    expiration_date: '',
    initial_quantity: '',
    status: 'active',
    notes: ''
  })

  // Fetch lots
  const fetchLots = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage,
        limit: lotsPerPage
      })

      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterItem !== 'all') params.append('item_id', filterItem)
      if (searchTerm) params.append('search', searchTerm)

      const endpoint = showExpiringOnly 
        ? `${API_BASE_URL}/lots/expiring-soon?${params.toString()}`
        : `${API_BASE_URL}/lots?${params.toString()}`

      const response = await fetch(endpoint, {
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to fetch lots')

      const data = await response.json()
      setLots(data.lots || [])
      setTotalPages(data.totalPages || 1)
      setTotalCount(data.totalCount || 0)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching lots:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch items for dropdown
  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/items?limit=1000`, {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch items')
      const data = await response.json()
      setItems(data.items || [])
    } catch (err) {
      console.error('Error fetching items:', err)
    }
  }

  // Fetch suppliers for dropdown
  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/suppliers`, {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch suppliers')
      const data = await response.json()
      setSuppliers(data.suppliers || [])
    } catch (err) {
      console.error('Error fetching suppliers:', err)
    }
  }

  useEffect(() => {
    fetchItems()
    fetchSuppliers()
  }, [])

  useEffect(() => {
    fetchLots()
  }, [currentPage, filterStatus, filterItem, searchTerm, showExpiringOnly])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Open create modal
  const handleCreate = () => {
    setModalMode('create')
    setFormData({
      lot_number: '',
      item_id: '',
      supplier_id: '',
      manufacturing_date: '',
      expiration_date: '',
      initial_quantity: '',
      status: 'active',
      notes: ''
    })
    setShowModal(true)
  }

  // Open edit modal
  const handleEdit = (lot) => {
    setModalMode('edit')
    setSelectedLot(lot)
    setFormData({
      lot_number: lot.lot_number,
      item_id: lot.item_id,
      supplier_id: lot.supplier_id || '',
      manufacturing_date: lot.manufacturing_date ? lot.manufacturing_date.split('T')[0] : '',
      expiration_date: lot.expiration_date ? lot.expiration_date.split('T')[0] : '',
      initial_quantity: lot.initial_quantity,
      status: lot.status,
      notes: lot.notes || ''
    })
    setShowModal(true)
  }

  // Submit form (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const endpoint = modalMode === 'create'
        ? `${API_BASE_URL}/lots`
        : `${API_BASE_URL}/lots/${selectedLot.id}`

      const method = modalMode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save lot')
      }

      setShowModal(false)
      fetchLots()
    } catch (err) {
      alert(`Erreur: ${err.message}`)
    }
  }

  // Delete lot
  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/lots/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete lot')
      }

      setDeleteConfirm(null)
      fetchLots()
    } catch (err) {
      alert(`Erreur: ${err.message}`)
    }
  }

  // Print PDF document
  const handlePrintPDF = async (lot, type = 'full') => {
    try {
      const response = await fetch(`${API_BASE_URL}/lots/${lot.id}/document?type=${type}`, {
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to generate PDF document')

      // Get the PDF blob
      const blob = await response.blob()
      
      // Create a URL for the blob and trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const filename = type === 'label' 
        ? `lot-label-${lot.lot_number}.pdf`
        : `lot-document-${lot.lot_number}.pdf`
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Erreur: ${err.message}`)
    }
  }

  // Get status badge color
  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      recalled: 'bg-orange-100 text-orange-800',
      depleted: 'bg-gray-100 text-gray-800'
    }
    const labels = {
      active: 'Actif',
      expired: 'Expiré',
      recalled: 'Rappelé',
      depleted: 'Épuisé'
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    )
  }

  // Check if lot is expiring soon (within 30 days)
  const isExpiringSoon = (expirationDate) => {
    if (!expirationDate) return false
    const today = new Date()
    const expDate = new Date(expirationDate)
    const daysUntilExpiry = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Lots</h1>
          <p className="text-gray-600">Gérer les lots d'articles avec traçabilité complète</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          Nouveau Lot
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rechercher</label>
            <input
              type="text"
              placeholder="Numéro de lot..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="expired">Expiré</option>
              <option value="recalled">Rappelé</option>
              <option value="depleted">Épuisé</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Article</label>
            <select
              value={filterItem}
              onChange={(e) => setFilterItem(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les articles</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showExpiringOnly}
                onChange={(e) => setShowExpiringOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Expiration proche</span>
            </label>
          </div>
        </div>
      </div>

      {/* Loading/Error States */}
      {loading && <div className="text-center py-8">Chargement...</div>}
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {/* Lots Table */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numéro de Lot</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fournisseur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lots.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    Aucun lot trouvé
                  </td>
                </tr>
              ) : (
                lots.map(lot => (
                  <tr key={lot.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">{lot.lot_number}</span>
                        {isExpiringSoon(lot.expiration_date) && (
                          <span className="ml-2 text-orange-500" title="Expiration proche">⚠️</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lot.item?.name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lot.supplier?.nom || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lot.initial_quantity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {lot.expiration_date 
                          ? new Date(lot.expiration_date).toLocaleDateString('fr-FR')
                          : 'N/A'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(lot.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePrintPDF(lot, 'full')}
                          className="text-blue-600 hover:text-blue-900"
                          title="Imprimer Document PDF"
                        >
                          📄
                        </button>
                        <button
                          onClick={() => handlePrintPDF(lot, 'label')}
                          className="text-green-600 hover:text-green-900"
                          title="Imprimer Étiquette PDF"
                        >
                          🏷️
                        </button>
                        <button
                          onClick={() => handleEdit(lot)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(lot)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{currentPage}</span> sur{' '}
                    <span className="font-medium">{totalPages}</span> - Total: {totalCount} lots
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      ←
                    </button>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const pageNum = i + 1
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      →
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === 'create' ? 'Créer un Lot' : 'Modifier le Lot'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de Lot *
                  </label>
                  <input
                    type="text"
                    name="lot_number"
                    value={formData.lot_number}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Article *
                  </label>
                  <select
                    name="item_id"
                    value={formData.item_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un article</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fournisseur
                  </label>
                  <select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Aucun</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.nom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantité Initiale *
                  </label>
                  <input
                    type="number"
                    name="initial_quantity"
                    value={formData.initial_quantity}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de Fabrication
                  </label>
                  <input
                    type="date"
                    name="manufacturing_date"
                    value={formData.manufacturing_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date d'Expiration
                  </label>
                  <input
                    type="date"
                    name="expiration_date"
                    value={formData.expiration_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Actif</option>
                    <option value="expired">Expiré</option>
                    <option value="recalled">Rappelé</option>
                    <option value="depleted">Épuisé</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <AlertDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          title="Supprimer le Lot"
          message={`Êtes-vous sûr de vouloir supprimer le lot "${deleteConfirm.lot_number}" ?`}
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}
    </div>
  )
}

export default LotsManagement
