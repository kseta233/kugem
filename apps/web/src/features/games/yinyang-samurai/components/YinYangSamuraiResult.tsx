import { Button } from '@/shared/components'
import type { SubmitScoreResult } from '@/features/sessions/sessions.service'
import type { YinYangSamuraiResult as YinYangSamuraiPlayResult } from '@/features/games/yinyang-samurai/types/yinyangSamurai.types'
import type { LeaderboardItem } from '@/types/leaderboard'

type YinYangSamuraiResultProps = {
  result: YinYangSamuraiPlayResult
  submitResult: SubmitScoreResult | null
  shareLoading: boolean
  onNativeShare: () => void
  onPlayAgain: () => void
  onClosePopup: () => void
  shareError: string | null
  shareUrl: string | null
  nativeShareStatus: string | null
  leaderboard: LeaderboardItem[]
}

const toLeaderboardAccuracy = (score: number): string => {
  return `${(score / 10).toFixed(1)}%`
}

const getHeadline = (result: YinYangSamuraiPlayResult): string => {
  if (result.isMissed) {
    return 'Missed cut'
  }

  if (result.accuracy >= 99) {
    return 'Perfect balance!'
  }

  return result.grade
}

export const YinYangSamuraiResult = ({
  result,
  submitResult,
  shareLoading,
  onNativeShare,
  onPlayAgain,
  onClosePopup,
  shareError,
  shareUrl,
  nativeShareStatus,
  leaderboard,
}: YinYangSamuraiResultProps) => {
  const topPlayers = leaderboard.slice(0, 3)

  return (
    <section className="yys-result-card" data-testid="yinyang-samurai-result-screen">
      <button type="button" className="yys-result-card__close" onClick={onClosePopup}>
        Close
      </button>

      <h3>{getHeadline(result)}</h3>

      <div className="yys-result-card__score">
        <strong>{result.isMissed ? '0.0%' : `${result.accuracy.toFixed(1)}%`}</strong>
        <span>Time: {(result.durationMs / 1000).toFixed(2)}s</span>
      </div>

      <section className="yys-result-card__leaders">
        <h4>Top 3 Players</h4>
        <div className="yys-result-card__leader-list">
          {topPlayers.length === 0 ? (
            <div className="yys-result-card__leader-row is-empty">
              <span>No leaderboard data yet</span>
            </div>
          ) : (
            topPlayers.map((item, index) => (
              <div className="yys-result-card__leader-row" key={`${item.user_id}-${item.created_at}`}>
                <div className="yys-result-card__leader-meta">
                  <span className="yys-result-card__leader-rank">{item.rank ?? index + 1}</span>
                  <span>{item.display_name ?? 'Guest'}</span>
                </div>
                <span className="yys-result-card__leader-score">{toLeaderboardAccuracy(item.score)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {submitResult?.validationStatus ? (
        <p className="yys-result-card__meta">Validation: {submitResult.validationStatus}</p>
      ) : null}
      {!submitResult ? <p className="yys-result-card__meta">Share to save this result to cloud.</p> : null}
      {submitResult && !submitResult.enteredLeaderboard ? (
        <p className="yys-result-card__meta">Result saved, but it did not enter the top 3 leaderboard.</p>
      ) : null}
      {submitResult?.enteredLeaderboard && submitResult.leaderboardRank ? (
        <p className="yys-result-card__meta">Leaderboard rank: #{submitResult.leaderboardRank}</p>
      ) : null}
      {shareError ? <p className="inline-error">{shareError}</p> : null}
      {nativeShareStatus ? <p className="yys-result-card__meta">{nativeShareStatus}</p> : null}
      {shareUrl ? (
        <p className="yys-result-card__meta">
          Share URL: <a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
        </p>
      ) : null}

      <div className="yys-result-card__actions">
        <Button fullWidth variant="secondary" disabled={shareLoading} onClick={onNativeShare}>
          {shareLoading ? 'Preparing Share...' : 'Share'}
        </Button>
        <Button fullWidth data-testid="play-again-action" onClick={onPlayAgain}>
          Try Again
        </Button>
      </div>
    </section>
  )
}
