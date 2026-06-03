import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { buildCutResult, buildMissedResult } from '@/features/games/yinyang-samurai/engine/scoring'
import { doesLineIntersectCircle, isSwipeLargeEnough } from '@/features/games/yinyang-samurai/engine/cutDetection'
import {
  createThrowConfig,
  getThrowY,
  isThrowFinished,
} from '@/features/games/yinyang-samurai/engine/throwPhysics'
import type {
  CountdownTick,
  CutLine,
  GameState,
  ThrowConfig,
  YinYangSamuraiResult,
} from '@/features/games/yinyang-samurai/types/yinyangSamurai.types'

const COUNTDOWN_SEQUENCE: Array<{ label: CountdownTick; durationMs: number }> = [
  { label: 3, durationMs: 700 },
  { label: 2, durationMs: 700 },
  { label: 1, durationMs: 700 },
  { label: 'GO', durationMs: 300 },
]

type Point = {
  x: number
  y: number
}

type UseYinYangSamuraiGameInput = {
  onFinish: (result: YinYangSamuraiResult) => void
}

type UseYinYangSamuraiGameOutput = {
  gameState: GameState
  countdownTick: CountdownTick | null
  timerMs: number
  throwConfig: ThrowConfig | null
  objectY: number
  cutLine: CutLine | null
  lastResult: YinYangSamuraiResult | null
  containerRef: RefObject<HTMLDivElement | null>
  startGame: () => void
  tryAgain: () => void
  onSwipeStart: (clientX: number, clientY: number) => void
  onSwipeEnd: (clientX: number, clientY: number) => void
  showConfetti: boolean
}

export const useYinYangSamuraiGame = ({ onFinish }: UseYinYangSamuraiGameInput): UseYinYangSamuraiGameOutput => {
  const [gameState, setGameState] = useState<GameState>('instruction')
  const [countdownTick, setCountdownTick] = useState<CountdownTick | null>(null)
  const [countdownIndex, setCountdownIndex] = useState(0)
  const [timerMs, setTimerMs] = useState(0)
  const [throwConfig, setThrowConfig] = useState<ThrowConfig | null>(null)
  const [objectY, setObjectY] = useState(0)
  const [cutLine, setCutLine] = useState<CutLine | null>(null)
  const [lastResult, setLastResult] = useState<YinYangSamuraiResult | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const countdownTimeoutRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)
  const timerStartRef = useRef<number>(0)
  const swipeStartRef = useRef<Point | null>(null)
  const hasCutRef = useRef(false)

  const clearCountdownTimeout = () => {
    if (countdownTimeoutRef.current !== null) {
      window.clearTimeout(countdownTimeoutRef.current)
      countdownTimeoutRef.current = null
    }
  }

  const clearFrame = () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }

  const resetRound = useCallback(() => {
    clearCountdownTimeout()
    clearFrame()
    hasCutRef.current = false
    swipeStartRef.current = null
    setTimerMs(0)
    setCutLine(null)
    setLastResult(null)
    setThrowConfig(null)
    setObjectY(0)
  }, [])

  const finishGame = useCallback(
    (result: YinYangSamuraiResult) => {
      clearCountdownTimeout()
      clearFrame()
      setLastResult(result)
      setGameState('result')
      onFinish(result)
    },
    [onFinish],
  )

  const startPlaying = useCallback(() => {
    const host = containerRef.current
    if (!host) {
      finishGame(buildMissedResult(0))
      return
    }

    const rect = host.getBoundingClientRect()
    const config = createThrowConfig(rect.width, rect.height)

    hasCutRef.current = false
    swipeStartRef.current = null
    timerStartRef.current = performance.now()

    setThrowConfig(config)
    setObjectY(config.startY)
    setCutLine(null)
    setTimerMs(0)
    setGameState('playing')
  }, [finishGame])

  const startGame = useCallback(() => {
    resetRound()
    setCountdownIndex(0)
    setCountdownTick(COUNTDOWN_SEQUENCE[0].label)
    setGameState('countdown')
  }, [resetRound])

  const tryAgain = useCallback(() => {
    startGame()
  }, [startGame])

  useEffect(() => {
    if (gameState !== 'countdown') {
      return
    }

    const current = COUNTDOWN_SEQUENCE[countdownIndex]
    if (!current) {
      setCountdownTick(null)
      startPlaying()
      return
    }

    setCountdownTick(current.label)
    countdownTimeoutRef.current = window.setTimeout(() => {
      setCountdownIndex((value) => value + 1)
    }, current.durationMs)

    return () => {
      clearCountdownTimeout()
    }
  }, [countdownIndex, gameState, startPlaying])

  useEffect(() => {
    if (gameState !== 'playing' || !throwConfig) {
      return
    }

    const animate = () => {
      const elapsed = performance.now() - timerStartRef.current
      const roundedElapsed = Math.max(0, Math.round(elapsed))
      setTimerMs(roundedElapsed)

      const nextY = getThrowY(roundedElapsed, throwConfig)
      setObjectY(nextY)

      if (isThrowFinished(roundedElapsed, throwConfig)) {
        finishGame(buildMissedResult(roundedElapsed))
        return
      }

      frameRef.current = window.requestAnimationFrame(animate)
    }

    frameRef.current = window.requestAnimationFrame(animate)

    return () => {
      clearFrame()
    }
  }, [finishGame, gameState, throwConfig])

  const toLocalPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const host = containerRef.current
    if (!host) {
      return null
    }

    const rect = host.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  const onSwipeStart = useCallback(
    (clientX: number, clientY: number) => {
      if (gameState !== 'playing' || hasCutRef.current) {
        return
      }

      const point = toLocalPoint(clientX, clientY)
      if (!point) {
        return
      }

      swipeStartRef.current = point
    },
    [gameState, toLocalPoint],
  )

  const onSwipeEnd = useCallback(
    (clientX: number, clientY: number) => {
      if (gameState !== 'playing' || hasCutRef.current || !throwConfig) {
        return
      }

      const start = swipeStartRef.current
      const end = toLocalPoint(clientX, clientY)
      swipeStartRef.current = null

      if (!start || !end) {
        return
      }

      hasCutRef.current = true
      const line: CutLine = {
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
      }

      setCutLine(line)

      const elapsed = Math.max(0, Math.round(performance.now() - timerStartRef.current))
      if (!isSwipeLargeEnough(line)) {
        finishGame(buildMissedResult(elapsed))
        return
      }

      const circle = {
        x: throwConfig.centerX,
        y: objectY,
        radius: throwConfig.radius,
      }

      const intersects = doesLineIntersectCircle(line, circle)
      if (!intersects) {
        finishGame(buildMissedResult(elapsed))
        return
      }

      finishGame(buildCutResult(line, circle, elapsed))
    },
    [finishGame, gameState, objectY, throwConfig, toLocalPoint],
  )

  useEffect(() => {
    return () => {
      clearCountdownTimeout()
      clearFrame()
    }
  }, [])

  const showConfetti = useMemo(() => {
    return Boolean(lastResult && !lastResult.isMissed && lastResult.accuracy >= 95)
  }, [lastResult])

  return {
    gameState,
    countdownTick,
    timerMs,
    throwConfig,
    objectY,
    cutLine,
    lastResult,
    containerRef,
    startGame,
    tryAgain,
    onSwipeStart,
    onSwipeEnd,
    showConfetti,
  }
}
