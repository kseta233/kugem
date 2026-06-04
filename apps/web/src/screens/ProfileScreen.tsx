import type { User } from '@supabase/supabase-js'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { deleteMyAccount } from '@/features/profile/profile.service'
import { Button, Card, CoinBadge, Icon, Page } from '@/shared/components'
import type { Profile } from '@/types/profile'

const avatarOptions = ['icon:gamepad', 'icon:puzzle', 'icon:tap', 'icon:coin', 'icon:lock'] as const

const toAvatarIconName = (avatarValue: string | null | undefined) => {
  const value = avatarValue ?? ''
  if (value.startsWith('icon:')) {
    return value.replace('icon:', '') as 'gamepad' | 'puzzle' | 'tap' | 'coin' | 'lock'
  }
  return 'gamepad'
}

const termsParagraphs = [
  'By deleting your account, all profile information, coin balances, score history, game sessions, and share records linked to your account will be permanently removed from the platform.',
  'This action cannot be undone. Deleted data cannot be recovered later, including leaderboards, achievements, and any historical records tied to your account.',
  'If you continue, your account access will end immediately and you will be signed out from this device. To play again, you will need to start a new account.',
  'Please make sure your email confirmation is correct before submitting this request. The deletion process requires deliberate confirmation to prevent accidental loss.',
  'By checking the confirmation box and submitting this form, you acknowledge and agree to these account deletion terms and request permanent deletion of your account data.',
]

interface ProfileScreenProps {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  onBackToHome: () => void
  onOpenCoinLedger: () => void
  onRefresh: () => Promise<void>
  onDeleteAccountSuccess: () => Promise<void>
  onUpdateAvatar: (iconKey: string) => Promise<void>
}

interface SettingsSectionProps {
  title: string
  children: ReactNode
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section className="settings-section">
      <h2 className="settings-section__title">{title}</h2>
      {children}
    </section>
  )
}

interface SettingsCardProps {
  children: ReactNode
  className?: string
}

function SettingsCard({ children, className = '' }: SettingsCardProps) {
  return <Card className={`settings-card ${className}`.trim()}>{children}</Card>
}

interface SettingsRowProps {
  icon: 'trash' | 'help' | 'support' | 'coin'
  label: string
  onClick: () => void
  danger?: boolean
}

function SettingsRow({ icon, label, onClick, danger = false }: SettingsRowProps) {
  return (
    <button
      type="button"
      className={`settings-row ${danger ? 'is-danger' : ''}`.trim()}
      onClick={onClick}
    >
      <span className="settings-row__left">
        <Icon name={icon} size={18} className="app-icon" />
        <span>{label}</span>
      </span>
      <Icon name="arrow-right" size={18} className="app-icon settings-row__chevron" />
    </button>
  )
}

function WalletBalanceCard({ coin }: { coin: number }) {
  return (
    <SettingsCard className="wallet-balance-card">
      <div className="wallet-balance-card__coin" aria-hidden="true">
        <Icon name="coin" size={22} className="app-icon app-icon--coin" />
      </div>
      <p className="wallet-balance-card__label">Current Balance</p>
      <p className="wallet-balance-card__value">
        {coin.toLocaleString()} <span>Coins</span>
      </p>
    </SettingsCard>
  )
}

interface ConfirmDeleteDialogProps {
  open: boolean
  registeredEmail: string
  deleting: boolean
  error: string | null
  onClose: () => void
  onConfirm: (email: string) => Promise<void>
}

