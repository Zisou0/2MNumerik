import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Button from './ButtonComponent'
import ProgressStepper from './ProgressStepper'
import { apiCall } from '../utils/api'
const OrderViewModal = ({ order, onClose, onEdit, formatDate, getStatusBadge, etapeOptions }) => {
  const { user } = useAuth()
  const [availableUsers, setAvailableUsers] = useState([])

  // Fetch users to map agent IDs to usernames
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiCall('/users', 'GET')
        const atelierUsers = (response.users || []).filter(user => user.role === 'atelier')
        setAvailableUsers(atelierUsers)
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }
    fetchUsers()
  }, [])

  // Helper function to get username by ID
  const getUsernameById = (userId) => {
    const user = availableUsers.find(u => u.id === userId)
    return user ? user.username : `Agent ${userId}`
  }

  // Helper function to check if user can edit orders
  const canEditOrders = () => {
    if (!user) return false
    
    // Admin and commercial can always edit
    if (user.role === 'admin' || user.role === 'commercial') {
      return true
    }
    
    // Infograph users can edit if they have permission on any editable fields
    if (user.role === 'infograph') {
      const infographEditableFields = [
        'quantity', 'numero_pms', 'statut', 'etape', 'atelier_concerne', 
        'infograph_en_charge', 'date_limite_livraison_estimee', 
        'estimated_work_time_minutes', 'bat', 'express', 'commentaires'
      ]
      return infographEditableFields.length > 0 // Infograph can edit some fields
    }
    
    // Atelier users can edit limited fields
    if (user.role === 'atelier') {
      const atelierEditableFields = ['statut', 'etape', 'atelier_concerne', 'commentaires']
      return atelierEditableFields.length > 0 // Atelier can edit some fields
    }
    
    return false
  }
  
  // Helper function to get visible fields based on user role
  const getVisibleViewFields = () => {
    if (user?.role === 'commercial') {
      return {
        code_client: true,
        nom_client: true,
        numero_affaire: true,
        numero_dm: true,
        commercial_en_charge: true,
        date_limite_livraison_attendue: true,
        produits: true,
        quantite: true,
        statut: true,
        etape: true,
        atelier_concerne: true,
        bat: true,
        express: true,
        // Hide these fields for commercial
        infograph_en_charge: false,
        agent_impression: false,
        date_limite_livraison_estimee: false,
        estimated_work_time_minutes: false,
        option_finition: false,
        commentaires: false
      }
    }
    if (user?.role === 'infograph') {
      return {
        nom_client: true,
        produits: true,
        quantite: true,
        statut: true,
        option_finition: true,
        bat: true,
        express: true,
        // Hide these fields for infograph
        code_client: false,
        numero_affaire: false,
        numero_dm: false,
        commercial_en_charge: false,
        infograph_en_charge: false,
        agent_impression: false,
        date_limite_livraison_estimee: false,
        date_limite_livraison_attendue: false,
        etape: false,
        atelier_concerne: false,
        estimated_work_time_minutes: false,
        commentaires: false
      }
    }
    // Default for admin and other roles - show all fields
    return {
      code_client: true,
      nom_client: true,
      numero_affaire: true,
      numero_dm: true,
      commercial_en_charge: true,
      infograph_en_charge: true,
      agent_impression: true,
      date_limite_livraison_estimee: true,
      date_limite_livraison_attendue: true,
      produits: true,
      quantite: true,
      statut: true,
      etape: true,
      atelier_concerne: true,
      estimated_work_time_minutes: true,
      option_finition: true,
      commentaires: true,
      bat: true,
      express: true
    }
  }

  const visibleViewFields = getVisibleViewFields()

  // Define the steps for the progress stepper based on etapeOptions (excluding conception and travail graphique)
  const steps = etapeOptions
    .filter(etape => etape !== 'conception' && etape !== 'travail graphique')
    .map(etape => ({
      key: etape,
      label: etape === 'pré-presse' ? 'Pré-presse' : 
             etape.charAt(0).toUpperCase() + etape.slice(1)
    }));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 ease-out overflow-y-auto h-full w-full z-50 animate-in fade-in">
      <div className="relative top-8 mx-auto p-0 w-11/12 max-w-4xl min-h-[calc(100vh-4rem)] animate-in slide-in-from-top-4 duration-500">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-3xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-8 py-6 text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">
                    Détails de la commande
                  </h3>
                  <p className="text-indigo-100 text-sm mt-1 font-medium">
                    Commande {order.numero_pms}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {canEditOrders() && (
                  <button
                    onClick={onEdit}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all duration-200 group border border-white/20 backdrop-blur-sm"
                  >
                    <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Modifier
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 group border border-white/20 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Progress Stepper */}
          <ProgressStepper currentStep={order.etape} steps={steps} />

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* 1. Order General Information */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">Informations générales</h4>
                  <p className="text-sm text-gray-600 mt-1">Détails de la commande #{order.id}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Order ID */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-700">ID Commande</span>
                  </div>
                  <div className="text-gray-900 font-bold text-lg bg-white px-4 py-3 rounded-lg border border-blue-200/50 shadow-sm">
                    #{order.id}
                  </div>
                </div>

                {/* Numéro d'affaire */}
                {visibleViewFields.numero_affaire && order.numero_affaire && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Numéro d'affaire</span>
                    </div>
                    <div className="text-gray-900 font-semibold bg-white px-4 py-3 rounded-lg border border-blue-200/50 shadow-sm">
                      {order.numero_affaire}
                    </div>
                  </div>
                )}

                {/* Numéro DM */}
                {visibleViewFields.numero_dm && order.numero_dm && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Numéro DM</span>
                    </div>
                    <div className="text-gray-900 font-semibold bg-white px-4 py-3 rounded-lg border border-blue-200/50 shadow-sm">
                      {order.numero_dm}
                    </div>
                  </div>
                )}

                {/* Client */}
                {visibleViewFields.nom_client && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Client</span>
                    </div>
                    <div className="text-gray-900 font-semibold bg-white px-4 py-3 rounded-lg border border-blue-200/50 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span>{order.clientInfo ? order.clientInfo.nom : order.client}</span>
                        {!order.clientInfo && order.client && (
                          <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full border border-amber-300 font-medium">
                            Texte libre
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Commercial en charge */}
                {visibleViewFields.commercial_en_charge && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Commercial en charge</span>
                    </div>
                    <div className="text-gray-900 font-semibold bg-white px-4 py-3 rounded-lg border border-blue-200/50 shadow-sm">
                      {order.commercial_en_charge || (
                        <span className="text-gray-400 font-normal italic">Non assigné</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Date limite attendue */}
                {visibleViewFields.date_limite_livraison_attendue && order.date_limite_livraison_attendue && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Date limite attendue</span>
                    </div>
                    <div className="text-gray-900 font-semibold bg-white px-4 py-3 rounded-lg border border-blue-200/50 shadow-sm">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(order.date_limite_livraison_attendue)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Statut */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-700">Statut global</span>
                  </div>
                  <div className="bg-white px-4 py-3 rounded-lg border border-blue-200/50 shadow-sm">
                    {getStatusBadge(order.statut)}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Client Information */}
            {order.clientInfo && (
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-800">Informations client</h4>
                    <p className="text-sm text-gray-600 mt-1">Détails du client #{order.clientInfo.id}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* Client Name */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Nom</span>
                    </div>
                    <div className="text-gray-900 font-semibold bg-white px-4 py-3 rounded-lg border border-cyan-200/50 shadow-sm">
                      {order.clientInfo.nom}
                    </div>
                  </div>

                  {/* Code Client */}
                  {visibleViewFields.code_client && order.clientInfo.code_client && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-gray-700">Code client</span>
                      </div>
                      <div className="text-gray-900 font-mono font-semibold bg-white px-4 py-3 rounded-lg border border-cyan-200/50 shadow-sm">
                        {order.clientInfo.code_client}
                      </div>
                    </div>
                  )}

                  {/* Client Type */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Type</span>
                    </div>
                    <div className="bg-white px-4 py-3 rounded-lg border border-cyan-200/50 shadow-sm">
                      <span className={`px-3 py-2 rounded-full text-sm font-bold capitalize ${
                        order.clientInfo.type_client === 'entreprise' 
                          ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300' 
                          : order.clientInfo.type_client === 'association'
                          ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300'
                          : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                      }`}>
                        {order.clientInfo.type_client}
                      </span>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Email</span>
                    </div>
                    <div className="text-gray-900 bg-white px-4 py-3 rounded-lg border border-cyan-200/50 shadow-sm">
                      {order.clientInfo.email ? (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium">{order.clientInfo.email}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-normal italic">Non renseigné</span>
                      )}
                    </div>
                  </div>

                  {/* Téléphone */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Téléphone</span>
                    </div>
                    <div className="text-gray-900 bg-white px-4 py-3 rounded-lg border border-cyan-200/50 shadow-sm">
                      {order.clientInfo.telephone ? (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="font-medium">{order.clientInfo.telephone}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-normal italic">Non renseigné</span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Statut</span>
                    </div>
                    <div className="bg-white px-4 py-3 rounded-lg border border-cyan-200/50 shadow-sm">
                      <span className={`px-3 py-2 rounded-full text-sm font-bold ${
                        order.clientInfo.actif 
                          ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' 
                          : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
                      }`}>
                        {order.clientInfo.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>

                  {/* Adresse */}
                  {order.clientInfo.adresse && (
                    <div className="space-y-2 md:col-span-2 xl:col-span-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-gray-700">Adresse</span>
                      </div>
                      <div className="text-gray-900 bg-white px-4 py-3 rounded-lg border border-cyan-200/50 shadow-sm">
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-indigo-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-medium">{order.clientInfo.adresse}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {order.clientInfo.notes && (
                    <div className="space-y-2 md:col-span-2 xl:col-span-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-gray-700">Notes internes</span>
                      </div>
                      <div className="text-gray-900 bg-white px-4 py-3 rounded-lg border border-cyan-200/50 shadow-sm">
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="font-medium">{order.clientInfo.notes}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Timeline & Metadata */}
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">Timeline & Informations</h4>
                  <p className="text-sm text-gray-600 mt-1">Historique et métadonnées de la commande</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Date de création */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-700">Créé le</span>
                  </div>
                  <div className="text-gray-900 bg-white px-4 py-3 rounded-lg border border-slate-200/50 shadow-sm">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="font-medium">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Date de modification */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-700">Modifié le</span>
                  </div>
                  <div className="text-gray-900 bg-white px-4 py-3 rounded-lg border border-slate-200/50 shadow-sm">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="font-medium">{formatDate(order.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Nombre de produits */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-700">Produits</span>
                  </div>
                  <div className="text-gray-900 bg-white px-4 py-3 rounded-lg border border-slate-200/50 shadow-sm">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span className="font-bold text-lg">
                        {order.orderProducts ? order.orderProducts.length : 0}
                      </span>
                      <span className="text-sm text-gray-600">
                        {order.orderProducts && order.orderProducts.length > 1 ? 'produits' : 'produit'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Commentaires généraux */}
                {visibleViewFields.commentaires && order.commentaires && (
                  <div className="space-y-2 md:col-span-2 xl:col-span-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Commentaires généraux</span>
                    </div>
                    <div className="text-gray-900 bg-white p-4 rounded-lg border border-slate-200/50 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg mt-0.5">
                          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                        </div>
                        <div className="flex-1 font-medium leading-relaxed">
                          {order.commentaires}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Product Details */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-800">Détails des produits</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.orderProducts?.length || 0} produit{order.orderProducts?.length > 1 ? 's' : ''} dans cette commande
                    </p>
                  </div>
                </div>
                
                {/* Summary stats */}
                {order.orderProducts && order.orderProducts.length > 0 && (
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-600">
                        {order.orderProducts.reduce((sum, op) => sum + (op.quantity || 0), 0)}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Quantité totale</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(order.orderProducts.reduce((sum, op) => sum + (op.estimated_work_time_minutes || 0), 0) / 60 * 10) / 10}h
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Temps estimé</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                {order.orderProducts && order.orderProducts.length > 0 ? (
                  order.orderProducts.map((orderProduct, index) => (
                    <div key={index} className="bg-white rounded-xl border border-emerald-200/50 shadow-lg overflow-hidden transform transition-all duration-200 hover:shadow-xl">
                      {/* Product Header */}
                      <div className="bg-gradient-to-r from-emerald-100 via-green-100 to-emerald-100 px-6 py-4 border-b border-emerald-200/50">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                              {index + 1}
                            </div>
                            <div>
                              <h5 className="text-xl font-bold text-gray-800">
                                {orderProduct.productInfo?.name || orderProduct.product?.name || 'Produit sans nom'}
                              </h5>
                              <p className="text-sm text-gray-600 mt-1">
                                ID Produit: #{orderProduct.product_id} • ID Commande Produit: #{orderProduct.id}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(orderProduct.statut)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Product Core Information */}
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
                          {/* Quantité */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-semibold text-gray-700">Quantité</span>
                            </div>
                            <div className="text-gray-900 font-bold text-lg bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-lg border border-blue-200/50 shadow-sm">
                              <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <span>{orderProduct.quantity || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Prix unitaire */}
                          {orderProduct.unit_price && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-semibold text-gray-700">Prix unitaire</span>
                              </div>
                              <div className="text-gray-900 font-bold bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-lg border border-green-200/50 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                  <span>{parseFloat(orderProduct.unit_price).toFixed(2)}€</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Numéro PMS */}
                          {orderProduct.numero_pms && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span className="text-sm font-semibold text-gray-700">Numéro PMS</span>
                              </div>
                              <div className="text-gray-900 font-mono font-semibold bg-gradient-to-r from-purple-50 to-violet-50 px-4 py-3 rounded-lg border border-purple-200/50 shadow-sm">
                                {orderProduct.numero_pms}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Production Information */}
                        <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4 mb-6 border border-gray-200">
                          <h6 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Informations de production
                          </h6>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {/* Étape */}
                            {visibleViewFields.etape && orderProduct.etape && (
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Étape actuelle</span>
                                <div className="bg-white px-3 py-2 rounded border shadow-sm">
                                  <span className="capitalize font-semibold text-gray-800">{orderProduct.etape}</span>
                                </div>
                              </div>
                            )}

                            {/* Atelier concerné */}
                            {visibleViewFields.atelier_concerne && orderProduct.atelier_concerne && (
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Atelier concerné</span>
                                <div className="bg-white px-3 py-2 rounded border shadow-sm">
                                  <span className="font-semibold text-gray-800">{orderProduct.atelier_concerne}</span>
                                </div>
                              </div>
                            )}

                            {/* Type de sous-traitance - Only visible to admin and atelier users */}
                            {(user?.role === 'admin' || user?.role === 'atelier') && orderProduct.atelier_concerne === 'sous-traitance' && orderProduct.type_sous_traitance && (
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Type de sous-traitance</span>
                                <div className="bg-white px-3 py-2 rounded border shadow-sm">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span className="font-semibold text-gray-800">{orderProduct.type_sous_traitance}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Infographe en charge */}
                            {visibleViewFields.infograph_en_charge && orderProduct.infograph_en_charge && (
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Infographe en charge</span>
                                <div className="bg-white px-3 py-2 rounded border shadow-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-800">
                                      {orderProduct.infograph_en_charge.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-gray-800">{orderProduct.infograph_en_charge}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Agent impression */}
                            {visibleViewFields.agent_impression && orderProduct.agent_impression && (
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Agent impression</span>
                                <div className="bg-white px-3 py-2 rounded border shadow-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-800">
                                      {orderProduct.agent_impression.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-gray-800">{orderProduct.agent_impression}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Temps de travail estimé */}
                            {visibleViewFields.estimated_work_time_minutes && orderProduct.estimated_work_time_minutes && (
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Temps estimé</span>
                                <div className="bg-white px-3 py-2 rounded border shadow-sm">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-semibold text-gray-800">
                                      {Math.round(orderProduct.estimated_work_time_minutes / 60 * 10) / 10}h
                                    </span>
                                    <span className="text-sm text-gray-500">({orderProduct.estimated_work_time_minutes} min)</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Date limite estimée */}
                            {visibleViewFields.date_limite_livraison_estimee && orderProduct.date_limite_livraison_estimee && (
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Date limite estimée</span>
                                <div className="bg-white px-3 py-2 rounded border shadow-sm">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="font-semibold text-gray-800">{formatDate(orderProduct.date_limite_livraison_estimee)}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Options spéciales */}
                        {(orderProduct.bat || orderProduct.express || orderProduct.pack_fin_annee) && (
                          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-4 mb-6 border border-yellow-200">
                            <h6 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              Options spéciales
                            </h6>
                            <div className="flex flex-wrap gap-3">
                              {orderProduct.bat && (
                                <div className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${
                                  orderProduct.bat === 'avec' 
                                    ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300 shadow-md' 
                                    : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-md'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    BAT {orderProduct.bat}
                                  </div>
                                </div>
                              )}
                              {orderProduct.express && (
                                <div className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${
                                  orderProduct.express === 'oui' 
                                    ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300 shadow-md' 
                                    : 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 shadow-md'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Express {orderProduct.express}
                                  </div>
                                </div>
                              )}
                              {orderProduct.pack_fin_annee && (
                                <div className="px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-2 border-purple-300 shadow-md">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                    </svg>
                                    Pack Fin d'Année
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Commentaires produit */}
                        {orderProduct.commentaires && (
                          <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4 mb-6 border border-gray-200">
                            <h6 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              Commentaires produit
                            </h6>
                            <div className="text-gray-800 bg-white p-4 rounded-lg border shadow-sm leading-relaxed">
                              {orderProduct.commentaires}
                            </div>
                          </div>
                        )}

                        {/* Finitions section */}
                        {visibleViewFields.option_finition && (
                          (orderProduct.orderProductFinitions && orderProduct.orderProductFinitions.length > 0) ||
                          (orderProduct.finitions && orderProduct.finitions.length > 0)
                        ) && (
                          <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                            <h6 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              Finitions
                            </h6>
                            <div className="space-y-4">
                              {orderProduct.orderProductFinitions ? (
                                orderProduct.orderProductFinitions.map((orderProductFinition, finitionIndex) => (
                                  <div key={finitionIndex} className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                          {finitionIndex + 1}
                                        </div>
                                        <span className="text-purple-800 font-bold text-lg">
                                          {orderProductFinition.finition?.name || 'Finition'}
                                        </span>
                                      </div>
                                      {orderProductFinition.finition?.id && (
                                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full border border-purple-200 font-medium">
                                          ID: #{orderProductFinition.finition.id}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Assignment and scheduling info */}
                                    <div className="space-y-4 text-sm">
                                      {/* Assigned agents */}
                                      {orderProductFinition.assigned_agents && orderProductFinition.assigned_agents.length > 0 && (
                                        <div>
                                          <span className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                            </svg>
                                            Agents assignés:
                                          </span>
                                          <div className="flex flex-wrap gap-2">
                                            {orderProductFinition.assigned_agents.map((agentId, idx) => (
                                              <div key={agentId} className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 px-3 py-2 rounded-lg border border-blue-200 shadow-sm">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold mr-2">
                                                  {getUsernameById(agentId).charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-semibold">{getUsernameById(agentId)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Date information */}
                                      {(orderProductFinition.start_date || orderProductFinition.end_date) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {/* Start date */}
                                          {orderProductFinition.start_date && (
                                            <div>
                                              <span className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                                Date de début:
                                              </span>
                                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 px-3 py-2 rounded-lg border border-green-200 shadow-sm">
                                                {new Date(orderProductFinition.start_date).toLocaleDateString('fr-FR', {
                                                  day: '2-digit',
                                                  month: '2-digit',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {/* End date */}
                                          {orderProductFinition.end_date && (
                                            <div>
                                              <span className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 12M6 6l12 12" />
                                                </svg>
                                                Date de fin:
                                              </span>
                                              <div className="bg-gradient-to-r from-red-50 to-rose-50 text-red-800 px-3 py-2 rounded-lg border border-red-200 shadow-sm">
                                                {new Date(orderProductFinition.end_date).toLocaleDateString('fr-FR', {
                                                  day: '2-digit',
                                                  month: '2-digit',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                // Fallback for old finitions format
                                orderProduct.finitions && orderProduct.finitions.map((finition, finitionIndex) => (
                                  <div key={finitionIndex} className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-purple-200 shadow-sm">
                                    <div className="flex items-center gap-3">
                                      <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg">
                                        {finitionIndex + 1}
                                      </div>
                                      <span className="text-purple-800 font-semibold">
                                        {finition.finition_name || finition.name || 'Finition'}
                                      </span>
                                    </div>
                                    <div className="p-1 bg-purple-100 rounded-lg">
                                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                      </svg>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white p-12 rounded-xl border border-emerald-200/50 text-center text-gray-500">
                    <div className="max-w-md mx-auto">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1M6 7h.01M18 7h.01" />
                      </svg>
                      <h6 className="text-lg font-semibold text-gray-700 mb-2">Aucun produit associé</h6>
                      <p className="text-gray-500">Cette commande ne contient aucun produit pour le moment.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">
                    Dernière modification: {formatDate(order.updatedAt)}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="min-w-[120px] bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Fermer
                    </div>
                  </Button>
                  {canEditOrders() && (
                    <Button
                      onClick={onEdit}
                      className="min-w-[140px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Modifier
                      </div>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderViewModal