import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import logoPrimary from '../assets/logoprimary.png'
import Input from '../components/InputComponent'
import Button from '../components/ButtonComponent'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Simple validation
    if (!email || !password) {
      setError('Veuillez saisir votre email et votre mot de passe')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      await login({ email, password })
      navigate('/')
    } catch (error) {
      console.error('Login error:', error)
      setError(error.message || 'Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Blue Header Bar */}
      <header className="bg-[#00AABB] text-white py-4 px-6  ">
      </header>
      
      {/* Login Form */}
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="max-w-lg w-full p-6 bg-white rounded-3xl shadow-lg">
          <div className='flex justify-center m-8'> 
            <img src={logoPrimary} alt="" />
          </div>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Saisissez votre email"
              disabled={isLoading}
            />
            
            <Input
              label="Mot de passe"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Saisissez votre mot de passe"
              className="mb-6"
              disabled={isLoading}
            />
            
            <div className="flex justify-center">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </div>
            
            <p className='text-xs text-gray-500 mt-2 px-4'>
              Si vous avez oublié votre mot de passe, contactez votre responsable pour le réinitialiser
            </p>
            
          
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage