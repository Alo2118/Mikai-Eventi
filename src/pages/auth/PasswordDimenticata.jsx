import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import { INPUT_STYLE } from '../../lib/constants'

export function PasswordDimenticata() {
  const requestPasswordReset = useAuthStore(s => s.requestPasswordReset)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const backToLogin = (
    <Link
      to="/login"
      className="flex items-center justify-center min-h-[48px] text-base text-mikai-500 hover:underline rounded-lg"
    >
      Torna all'accesso
    </Link>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await requestPasswordReset(email.trim())
    setLoading(false)
    if (error) {
      setError('Non siamo riusciti a inviare l\'email. Riprova tra qualche minuto.')
      return
    }
    setSent(true)
  }

  return (
    <AuthLayout subtitle="Recupera la password">
      {sent ? (
        <div className="space-y-5">
          <p className="text-base text-gray-700" role="status">
            Se <strong>{email}</strong> è registrata, ti abbiamo mandato un'email con un link
            per scegliere una nuova password. Controlla anche nella posta indesiderata.
          </p>
          {backToLogin}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-base text-gray-600">
            Scrivi la tua email di lavoro: ti mandiamo un link per scegliere una nuova password.
          </p>
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

          {error && <p className="text-red-600 text-base" role="alert">{error}</p>}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Inviami il link
          </Button>
          {backToLogin}
        </form>
      )}
    </AuthLayout>
  )
}

