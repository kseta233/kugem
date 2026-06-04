import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Button, CoinBadge, Icon } from '@/shared/components'
import type { SessionSource } from '@/features/auth/auth.service'
import type { Profile } from '@/types/profile'

interface Props {
  profile: Profile | null
  sessionSource: SessionSource | null
  isExiting: boolean
  savingDisplayName: boolean
  onSaveDisplayName: (displayName: string) => Promise<void>
  onOpenAuth: () => void
  onContinue: () => void
}

const PLACEHOLDER_DISPLAY_NAME = 'Guest'

const hasCustomDisplayName = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 && trimmed.toLowerCase() !== PLACEHOLDER_DISPLAY_NAME.toLowerCase()
}

export function WelcomeScreen({
  profile,
  sessionSource,
  isExiting,
  savingDisplayName,
  onSaveDisplayName,
  onOpenAuth,
  onContinue,
}: Props) {
  const [nameInput, setNameInput] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const displayName = profile?.display_name?.trim() ?? ''
  const hasSavedName = hasCustomDisplayName(displayName)
  const isReturningUser = sessionSource === 'restored'
  const shouldShowNameInput = !isReturningUser

  useEffect(() => {
    setNameInput(hasSavedName ? displayName : '')
    setValidationError(null)
    setSubmitError(null)
  }, [displayName, hasSavedName])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = nameInput.trim()
    if (!trimmedName) {
      setValidationError('Enter your display name to continue.')
      return
    }

    if (profile?.app_status === 'registered' && trimmedName === displayName) {
      onContinue()
      return
    }

    try {
      setValidationError(null)
      setSubmitError(null)
      await onSaveDisplayName(trimmedName)
      onContinue()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save your display name.')
    }
  }

  return (
    <div
      data-testid="anonymous-auth-ready"
      className="welcome-screen"
      style={{
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translateY(-12px)' : 'translateY(0)',
      }}
    >
      <div className="welcome-screen__orb welcome-screen__orb--top" aria-hidden="true" />
      <div className="welcome-screen__orb welcome-screen__orb--bottom" aria-hidden="true" />

      <div className="welcome-screen__shell">
        <header className="welcome-screen__topbar">
          <div className="welcome-screen__brand">
            <span aria-hidden="true" className="welcome-screen__brand-mark">
              <Icon name="gamepad" size={22} className="app-icon app-icon--brand" />
            </span>
            <span>MiniPlay</span>
          </div>
          <CoinBadge testId="profile-coin-badge" value={profile?.total_coin ?? 0} />
        </header>

        <main className="welcome-screen__content">
          <section className="welcome-hero">
            <div className="welcome-hero__art" aria-hidden="true">
              <div className="welcome-hero__glow" />
              <div className="welcome-hero__controller">
                <Icon name="gamepad" size={72} className="app-icon app-icon--brand" />
              </div>
            </div>

            {!shouldShowNameInput ? (
              <>
                <p className="welcome-hero__eyebrow">Welcome</p>
                <h1 className="welcome-hero__title">{displayName || PLACEHOLDER_DISPLAY_NAME}</h1>
              </>
            ) : (
              <>
                <p className="welcome-hero__eyebrow">Welcome to MiniPlay</p>
                <h1 className="welcome-hero__title">Choose your name</h1>
                <p className="welcome-hero__subtitle">
                  Add a display name before you start. This is what other screens will show.
                </p>
              </>
            )}
          </section>

          {shouldShowNameInput ? (
            <section className="welcome-panel" data-testid="session-persistence-indicator">
              <div className="welcome-panel__header">
                <div>
                  <p className="welcome-panel__label">First Time Setup</p>
                  <h2>Set your display name</h2>
                </div>
              </div>

              <form className="welcome-name-form" onSubmit={(event) => void onSubmit(event)}>
                <label className="welcome-name-form__label" htmlFor="welcome-display-name">
                  Display name
                </label>
                <div className="welcome-name-form__field">
                  <input
                    id="welcome-display-name"
                    data-testid="welcome-display-name-input"
                    value={nameInput}
                    onChange={(event) => {
                      setNameInput(event.target.value)
                      if (validationError) {
                        setValidationError(null)
                      }
                    }}
                    placeholder="Enter your name"
                    aria-invalid={validationError ? 'true' : 'false'}
                    aria-describedby={validationError ? 'welcome-display-name-error' : undefined}
                    maxLength={32}
                    autoComplete="nickname"
                    required
                  />
                  <span aria-hidden="true" className="welcome-name-form__icon">
                    <Icon name="pencil" size={18} className="app-icon" />
                  </span>
                </div>
                {validationError ? (
                  <p
                    id="welcome-display-name-error"
                    data-testid="welcome-display-name-error"
                    className="inline-error"
                  >
                    {validationError}
                  </p>
                ) : null}
                {submitError ? <p className="inline-error">{submitError}</p> : null}

                <Button
                  type="submit"
                  data-testid="continue-to-games"
                  fullWidth
                  disabled={savingDisplayName}
                  className="welcome-cta"
                >
                  {savingDisplayName ? 'Saving...' : 'Start Playing'}
                  <Icon name="arrow-right" size={16} className="app-icon" />
                </Button>
              </form>

              <div className="welcome-email-hint">
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="welcome-email-hint__trigger"
                    data-testid="welcome-open-auth-page"
                    onClick={onOpenAuth}
                  >
                    Sign in or create account
                  </button>
                </p>
              </div>
            </section>
          ) : null}

          {!shouldShowNameInput ? (
            <Button
              type="button"
              data-testid="continue-to-games"
              onClick={onContinue}
              fullWidth
              className="welcome-cta"
            >
              Continue to Games
              <Icon name="arrow-right" size={16} className="app-icon" />
            </Button>
          ) : null}
        </main>
      </div>
    </div>
  )
}
