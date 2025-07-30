import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import logoPrimary from '../assets/logoprimary.png'
import Input from '../components/InputComponent'
import Button from '../components/ButtonComponent'

const RegisterPage = () => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { register } = useAuth()

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validatePassword = (password) => {
    const minLength = password.length >= 6
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    
    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers,
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      setError('Tous les champs sont obligatoires')
      return
    }

    if (!validateEmail(email)) {
      setError('Format d\'email invalide')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      let errorMessage = 'Le mot de passe doit contenir au moins :'
      if (!passwordValidation.minLength) errorMessage += '\n• 6 caractères'
      if (!passwordValidation.hasUpperCase) errorMessage += '\n• Une lettre majuscule'
      if (!passwordValidation.hasLowerCase) errorMessage += '\n• Une lettre minuscule'
      if (!passwordValidation.hasNumbers) errorMessage += '\n• Un chiffre'
      
      setError(errorMessage)
      return
    }

    if (username.length < 3) {
      setError('Le nom d\'utilisateur doit contenir au moins 3 caractères')
      return
    }

    setLoading(true)
    try {
      await register({ username, email, password })
      navigate('/')
    } catch (err) {
      console.error('Registration error:', err)
      
      if (err.message.includes('email')) {
        setError('Cette adresse email est déjà utilisée')
      } else if (err.message.includes('username')) {
        setError('Ce nom d\'utilisateur est déjà pris')
      } else if (err.message.includes('network') || err.message.includes('Failed to fetch')) {
        setError('Erreur de connexion. Vérifiez votre connexion internet.')
      } else {
        setError(err.message || 'Erreur lors de l\'inscription. Veuillez réessayer.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Blue Header Bar */}
      <header className="bg-[#00AABB] text-white py-4 px-6">
      </header>
      
      {/* Register Form */}
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="max-w-lg w-full p-6 bg-white rounded-3xl shadow-lg">
          <div className='flex justify-center m-8'> 
            <img src={logoPrimary} alt="Logo" />
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 whitespace-pre-line">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <Input
              label="Nom d'utilisateur"
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Saisissez votre nom d'utilisateur"
              minLength={3}
            />
            
            <Input
              label="Email"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Saisissez votre email"
            />
            
            <Input
              label="Mot de passe"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Saisissez votre mot de passe"
            />
            
            <Input
              label="Confirmer le mot de passe"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmez votre mot de passe"
              className="mb-6"
            />
            
            <Button type="submit" disabled={loading}>
              {loading ? 'Inscription...' : 'S\'inscrire'}
            </Button>
            
            <div className="text-center mt-4">
              <Link to="/login" className="text-[#00AABB] hover:underline text-sm">
                Déjà un compte ? Se connecter
              </Link>
            </div>
            
            <p className='text-xs text-gray-500 mt-2 px-4 text-center'>
              En vous inscrivant, vous acceptez nos conditions d'utilisation
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage