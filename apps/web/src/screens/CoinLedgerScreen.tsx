import { useEffect, useState } from 'react'
import { getCoinLedger } from '@/features/profile/profile.service'
import { Button, Card, CoinBadge, Icon, Page } from '@/shared/components'
import type { CoinLedgerEntry } from '@/types/profile'

interface CoinLedgerScreenProps {
  profileCoin: number
  onBackToProfile: () => void
}

const toReasonLabel = (entry: CoinLedgerEntry): string => {
  const reason = entry.reason ?? ''
  if (reason === 'LEADERBOARD_ENTRY_REWARD') {
    return 'Leaderboard reward'
  }
  if (reason === 'VALID_SCORE_REWARD') {
    return 'Valid score reward'
  }
  if (reason === 'LEADERBOARD_SHARE_REWARD') {
    return 'Leaderboard reward'
  }
  return reason ? reason.toLowerCase().replace(/_/g, ' ') : 'Reward'
}

const toSourceLabel = (entry: CoinLedgerEntry): string => {
  const metadata = entry.metadata ?? {}
  const gameSlugValue = metadata.gameSlug
  const gameSlug = typeof gameSlugValue === 'string' ? gameSlugValue : null
  if (!gameSlug) {
    return 'System'
  }

  if (gameSlug === 'yinyang-samurai') {
    return 'YinYang Samurai'
  }

  return gameSlug
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const formatLedgerDate = (isoDate: string): string => {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return isoDate
  }
  return date.toLocaleString()
}

export function CoinLedgerScreen({ profileCoin, onBackToProfile }: CoinLedgerScreenProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<CoinLedgerEntry[]>([])

  const loadLedger = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getCoinLedger(100)
      setEntries(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load coin history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLedger()
  }, [])

  return (
    <Page
      title="Coin History"
      className="settings-page"
      leading={
        <button
          type="button"
          className="settings-back-btn"
          data-testid="back-to-profile"
          onClick={onBackToProfile}
          aria-label="Back to profile"
        >
          <Icon name="arrow-left" size={20} className="app-icon" />
        </button>
      }
      trailing={<CoinBadge testId="profile-coin-badge-ledger" value={profileCoin} />}
    >
      <div className="settings-content">
        <Card className="settings-card">
          <section className="coin-history-list" data-testid="coin-history-list">
            {loading ? <p>Loading coin history...</p> : null}
            {error ? <p className="inline-error">{error}</p> : null}

            {!loading && error ? (
              <Button type="button" variant="secondary" onClick={() => void loadLedger()}>
                Retry
              </Button>
            ) : null}

            {!loading && !error && entries.length === 0 ? <p>No coin history yet.</p> : null}

            {!loading && !error && entries.length > 0
              ? entries.map((entry) => (
                  <article key={entry.id} className="coin-history-item">
                    <header className="coin-history-item__top">
                      <p className="coin-history-item__amount">+{entry.amount} coin</p>
                      <small>{formatLedgerDate(entry.created_at)}</small>
                    </header>
                    <p className="coin-history-item__meta">From: {toSourceLabel(entry)}</p>
                    <p className="coin-history-item__meta">How: {toReasonLabel(entry)}</p>
                  </article>
                ))
              : null}
          </section>
        </Card>
      </div>
    </Page>
  )
}
