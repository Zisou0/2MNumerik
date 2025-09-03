import React, { useState, useRef, useEffect } from 'react';
import { DownOutlined, CloseOutlined, UserOutlined } from '@ant-design/icons';

const UserSelector = ({ selectedUsers = [], onChange, users = [], placeholder = "Sélectionner des utilisateurs..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedUsers.includes(user)
  );

  const handleUserSelect = (user) => {
    if (!selectedUsers.includes(user)) {
      onChange([...selectedUsers, user]);
    }
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleUserRemove = (userToRemove) => {
    onChange(selectedUsers.filter(user => user !== userToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && searchTerm === '' && selectedUsers.length > 0) {
      handleUserRemove(selectedUsers[selectedUsers.length - 1]);
    } else if (e.key === 'Enter' && filteredUsers.length > 0) {
      e.preventDefault();
      handleUserSelect(filteredUsers[0]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main input container */}
      <div
        className={`min-h-[42px] w-full px-3 py-2 border rounded-lg bg-white cursor-text transition-all duration-200 ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <div className="flex flex-wrap gap-1.5 items-center">
          {/* Selected users as chips */}
          {selectedUsers.map((user, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium"
            >
              <UserOutlined className="text-xs" />
              <span>{user}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUserRemove(user);
                }}
                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
              >
                <CloseOutlined className="text-xs" />
              </button>
            </div>
          ))}
          
          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedUsers.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-sm placeholder-gray-500"
          />
          
          {/* Dropdown arrow */}
          <DownOutlined 
            className={`text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            <div className="py-1">
              {filteredUsers.map((user, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleUserSelect(user)}
                  className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-sm text-gray-700 transition-colors"
                >
                  <UserOutlined className="text-gray-400" />
                  <span>{user}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              {searchTerm ? `Aucun utilisateur trouvé pour "${searchTerm}"` : "Tous les utilisateurs sont déjà sélectionnés"}
            </div>
          )}
        </div>
      )}

      {/* Helper text */}
      {selectedUsers.length > 0 && (
        <div className="mt-1 text-xs text-gray-500">
          {selectedUsers.length} utilisateur{selectedUsers.length > 1 ? 's' : ''} sélectionné{selectedUsers.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default UserSelector;
