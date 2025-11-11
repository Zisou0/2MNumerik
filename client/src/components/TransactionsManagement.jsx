import { useState, useEffect } from 'react'
import AlertDialog from './AlertDialog'

const API_BASE_URL = 'http://localhost:3001/api'

function TransactionsManagement() {
  const [transactions, setTransactions] = useState([])
  const [items, setItems] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create', 'edit', 'view'
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [validateConfirm, setValidateConfirm] = useState(null)
  const [validatorName, setValidatorName] = useState('')
  const [stockErrorDialog, setStockErrorDialog] = useState(null)

  // Pagination and filtering states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('DESC')

  // Form state
  const [formData, setFormData] = useState({
    item_id: '',
    from_location: '',
    to_location: '',
    quantity: '',
    type: '',
    created_by: ''
  })

  // Get transaction type labels
  const getTypeLabel = (type) => {
    const typeLabels = {
      'IN': 'Entrée',
      'OUT': 'Sortie',
      'TRANSFER': 'Transfert',
      'ADJUSTMENT': 'Ajustement'
    }
    return typeLabels[type] || type
  }

  // Get transaction type badge style
  const getTypeBadgeStyle = (type) => {
    const styles = {
      'IN': 'bg-green-100 text-green-800',
      'OUT': 'bg-red-100 text-red-800',
      'TRANSFER': 'bg-blue-100 text-blue-800',
      'ADJUSTMENT': 'bg-yellow-100 text-yellow-800'
    }
    return styles[type] || 'bg-gray-100 text-gray-800'
  }

  // Get status labels
  const getStatusLabel = (status) => {
    const statusLabels = {
      'draft': 'Brouillon',
      'validated': 'Validée',
      'cancelled': 'Annulée'
    }
    return statusLabels[status] || status
  }

  // Get status badge style
  const getStatusBadgeStyle = (status) => {
    const styles = {
      'draft': 'bg-gray-100 text-gray-800',
      'validated': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  // Get location type label
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

  // Fetch transactions from API
  const fetchTransactions = async (page = currentPage, search = searchTerm) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(filterType && { type: filterType }),
        ...(filterStatus && { status: filterStatus })
      })
      
      const response = await fetch(`${API_BASE_URL}/transactions?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      setTransactions(data.transactions)
      setTotalTransactions(data.totalCount)
      setTotalPages(data.totalPages)
      setCurrentPage(page)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch items for dropdown - only items with assigned emplacements
  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/items?limit=1000`)
      if (!response.ok) {
        throw new Error('Failed to fetch items')
      }
      const data = await response.json()
      // Filter items to only include those with stock levels (emplacements assigned)
      const itemsWithEmplacements = (data.items || []).filter(item => 
        item.stockLevels && item.stockLevels.length > 0
      )
      setItems(itemsWithEmplacements)
    } catch (err) {
      console.error('Error fetching items:', err)
    }
  }

  // Fetch locations for dropdown
  const fetchLocations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/locations`)
      if (!response.ok) {
        throw new Error('Failed to fetch locations')
      }
      const data = await response.json()
      setLocations(data.locations || [])
    } catch (err) {
      console.error('Error fetching locations:', err)
    }
  }

  // Create new transaction
  const createTransaction = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          item_id: parseInt(formData.item_id),
          from_location: formData.from_location ? parseInt(formData.from_location) : null,
          to_location: formData.to_location ? parseInt(formData.to_location) : null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Check if it's a stock insufficiency error
        if (errorData.type === 'INSUFFICIENT_STOCK') {
          setStockErrorDialog({
            title: "Stock Insuffisant",
            message: errorData.error
          })
          return
        }
        
        throw new Error(errorData.error || 'Failed to create transaction')
      }

      await fetchTransactions()
      closeModal()
    } catch (err) {
      setError(err.message)
    }
  }

  // Update transaction
  const updateTransaction = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${selectedTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          item_id: parseInt(formData.item_id),
          from_location: formData.from_location ? parseInt(formData.from_location) : null,
          to_location: formData.to_location ? parseInt(formData.to_location) : null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Check if it's a stock insufficiency error
        if (errorData.type === 'INSUFFICIENT_STOCK') {
          setStockErrorDialog({
            title: "Stock Insuffisant",
            message: errorData.error
          })
          return
        }
        
        throw new Error(errorData.error || 'Failed to update transaction')
      }

      await fetchTransactions()
      closeModal()
    } catch (err) {
      setError(err.message)
    }
  }

  // Validate transaction
  const handleValidateClick = (transaction) => {
    setValidateConfirm(transaction)
    setValidatorName('')
  }

  const confirmValidation = async () => {
    if (!validateConfirm || !validatorName.trim()) return

    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${validateConfirm.id}/validate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ validated_by: validatorName.trim() })
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Check if it's a stock insufficiency error
        if (errorData.type === 'INSUFFICIENT_STOCK') {
          setStockErrorDialog({
            title: "Stock Insuffisant",
            message: errorData.error
          })
          setValidateConfirm(null)
          setValidatorName('')
          return
        }
        
        throw new Error(errorData.error || 'Failed to validate transaction')
      }

      await fetchTransactions()
      setValidateConfirm(null)
      setValidatorName('')
    } catch (err) {
      setError(err.message)
      setValidateConfirm(null)
      setValidatorName('')
    }
  }

  // Cancel transaction
  const cancelTransaction = async (transactionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}/cancel`, {
        method: 'PATCH',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel transaction')
      }

      await fetchTransactions()
    } catch (err) {
      setError(err.message)
    }
  }

  // Delete transaction
  const handleDeleteClick = (transaction) => {
    setDeleteConfirm(transaction)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${deleteConfirm.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete transaction')
      }

      await fetchTransactions()
      setDeleteConfirm(null)
    } catch (err) {
      setError(err.message)
      setDeleteConfirm(null)
    }
  }

  // Modal management
  const openCreateModal = () => {
    setModalMode('create')
    setSelectedTransaction(null)
    setFormData({
      item_id: '',
      from_location: '',
      to_location: '',
      quantity: '',
      type: '',
      created_by: ''
    })
    setShowModal(true)
  }

  const openEditModal = (transaction) => {
    setModalMode('edit')
    setSelectedTransaction(transaction)
    setFormData({
      item_id: transaction.item_id.toString(),
      from_location: transaction.from_location ? transaction.from_location.toString() : '',
      to_location: transaction.to_location ? transaction.to_location.toString() : '',
      quantity: transaction.quantity.toString(),
      type: transaction.type,
      created_by: transaction.created_by
    })
    setShowModal(true)
  }

  const openViewModal = (transaction) => {
    setModalMode('view')
    setSelectedTransaction(transaction)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedTransaction(null)
    setFormData({
      item_id: '',
      from_location: '',
      to_location: '',
      quantity: '',
      type: '',
      created_by: ''
    })
  }

  // Handle pagination
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchTransactions(page, searchTerm)
    }
  }

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    fetchTransactions(1, searchTerm)
  }

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value)
    if (e.target.value === '') {
      fetchTransactions(1, '')
    }
  }

  // Handle filters
  const handleFilterChange = () => {
    fetchTransactions(1, searchTerm)
  }

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault()
    if (modalMode === 'create') {
      createTransaction()
    } else if (modalMode === 'edit') {
      updateTransaction()
    }
  }

  // Handle type change to reset locations
  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      type,
      from_location: type === 'IN' ? '' : formData.from_location,
      to_location: type === 'OUT' ? '' : formData.to_location
    })
  }

  // Load data on component mount
  useEffect(() => {
    fetchTransactions()
    fetchItems()
    fetchLocations()
  }, [])

  // Handle filter changes
  useEffect(() => {
    handleFilterChange()
  }, [filterType, filterStatus])

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
          <h2 className="text-xl font-semibold text-gray-800">Transactions de Stock</h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalTransactions} transaction(s) enregistrée(s)
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#00AABB] text-white px-4 py-2 rounded-lg hover:bg-[#008899] transition-colors flex items-center"
        >
          <span className="mr-2">+</span>
          Nouvelle Transaction
        </button>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Rechercher par créateur ou validateur..."
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

        {/* Filters */}
        <div className="flex gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
          >
            <option value="">Tous les types</option>
            <option value="IN">Entrée</option>
            <option value="OUT">Sortie</option>
            <option value="TRANSFER">Transfert</option>
            <option value="ADJUSTMENT">Ajustement</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
          >
            <option value="">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="validated">Validée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Transactions table */}
      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl">📝</span>
          <p className="text-gray-500 mt-4">Aucune transaction trouvée</p>
          <p className="text-sm text-gray-400 mt-2">Créez votre première transaction pour commencer</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Article
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  De → Vers
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeStyle(transaction.type)}`}>
                      {getTypeLabel(transaction.type)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{transaction.item?.name}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{transaction.quantity}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {transaction.fromLocation?.name || '—'} → {transaction.toLocation?.name || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeStyle(transaction.status)}`}>
                      {getStatusLabel(transaction.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => openViewModal(transaction)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Voir
                      </button>
                      {transaction.status === 'draft' && (
                        <>
                          <button
                            onClick={() => openEditModal(transaction)}
                            className="text-[#00AABB] hover:text-[#008899]"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleValidateClick(transaction)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Valider
                          </button>
                          <button
                            onClick={() => cancelTransaction(transaction.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleDeleteClick(transaction)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </div>
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
            Affichage {((currentPage - 1) * 10) + 1} à {Math.min(currentPage * 10, totalTransactions)} sur {totalTransactions} transactions
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Précédent
            </button>
            
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

      {/* Create/Edit Modal */}
      {showModal && (modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {modalMode === 'create' ? 'Nouvelle Transaction' : 'Modifier Transaction'}
              </h3>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Article *
                    </label>
                    <select
                      required
                      value={formData.item_id}
                      onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                    >
                      <option value="">Sélectionner un article</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => handleTypeChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                    >
                      <option value="">Sélectionner un type</option>
                      <option value="IN">Entrée</option>
                      <option value="OUT">Sortie</option>
                      <option value="TRANSFER">Transfert</option>
                      <option value="ADJUSTMENT">Ajustement</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantité *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                      placeholder="Ex: 10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Créé par *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.created_by}
                      onChange={(e) => setFormData({ ...formData, created_by: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                      placeholder="Nom de l'utilisateur"
                    />
                  </div>
                </div>

                {/* Location fields based on type */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {formData.type !== 'IN' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emplacement source {formData.type === 'TRANSFER' ? '*' : ''}
                      </label>
                      <select
                        required={formData.type === 'TRANSFER'}
                        value={formData.from_location}
                        onChange={(e) => setFormData({ ...formData, from_location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                      >
                        <option value="">Sélectionner un emplacement</option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name} ({getLocationTypeLabel(location.type)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.type !== 'OUT' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emplacement destination {formData.type === 'TRANSFER' || formData.type === 'IN' ? '*' : ''}
                      </label>
                      <select
                        required={formData.type === 'TRANSFER' || formData.type === 'IN'}
                        value={formData.to_location}
                        onChange={(e) => setFormData({ ...formData, to_location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                      >
                        <option value="">Sélectionner un emplacement</option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name} ({getLocationTypeLabel(location.type)})
                          </option>
                        ))}
                      </select>
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

      {/* View Modal */}
      {showModal && modalMode === 'view' && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Détails de la Transaction #{selectedTransaction.id}
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Type</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeStyle(selectedTransaction.type)}`}>
                      {getTypeLabel(selectedTransaction.type)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Statut</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeStyle(selectedTransaction.status)}`}>
                      {getStatusLabel(selectedTransaction.status)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Article</label>
                  <p className="text-gray-900">{selectedTransaction.item?.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Quantité</label>
                  <p className="text-gray-900 font-medium">{selectedTransaction.quantity}</p>
                </div>

                {selectedTransaction.fromLocation && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Emplacement source</label>
                    <p className="text-gray-900">{selectedTransaction.fromLocation.name}</p>
                  </div>
                )}

                {selectedTransaction.toLocation && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Emplacement destination</label>
                    <p className="text-gray-900">{selectedTransaction.toLocation.name}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-500">Créé par</label>
                  <p className="text-gray-900">{selectedTransaction.created_by}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Date de création</label>
                  <p className="text-gray-900">{new Date(selectedTransaction.created_at).toLocaleString('fr-FR')}</p>
                </div>

                {selectedTransaction.validated_by && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Validé par</label>
                      <p className="text-gray-900">{selectedTransaction.validated_by}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Date de validation</label>
                      <p className="text-gray-900">{new Date(selectedTransaction.validated_at).toLocaleString('fr-FR')}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
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
          message={`Êtes-vous sûr de vouloir supprimer cette transaction ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}

      {/* Validation Confirmation Modal */}
      {validateConfirm && (
        <AlertDialog
          isOpen={true}
          onClose={() => {
            setValidateConfirm(null)
            setValidatorName('')
          }}
          onConfirm={confirmValidation}
          title="Valider la transaction"
          message={
            <div className="space-y-3">
              <p>Entrez le nom du validateur pour confirmer la validation de cette transaction :</p>
              <input
                type="text"
                value={validatorName}
                onChange={(e) => setValidatorName(e.target.value)}
                placeholder="Nom du validateur"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                autoFocus
              />
            </div>
          }
          confirmText="Valider"
          cancelText="Annuler"
          confirmDisabled={!validatorName.trim()}
          type="info"
        />
      )}

      {/* Stock Error Dialog */}
      {stockErrorDialog && (
        <AlertDialog
          isOpen={true}
          onClose={() => setStockErrorDialog(null)}
          onConfirm={() => setStockErrorDialog(null)}
          title={stockErrorDialog.title}
          message={stockErrorDialog.message}
          confirmText="Compris"
          type="error"
          showCancel={false}
        />
      )}
    </div>
  )
}

export default TransactionsManagement