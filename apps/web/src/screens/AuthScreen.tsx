import type { FormEvent } from 'react'
import { useState } from 'react'
import { Button, Icon } from '@/shared/components'

type AuthMode = 'signin' | 'signup'

interface AuthScreenProps {
  loading: boolean
  error: string | null
  onBack: () => void
  onGoogleAuth: () => Promise<void>
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (displayName: string, email: string, password: string) => Promise<void>
}

export function AuthScreen({ loading, error, onBack, onGoogleAuth, onSignIn, onSignUp }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signup')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isSignUp = mode === 'signup'

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedEmail = email.trim()
    const trimmedName = displayName.trim()

    if (!trimmedEmail || !password) {
      setSubmitError('Email and password are required.')
      return
    }

    if (isSignUp && !trimmedName) {
      setSubmitError('Display name is required.')
      return
    }

    if (isSignUp && !acceptedTerms) {
      setSubmitError('You need to accept terms to create an account.')
      return
    }

    try {
      setSubmitting(true)
      setSubmitError(null)

      if (isSignUp) {
        await onSignUp(trimmedName, trimmedEmail, password)
      } else {
        await onSignIn(trimmedEmail, password)
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to authenticate.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-screen" data-testid="auth-screen">
      <div className="auth-screen__shell">
        <header className="auth-screen__header">
          <button
            type="button"
            className="auth-screen__back"
            data-testid="auth-back"
            aria-label="Back to welcome"
            onClick={onBack}
          >
            <Icon name="arrow-left" size={18} className="app-icon" />
          </button>
          <span className="auth-screen__logo" aria-hidden="true">
            <Icon name="gamepad" size={24} className="app-icon app-icon--brand" />
          </span>
        </header>

        <section className="auth-screen__headline">
          <h1>{isSignUp ? 'Create Account' : 'Sign In'}</h1>
          <p>
            {isSignUp
              ? 'Join MiniPlay and start climbing the ranks.'
              : 'Welcome back. Sign in to continue your progress.'}
          </p>
        </section>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`auth-tab ${mode === 'signup' ? 'is-active' : ''}`.trim()}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={`auth-tab ${mode === 'signin' ? 'is-active' : ''}`.trim()}
            onClick={() => setMode('signin')}
          >
            Sign In
          </button>
        </div>

        <div className="auth-social-block">
          <Button
            type="button"
            fullWidth
            variant="secondary"
            className="auth-google-button"
            disabled={submitting || loading}
            data-testid="auth-google-button"
            onClick={() => void onGoogleAuth()}
          >
            {submitting || loading
              ? 'Opening Google...'
              : isSignUp
                ? 'Sign Up with Google'
                : 'Sign In with Google'}
          </Button>
          <p className="auth-social-copy">Google sign in unlocks sharing and coin rewards.</p>
        </div>

        <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
          {isSignUp ? (
            <label className="auth-field" htmlFor="auth-display-name">
              <span>Display name</span>
              <input
                id="auth-display-name"
                data-testid="auth-display-name-input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Display Name"
                autoComplete="nickname"
                maxLength={32}
                required
              />
            </label>
          ) : null}

          <label className="auth-field" htmlFor="auth-email">
            <span>Email</span>
            <input
              id="auth-email"
              type="email"
              data-testid="auth-email-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field auth-field--password" htmlFor="auth-password">
            <span>Password</span>
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              data-testid="auth-password-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
            />
            <button
              type="button"
              className="auth-password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((current) => !current)}
            >
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} className="app-icon" />
            </button>
          </label>

          {isSignUp ? (
            <label className="auth-terms" htmlFor="auth-accept-terms">
              <input
                id="auth-accept-terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
              />
              <span>I agree to the Terms & Conditions</span>
            </label>
          ) : null}

          {submitError ? <p className="inline-error">{submitError}</p> : null}
          {!submitError && error ? <p className="inline-error">{error}</p> : null}

          <Button
            type="submit"
            fullWidth
            className="auth-submit"
            disabled={submitting || loading}
            data-testid="auth-submit"
          >
            {submitting || loading
              ? isSignUp
                ? 'Creating account...'
                : 'Signing in...'
              : isSignUp
                ? 'Sign Up'
                : 'Sign In'}
          </Button>
        </form>

        <footer className="auth-footer">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              className="auth-inline-switch"
              onClick={() => setMode(isSignUp ? 'signin' : 'signup')}
            >
              {isSignUp ? 'Sign In' : 'Create one'}
            </button>
          </p>
        </footer>
      </div>
    </main>
  )
}
