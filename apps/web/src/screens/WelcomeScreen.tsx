import type { CSSProperties } from 'react'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/profile'
import { CoinBadge } from '@/shared/components'

interface Props {
  user: User | null
  profile: Profile | null
  sessionSource: 'restored' | 'new' | null
  isExiting: boolean
  onContinue: () => void
}

const BENTO_CARD: CSSProperties = {
  background: 'var(--color-surface)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-4)',
  boxShadow: '0 4px 20px var(--color-shadow)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

export function WelcomeScreen({ user, profile, sessionSource, isExiting, onContinue }: Props) {
  const [copied, setCopied] = useState(false)

  const userId = user?.id ?? ''
  const displayName = profile?.display_name ?? 'Guest'
  const isReturning = sessionSource === 'restored'

  const copyId = () => {
    if (!userId) return
    void navigator.clipboard.writeText(userId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      data-testid="anonymous-auth-ready"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-bg)',
        overflowY: 'auto',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translateY(-12px)' : 'translateY(0)',
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: 'none',
          margin: '0 auto',
          width: '100%',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top bar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            background: 'rgba(248,249,250,0.88)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>🎮</span>
            <span style={{ font: 'var(--font-headline-md)', color: 'var(--color-brand)' }}>
              MiniPlay
            </span>
          </div>
          <CoinBadge testId="profile-coin-badge" value={profile?.total_coin ?? 0} />
        </header>

        {/* Scrollable content */}
        <main
          style={{
            flex: 1,
            padding: '20px 20px calc(20px + var(--safe-bottom))',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Decorative blob */}
          <div
            style={{
              position: 'fixed',
              top: '-20%',
              left: '-10%',
              width: '60%',
              height: '60%',
              background: 'rgba(124, 58, 237, 0.05)',
              borderRadius: '50%',
              filter: 'blur(80px)',
              pointerEvents: 'none',
              zIndex: -1,
            }}
          />

          {/* Hero */}
          <section style={{ textAlign: 'center', paddingTop: 16 }}>
            <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 16 }}>🎮</div>
            <h1
              style={{
                font: 'var(--font-display-lg)',
                color: 'var(--color-brand)',
                margin: '0 0 4px',
                letterSpacing: '-0.02em',
              }}
            >
              {isReturning ? 'Welcome back,' : 'Welcome,'}
            </h1>
            <h1
              style={{
                font: 'var(--font-display-lg)',
                color: 'var(--color-brand)',
                margin: '0 0 8px',
                letterSpacing: '-0.02em',
              }}
            >
              {displayName}!
            </h1>
            <p
              style={{
                font: 'var(--font-body-md)',
                color: 'var(--color-text-muted)',
                margin: 0,
              }}
            >
              {isReturning
                ? "We're glad to see you again."
                : 'Your anonymous session has been created.'}
            </p>
          </section>

          {/* Account ID card */}
          <div
            data-testid="session-persistence-indicator"
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              boxShadow: '0 4px 20px var(--color-shadow)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  font: 'var(--font-label-lg)',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Account ID
              </span>
              <span style={{ color: 'var(--color-brand)', fontSize: 18 }}>🔑</span>
            </div>
            <div
              style={{
                background: 'var(--color-surface-low)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <code
                style={{
                  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  flex: 1,
                  wordBreak: 'break-all',
                  lineHeight: 1.5,
                }}
              >
                {userId || '—'}
              </code>
              <button
                type="button"
                aria-label="Copy account ID"
                onClick={copyId}
                style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: 'none',
                  background: copied ? 'var(--color-brand-soft)' : 'transparent',
                  color: copied ? 'var(--color-brand)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                {copied ? '✓' : '⧉'}
              </button>
            </div>
          </div>

          {/* Stats bento grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <div
              style={{ ...BENTO_CARD, borderBottom: '3px solid var(--color-surface-variant)' }}
            >
              <span style={{ fontSize: 20 }}>🌐</span>
              <span
                style={{ font: 'var(--font-label-sm)', color: 'var(--color-text-muted)', marginTop: 8 }}
              >
                Status
              </span>
              <span style={{ font: 'var(--font-headline-md)', color: 'var(--color-text)' }}>
                {profile?.app_status ?? 'anonymous'}
              </span>
            </div>

            <div
              style={{ ...BENTO_CARD, borderBottom: '3px solid var(--color-surface-variant)' }}
            >
              <span style={{ fontSize: 20 }}>✏️</span>
              <span
                style={{ font: 'var(--font-label-sm)', color: 'var(--color-text-muted)', marginTop: 8 }}
              >
                Display Name
              </span>
              <span
                style={{
                  font: 'var(--font-headline-md)',
                  color: 'var(--color-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </span>
            </div>

            <div style={{ ...BENTO_CARD, borderBottom: '3px solid var(--color-coin-bg)' }}>
              <span style={{ fontSize: 20 }}>🪙</span>
              <span
                style={{ font: 'var(--font-label-sm)', color: 'var(--color-text-muted)', marginTop: 8 }}
              >
                Total Coin
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ font: 'var(--font-headline-md)', color: 'var(--color-text)' }}>
                  {profile?.total_coin ?? 0}
                </span>
                <span style={{ font: 'var(--font-label-sm)', color: 'var(--color-text-muted)' }}>
                  MPC
                </span>
              </div>
            </div>

            <div style={{ ...BENTO_CARD, borderBottom: '3px solid var(--color-brand-soft)' }}>
              <span style={{ fontSize: 20 }}>🕹️</span>
              <span
                style={{ font: 'var(--font-label-sm)', color: 'var(--color-text-muted)', marginTop: 8 }}
              >
                Total Play
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ font: 'var(--font-headline-md)', color: 'var(--color-text)' }}>
                  {profile?.total_play_count ?? 0}
                </span>
                <span style={{ font: 'var(--font-label-sm)', color: 'var(--color-text-muted)' }}>
                  Games
                </span>
              </div>
            </div>
          </div>

          {/* Ready to play card */}
          <div
            style={{
              background: 'rgba(237,221,255,0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              border: '1px solid rgba(99,14,212,0.1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <h3
              style={{
                font: 'var(--font-headline-md)',
                color: 'var(--color-brand)',
                margin: '0 0 4px',
              }}
            >
              Ready to play?
            </h3>
            <p
              style={{ font: 'var(--font-body-md)', color: 'var(--color-text-muted)', margin: 0 }}
            >
              Your progress is saved on this device. Play games to earn coins!
            </p>
            <div
              style={{
                position: 'absolute',
                right: -16,
                bottom: -16,
                fontSize: 96,
                opacity: 0.1,
                lineHeight: 1,
                transform: 'rotate(12deg)',
                pointerEvents: 'none',
              }}
            >
              🚀
            </div>
          </div>

          {/* Bottom CTA in normal flow for mobile scroll layout */}
          <div
            style={{
              marginTop: 8,
              paddingTop: 4,
            }}
          >
            <button
              type="button"
              data-testid="continue-to-games"
              onClick={onContinue}
              style={{
                width: '100%',
                minHeight: 56,
                background: 'var(--color-brand-container)',
                color: 'var(--color-brand-on)',
                border: 'none',
                borderBottom: '4px solid var(--color-brand-strong)',
                borderRadius: 'var(--radius-lg)',
                font: 'var(--font-headline-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 20px rgba(99,14,212,0.25)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              Continue to Games
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
