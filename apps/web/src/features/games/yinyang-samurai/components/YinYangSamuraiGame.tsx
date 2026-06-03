import { useMemo } from 'react'
import { Button, Card } from '@/shared/components'
import { useYinYangSamuraiGame } from '@/features/games/yinyang-samurai/hooks/useYinYangSamuraiGame'
import type { YinYangSamuraiResult } from '@/features/games/yinyang-samurai/types/yinyangSamurai.types'

type YinYangSamuraiGameProps = {
  onFinish: (result: YinYangSamuraiResult) => void
  submitting?: boolean
}

const formatDuration = (durationMs: number): string => {
  return `${(durationMs / 1000).toFixed(2)}s`
}

export const YinYangSamuraiGame = ({ onFinish, submitting = false }: YinYangSamuraiGameProps) => {
  const {
    gameState,
    countdownTick,
    timerMs,
    throwConfig,
    objectY,
    cutLine,
    lastResult,
    containerRef,
    startGame,
    onSwipeStart,
    onSwipeEnd,
    showConfetti,
  } = useYinYangSamuraiGame({ onFinish })

  const circleStyle = useMemo(() => {
    if (!throwConfig) {
      return { display: 'none' }
    }

    return {
      width: `${throwConfig.radius * 2}px`,
      height: `${throwConfig.radius * 2}px`,
      left: `${throwConfig.centerX - throwConfig.radius}px`,
      top: `${objectY - throwConfig.radius}px`,
    }
  }, [objectY, throwConfig])

  const cutLineStyle = useMemo(() => {
    if (!cutLine) {
      return { display: 'none' }
    }

    const dx = cutLine.endX - cutLine.startX
    const dy = cutLine.endY - cutLine.startY
    const length = Math.hypot(dx, dy)
    const angle = Math.atan2(dy, dx)

    return {
      width: `${length}px`,
      left: `${cutLine.startX}px`,
      top: `${cutLine.startY}px`,
      transform: `rotate(${angle}rad)`,
      transformOrigin: '0 0',
    }
  }, [cutLine])

  return (
    <section className="yys-shell" data-testid="yinyang-samurai-play-screen">
      {gameState === 'instruction' ? (
        <Card title="YinYang Samurai" className="yys-panel yys-panel--instruction">
          <p>Cut the object into a perfect half.</p>
          <p>Swipe only once.</p>
          <Button fullWidth data-testid="yys-start-button" onClick={startGame}>
            Start
          </Button>
        </Card>
      ) : null}

      {(gameState === 'countdown' || gameState === 'playing' || gameState === 'result') ? (
        <section
          className="yys-arena"
          ref={containerRef}
          data-testid="yys-arena"
          onPointerDown={(event) => onSwipeStart(event.clientX, event.clientY)}
          onPointerUp={(event) => onSwipeEnd(event.clientX, event.clientY)}
          onPointerCancel={(event) => onSwipeEnd(event.clientX, event.clientY)}
          aria-label="YinYang Samurai game arena"
        >
          <div className="yys-orb" style={circleStyle} />
          <div className="yys-cut-line" style={cutLineStyle} />

          {gameState === 'countdown' ? (
            <section className="yys-countdown-overlay" data-testid="yys-countdown">
              <p>{countdownTick}</p>
            </section>
          ) : null}

          {showConfetti ? (
            <div className="yys-confetti" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : null}

          {gameState !== 'countdown' ? (
            <footer className="yys-timer" data-testid="yys-live-timer">
              {formatDuration(timerMs)}
            </footer>
          ) : null}

          {gameState === 'result' && lastResult ? (
            <aside className="yys-result-toast" data-testid="yys-local-result">
              <strong>{lastResult.isMissed ? 'Missed Cut' : `${lastResult.accuracy.toFixed(2)}%`}</strong>
              <span>{lastResult.grade}</span>
              <span>{formatDuration(lastResult.durationMs)}</span>
              {submitting ? <small>Submitting score...</small> : null}
            </aside>
          ) : null}
        </section>
      ) : null}
    </section>
  )
}
