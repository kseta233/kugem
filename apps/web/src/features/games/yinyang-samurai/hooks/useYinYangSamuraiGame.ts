import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { isSwipeLargeEnough } from '@/features/games/yinyang-samurai/engine/cutDetection'
import { createThrowConfig } from '@/features/games/yinyang-samurai/engine/throwPhysics'
import { YinYangSamuraiScene } from '@/features/games/yinyang-samurai/scene/YinYangSamuraiScene'
import { createGameSfxPlayer } from '@/features/games/yinyang-samurai/sfx/gameSfx'
import { createSlashSfxPlayer } from '@/features/games/yinyang-samurai/sfx/slashSfx'
import type {
  CountdownTick,
  CutLine,
  GameState,
  ThrowConfig,
  YinYangSamuraiResult,
} from '@/features/games/yinyang-samurai/types/yinyangSamurai.types'

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
  const sceneRef = useRef<YinYangSamuraiScene | null>(null)
  const countdownTimeoutRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)
  const swipeStartRef = useRef<Point | null>(null)
  const hasCutRef = useRef(false)
  const playCountdownRef = useRef<(tick: CountdownTick) => void>(() => {})
  const playResultPopRef = useRef<(result: YinYangSamuraiResult) => void>(() => {})
  const playSlashRef = useRef<() => void>(() => {})

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
    sceneRef.current?.resetRound()
    clearCountdownTimeout()
    clearFrame()
    hasCutRef.current = false
    swipeStartRef.current = null
    setTimerMs(0)
    setCutLine(null)
    setLastResult(null)
    setThrowConfig(null)
    setObjectY(0)
    setGameState(sceneRef.current?.getState() ?? 'instruction')
  }, [])

  const finishGame = useCallback(
    (result: YinYangSamuraiResult) => {
      clearCountdownTimeout()
      clearFrame()
      setLastResult(result)
      setGameState(sceneRef.current?.getState() ?? 'result')
      playResultPopRef.current(result)
      onFinish(result)
    },
    [onFinish],
  )

  const startPlaying = useCallback(() => {
    const host = containerRef.current
    if (!host) {
      finishGame(sceneRef.current?.endWithMissed(0) ?? { accuracy: 0, score: 0, durationMs: 0, grade: 'Missed Cut', isMissed: true })
      return
    }

    const rect = host.getBoundingClientRect()
    const config = createThrowConfig(rect.width, rect.height)

    hasCutRef.current = false
    swipeStartRef.current = null
    sceneRef.current?.startPlaying(config, performance.now())

    setThrowConfig(config)
    setObjectY(config.startY)
    setCutLine(null)
    setTimerMs(0)
    setGameState(sceneRef.current?.getState() ?? 'playing')
  }, [finishGame])

  const startGame = useCallback(() => {
    resetRound()
    const firstStep = sceneRef.current?.startCountdown()
    setCountdownIndex(0)
    setCountdownTick(firstStep?.label ?? null)
    setGameState(sceneRef.current?.getState() ?? 'countdown')
  }, [resetRound])

  const tryAgain = useCallback(() => {
    startGame()
  }, [startGame])

  useEffect(() => {
    if (gameState !== 'countdown') {
      return
    }

    const scene = sceneRef.current
    if (!scene) {
      return
    }

    const current = scene.getCountdownStep()
    if (!current) {
      setCountdownTick(null)
      startPlaying()
      return
    }

    setCountdownTick(current.label)
    playCountdownRef.current(current.label)
    countdownTimeoutRef.current = window.setTimeout(() => {
      const countdownState = scene.advanceCountdown()
      if (countdownState.done) {
        setCountdownTick(null)
        startPlaying()
      } else {
        setCountdownIndex((value) => value + 1)
        setCountdownTick(countdownState.next?.label ?? null)
      }
    }, current.durationMs)

    return () => {
      clearCountdownTimeout()
    }
  }, [countdownIndex, gameState, startPlaying])

  useEffect(() => {
    if (gameState !== 'playing') {
      return
    }

    const scene = sceneRef.current
    if (!scene) {
      return
    }

    const animate = () => {
      const frame = scene.getPlayingFrame(performance.now())
      if (!frame) {
        return
      }

      setTimerMs(frame.elapsedMs)
      setObjectY(frame.y)

      if (frame.hasFinishedThrow) {
        finishGame(scene.endWithMissed(frame.elapsedMs))
        return
      }

      frameRef.current = window.requestAnimationFrame(animate)
    }

    frameRef.current = window.requestAnimationFrame(animate)

    return () => {
      clearFrame()
    }
  }, [finishGame, gameState])

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
      playSlashRef.current()

      const scene = sceneRef.current
      if (!scene) {
        return
      }

      const elapsed = scene.getElapsedMs(performance.now())
      if (!isSwipeLargeEnough(line)) {
        finishGame(scene.endWithMissed(elapsed))
        return
      }

      finishGame(scene.resolveCut(line, objectY, elapsed))
    },
    [finishGame, gameState, objectY, throwConfig, toLocalPoint],
  )

  useEffect(() => {
    const scene = new YinYangSamuraiScene()
    sceneRef.current = scene
    setGameState(scene.getState())

    const gameSfx = createGameSfxPlayer()
    playCountdownRef.current = gameSfx.playCountdownTick
    playResultPopRef.current = gameSfx.playResultPop

    const slashSfx = createSlashSfxPlayer()
    playSlashRef.current = slashSfx.play

    return () => {
      clearCountdownTimeout()
      clearFrame()
      playCountdownRef.current = () => {}
      playResultPopRef.current = () => {}
      playSlashRef.current = () => {}
      gameSfx.dispose()
      slashSfx.dispose()
      sceneRef.current = null
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
