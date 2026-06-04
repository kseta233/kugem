import { YinYangSamuraiGame, type YinYangSamuraiPlayResult } from '@/features/games/yinyang-samurai'
import { useYinYangFlow } from '@/features/yinyang-samurai/useYinYangFlow'
import type { Game } from '@/types/game'

interface YinYangSamuraiScreenProps {
  routeName: 'yinyang-intro' | 'yinyang-play'
  selectedGame: Game | null
  currentGameId: string | null
  sessionId: string | null
  sessionError: string | null
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
  isRegisteredProfile,
  onRequireRegister,
  onRefreshProfile,
  onLoadLeaderboard,
  onStartSession,
  onClose,
}: YinYangSamuraiScreenProps) {
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
      <button type="button" className="yys-close-btn" aria-label="Close game" onClick={onClose}>
        <span aria-hidden="true">×</span>
      </button>

      <div className="yys-fullscreen-inner">
        <YinYangSamuraiGame
          onFinish={onFinish}
          submitting={flow.shareLoading}
          autoStart={routeName === 'yinyang-play'}
          showInstruction={routeName === 'yinyang-intro'}
          onStartAttempt={onStartSession}
          onTryAgain={() => void flow.onPlayAgain()}
        />

        <small data-testid="session-started-state">Session active: {sessionId ?? '-'}</small>
        {sessionError ? <small className="inline-error">{sessionError}</small> : null}
      </div>
    </section>
  )
}
