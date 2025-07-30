import React from 'react'
import { useNavigate } from 'react-router-dom'

const UnauthorizedPage = () => {
  const navigate = useNavigate()

  const handleGoHome = () => {
    navigate('/')
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Animated Icon */}
        <div className="mb-8 animate-bounce">
          <div className="mx-auto w-24 h-24 bg-cyan-100 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12"
              style={{ color: '#00AABB' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-7V6a3 3 0 00-6 0v1m6-1a3 3 0 616 0v1m-6-1V4a3 3 0 00-6 0v1m6-1V4a3 3 0 616 0v1"
              />
            </svg>
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-6xl font-bold mb-4 animate-pulse" style={{ color: '#00AABB' }}>
          401
        </h1>

        {/* Title */}
        <h2 className="text-3xl font-semibold text-gray-800 mb-4">
          Accès Non Autorisé
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          Oups ! Vous n'avez pas la permission d'accéder à cette page. 
          Veuillez vérifier vos identifiants ou contacter un administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoHome}
            className="w-full text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{ 
              backgroundColor: '#00AABB',
              '--tw-ring-color': '#00AABB'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#009AAA'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#00AABB'}
          >
            Aller à l'Accueil
          </button>
          
          <button
            onClick={handleGoBack}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
          >
            Retour
          </button>
        </div>
        
      </div>
    </div>
  )
}

export default UnauthorizedPage