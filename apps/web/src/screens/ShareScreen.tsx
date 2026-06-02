import { Button, Card, CoinBadge, Page } from '@/shared/components'
import type { PublicSharePost } from '@/features/share/share.service'

type ShareScreenProps = {
  slug: string
  loading: boolean
  error: string | null
  sharePost: PublicSharePost | null
  onBackToHome: () => void
  onRetry: () => Promise<void>
}

export function ShareScreen({
  slug,
  loading,
  error,
  sharePost,
  onBackToHome,
  onRetry,
}: ShareScreenProps) {
  return (
    <Page
      title="Shared Result"
      leading={
        <button type="button" className="home-profile-pill" data-testid="back-to-home" onClick={onBackToHome}>
          <span aria-hidden="true">←</span>
          <span>Home</span>
        </button>
      }
    >
      {loading ? (
        <Card title="Loading share">
          <p>Loading shared score details...</p>
        </Card>
      ) : null}

      {!loading && error ? (
        <Card title="Unable to load share">
          <div className="status-block error">
            <p>{error}</p>
            <Button type="button" onClick={() => void onRetry()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {!loading && !error && !sharePost ? (
        <Card title="Share not found">
          <div className="status-block empty">
            <p>We could not find this shared post. It may be private or removed.</p>
            <Button type="button" onClick={() => void onRetry()}>
              Refresh
            </Button>
          </div>
        </Card>
      ) : null}

      {!loading && !error && sharePost ? (
        <Card title={sharePost.gameTitle}>
          <section className="share-summary" data-testid="public-share-screen">
            <p className="share-label">Shared by</p>
            <p className="share-value">{sharePost.displayName ?? 'Guest'}</p>

            <p className="share-label">Score</p>
            <p className="share-value" data-testid="public-share-score">{sharePost.score}</p>

            <p className="share-label">Duration</p>
            <p className="share-value">{sharePost.durationMs}ms</p>

            <p className="share-label">Validation</p>
            <p className="share-value">{sharePost.validationStatus}</p>

            <p className="share-label">Share slug</p>
            <p className="share-value">{slug}</p>

            <CoinBadge value={0} />

            {sharePost.caption ? (
              <blockquote className="share-caption">&quot;{sharePost.caption}&quot;</blockquote>
            ) : null}

            <Button type="button" fullWidth onClick={onBackToHome}>
              Play This Game
            </Button>
          </section>
        </Card>
      ) : null}
    </Page>
  )
}