function ConfirmDeleteDialog({
  open,
  registeredEmail,
  deleting,
  error,
  onClose,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const termsScrollRef = useRef<HTMLDivElement | null>(null)
  const normalizedEmail = registeredEmail.trim().toLowerCase()
  const canUseDeleteFlow = normalizedEmail.length > 0

  useEffect(() => {
    if (!open) {
      return
    }
    setScrolledToEnd(false)
    setAcceptedTerms(false)
    setEmailInput('')
  }, [open])

  if (!open) {
    return null
  }

  const canDelete =
    canUseDeleteFlow &&
    scrolledToEnd &&
    acceptedTerms &&
    emailInput.trim().toLowerCase() === normalizedEmail &&
    !deleting

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

  return (
    <div className="delete-account-backdrop" onClick={onClose}>
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

        {!scrolledToEnd ? <small className="delete-account-hint">Scroll to the bottom to continue.</small> : null}

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
          <p className="inline-error">You need a registered account with email to use account deletion.</p>
        ) : null}

        {error ? <p className="inline-error">{error}</p> : null}

        <div className="delete-account-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!canDelete}
            onClick={() => void onConfirm(emailInput.trim())}
          >
            {deleting ? 'Deleting...' : 'Delete permanently'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

interface ContactSupportFormProps {
  open: boolean
  onClose: () => void
  onSubmitted: () => void
}

function ContactSupportForm({ open, onClose, onSubmitted }: ContactSupportFormProps) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setSubject('')
      setMessage('')
      setError(null)
    }
  }, [open])

  if (!open) {
    return null
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required.')
      return
    }

    setError(null)
    onSubmitted()
    onClose()
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <Card className="settings-overlay__panel" onClick={(event) => event.stopPropagation()}>
        <header className="settings-overlay__header">
          <h3>Contact Support</h3>
          <button type="button" className="settings-overlay__close" onClick={onClose} aria-label="Close contact support">
            <Icon name="x" size={18} className="app-icon" />
          </button>
        </header>

        <form className="contact-support-form" onSubmit={onSubmit}>
          <label htmlFor="support-subject">
            Subject
            <input
              id="support-subject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Enter a short subject"
            />
          </label>

          <label htmlFor="support-message">
            Message
            <textarea
              id="support-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell us what happened"
              rows={5}
            />
          </label>

          {error ? <p className="inline-error">{error}</p> : null}

          <Button type="submit" fullWidth>
            Submit
          </Button>
        </form>
      </Card>
    </div>
  )
}

function formatAccountId(user: User | null) {
  if (!user?.id) {
    return 'No account ID'
  }
  return user.id
}

export function ProfileScreen({
  user,
  profile,
  loading,
  error,
  onBackToHome,
  onOpenCoinLedger,
  onRefresh,
  onDeleteAccountSuccess,
  onUpdateAvatar,
}: ProfileScreenProps) {
  const hasProfile = Boolean(profile)
  const [deleteFlowOpen, setDeleteFlowOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [showFaq, setShowFaq] = useState(false)
  const [showContactSupport, setShowContactSupport] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const activeAvatar = toAvatarIconName(profile?.avatar_url)
  const registeredEmail = user?.is_anonymous ? '' : user?.email ?? ''

  useEffect(() => {
    if (!toastMessage) {
      return
    }
    const timer = window.setTimeout(() => setToastMessage(null), 1800)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  const accountLabel = useMemo(() => formatAccountId(user), [user])

  const onConfirmDelete = async (email: string) => {
    try {
      setDeleting(true)
      setDeleteError(null)
      await deleteMyAccount({
        email,
        acceptedTerms: true,
      })
      setDeleteFlowOpen(false)
      await onDeleteAccountSuccess()
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
      setAvatarPickerOpen(false)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Unable to update avatar icon.')
    } finally {
      setAvatarSaving(false)
    }
  }

  return (
    <Page
      title="Settings"
      className="settings-page"
      leading={
        <button
          type="button"
          className="settings-back-btn"
          data-testid="back-to-home"
          onClick={onBackToHome}
          aria-label="Back to home"
        >
          <Icon name="arrow-left" size={20} className="app-icon" />
        </button>
      }
      trailing={<CoinBadge testId="profile-coin-badge-settings" value={profile?.total_coin ?? 0} />}
    >
      <div className="settings-content">
        {loading ? (
          <SettingsCard>
            <p>Loading your profile data...</p>
          </SettingsCard>
        ) : null}

        {!loading && error ? (
          <SettingsCard>
            <div className="status-block error">
              <p>{error}</p>
              <Button type="button" onClick={() => void onRefresh()}>
                Retry
              </Button>
            </div>
          </SettingsCard>
        ) : null}

        {!loading && !error && !hasProfile ? (
          <SettingsCard>
            <div className="status-block empty">
              <p>Profile not found yet. Tap retry to sync profile.</p>
              <Button type="button" onClick={() => void onRefresh()}>
                Refresh
              </Button>
            </div>
          </SettingsCard>
        ) : null}

        {!loading && !error && hasProfile ? (
          <>
            <SettingsCard className="settings-profile-card" data-testid="profile-screen-card">
              <button
                type="button"
                className="settings-avatar-button"
                onClick={() => setAvatarPickerOpen(true)}
                aria-label="Change avatar"
              >
                <span className="settings-avatar">
                  <Icon
                    name={activeAvatar}
                    size={34}
                    className="app-icon app-icon--brand"
                  />
                </span>
                <span className="settings-avatar-edit" aria-hidden="true">
                  <Icon name="pencil" size={12} className="app-icon" />
                </span>
              </button>

              <div className="settings-identity">
                <h3>{profile?.display_name ?? 'Guest Player'}</h3>
                <p>{accountLabel}</p>
              </div>
            </SettingsCard>

            <SettingsSection title="ACCOUNT">
              <SettingsCard>
                <SettingsRow
                  icon="trash"
                  label="Delete Account"
                  danger
                  onClick={() => {
                    setDeleteError(null)
                    setDeleteFlowOpen(true)
                  }}
                />
              </SettingsCard>
            </SettingsSection>

            <SettingsSection title="COIN">
              <WalletBalanceCard coin={profile?.total_coin ?? 0} />
              <SettingsCard>
                <SettingsRow icon="coin" label="See History" onClick={onOpenCoinLedger} />
              </SettingsCard>
            </SettingsSection>

            <SettingsSection title="SUPPORT">
              <SettingsCard>
                <SettingsRow icon="help" label="FAQs" onClick={() => setShowFaq(true)} />
                <SettingsRow
                  icon="support"
                  label="Contact Support"
                  onClick={() => setShowContactSupport(true)}
                />
              </SettingsCard>
            </SettingsSection>
          </>
        ) : null}
      </div>

      {avatarPickerOpen ? (
        <div className="settings-overlay" onClick={() => setAvatarPickerOpen(false)}>
          <Card className="settings-overlay__panel" onClick={(event) => event.stopPropagation()}>
            <header className="settings-overlay__header">
              <h3>Choose Avatar</h3>
              <button
                type="button"
                className="settings-overlay__close"
                onClick={() => setAvatarPickerOpen(false)}
                aria-label="Close avatar picker"
              >
                <Icon name="x" size={18} className="app-icon" />
              </button>
            </header>

            <div className="settings-avatar-grid">
              {avatarOptions.map((option) => {
                const iconName = option.replace('icon:', '') as 'gamepad' | 'puzzle' | 'tap' | 'coin' | 'lock'
                const isActive = activeAvatar === iconName

                return (
                  <button
                    key={option}
                    type="button"
                    className={`settings-avatar-option ${isActive ? 'is-active' : ''}`.trim()}
                    aria-label={`Use ${iconName} icon`}
                    disabled={avatarSaving}
                    onClick={() => void onSelectAvatar(option)}
                  >
                    <Icon name={iconName} size={22} className="app-icon" />
                  </button>
                )
              })}
            </div>

            {avatarError ? <p className="inline-error">{avatarError}</p> : null}
          </Card>
        </div>
      ) : null}

      <ConfirmDeleteDialog
        open={deleteFlowOpen}
        registeredEmail={registeredEmail}
        deleting={deleting}
        error={deleteError}
        onClose={() => {
          setDeleteFlowOpen(false)
          setDeleteError(null)
        }}
        onConfirm={onConfirmDelete}
      />

      {showFaq ? (
        <div className="settings-overlay" onClick={() => setShowFaq(false)}>
          <Card className="settings-overlay__panel" onClick={(event) => event.stopPropagation()}>
            <header className="settings-overlay__header">
              <h3>FAQs</h3>
              <button
                type="button"
                className="settings-overlay__close"
                onClick={() => setShowFaq(false)}
                aria-label="Close FAQ"
              >
                <Icon name="x" size={18} className="app-icon" />
              </button>
            </header>

            <div className="settings-faq-content">
              <h4>How do I earn coins?</h4>
              <p>Play games and submit valid scores to receive rewards.</p>
              <h4>Can I share my score?</h4>
              <p>Yes, registered users can generate and share result links.</p>
              <h4>How do I delete my account?</h4>
              <p>Open ACCOUNT, tap Delete Account, then complete the confirmation journey.</p>
            </div>
          </Card>
        </div>
      ) : null}

      <ContactSupportForm
        open={showContactSupport}
        onClose={() => setShowContactSupport(false)}
        onSubmitted={() => setToastMessage('Support request submitted.')}
      />

      {toastMessage ? <div className="settings-toast">{toastMessage}</div> : null}
    </Page>
  )
}
