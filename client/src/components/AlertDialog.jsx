import { useEffect, useState } from 'react'

function AlertDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirmation", 
  message = "Êtes-vous sûr de vouloir continuer ?",
  confirmText = "Confirmer",
  cancelText = "Annuler",
  type = "warning", // warning, danger, info, error
  confirmDisabled = false, // New prop to disable confirm button
  showCancel = true // New prop to show/hide cancel button
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Small delay to trigger the animation
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsVisible(false)
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = () => {
    setIsVisible(false)
    // Wait for animation to complete before actually closing
    setTimeout(() => onClose(), 200)
  }

  const handleConfirm = () => {
    setIsVisible(false)
    setTimeout(() => onConfirm(), 200)
  }

  if (!isOpen) return null

  const getIconColor = () => {
    switch (type) {
      case 'danger': return 'text-red-600'
      case 'error': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      case 'info': return 'text-blue-600'
      default: return 'text-yellow-600'
    }
  }

  const getConfirmButtonColor = () => {
    switch (type) {
      case 'danger': return 'bg-red-600 hover:bg-red-700'
      case 'error': return 'bg-red-600 hover:bg-red-700'
      case 'warning': return 'bg-yellow-600 hover:bg-yellow-700'
      case 'info': return 'bg-blue-600 hover:bg-blue-700'
      default: return 'bg-yellow-600 hover:bg-yellow-700'
    }
  }

  return (
    <div className="fixed inset-0 z-99 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/30 transition-opacity duration-200 ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all duration-200 ease-out sm:my-8 sm:w-full sm:max-w-lg ${
          isVisible 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-4'
        }`}>
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10`}>
                <svg className={`h-6 w-6 ${getIconColor()}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className="text-base font-semibold leading-6 text-gray-900">
                  {title}
                </h3>
                <div className="mt-2">
                  {typeof message === 'string' ? (
                    <p className="text-sm text-gray-500">
                      {message}
                    </p>
                  ) : (
                    <div className="text-sm text-gray-500">
                      {message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              disabled={confirmDisabled}
              className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${getConfirmButtonColor()} ${confirmDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
            {showCancel && (
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                onClick={handleClose}
              >
                {cancelText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlertDialog