import { Button, Card, CoinBadge, HomeCategoryChips, HomeGameCard, Page } from '@/shared/components'
import type { HomeCategory } from '@/shared/components'
import type { Game } from '@/types/game'
import type { LeaderboardItem } from '@/types/leaderboard'
import type { SubmitScoreResult } from '@/features/sessions/sessions.service'

type GameScreen = 'catalog' | 'detail' | 'play' | 'result'

type HomeGameCardItem = {
  game: Game
  category: HomeCategory
  reward: number
  variant: 'reaction' | 'memory' | 'speed' | 'locked'
  isReaction: boolean
}

interface HomeScreenProps {
  loading: boolean
  error: string | null
  hasProfile: boolean
  profileCoin: number
  profileInitial: string
  homeDisplayName: string
  isRestoredSession: boolean
  onRefresh: () => Promise<void>
  onOpenProfile: () => void

  gamesLoading: boolean
  gamesError: string | null
  homeCategory: HomeCategory
  onChangeCategory: (category: HomeCategory) => void
  visibleGames: HomeGameCardItem[]

  screen: GameScreen
  selectedGame: Game | null
  selectedGameCategory: HomeCategory
  sessionError: string | null
  startingSession: boolean
  sessionId: string | null
  submittingScore: boolean
  reactionTimeMs: number | null

  submittedScore: number | null
  submitResult: SubmitScoreResult | null
  playDurationMs: number | null
  shareLoading: boolean
  shareError: string | null
  shareUrl: string | null

  leaderboardLoading: boolean
  leaderboardError: string | null
  leaderboard: LeaderboardItem[]

  onOpenDetail: (game: Game) => void
  onStartSession: () => Promise<boolean>
  onBackToCatalog: () => void
  onFinishPlay: () => Promise<void>
  onCreateShare: () => Promise<void>
  onPlayAgain: () => void
}

