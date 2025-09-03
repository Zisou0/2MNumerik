import React, { useState, useEffect, useRef } from 'react'

const AgentSelector = ({ availableUsers, selectedAgents, onAgentsChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredUsers, setFilteredUsers] = useState(availableUsers)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = availableUsers.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(availableUsers)
    }
  }, [searchTerm, availableUsers])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Get selected users objects
  const getSelectedUsers = () => {
    return availableUsers.filter(user => selectedAgents.includes(user.id))
  }

  // Toggle agent selection
  const toggleAgent = (userId) => {
    const newSelectedAgents = selectedAgents.includes(userId)
      ? selectedAgents.filter(id => id !== userId)
      : [...selectedAgents, userId]
    
    onAgentsChange(newSelectedAgents)
  }

  // Remove agent from selection
  const removeAgent = (userId) => {
    const newSelectedAgents = selectedAgents.filter(id => id !== userId)
    onAgentsChange(newSelectedAgents)
  }

  // Clear all selections
  const clearAll = () => {
    onAgentsChange([])
  }

  const selectedUsers = getSelectedUsers()

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected agents display */}
      {selectedUsers.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map(user => (
              <div
                key={user.id}
                className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
              >
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-semibold text-blue-900">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span>{user.username}</span>
                <button
                  type="button"
                  onClick={() => removeAgent(user.id)}
                  className="text-blue-600 hover:text-blue-800 ml-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {selectedUsers.length > 1 && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-gray-500 hover:text-red-600 px-2 py-1 text-sm transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Tout effacer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          placeholder={selectedUsers.length > 0 
            ? "Rechercher d'autres agents..." 
            : "Rechercher des agents..."}
        />
        
        {/* Search icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Selected count indicator */}
        {selectedUsers.length > 0 && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-medium">
              {selectedUsers.length}
            </div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Header with select/deselect all */}
          {filteredUsers.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-600 font-medium">
                {filteredUsers.length} agent{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allUserIds = filteredUsers.map(user => user.id)
                    const newSelection = [...new Set([...selectedAgents, ...allUserIds])]
                    onAgentsChange(newSelection)
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Tout sélectionner
                </button>
                {selectedUsers.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Tout désélectionner
                  </button>
                )}
              </div>
            </div>
          )}

          {/* User list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm">
                  {searchTerm 
                    ? `Aucun agent trouvé pour "${searchTerm}"` 
                    : "Aucun agent d'atelier disponible"}
                </p>
              </div>
            ) : (
              filteredUsers.map(user => {
                const isSelected = selectedAgents.includes(user.id)
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleAgent(user.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0 ${
                      isSelected ? 'bg-blue-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center">
                      {/* Checkbox */}
                      <div className={`flex-shrink-0 w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 hover:border-blue-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* User avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                        isSelected
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>

                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          isSelected ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {user.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          Agent d'atelier
                          {user.email && ` • ${user.email}`}
                        </p>
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="flex-shrink-0 ml-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer with action buttons */}
          {filteredUsers.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {selectedUsers.length} agent{selectedUsers.length > 1 ? 's' : ''} sélectionné{selectedUsers.length > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setSearchTerm('')
                }}
                className="text-xs text-gray-600 hover:text-gray-800 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors duration-200"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AgentSelector
