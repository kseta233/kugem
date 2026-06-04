import { useState } from 'react'
import { Button, Icon } from '@/shared/components'
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
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  const handleCopyLink = async () => {
    if (!shareUrl) {
      return
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl)
        setCopyStatus('Copied!')
        return
      } catch {
        setCopyStatus('Copy failed, please copy manually.')
        return
      }
    }

    setCopyStatus('Clipboard is not available on this device.')
  }

  return (
    <section className="yys-result-card" data-testid="yinyang-samurai-result-screen">
      <button type="button" className="yys-result-card__close" aria-label="Close result popup" onClick={onClosePopup}>
        <Icon name="x" size={18} className="app-icon" />
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

      {!submitResult ? <p className="yys-result-card__meta">Share to save this result to cloud.</p> : null}
      {submitResult?.enteredLeaderboard && submitResult.leaderboardRank ? (
        <p className="yys-result-card__meta">Leaderboard rank: #{submitResult.leaderboardRank}</p>
      ) : null}
      {shareError ? <p className="inline-error">{shareError}</p> : null}
      {nativeShareStatus ? <p className="yys-result-card__meta">{nativeShareStatus}</p> : null}
      {shareUrl ? (
        <section className="yys-result-card__share" aria-label="Share link">
          <p className="yys-result-card__share-title">Yaay your record is saved, here is the link</p>
          <div className="yys-result-card__share-row">
            <a className="yys-result-card__share-link" href={shareUrl} target="_blank" rel="noreferrer">
              {shareUrl}
            </a>
            <Button variant="secondary" onClick={() => void handleCopyLink()}>
              Copy
            </Button>
          </div>
          {copyStatus ? <p className="yys-result-card__meta">{copyStatus}</p> : null}
        </section>
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
