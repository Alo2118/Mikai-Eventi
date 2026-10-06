import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import { INPUT_STYLE } from '../../lib/constants'

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
    <AuthLayout subtitle="Accedi al sistema">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={INPUT_STYLE}
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
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={INPUT_STYLE}
          />
        </div>

        {error && (
          <p className="text-red-600 text-base" role="alert">{error}</p>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Accedi
        </Button>
      </form>
      <Link
        to="/password-dimenticata"
        className="mt-3 flex items-center justify-center min-h-[48px] text-base text-mikai-500 hover:underline rounded-lg"
      >
        Password dimenticata?
      </Link>
    </AuthLayout>
  )
}
