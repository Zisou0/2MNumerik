import React, { useState } from 'react'
import { exportAPI } from '../utils/api'
import { useNotifications } from '../contexts/NotificationContext'

function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false)
  const { addNotification } = useNotifications()

  const handleExportDatabase = async () => {
    setIsExporting(true)
    
    try {
      const blob = await exportAPI.exportDatabase()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0]
      link.download = `database_export_${currentDate}.xlsx`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      addNotification({
        type: 'success',
        title: 'Export réussi',
        message: 'La base de données a été exportée avec succès'
      })
      
    } catch (error) {
      console.error('Export error:', error)
      addNotification({
        type: 'error',
        title: 'Erreur d\'export',
        message: error.message || 'Erreur lors de l\'export de la base de données'
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="settings-page p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Welcome to Settings Page</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Database Management</h2>
          <p className="text-gray-600 mb-6">
            Export all database tables to an Excel file for backup or analysis purposes.
          </p>
          
          <button
            onClick={handleExportDatabase}
            disabled={isExporting}
            className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
              isExporting
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-[#00AABB] text-white hover:bg-[#008A99] active:bg-[#007688]'
            }`}
          >
            {isExporting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </span>
            ) : (
              'Export Database'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
