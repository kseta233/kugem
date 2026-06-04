import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Icon } from '@/shared/components'
import { useYinYangSamuraiGame } from '@/features/games/yinyang-samurai/hooks/useYinYangSamuraiGame'
import type { YinYangSamuraiResult } from '@/features/games/yinyang-samurai/types/yinyangSamurai.types'

type YinYangSamuraiGameProps = {
  onFinish: (result: YinYangSamuraiResult) => void
  submitting?: boolean
  autoStart?: boolean
  showInstruction?: boolean
  onStartAttempt?: () => Promise<boolean> | boolean
  onTryAgain?: () => void
}

const formatDuration = (durationMs: number): string => {
  return `${(durationMs / 1000).toFixed(2)}s`
}

const introSteps = [
  'Wait for the object to fly into the arena.',
  'Draw a single slash to split it as evenly as possible.',
  'The closer your cut is to center, the higher your score.',
]

export const YinYangSamuraiGame = ({
  onFinish,
  submitting = false,
  autoStart = false,
  showInstruction = true,
  onStartAttempt,
  onTryAgain,
}: YinYangSamuraiGameProps) => {
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
  const [starting, setStarting] = useState(false)
  const hasAutoStartedRef = useRef(false)

  const handleStart = async () => {
    if (starting) {
      return
    }

    try {
      setStarting(true)
      if (onStartAttempt) {
        const canStart = await onStartAttempt()
        if (!canStart) {
          return
        }
      }
      startGame()
    } finally {
      setStarting(false)
    }
  }

  useEffect(() => {
    if (!autoStart || gameState !== 'instruction' || hasAutoStartedRef.current) {
      return
    }

    hasAutoStartedRef.current = true
    void handleStart()
  }, [autoStart, gameState])

  useEffect(() => {
    if (!autoStart) {
      hasAutoStartedRef.current = false
    }
  }, [autoStart])

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
      {gameState === 'instruction' && showInstruction ? (
        <Card className="yys-intro" data-testid="yys-instruction-screen">
          <div className="yys-intro__hero slash-animation" aria-hidden="true">
            <div className="yys-intro__hero-back">←</div>
            <div className="yys-intro__hero-badge">$ 50 Coins</div>
            <div className="yys-intro__hero-icon">
              <div className="yys-intro__graphic-yinyang" />
            </div>
          </div>

          <div className="yys-intro__copy">
            <h2>The Yin Yang Swordsman</h2>
            <p>Master the art of the perfect cut.</p>
          </div>

          <section className="yys-intro__rules" aria-label="Simple rules">
            <h3>Simple Rules</h3>
            <ol>
              {introSteps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </section>

          <div className="yys-intro__actions">
            <Button
              fullWidth
              data-testid="yys-start-button"
              disabled={starting}
              onClick={() => void handleStart()}
              title={starting ? 'Starting...' : 'Start Game'}
              leftIcon={
                starting ? (
                  <Icon name="hourglass" size={18} className="app-icon" />
                ) : (
                  <Icon name="play" size={18} className="app-icon" />
                )
              }
              rightIcon={!starting ? <Icon name="arrow-right" size={18} className="app-icon" /> : null}
            />
          </div>
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
            <header className="yys-result-hud" data-testid="yys-local-result">
              <button
                type="button"
                className="yys-result-hud__retry"
                aria-label="Try again"
                onClick={() => {
                  if (onTryAgain) {
                    onTryAgain()
                    return
                  }
                  startGame()
                }}
              >
                <Icon name="play" size={16} className="app-icon" />
              </button>

              <strong className="yys-result-hud__percentage">
                {lastResult.isMissed ? '0.0%' : `${lastResult.accuracy.toFixed(2)}%`}
              </strong>

              {submitting ? <small>Submitting...</small> : <small aria-hidden="true" />}
            </header>
          ) : null}
        </section>
      ) : null}
    </section>
  )
}
