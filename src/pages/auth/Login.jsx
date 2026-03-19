import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function Login() {
  const session = useAuthStore(s => s.session)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const signIn = useAuthStore(s => s.signIn)

  if (session) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Email o password non corretti. Riprova.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-center text-mikai-400 mb-2">Mikai Eventi</h1>
        <p className="text-center text-gray-500 mb-8">Accedi al sistema</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400"
              placeholder="nome@mikai.it"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-base font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400"
            />
          </div>

          {error && (
            <p className="text-red-600 text-base" role="alert">{error}</p>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Accedi
          </Button>
        </form>
      </div>
    </div>
  )
}