export function HomeScreen({
  loading,
  error,
  hasProfile,
  profileCoin,
  profileInitial,
  homeDisplayName,
  isRestoredSession,
  onRefresh,
  onOpenProfile,
  gamesLoading,
  gamesError,
  homeCategory,
  onChangeCategory,
  visibleGames,
  screen,
  selectedGame,
  selectedGameCategory,
  sessionError,
  startingSession,
  sessionId,
  submittingScore,
  reactionTimeMs,
  submittedScore,
  submitResult,
  playDurationMs,
  shareLoading,
  shareError,
  shareUrl,
  leaderboardLoading,
  leaderboardError,
  leaderboard,
  onOpenDetail,
  onStartSession,
  onBackToCatalog,
  onFinishPlay,
  onCreateShare,
  onPlayAgain,
}: HomeScreenProps) {
  return (
    <Page
      title="MiniPlay"
      leading={
        <button
          type="button"
          className="home-profile-pill"
          aria-label="Open profile"
          data-testid="open-profile-page"
          onClick={onOpenProfile}
        >
          <span className="home-profile-avatar" aria-hidden="true">
            {profileInitial}
          </span>
          <span>Profile</span>
        </button>
      }
      trailing={<CoinBadge testId="profile-coin-badge" value={profileCoin} />}
    >
      {loading ? (
        <Card title="Loading">
          <p>Loading your profile and game data...</p>
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

      <Card title="Game Catalog" className="game-card" data-testid="game-catalog">
        {screen === 'catalog' ? (
          <>
            {!loading && !error && hasProfile ? (
              <section className="home-hero" data-testid="anonymous-auth-ready">
                <h2>{homeDisplayName}, Ready for Challenge?</h2>
                <p>Pick a game to earn coins and top the leaderboard.</p>
                <div
                  data-testid="session-persistence-indicator"
                  className={`session-indicator ${isRestoredSession ? 'is-restored' : 'is-new'}`}
                >
                  <span className="session-dot" aria-hidden="true" />
                  <span>
                    {isRestoredSession
                      ? 'Local guest session restored'
                      : 'Local guest session started'}
                  </span>
                </div>
              </section>
            ) : null}

            {!loading && !error && hasProfile ? (
              <>
                <HomeCategoryChips value={homeCategory} onChange={onChangeCategory} />

                <section className="home-games-grid" data-testid="game-catalog-list">
                  {gamesLoading ? <p>Loading active games...</p> : null}
                  {gamesError ? <p className="inline-error">{gamesError}</p> : null}
                  {!gamesLoading && !gamesError && visibleGames.length === 0 ? (
                    <p>No active games found.</p>
                  ) : null}

                  {!gamesLoading &&
                    !gamesError &&
                    visibleGames.map((item) => (
                      <HomeGameCard
                        key={item.game.id}
                        title={item.game.title}
                        category={item.category}
                        reward={item.reward}
                        variant={item.variant}
                        testId={item.isReaction ? 'reaction-game-card' : undefined}
                        buttonTestId={item.isReaction ? 'open-reaction-detail' : undefined}
                        onAction={() => onOpenDetail(item.game)}
                      />
                    ))}
                </section>
              </>
            ) : null}
          </>
        ) : null}

        {screen === 'detail' ? (
          <section className="detail-panel" data-testid="reaction-detail-screen">
            <h3>{selectedGame?.title ?? 'Game Detail'}</h3>
            <p>{selectedGame?.description ?? 'Start a new session to begin.'}</p>
            <p>Category: {selectedGameCategory}</p>
            <p>Reward: +{Number(selectedGame?.config.rewardCoin ?? 0)} coins</p>
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
              <p>TAP TO SCORE</p>
              <button
                type="button"
                className="tap-orb"
                data-testid="tap-play-area"
                aria-label="Tap play area"
                disabled={submittingScore}
                onClick={() => void onFinishPlay()}
              >
                {submittingScore ? 'Submitting...' : 'Tap'}
              </button>
              <small data-testid="session-started-state">Session active: {sessionId ?? '-'}</small>
              {sessionError ? <small className="inline-error">{sessionError}</small> : null}
            </div>
          </section>
        ) : null}

        {screen === 'result' ? (
          <section className="result-panel" data-testid="score-result-screen">
            <h3>{selectedGame?.title ?? 'Result'}</h3>
            <p data-testid="reaction-time-result">{reactionTimeMs ?? 0}ms</p>
            <p>Score: {submittedScore ?? 0}</p>
            <p>Validation: {submitResult?.validationStatus ?? '-'}</p>
            <CoinBadge value={submitResult?.coinReward ?? 0} />
            {typeof submitResult?.rankHint === 'number' ? <p>Rank hint: #{submitResult.rankHint}</p> : null}
            {typeof submitResult?.totalCoin === 'number' ? <p>Total coin: {submitResult.totalCoin}</p> : null}
            {playDurationMs ? <p>Duration: {playDurationMs}ms</p> : null}

            <section className="detail-actions">
              <Button fullWidth variant="secondary" disabled={shareLoading} onClick={() => void onCreateShare()}>
                {shareLoading ? 'Creating Share...' : 'Create Share Link'}
              </Button>
            </section>

            {shareError ? <p className="inline-error">{shareError}</p> : null}
            {shareUrl ? (
              <p>
                Share URL:{' '}
                <a href={shareUrl} target="_blank" rel="noreferrer">
                  {shareUrl}
                </a>
              </p>
            ) : null}

            <section>
              <h4>Leaderboard</h4>
              {leaderboardLoading ? <p>Loading leaderboard...</p> : null}
              {leaderboardError ? <p className="inline-error">{leaderboardError}</p> : null}
              {!leaderboardLoading && !leaderboardError && leaderboard.length === 0 ? (
                <p>No leaderboard data yet.</p>
              ) : null}
              {!leaderboardLoading && !leaderboardError && leaderboard.length > 0 ? (
                <ol>
                  {leaderboard.map((item) => (
                    <li key={`${item.user_id}-${item.created_at}`}>
                      {(item.display_name ?? 'Guest')} - {item.score}
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>

            <div className="detail-actions">
              <Button fullWidth data-testid="play-again-action" disabled={startingSession} onClick={onPlayAgain}>
                {startingSession ? 'Starting...' : 'Play Again'}
              </Button>
              <Button fullWidth variant="secondary" onClick={onBackToCatalog}>
                Back to Games
              </Button>
            </div>
          </section>
        ) : null}
      </Card>

      <footer className="foot-note">New home design active. More games unlock in Phase 2.</footer>
    </Page>
  )
}
