import type { FormEvent } from 'react'
import { useState } from 'react'
import { useAnonymousAuth } from '@/features/auth/useAnonymousAuth'
import { startGameSession } from '@/features/sessions/sessions.service'
import { Button, Card, CoinBadge, Page } from '@/shared/components'

type Screen = 'catalog' | 'detail' | 'play' | 'result'

function App() {
  const { user, profile, sessionSource, loading, error, refresh, signOutAndRestart, updateDisplayName } =
    useAnonymousAuth()
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [screen, setScreen] = useState<Screen>('catalog')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [startingSession, setStartingSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [reactionTimeMs, setReactionTimeMs] = useState<number | null>(null)
  const activeProfile = profile

  const onSubmitDisplayName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSaving(true)
      await updateDisplayName(displayNameInput)
      setDisplayNameInput('')
    } finally {
      setSaving(false)
    }
  }

  const hasProfile = Boolean(activeProfile)
  const isRestoredSession = sessionSource === 'restored'

  const onSignOut = async () => {
    try {
      setSigningOut(true)
      await signOutAndRestart()
    } finally {
      setSigningOut(false)
    }
  }

  const onOpenDetail = () => {
    setScreen('detail')
  }

  const onBackToCatalog = () => {
    setScreen('catalog')
    setSessionError(null)
  }

  const onStartSession = async () => {
    try {
      setStartingSession(true)
      setSessionError(null)
      const session = await startGameSession('reaction-time')
      setSessionId(session.sessionId)
      setScreen('play')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start game session'
      setSessionError(message)
    } finally {
      setStartingSession(false)
    }
  }

  const onFinishPlay = () => {
    const ms = Math.floor(160 + Math.random() * 240)
    setReactionTimeMs(ms)
    setScreen('result')
  }

  const onPlayAgain = () => {
    setReactionTimeMs(null)
    setScreen('play')
  }

  return (
    <Page
      title="MiniPlay"
      leading={<span className="profile-chip">{activeProfile?.display_name ?? 'Guest Player'}</span>}
      trailing={<CoinBadge testId="profile-coin-badge" value={activeProfile?.total_coin ?? 0} />}
    >
      <section className="headline-block">
        <h2>Profile Setup</h2>
        <p>Anonymous account with persistent local session on this device.</p>
      </section>

      <Card title="Account Session">
        {!loading && sessionSource ? (
          <div
            data-testid="session-persistence-indicator"
            className={`session-indicator ${isRestoredSession ? 'is-restored' : 'is-new'}`}
          >
            <span className="session-dot" aria-hidden="true" />
            <span>
              {isRestoredSession
                ? 'Session restored from this device'
                : 'New anonymous session created'}
            </span>
          </div>
        ) : null}

        {loading ? <p>Loading session and profile...</p> : null}

        {!loading && error ? (
          <div className="status-block error">
            <p>{error}</p>
            <Button type="button" onClick={() => void refresh()}>
              Retry
            </Button>
          </div>
        ) : null}

        {!loading && !error && !hasProfile ? (
          <div className="status-block empty">
            <p>Profile not found yet. Tap retry to sync profile.</p>
            <Button type="button" onClick={() => void refresh()}>
              Refresh
            </Button>
          </div>
        ) : null}

        {!loading && !error && hasProfile ? (
          <div className="status-block success" data-testid="anonymous-auth-ready">
            <dl className="kv-list">
              <div>
                <dt>User ID</dt>
                <dd>{user?.id}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{activeProfile?.app_status}</dd>
              </div>
              <div>
                <dt>Display Name</dt>
                <dd>{activeProfile?.display_name ?? '-'}</dd>
              </div>
              <div>
                <dt>Total Coin</dt>
                <dd>
                  <CoinBadge value={activeProfile?.total_coin ?? 0} />
                </dd>
              </div>
              <div>
                <dt>Total Play</dt>
                <dd>{activeProfile?.total_play_count ?? 0}</dd>
              </div>
            </dl>

            <form className="inline-form" onSubmit={(event) => void onSubmitDisplayName(event)}>
              <input
                value={displayNameInput}
                onChange={(event) => setDisplayNameInput(event.target.value)}
                placeholder="Update display name"
                aria-label="Display name"
                maxLength={32}
              />
              <Button type="submit" fullWidth disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </form>

            <Button
              type="button"
              variant="secondary"
              fullWidth
                data-testid="signout-control"
              disabled={signingOut}
              onClick={() => void onSignOut()}
            >
              {signingOut ? 'Signing out...' : 'Sign out and create new anonymous session'}
            </Button>
          </div>
        ) : null}
      </Card>

      <Card title="Game Catalog" className="game-card" data-testid="game-catalog">
        {screen === 'catalog' ? (
          <section className="catalog-grid" data-testid="game-catalog-list">
            <article className="catalog-item" data-testid="reaction-game-card">
              <div className="catalog-thumb" />
              <h3>Reaction Time</h3>
              <p>Tap as fast as possible when the signal appears.</p>
              <Button fullWidth data-testid="open-reaction-detail" onClick={onOpenDetail}>
                Open Game
              </Button>
            </article>
          </section>
        ) : null}

        {screen === 'detail' ? (
          <section className="detail-panel" data-testid="reaction-detail-screen">
            <h3>Reaction Time</h3>
            <p>Wait for signal, tap fast, and beat your own best time.</p>
            {sessionError ? (
              <p className="inline-error" data-testid="session-start-error">
                {sessionError}
              </p>
            ) : null}
            <div className="detail-actions">
              <Button
                fullWidth
                data-testid="start-game-session"
                disabled={startingSession}
                onClick={() => void onStartSession()}
              >
                {startingSession ? 'Starting session...' : 'Start Game Session'}
              </Button>
              <Button fullWidth variant="secondary" onClick={onBackToCatalog}>
                Back to Catalog
              </Button>
            </div>
          </section>
        ) : null}

        {screen === 'play' ? (
          <section className="game-frame" data-testid="game-play-screen" aria-label="Portrait game area preview">
            <div className="game-frame-inner">
              <p>TAP TO START</p>
              <button
                type="button"
                className="tap-orb"
                data-testid="tap-play-area"
                aria-label="Tap play area"
                onClick={onFinishPlay}
              >
                Tap
              </button>
              <small data-testid="session-started-state">
                Session active: {sessionId ?? '-'}
              </small>
            </div>
          </section>
        ) : null}

        {screen === 'result' ? (
          <section className="result-panel" data-testid="score-result-screen">
            <h3>Reaction Time</h3>
            <p data-testid="reaction-time-result">{reactionTimeMs ?? 0}ms</p>
            <CoinBadge value={50} />
            <div className="detail-actions">
              <Button fullWidth data-testid="play-again-action" onClick={onPlayAgain}>
                Play Again
              </Button>
              <Button fullWidth variant="secondary" onClick={onBackToCatalog}>
                Back to Games
              </Button>
            </div>
          </section>
        ) : null}
      </Card>

      <footer className="foot-note">Ready for Phase 2 game catalog screen implementation.</footer>
    </Page>
  )
}

export default App
