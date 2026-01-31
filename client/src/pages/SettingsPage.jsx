import React, { useState } from 'react'
import { exportAPI } from '../utils/api'
import { useNotifications } from '../contexts/NotificationContext'

// Multi-Select Dropdown Component
const MultiSelectDropdown = ({ options, selectedValues, onChange, placeholder, className }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const handleToggle = (value) => {
    onChange(value)
  }
  
  const selectedCount = selectedValues.length
  const displayText = selectedCount === 0 
    ? placeholder 
    : selectedCount === 1 
      ? options.find(opt => opt.value === selectedValues[0])?.label || selectedValues[0]
      : `${selectedCount} sélectionné(s)`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${className} flex items-center justify-between w-full text-left focus:outline-none`}
      >
        <span className={selectedCount === 0 ? 'text-gray-500' : 'text-gray-900'}>
          {displayText}
        </span>
        <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value)
              return (
                <label
                  key={option.value}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(option.value)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">{option.label}</span>
                </label>
              )
            })}
            
            {selectedValues.length > 0 && (
              <div className="border-t border-gray-200 px-3 py-2">
                <button
                  onClick={() => {
                    selectedValues.forEach(value => onChange(value))
                    setIsOpen(false)
                  }}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Tout désélectionner
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingDashboard, setIsExportingDashboard] = useState(false)
  const [isExportingTasks, setIsExportingTasks] = useState(false)
  const [isExportingFinitions, setIsExportingFinitions] = useState(false)
  const [isExportingSQL, setIsExportingSQL] = useState(false)
  
  // Date ranges for each export type
  const [dashboardDateFrom, setDashboardDateFrom] = useState('')
  const [dashboardDateTo, setDashboardDateTo] = useState('')
  const [tasksDateFrom, setTasksDateFrom] = useState('')
  const [tasksDateTo, setTasksDateTo] = useState('')
  const [finitionsDateFrom, setFinitionsDateFrom] = useState('')
  const [finitionsDateTo, setFinitionsDateTo] = useState('')
  const [databaseDateFrom, setDatabaseDateFrom] = useState('')
  const [databaseDateTo, setDatabaseDateTo] = useState('')
  
  // Dashboard export column selection
  const availableColumns = [
    { value: 'numero_affaire', label: 'N° Affaire' },
    { value: 'numero_dm', label: 'N° DM' },
    { value: 'client', label: 'Client' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'date_limite_livraison_attendue', label: 'Date Limite Livraison Attendue' },
    { value: 'product', label: 'Produit' },
    { value: 'quantity', label: 'Quantité' },
    { value: 'numero_pms', label: 'N° PMS' },
    { value: 'statut', label: 'Statut' },
    { value: 'etape', label: 'Étape' },
    { value: 'atelier', label: 'Atelier' },
    { value: 'graphiste', label: 'Graphiste' },
    { value: 'agent_impression', label: 'Agent Impression' },
    { value: 'delai_estime', label: 'Délai Estimé' },
    { value: 'temps_estime', label: 'Temps Estimé (min)' },
    { value: 'bat', label: 'BAT' },
    { value: 'express', label: 'Express' },
    { value: 'pack_fin_annee', label: 'Pack Fin Année' },
    { value: 'commentaires', label: 'Commentaires' },
    { value: 'date_creation', label: 'Date Création' },
    { value: 'date_modification', label: 'Date Modification' }
  ]
  
  const [selectedColumns, setSelectedColumns] = useState(
    availableColumns.map(col => col.value) // Select all columns by default
  )
  
  const { addNotification } = useNotifications()
  
  const handleColumnToggle = (columnValue) => {
    setSelectedColumns(prev => 
      prev.includes(columnValue) 
        ? prev.filter(col => col !== columnValue)
        : [...prev, columnValue]
    )
  }

  const handleExportDatabase = async (format = 'excel') => {
    const setLoadingState = format === 'sql' ? setIsExportingSQL : setIsExporting;
    setLoadingState(true)
    
    try {
      // Prepare date parameters
      const dateParams = { format }
      if (databaseDateFrom) dateParams.dateFrom = databaseDateFrom
      if (databaseDateTo) dateParams.dateTo = databaseDateTo
      
      const blob = await exportAPI.exportDatabase(dateParams)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with current date and optional date range
      const currentDate = new Date().toISOString().split('T')[0]
      // SQL exports are now gzip compressed (.sql.gz)
      const extension = format === 'sql' ? 'sql.gz' : 'xlsx'
      let filename = `database_export_${currentDate}`
      if (databaseDateFrom || databaseDateTo) {
        filename += `_filtered`
        if (databaseDateFrom) filename += `_from_${databaseDateFrom}`
        if (databaseDateTo) filename += `_to_${databaseDateTo}`
      }
      link.download = `${filename}.${extension}`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      addNotification({
        type: 'success',
        title: 'Export réussi',
        message: `La base de données a été exportée avec succès en format ${format === 'sql' ? 'SQL' : 'Excel'}`
      })
      
    } catch (error) {
      console.error('Export error:', error)
      addNotification({
        type: 'error',
        title: 'Erreur d\'export',
        message: error.message || 'Erreur lors de l\'export de la base de données'
      })
    } finally {
      setLoadingState(false)
    }
  }

  const handleExportDashboardTable = async () => {
    setIsExportingDashboard(true)
    
    try {
      // Prepare date parameters
      const dateParams = {}
      if (dashboardDateFrom) dateParams.dateFrom = dashboardDateFrom
      if (dashboardDateTo) dateParams.dateTo = dashboardDateTo
      
      // Add selected columns
      if (selectedColumns.length > 0) {
        dateParams.columns = selectedColumns.join(',')
      }
      
      const blob = await exportAPI.exportDashboardTable(dateParams)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with current date and optional date range
      const currentDate = new Date().toISOString().split('T')[0]
      let filename = `dashboard_table_export_${currentDate}`
      if (dashboardDateFrom || dashboardDateTo) {
        filename += `_filtered`
        if (dashboardDateFrom) filename += `_from_${dashboardDateFrom}`
        if (dashboardDateTo) filename += `_to_${dashboardDateTo}`
      }
      link.download = `${filename}.xlsx`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      addNotification({
        type: 'success',
        title: 'Export réussi',
        message: 'Le tableau de bord a été exporté avec succès'
      })
      
    } catch (error) {
      console.error('Dashboard export error:', error)
      addNotification({
        type: 'error',
        title: 'Erreur d\'export',
        message: error.message || 'Erreur lors de l\'export du tableau de bord'
      })
    } finally {
      setIsExportingDashboard(false)
    }
  }

  const handleExportTasksTable = async () => {
    setIsExportingTasks(true)
    
    try {
      // Prepare date parameters
      const dateParams = {}
      if (tasksDateFrom) dateParams.dateFrom = tasksDateFrom
      if (tasksDateTo) dateParams.dateTo = tasksDateTo
      
      const blob = await exportAPI.exportTasksTable(dateParams)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with current date and optional date range
      const currentDate = new Date().toISOString().split('T')[0]
      let filename = `tasks_export_${currentDate}`
      if (tasksDateFrom || tasksDateTo) {
        filename += `_filtered`
        if (tasksDateFrom) filename += `_from_${tasksDateFrom}`
        if (tasksDateTo) filename += `_to_${tasksDateTo}`
      }
      link.download = `${filename}.xlsx`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      addNotification({
        type: 'success',
        title: 'Export réussi',
        message: 'Les tâches ont été exportées avec succès'
      })
      
    } catch (error) {
      console.error('Tasks export error:', error)
      addNotification({
        type: 'error',
        title: 'Erreur d\'export',
        message: error.message || 'Erreur lors de l\'export des tâches'
      })
    } finally {
      setIsExportingTasks(false)
    }
  }

  const handleExportFinitionsTable = async () => {
    setIsExportingFinitions(true)
    
    try {
      // Prepare date parameters
      const dateParams = {}
      if (finitionsDateFrom) dateParams.dateFrom = finitionsDateFrom
      if (finitionsDateTo) dateParams.dateTo = finitionsDateTo
      
      const blob = await exportAPI.exportFinitionsTable(dateParams)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with current date and optional date range
      const currentDate = new Date().toISOString().split('T')[0]
      let filename = `finitions_export_${currentDate}`
      if (finitionsDateFrom || finitionsDateTo) {
        filename += `_filtered`
        if (finitionsDateFrom) filename += `_from_${finitionsDateFrom}`
        if (finitionsDateTo) filename += `_to_${finitionsDateTo}`
      }
      link.download = `${filename}.xlsx`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      addNotification({
        type: 'success',
        title: 'Export réussi',
        message: 'Les finitions ont été exportées avec succès'
      })
      
    } catch (error) {
      console.error('Finitions export error:', error)
      addNotification({
        type: 'error',
        title: 'Erreur d\'export',
        message: error.message || 'Erreur lors de l\'export des finitions'
      })
    } finally {
      setIsExportingFinitions(false)
    }
  }

  return (
    <div className="settings-page p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Bienvenue sur la Page de Paramètres</h1>
        
        <div className="grid gap-6">
          {/* Dashboard Export Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Export Tableau de Bord</h2>
            <p className="text-gray-600 mb-6">
              Exportez toutes les données du tableau de bord principal avec tous les colonnes en format Excel.
            </p>
            
            {/* Date Range Selection */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Sélection de période (optionnel)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dashboard-date-from" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    id="dashboard-date-from"
                    value={dashboardDateFrom}
                    onChange={(e) => setDashboardDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00AABB] focus:border-[#00AABB]"
                  />
                </div>
                <div>
                  <label htmlFor="dashboard-date-to" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    id="dashboard-date-to"
                    value={dashboardDateTo}
                    onChange={(e) => setDashboardDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00AABB] focus:border-[#00AABB]"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Laissez vide pour exporter toutes les données
              </p>
            </div>
            
            {/* Column Selection */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Sélection des colonnes</h3>
              <div className="mb-2">
                <MultiSelectDropdown
                  options={availableColumns}
                  selectedValues={selectedColumns}
                  onChange={handleColumnToggle}
                  placeholder="Sélectionnez les colonnes à exporter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00AABB] focus:border-[#00AABB] bg-white"
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  {selectedColumns.length} colonne(s) sélectionnée(s)
                </p>
                <div className="space-x-2">
                  <button
                    onClick={() => setSelectedColumns(availableColumns.map(col => col.value))}
                    className="text-xs text-[#00AABB] hover:text-[#008A99]"
                  >
                    Tout sélectionner
                  </button>
                  <button
                    onClick={() => setSelectedColumns([])}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Tout désélectionner
                  </button>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleExportDashboardTable}
              disabled={isExportingDashboard}
              className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                isExportingDashboard
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-[#00AABB] text-white hover:bg-[#008A99] active:bg-[#007688]'
              }`}
            >
              {isExportingDashboard ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exportation en cours...
                </span>
              ) : (
                'Exporter le Tableau de Bord'
              )}
            </button>
          </div>

          {/* Tasks Export Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Export Table des Tâches</h2>
            <p className="text-gray-600 mb-6">
              Exportez toutes les tâches d'atelier avec leurs détails en format Excel.
            </p>
            
            {/* Date Range Selection */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Sélection de période (optionnel)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tasks-date-from" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    id="tasks-date-from"
                    value={tasksDateFrom}
                    onChange={(e) => setTasksDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00AABB] focus:border-[#00AABB]"
                  />
                </div>
                <div>
                  <label htmlFor="tasks-date-to" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    id="tasks-date-to"
                    value={tasksDateTo}
                    onChange={(e) => setTasksDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00AABB] focus:border-[#00AABB]"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Laissez vide pour exporter toutes les données
              </p>
            </div>
            
            <button
              onClick={handleExportTasksTable}
              disabled={isExportingTasks}
              className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                isExportingTasks
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-[#00AABB] text-white hover:bg-[#008A99] active:bg-[#007688]'
              }`}
            >
              {isExportingTasks ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exportation en cours...
                </span>
              ) : (
                'Exporter les Tâches'
              )}
            </button>
          </div>

          {/* Finitions Export Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Export Table des Finitions</h2>
            <p className="text-gray-600 mb-6">
              Exportez toutes les finitions avec agent finition, PMS, article, la finition, quantité, date début et date fin en format Excel.
            </p>
            
            {/* Date Range Selection */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Sélection de période (optionnel)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="finitions-date-from" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    id="finitions-date-from"
                    value={finitionsDateFrom}
                    onChange={(e) => setFinitionsDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00AABB] focus:border-[#00AABB]"
                  />
                </div>
                <div>
                  <label htmlFor="finitions-date-to" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    id="finitions-date-to"
                    value={finitionsDateTo}
                    onChange={(e) => setFinitionsDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00AABB] focus:border-[#00AABB]"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Laissez vide pour exporter toutes les données
              </p>
            </div>
            
            <button
              onClick={handleExportFinitionsTable}
              disabled={isExportingFinitions}
              className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                isExportingFinitions
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-[#00AABB] text-white hover:bg-[#008A99] active:bg-[#007688]'
              }`}
            >
              {isExportingFinitions ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exportation en cours...
                </span>
              ) : (
                'Exporter les Finitions'
              )}
            </button>
          </div>

          {/* Database Export Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Gestion de Base de Données</h2>
            <p className="text-gray-600 mb-6">
              Exportez la base de données complète pour des fins de sauvegarde ou d'analyse. Choisissez entre le format Excel pour l'analyse de données ou le format SQL pour la restauration de base de données.
            </p>
            
            {/* Date Range Selection */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Sélection de période (optionnel)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="database-date-from" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    id="database-date-from"
                    value={databaseDateFrom}
                    onChange={(e) => setDatabaseDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00AABB] focus:border-[#00AABB]"
                  />
                </div>
                <div>
                  <label htmlFor="database-date-to" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    id="database-date-to"
                    value={databaseDateTo}
                    onChange={(e) => setDatabaseDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#00AABB] focus:border-[#00AABB]"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Laissez vide pour exporter toutes les données
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Excel Export Button */}
              <button
                onClick={() => handleExportDatabase('excel')}
                disabled={isExporting}
                className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex-1 ${
                  isExporting
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-[#00AABB] text-white hover:bg-[#008A99] active:bg-[#007688]'
                }`}
              >
                {isExporting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exportation Excel en cours...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exporter en Excel
                  </span>
                )}
              </button>

              {/* SQL Export Button */}
              <button
                onClick={() => handleExportDatabase('sql')}
                disabled={isExportingSQL}
                className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex-1 ${
                  isExportingSQL
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
                }`}
              >
                {isExportingSQL ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exportation SQL en cours...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    Exporter en SQL
                  </span>
                )}
              </button>
            </div>

            {/* Format explanations */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="bg-blue-50 p-3 rounded">
                <div className="font-medium text-blue-800 mb-1">📊 Format Excel</div>
                <div>Idéal pour l'analyse de données, les rapports et l'import dans d'autres outils.</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded">
                <div className="font-medium text-emerald-800 mb-1">🗄️ Format SQL</div>
                <div>Parfait pour les sauvegardes complètes et la restauration de base de données.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
