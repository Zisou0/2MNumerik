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
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg shadow-sm border border-blue-200">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-800">Informations générales de la commande</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {order.numero_affaire && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-600">Numéro d'affaire</span>
                    <div className="text-gray-900 font-semibold bg-white px-3 py-2 rounded-lg border border-blue-200/50">
                      {order.numero_affaire}
                    </div>
                  </div>
                )}
                {order.numero_dm && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-600">Numéro DM</span>
                    <div className="text-gray-900 font-semibold bg-white px-3 py-2 rounded-lg border border-blue-200/50">
                      {order.numero_dm}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-600">Client</span>
                  <div className="text-gray-900 font-semibold bg-white px-3 py-2 rounded-lg border border-blue-200/50">
                    {order.clientInfo ? order.clientInfo.nom : order.client}
                    {!order.clientInfo && order.client && (
                      <span className="ml-2 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full border border-amber-200">
                        Texte libre
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-600">Commercial en charge</span>
                  <div className="text-gray-900 font-semibold bg-white px-3 py-2 rounded-lg border border-blue-200/50">
                    {order.commercial_en_charge || '-'}
                  </div>
                </div>
                {order.date_limite_livraison_attendue && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-600">Date limite attendue</span>
                    <div className="text-gray-900 font-semibold bg-white px-3 py-2 rounded-lg border border-blue-200/50">
                      {formatDate(order.date_limite_livraison_attendue)}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-600">Statut</span>
                  <div className="bg-white px-3 py-2 rounded-lg border border-blue-200/50">
                    {getStatusBadge(order.statut)}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Client Information */}
            {order.clientInfo && (
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-cyan-100 rounded-lg shadow-sm border border-cyan-200">
                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800">Informations client</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-600">Nom</span>
                    <div className="text-gray-900 font-semibold bg-white px-3 py-2 rounded-lg border border-cyan-200/50">
                      {order.clientInfo.nom}
                    </div>
                  </div>
                  {order.clientInfo.code_client && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-gray-600">Code client</span>
                      <div className="text-gray-900 bg-white px-3 py-2 rounded-lg border border-cyan-200/50">
                        {order.clientInfo.code_client}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-600">Email</span>
                    <div className="text-gray-900 bg-white px-3 py-2 rounded-lg border border-cyan-200/50">
                      {order.clientInfo.email || '-'}
                    </div>
                  </div>
                  {order.clientInfo.telephone && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-gray-600">Téléphone</span>
                      <div className="text-gray-900 bg-white px-3 py-2 rounded-lg border border-cyan-200/50">
                        {order.clientInfo.telephone}
                      </div>
                    </div>
                  )}
                  {order.clientInfo.adresse && (
                    <div className="space-y-1 md:col-span-2">
                      <span className="text-sm font-medium text-gray-600">Adresse</span>
                      <div className="text-gray-900 bg-white px-3 py-2 rounded-lg border border-cyan-200/50">
                        {order.clientInfo.adresse}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-600">Type</span>
                    <div className="bg-white px-3 py-2 rounded-lg border border-cyan-200/50">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                        order.clientInfo.type_client === 'entreprise' 
                          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                          : order.clientInfo.type_client === 'association'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {order.clientInfo.type_client}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Extra Information */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg shadow-sm border border-orange-200">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-800">Informations complémentaires</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-600">Créé le</span>
                  <div className="text-gray-900 bg-white px-3 py-2 rounded-lg border border-orange-200/50">
                    {formatDate(order.createdAt)}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-600">Modifié le</span>
                  <div className="text-gray-900 bg-white px-3 py-2 rounded-lg border border-orange-200/50">
                    {formatDate(order.updatedAt)}
                  </div>
                </div>
                {order.commentaires && (
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-sm font-medium text-gray-600">Commentaires généraux</span>
                    <div className="text-gray-900 bg-white p-3 rounded-lg border border-orange-200/50">
                      {order.commentaires}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Each Product/Order Information */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg shadow-sm border border-green-200">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-800">Détails des produits commandés</h4>
              </div>
              <div className="space-y-6">
                {order.orderProducts && order.orderProducts.length > 0 ? (
                  order.orderProducts.map((orderProduct, index) => (
                    <div key={index} className="bg-white rounded-lg border border-green-200/50 shadow-sm overflow-hidden">
                      {/* Product Header */}
                      <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-4 border-b border-green-200/50">
                        <div className="flex justify-between items-center">
                          <h5 className="text-lg font-semibold text-gray-800">
                            {orderProduct.productInfo?.name || orderProduct.product?.name || 'Produit'}
                          </h5>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">ID: #{orderProduct.product_id}</span>
                            {getStatusBadge(orderProduct.statut)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Product Details */}
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="space-y-1">
                            <span className="text-sm font-medium text-gray-600">Quantité</span>
                            <div className="text-gray-900 font-semibold bg-gray-50 px-3 py-2 rounded border">
                              {orderProduct.quantity || 'N/A'}
                            </div>
                          </div>
                          {orderProduct.numero_pms && (
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-gray-600">Numéro PMS</span>
                              <div className="text-gray-900 font-semibold bg-gray-50 px-3 py-2 rounded border">
                                {orderProduct.numero_pms}
                              </div>
                            </div>
                          )}
                          {orderProduct.etape && (
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-gray-600">Étape actuelle</span>
                              <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                                <span className="capitalize font-medium">{orderProduct.etape}</span>
                              </div>
                            </div>
                          )}
                          {orderProduct.atelier_concerne && (
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-gray-600">Atelier concerné</span>
                              <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                                {orderProduct.atelier_concerne}
                              </div>
                            </div>
                          )}
                          {orderProduct.infograph_en_charge && (
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-gray-600">Infographe en charge</span>
                              <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                                {orderProduct.infograph_en_charge}
                              </div>
                            </div>
                          )}
                          {visibleViewFields.agent_impression && orderProduct.agent_impression && (
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-gray-600">Agent impression</span>
                              <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                                {orderProduct.agent_impression}
                              </div>
                            </div>
                          )}
                          {orderProduct.estimated_work_time_minutes && (
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-gray-600">Temps de travail estimé</span>
                              <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                                {Math.round(orderProduct.estimated_work_time_minutes / 60 * 10) / 10}h ({orderProduct.estimated_work_time_minutes} min)
                              </div>
                            </div>
                          )}
                          {orderProduct.date_limite_livraison_estimee && (
                            <div className="space-y-1 md:col-span-2 lg:col-span-3">
                              <span className="text-sm font-medium text-gray-600">Date limite de livraison estimée</span>
                              <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">
                                {formatDate(orderProduct.date_limite_livraison_estimee)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Options and Special Requirements */}
                        {(orderProduct.bat || orderProduct.express) && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <span className="text-sm font-medium text-gray-600 block mb-2">Options spéciales</span>
                            <div className="flex gap-2">
                              {orderProduct.bat && (
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  orderProduct.bat === 'avec' 
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                                }`}>
                                  BAT {orderProduct.bat}
                                </span>
                              )}
                              {orderProduct.express && (
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  orderProduct.express === 'oui' 
                                    ? 'bg-red-100 text-red-800 border border-red-200' 
                                    : 'bg-green-100 text-green-800 border border-green-200'
                                }`}>
                                  Express {orderProduct.express}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Product Comments */}
                        {orderProduct.commentaires && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <span className="text-sm font-medium text-gray-600 block mb-2">Commentaires produit</span>
                            <div className="text-gray-700 bg-gray-50 p-3 rounded border">
                              {orderProduct.commentaires}
                            </div>
                          </div>
                        )}

                        {/* Finitions section */}
                        {visibleViewFields.option_finition && (
                          (orderProduct.orderProductFinitions && orderProduct.orderProductFinitions.length > 0) ||
                          (orderProduct.finitions && orderProduct.finitions.length > 0)
                        ) && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <span className="text-sm font-medium text-gray-600 block mb-2">Finitions</span>
                            <div className="space-y-2">
                              {orderProduct.orderProductFinitions ? (
                                orderProduct.orderProductFinitions.map((orderProductFinition, finitionIndex) => (
                                  <div key={finitionIndex} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-purple-800 font-medium">
                                        {orderProductFinition.finition?.name || 'Finition'}
                                      </span>
                                      <div className="p-1 bg-purple-100 rounded-lg">
                                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                      </div>
                                    </div>
                                     {/* Assignment and scheduling info */}
                                    <div className="space-y-3 text-sm">
                                      {/* Assigned agents */}
                                      {orderProductFinition.assigned_agents && orderProductFinition.assigned_agents.length > 0 && (
                                        <div>
                                          <span className="font-medium text-gray-700 mb-2 block">Agents assignés:</span>
                                          <div className="flex flex-wrap gap-2">
                                            {orderProductFinition.assigned_agents.map((agentId, idx) => (
                                              <div key={agentId} className="flex items-center bg-blue-50 text-blue-800 px-3 py-2 rounded-lg border border-blue-200">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium mr-2">
                                                  {getUsernameById(agentId).charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium">{getUsernameById(agentId)}</span>
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
                                              <span className="font-medium text-gray-700 block mb-1">Date de début:</span>
                                              <div className="bg-green-50 text-green-800 px-3 py-2 rounded-lg border border-green-200">
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
                                              <span className="font-medium text-gray-700 block mb-1">Date de fin:</span>
                                              <div className="bg-red-50 text-red-800 px-3 py-2 rounded-lg border border-red-200">
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
                                  <div key={finitionIndex} className="flex items-center justify-between bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                                    <div className="flex-1">
                                      <span className="text-purple-800 font-medium">
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
                  <div className="bg-white p-8 rounded-lg border border-green-200/50 text-center text-gray-500">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1M6 7h.01M18 7h.01" />
                    </svg>
                    <p className="font-medium">Aucun produit associé à cette commande</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-4 pt-8 border-t border-gray-200 mt-8">
              <Button
                variant="secondary"
                onClick={onClose}
                className="min-w-[120px]"
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
                  className="min-w-[140px]"
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
  )
}

export default OrderViewModal