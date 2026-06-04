import { useEffect } from 'react'
import { Button, Card, Icon } from '@/shared/components'

type RegisterPromptModalProps = {
  open: boolean
  loading: boolean
  error: string | null
  onClose: () => void
  onGoogleAuth: () => Promise<void>
  onOpenAuthPage: () => void
}

export function RegisterPromptModal({
  open,
  loading,
  error,
  onClose,
  onGoogleAuth,
  onOpenAuthPage,
}: RegisterPromptModalProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) {
    return null
  }

  return (
    <div className="register-prompt-backdrop" role="presentation" onClick={onClose}>
      <Card
        className="register-prompt-modal"
        title="Register to share"
        role="dialog"
        aria-modal="true"
        aria-describedby="register-prompt-copy"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="register-prompt-modal__hero" aria-hidden="true">
          <Icon name="gamepad" size={28} className="app-icon app-icon--brand" />
        </div>

        <p id="register-prompt-copy" className="register-prompt-modal__copy">
          You need a registered account before you can create a share link or receive coin rewards.
        </p>

        {error ? <p className="inline-error">{error}</p> : null}

        <div className="register-prompt-modal__actions">
          <Button
            type="button"
            fullWidth
            disabled={loading}
            data-testid="register-with-google"
            onClick={() => void onGoogleAuth()}
          >
            {loading ? 'Opening Google...' : 'Register with Google'}
          </Button>

          <Button type="button" variant="secondary" fullWidth onClick={onOpenAuthPage}>
            Open register page
          </Button>

          <Button type="button" variant="ghost" fullWidth onClick={onClose}>
            Maybe later
          </Button>
        </div>
      </Card>
    </div>
  )
}