import type { User } from '@supabase/supabase-js'
import { useMemo, useRef, useState } from 'react'
import { deleteMyAccount } from '@/features/profile/profile.service'
import { Button, Card, CoinBadge, Icon, Page } from '@/shared/components'
import type { Profile } from '@/types/profile'

const avatarOptions = ['icon:gamepad', 'icon:puzzle', 'icon:tap', 'icon:coin', 'icon:lock'] as const

const toAvatarIconName = (avatarValue: string | null | undefined) => {
  const value = avatarValue ?? ''
  if (value.startsWith('icon:')) {
    return value.replace('icon:', '')
  }
  return 'gamepad'
}

interface ProfileScreenProps {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  signingOut: boolean
  onBackToHome: () => void
  onRefresh: () => Promise<void>
  onSignOut: () => Promise<void>
  onUpdateAvatar: (iconKey: string) => Promise<void>
}

export function ProfileScreen({
  user,
  profile,
  loading,
  error,
  signingOut,
  onBackToHome,
  onRefresh,
  onSignOut,
  onUpdateAvatar,
}: ProfileScreenProps) {
  const hasProfile = Boolean(profile)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteFlowOpen, setDeleteFlowOpen] = useState(false)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const termsScrollRef = useRef<HTMLDivElement | null>(null)
  const activeAvatar = toAvatarIconName(profile?.avatar_url)

  const normalizedEmail = (user?.email ?? '').trim().toLowerCase()
  const canUseDeleteFlow = Boolean(normalizedEmail) && !user?.is_anonymous

  const canDelete =
    canUseDeleteFlow &&
    scrolledToEnd &&
    acceptedTerms &&
    emailInput.trim().toLowerCase() === normalizedEmail &&
    !deleting

  const termsParagraphs = useMemo(
    () => [
      'By deleting your account, all profile information, coin balances, score history, game sessions, and share records linked to your account will be permanently removed from the platform.',
      'This action cannot be undone. Deleted data cannot be recovered later, including leaderboards, achievements, and any historical records tied to your account.',
      'If you continue, your account access will end immediately and you will be signed out from this device. To play again, you will need to start a new account.',
      'Please make sure your email confirmation is correct before submitting this request. The deletion process requires deliberate confirmation to prevent accidental loss.',
      'By checking the confirmation box and submitting this form, you acknowledge and agree to these account deletion terms and request permanent deletion of your account data.',
    ],
    [],
  )

  const openDeleteFlow = () => {
    setMenuOpen(false)
    setDeleteFlowOpen(true)
    setScrolledToEnd(false)
    setAcceptedTerms(false)
    setEmailInput('')
    setDeleteError(null)
  }

  const closeDeleteFlow = () => {
    setDeleteFlowOpen(false)
    setDeleteError(null)
  }

  const onTermsScroll = () => {
    const element = termsScrollRef.current
    if (!element || scrolledToEnd) {
      return
    }

    const reachedBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 8
    if (reachedBottom) {
      setScrolledToEnd(true)
    }
  }

  const onConfirmDelete = async () => {
    if (!canDelete) {
      return
    }

    try {
      setDeleting(true)
      setDeleteError(null)
      await deleteMyAccount({
        email: emailInput.trim(),
        acceptedTerms: true,
      })
      closeDeleteFlow()
      await onSignOut()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete account right now.'
      setDeleteError(message)
    } finally {
      setDeleting(false)
    }
  }

  const onSelectAvatar = async (iconKey: string) => {
    if (avatarSaving) {
      return
    }

    try {
      setAvatarSaving(true)
      setAvatarError(null)
      await onUpdateAvatar(iconKey)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Unable to update avatar icon.')
    } finally {
      setAvatarSaving(false)
    }
  }

  return (
    <Page
      title="Profile"
      leading={
        <button
          type="button"
          className="home-profile-pill"
          data-testid="back-to-home"
          onClick={onBackToHome}
        >
          <Icon name="arrow-left" size={16} className="app-icon" />
          <span>Home</span>
        </button>
      }
      trailing={<CoinBadge testId="profile-coin-badge" value={profile?.total_coin ?? 0} />}
    >
      {loading ? (
        <Card title="Loading">
          <p>Loading your profile data...</p>
        </Card>
      ) : null}

      {!loading && error ? (
        <Card title="Unable to load profile">
          <div className="status-block error">
            <p>{error}</p>
            <Button type="button" onClick={() => void onRefresh()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {!loading && !error && !hasProfile ? (
        <Card title="Profile unavailable">
          <div className="status-block empty">
            <p>Profile not found yet. Tap retry to sync profile.</p>
            <Button type="button" onClick={() => void onRefresh()}>
              Refresh
            </Button>
          </div>
        </Card>
      ) : null}

      {!loading && !error && hasProfile ? (
        <Card className="profile-redesign-card" data-testid="profile-screen-card">
          <div className="profile-redesign__top">
            <div className="profile-redesign__avatar" aria-hidden="true">
              <Icon name={activeAvatar as 'gamepad' | 'puzzle' | 'tap' | 'coin' | 'lock'} size={34} className="app-icon app-icon--brand" />
            </div>

            <div className="profile-redesign__identity">
              <h2>{profile?.display_name ?? 'Guest Player'}</h2>
              <p>{user?.email ?? 'Anonymous account'}</p>
            </div>

            <div className="profile-redesign__menu-wrap">
              <button
                type="button"
                className="profile-redesign__menu-trigger"
                aria-label="Open profile menu"
                onClick={() => setMenuOpen((value) => !value)}
              >
                <span aria-hidden="true">⋯</span>
              </button>

              {menuOpen ? (
                <div className="profile-redesign__menu" role="menu">
                  <button type="button" role="menuitem" onClick={openDeleteFlow}>
                    Delete account
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <section className="profile-redesign__avatar-picker" aria-label="Avatar icon picker">
            <p>Avatar icon</p>
            <div className="profile-redesign__avatar-grid">
              {avatarOptions.map((option) => {
                const iconName = option.replace('icon:', '') as 'gamepad' | 'puzzle' | 'tap' | 'coin' | 'lock'
                const isActive = activeAvatar === iconName

                return (
                  <button
                    key={option}
                    type="button"
                    className={`profile-redesign__avatar-option ${isActive ? 'is-active' : ''}`.trim()}
                    aria-label={`Use ${iconName} icon`}
                    disabled={avatarSaving}
                    onClick={() => void onSelectAvatar(option)}
                  >
                    <Icon name={iconName} size={20} className="app-icon" />
                  </button>
                )
              })}
            </div>
            {avatarError ? <p className="inline-error">{avatarError}</p> : null}
          </section>

          <div className="profile-redesign__stats">
            <article className="profile-redesign__stat">
              <p>Total Coins</p>
              <strong>{profile?.total_coin ?? 0}</strong>
            </article>
            <article className="profile-redesign__stat">
              <p>Games Played</p>
              <strong>{profile?.total_play_count ?? 0}</strong>
            </article>
          </div>

          <div className="profile-redesign__footnote">
            <small>User ID: {user?.id}</small>
          </div>

          <div className="detail-actions">
            <Button type="button" onClick={() => void onRefresh()}>
              Refresh profile
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              data-testid="signout-control"
              disabled={signingOut}
              onClick={() => void onSignOut()}
            >
              {signingOut ? 'Signing out...' : 'Sign out'}
            </Button>
          </div>
        </Card>
      ) : null}

      {deleteFlowOpen ? (
        <div className="delete-account-backdrop" onClick={closeDeleteFlow}>
          <Card className="delete-account-dialog" onClick={(event) => event.stopPropagation()}>
            <h2>Delete Account</h2>
            <p>
              Review the terms below. Scroll to the end, accept the terms, and enter your registered
              email to confirm permanent deletion.
            </p>

            <div
              ref={termsScrollRef}
              className="delete-account-terms"
              onScroll={onTermsScroll}
              data-testid="delete-account-terms"
            >
              {termsParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {!scrolledToEnd ? (
              <small className="delete-account-hint">Scroll to the bottom to continue.</small>
            ) : null}

            <label className="delete-account-check" htmlFor="delete-account-accept">
              <input
                id="delete-account-accept"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
              />
              <span>I have read and agree to the account deletion terms.</span>
            </label>

            <label className="delete-account-email" htmlFor="delete-account-email-input">
              Registered email
              <input
                id="delete-account-email-input"
                type="email"
                placeholder="name@example.com"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                disabled={!canUseDeleteFlow || deleting}
              />
            </label>

            {!canUseDeleteFlow ? (
              <p className="inline-error">
                You need a registered account with email to use account deletion.
              </p>
            ) : null}

            {deleteError ? <p className="inline-error">{deleteError}</p> : null}

            <div className="delete-account-actions">
              <Button type="button" variant="ghost" onClick={closeDeleteFlow}>
                Cancel
              </Button>
              <Button type="button" variant="secondary" disabled={!canDelete} onClick={() => void onConfirmDelete()}>
                {deleting ? 'Deleting...' : 'Delete permanently'}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </Page>
  )
}