import React, { useState, useEffect, useRef } from 'react';
import { clientAPI } from '../utils/api';

const ClientSearch = ({ onClientSelect, selectedClient, className = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedClientData, setSelectedClientData] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (selectedClient) {
      setSelectedClientData(selectedClient);
      setSearchTerm(selectedClient.nom || '');
    }
  }, [selectedClient]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (value) => {
    setSearchTerm(value);
    
    if (value.length >= 2) {
      setLoading(true);
      try {
        const response = await clientAPI.searchClients(value);
        setSearchResults(response.clients || []);
        setIsDropdownOpen(true);
      } catch (error) {
        console.error('Error searching clients:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    } else {
      setSearchResults([]);
      setIsDropdownOpen(false);
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClientData(client);
    setSearchTerm(client.nom);
    setIsDropdownOpen(false);
    onClientSelect(client);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    handleSearch(value);
    
    // If the user clears the input, reset the selected client
    if (value === '') {
      setSelectedClientData(null);
      setShowManualInput(false);
      onClientSelect(null);
    }
  };

  const handleInputFocus = () => {
    if (searchTerm.length >= 2) {
      setIsDropdownOpen(true);
    }
  };

  const handleUseManualInput = () => {
    setShowManualInput(true);
    setIsDropdownOpen(false);
    setSelectedClientData(null);
    // Create a mock client object with just the name
    const manualClient = {
      nom: searchTerm,
      isManual: true
    };
    onClientSelect(manualClient);
  };

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Client *
      </label>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
          placeholder="Rechercher un client..."
          required
        />
        {loading && (
          <div className="absolute right-3 top-3">
            <svg className="w-4 h-4 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {searchResults.length > 0 ? (
            <>
              {searchResults.map((client) => (
                <div
                  key={client.id}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                  onClick={() => handleClientSelect(client)}
                >
                  <div className="flex justify-between items-start">                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{client.nom}</div>
                    <div className="text-sm text-gray-500">{client.email}</div>
                    {client.adresse && (
                      <div className="text-sm text-gray-400">{client.adresse}</div>
                    )}
                  </div>
                    <div className="ml-2 flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.type_client === 'entreprise' 
                          ? 'bg-blue-100 text-blue-800' 
                          : client.type_client === 'association'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {client.type_client}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {searchTerm.length >= 2 && (
                <div 
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-t border-gray-200 bg-gray-50"
                  onClick={handleUseManualInput}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-blue-600 font-medium">
                      Utiliser "{searchTerm}" comme nouveau client
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="px-4 py-3 text-gray-500 text-center">
                {searchTerm.length >= 2 ? 'Aucun client trouvé' : 'Tapez au moins 2 caractères pour rechercher'}
              </div>
              {searchTerm.length >= 2 && (
                <div 
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-t border-gray-200 bg-gray-50"
                  onClick={handleUseManualInput}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-blue-600 font-medium">
                      Utiliser "{searchTerm}" comme nouveau client
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Selected Client Details */}
      {selectedClientData && !selectedClientData.isManual && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">Informations du client</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium text-blue-700">Nom:</span>
              <span className="ml-2 text-blue-600">{selectedClientData.nom}</span>
            </div>
            <div>
              <span className="font-medium text-blue-700">Email:</span>
              <span className="ml-2 text-blue-600">{selectedClientData.email}</span>
            </div>
            {selectedClientData.telephone && (
              <div>
                <span className="font-medium text-blue-700">Téléphone:</span>
                <span className="ml-2 text-blue-600">{selectedClientData.telephone}</span>
              </div>
            )}
            {selectedClientData.adresse && (
              <div>
                <span className="font-medium text-blue-700">Adresse:</span>
                <span className="ml-2 text-blue-600">{selectedClientData.adresse}</span>
              </div>
            )}
            <div>
              <span className="font-medium text-blue-700">Type:</span>
              <span className={`ml-2 capitalize ${
                selectedClientData.type_client === 'entreprise' 
                  ? 'text-blue-600' 
                  : selectedClientData.type_client === 'association'
                  ? 'text-green-600'
                  : 'text-gray-600'
              }`}>
                {selectedClientData.type_client}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Manual Input Notice */}
      {showManualInput && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-amber-700 text-sm">
              Vous utilisez un nom de client qui n'existe pas dans la base de données. Il sera sauvegardé comme texte libre.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientSearch;
