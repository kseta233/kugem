import { Button, CoinBadge } from '@/shared/components'
import type { SubmitScoreResult } from '@/features/sessions/sessions.service'
import type { YinYangSamuraiResult as YinYangSamuraiPlayResult } from '@/features/games/yinyang-samurai/types/yinyangSamurai.types'

type YinYangSamuraiResultProps = {
  result: YinYangSamuraiPlayResult
  submitResult: SubmitScoreResult | null
  shareLoading: boolean
  onCreateShare: () => void
  onNativeShare: () => void
  onPlayAgain: () => void
  onBackToGames: () => void
  shareError: string | null
  shareUrl: string | null
  nativeShareStatus: string | null
}

export const YinYangSamuraiResult = ({
  result,
  submitResult,
  shareLoading,
  onCreateShare,
  onNativeShare,
  onPlayAgain,
  onBackToGames,
  shareError,
  shareUrl,
  nativeShareStatus,
}: YinYangSamuraiResultProps) => {
  return (
    <section className="result-panel" data-testid="yinyang-samurai-result-screen">
      <h3>YinYang Samurai</h3>
      <p>{result.isMissed ? 'Missed Cut' : `${result.accuracy.toFixed(2)}%`}</p>
      <p>{result.grade}</p>
      <p>Time: {(result.durationMs / 1000).toFixed(2)}s</p>
      <p>Score: {result.score}</p>
      <p>Validation: {submitResult?.validationStatus ?? '-'}</p>
      <CoinBadge value={submitResult?.coinReward ?? 0} />
      {typeof submitResult?.rankHint === 'number' ? <p>Rank hint: #{submitResult.rankHint}</p> : null}
      {typeof submitResult?.totalCoin === 'number' ? <p>Total coin: {submitResult.totalCoin}</p> : null}

      <section className="detail-actions">
        <Button fullWidth variant="secondary" disabled={shareLoading} onClick={onCreateShare}>
          {shareLoading ? 'Creating Share...' : 'Create Share Link'}
        </Button>
        <Button fullWidth onClick={onNativeShare}>
          Share Result
        </Button>
      </section>

      {shareError ? <p className="inline-error">{shareError}</p> : null}
      {nativeShareStatus ? <p>{nativeShareStatus}</p> : null}
      {shareUrl ? (
        <p>
          Share URL:{' '}
          <a href={shareUrl} target="_blank" rel="noreferrer">
            {shareUrl}
          </a>
        </p>
      ) : null}

      <div className="detail-actions">
        <Button fullWidth data-testid="play-again-action" onClick={onPlayAgain}>
          Try Again
        </Button>
        <Button fullWidth variant="secondary" onClick={onBackToGames}>
          Back to Games
        </Button>
      </div>
    </section>
  )
}
