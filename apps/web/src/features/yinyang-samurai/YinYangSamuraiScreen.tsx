import { YinYangSamuraiGame, YinYangSamuraiResult, type YinYangSamuraiPlayResult } from '@/features/games/yinyang-samurai'
import { useYinYangFlow } from '@/features/yinyang-samurai/useYinYangFlow'
import type { Game } from '@/types/game'
import type { LeaderboardItem } from '@/types/leaderboard'

interface YinYangSamuraiScreenProps {
  routeName: 'yinyang-intro' | 'yinyang-play'
  selectedGame: Game | null
  currentGameId: string | null
  sessionId: string | null
  sessionError: string | null
  leaderboard: LeaderboardItem[]
  isRegisteredProfile: boolean
  onRequireRegister: () => void
  onRefreshProfile: () => Promise<void>
  onLoadLeaderboard: (gameId: string) => void
  onStartSession: () => Promise<boolean>
  onClose: () => void
}

export function YinYangSamuraiScreen({
  routeName,
  selectedGame,
  currentGameId,
  sessionId,
  sessionError,
  leaderboard,
  isRegisteredProfile,
  onRequireRegister,
  onRefreshProfile,
  onLoadLeaderboard,
  onStartSession,
  onClose,
}: YinYangSamuraiScreenProps) {
  const introCoinReward = Math.max(
    0,
    Math.floor(Number(selectedGame?.config.baseRewardCoin ?? selectedGame?.config.rewardCoin ?? 1)),
  )

  const flow = useYinYangFlow({
    selectedGame,
    sessionId,
    currentGameId,
    isRegisteredProfile,
    onRequireRegister,
    onRefreshProfile,
    onLoadLeaderboard,
    onStartSession,
  })

  const onFinish = (result: YinYangSamuraiPlayResult) => {
    flow.onFinishPlay(result)
  }

  return (
    <section className="yys-fullscreen" data-testid="yinyang-fullscreen-shell" aria-label="YinYang Samurai fullscreen">
      {!flow.isYinYangResultOpen ? (
        <button type="button" className="yys-close-btn" aria-label="Close game" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
      ) : null}

      <div className="yys-fullscreen-inner">
        <YinYangSamuraiGame
          onFinish={onFinish}
          submitting={flow.shareLoading}
          autoStart={routeName === 'yinyang-play'}
          showInstruction={routeName === 'yinyang-intro'}
          introCoinReward={introCoinReward}
          onStartAttempt={onStartSession}
          onTryAgain={flow.onPlayAgain}
        />

        {sessionError ? <small className="inline-error">{sessionError}</small> : null}

        {routeName === 'yinyang-play' && flow.yinYangPlayResult && flow.isYinYangResultOpen ? (
          <div className="yys-result-popup" data-testid="yinyang-result-popup">
            <div className="yys-result-popup__confetti" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <YinYangSamuraiResult
              result={flow.yinYangPlayResult}
              submitResult={flow.submitResult}
              shareLoading={flow.shareLoading}
              onNativeShare={() => void flow.onNativeShare()}
              onPlayAgain={() => {
                void flow.onPlayAgain()
              }}
              onClosePopup={flow.closePopup}
              shareError={flow.shareError}
              shareUrl={flow.shareResult?.shareUrl ?? null}
              nativeShareStatus={flow.nativeShareStatus}
              leaderboard={leaderboard}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
