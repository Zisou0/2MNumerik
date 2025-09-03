import React, { useState } from 'react'
import { exportAPI } from '../utils/api'
import { useNotifications } from '../contexts/NotificationContext'

function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingDashboard, setIsExportingDashboard] = useState(false)
  const [isExportingTasks, setIsExportingTasks] = useState(false)
  const [isExportingFinitions, setIsExportingFinitions] = useState(false)
  const [isExportingSQL, setIsExportingSQL] = useState(false)
  const { addNotification } = useNotifications()

  const handleExportDatabase = async (format = 'excel') => {
    const setLoadingState = format === 'sql' ? setIsExportingSQL : setIsExporting;
    setLoadingState(true)
    
    try {
      const blob = await exportAPI.exportDatabase(format)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0]
      const extension = format === 'sql' ? 'sql' : 'xlsx'
      link.download = `database_export_${currentDate}.${extension}`
      
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
      const blob = await exportAPI.exportDashboardTable()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0]
      link.download = `dashboard_table_export_${currentDate}.xlsx`
      
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
      const blob = await exportAPI.exportTasksTable()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0]
      link.download = `tasks_export_${currentDate}.xlsx`
      
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
      const blob = await exportAPI.exportFinitionsTable()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0]
      link.download = `finitions_export_${currentDate}.xlsx`
      
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
