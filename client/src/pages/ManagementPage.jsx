import React, { useState, useEffect } from 'react'
import { userAPI } from '../utils/api'
import Input from '../components/InputComponent'
import Button from '../components/ButtonComponent'
import AlertDialog from '../components/AlertDialog'
import Pagination from '../components/Pagination'

const ManagementPage = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [sortBy, setSortBy] = useState('username')
  const [sortOrder, setSortOrder] = useState('asc')
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  })

  // Load users on component mount
  useEffect(() => {
    loadUsers()
  }, [])

  // Filter and sort users
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === '' || user.role === roleFilter
    
    return matchesSearch && matchesRole
  }).sort((a, b) => {
    let aValue = a[sortBy]
    let bValue = b[sortBy]
    
    if (sortBy === 'created_at') {
      aValue = new Date(aValue)
      bValue = new Date(bValue)
    }
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, roleFilter, sortBy, sortOrder])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await userAPI.getUsers()
      setUsers(response.users)
      setError('')
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs: ' + err.message)
    } finally {
      setLoading(false)
    }
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
      username: '',
      email: '',
      password: '',
      role: 'user'
    })
    setEditingUser(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (editingUser) {
        // Update existing user
        const updateData = { ...formData }
        if (!updateData.password) {
          delete updateData.password // Don't update password if empty
        }
        
        await userAPI.updateUser(editingUser.id, updateData)
        setSuccess('Utilisateur mis à jour avec succès')
      } else {
        // Create new user
        if (!formData.password) {
          setError('Le mot de passe est requis pour créer un utilisateur')
          return
        }
        await userAPI.createUser(formData)
        setSuccess('Utilisateur créé avec succès')
      }
      
      resetForm()
      setShowModal(false)
      loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't prefill password
      role: user.role
    })
    setShowModal(true)
  }

  const handleDelete = async (userId) => {
    try {
      await userAPI.deleteUser(userId)
      setSuccess('Utilisateur supprimé avec succès')
      setDeleteConfirm(null)
      loadUsers()
    } catch (err) {
      setError('Erreur lors de la suppression: ' + err.message)
    }
  }

  const confirmDelete = (user) => {
    setDeleteConfirm(user)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setRoleFilter('')
    setSortBy('username')
    setSortOrder('asc')
    setCurrentPage(1)
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
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Gestion des Utilisateurs</h1>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          Créer un utilisateur
        </Button>
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

      {/* Search and Filter Section */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Bar */}
          <div className="lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                placeholder="Rechercher par nom d'utilisateur ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 pl-10"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-2">
              Filtrer par rôle
            </label>
            <select
              id="roleFilter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
            >
              <option value="">Tous les rôles</option>
              <option value="admin">Administrateur</option>
              <option value="commercial">Commercial</option>
              <option value="atelier">Atelier</option>
              <option value="infograph">Infographe</option>
              <option value="user">Utilisateur</option>
            </select>
          </div>

          {/* Sort Options */}
          <div>
            <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-2">
              Trier par
            </label>
            <select
              id="sortBy"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field)
                setSortOrder(order)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
            >
              <option value="username-asc">Nom d'utilisateur (A-Z)</option>
              <option value="username-desc">Nom d'utilisateur (Z-A)</option>
              <option value="email-asc">Email (A-Z)</option>
              <option value="email-desc">Email (Z-A)</option>
              <option value="role-asc">Rôle (A-Z)</option>
              <option value="role-desc">Rôle (Z-A)</option>
              <option value="created_at-desc">Plus récent</option>
              <option value="created_at-asc">Plus ancien</option>
            </select>
          </div>
        </div>

        {/* Filter Summary and Clear Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 pt-4 border-t gap-2">
          <div className="text-sm text-gray-600">
            {filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''} trouvé{filteredUsers.length !== 1 ? 's' : ''}
            {searchTerm && ` pour "${searchTerm}"`}
            {roleFilter && ` avec le rôle "${roleFilter}"`}
          </div>
          
          {(searchTerm || roleFilter || sortBy !== 'username' || sortOrder !== 'asc') && (
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      </div>

      {/* Users Table - Desktop View */}
      <div className="hidden lg:block bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center space-x-1">
                  <span>ID</span>
                  {sortBy === 'id' && (
                    <span className="text-blue-600">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('username')}
              >
                <div className="flex items-center space-x-1">
                  <span>Nom d'utilisateur</span>
                  {sortBy === 'username' && (
                    <span className="text-blue-600">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center space-x-1">
                  <span>Email</span>
                  {sortBy === 'email' && (
                    <span className="text-blue-600">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('role')}
              >
                <div className="flex items-center space-x-1">
                  <span>Rôle</span>
                  {sortBy === 'role' && (
                    <span className="text-blue-600">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center space-x-1">
                  <span>Date de création</span>
                  {sortBy === 'created_at' && (
                    <span className="text-blue-600">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin' 
                      ? 'bg-red-100 text-red-800' 
                      : user.role === 'commercial'
                      ? 'bg-blue-100 text-blue-800'
                      : user.role === 'atelier'
                      ? 'bg-orange-100 text-orange-800'
                      : user.role === 'infograph'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(user.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-3 py-1 rounded transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => confirmDelete(user)}
                    className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded transition-colors"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || roleFilter ? 'Aucun utilisateur trouvé avec ces critères' : 'Aucun utilisateur trouvé'}
          </div>
        )}
      </div>

      {/* Users Cards - Mobile/Tablet View */}
      <div className="lg:hidden space-y-4">
        {paginatedUsers.map((user) => (
          <div key={user.id} className="bg-white shadow-md rounded-lg p-4 border">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{user.username}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'admin' 
                      ? 'bg-red-100 text-red-800' 
                      : user.role === 'commercial'
                      ? 'bg-blue-100 text-blue-800'
                      : user.role === 'atelier'
                      ? 'bg-orange-100 text-orange-800'
                      : user.role === 'infograph'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">ID:</span> {user.id}</p>
                  <p><span className="font-medium">Email:</span> {user.email}</p>
                  <p><span className="font-medium">Créé le:</span> {new Date(user.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
              <button
                onClick={() => handleEdit(user)}
                className="flex-1 text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-4 py-2 rounded transition-colors text-center text-sm font-medium"
              >
                Modifier
              </button>
              <button
                onClick={() => confirmDelete(user)}
                className="flex-1 text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-4 py-2 rounded transition-colors text-center text-sm font-medium"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
            {searchTerm || roleFilter ? 'Aucun utilisateur trouvé avec ces critères' : 'Aucun utilisateur trouvé'}
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        totalItems={filteredUsers.length}
      />

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 transition-opacity duration-200 ease-out overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto p-5 w-full max-w-md sm:max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nom d'utilisateur"
                  id="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Entrez le nom d'utilisateur"
                  required
                />
                
                <Input
                  label="Email"
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Entrez l'email"
                  required
                />
                
                <Input
                  label={editingUser ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"}
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Entrez le mot de passe"
                  required={!editingUser}
                />
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="role">
                    Rôle
                  </label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="user">Utilisateur</option>
                    <option value="admin">Administrateur</option>
                    <option value="atelier">Atelier</option>
                    <option value="commercial">Commercial</option>
                    <option value="infograph">Infographe</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="submit" className="flex-1 order-2 sm:order-1">
                    {editingUser ? 'Mettre à jour' : 'Créer'}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <AlertDialog
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          title="Confirmer la suppression"
          message={`Êtes-vous sûr de vouloir supprimer l'utilisateur "${deleteConfirm.username}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}
    </div>
  )
}

export default ManagementPage