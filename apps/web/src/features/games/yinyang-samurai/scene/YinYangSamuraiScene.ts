import {
  type CountdownTick,
  type CutLine,
  type GameState,
  type ThrowConfig,
  type YinYangSamuraiResult,
} from '@/features/games/yinyang-samurai/types/yinyangSamurai.types'
import { buildCutResult, buildMissedResult } from '@/features/games/yinyang-samurai/engine/scoring'
import { doesLineIntersectCircle } from '@/features/games/yinyang-samurai/engine/cutDetection'
import { getThrowY, isThrowFinished } from '@/features/games/yinyang-samurai/engine/throwPhysics'

type CountdownStep = {
  label: CountdownTick
  durationMs: number
}

const COUNTDOWN_SEQUENCE: CountdownStep[] = [
  { label: 3, durationMs: 700 },
  { label: 2, durationMs: 700 },
  { label: 1, durationMs: 700 },
  { label: 'GO', durationMs: 300 },
]

type PlayingFrame = {
  elapsedMs: number
  y: number
  hasFinishedThrow: boolean
}

export class YinYangSamuraiScene {
  private state: GameState = 'instruction'
  private countdownIndex = 0
  private throwConfig: ThrowConfig | null = null
  private timerStartedAt = 0

  public resetRound(): void {
    this.state = 'instruction'
    this.countdownIndex = 0
    this.throwConfig = null
    this.timerStartedAt = 0
  }

  public startCountdown(): CountdownStep {
    this.state = 'countdown'
    this.countdownIndex = 0
    return COUNTDOWN_SEQUENCE[this.countdownIndex]
  }

  public getState(): GameState {
    return this.state
  }

  public getCountdownStep(): CountdownStep | null {
    if (this.state !== 'countdown') {
      return null
    }

    return COUNTDOWN_SEQUENCE[this.countdownIndex] ?? null
  }

  public advanceCountdown(): { done: boolean; next: CountdownStep | null } {
    if (this.state !== 'countdown') {
      return { done: true, next: null }
    }

    this.countdownIndex += 1
    const nextStep = COUNTDOWN_SEQUENCE[this.countdownIndex] ?? null

    if (!nextStep) {
      return { done: true, next: null }
    }

    return { done: false, next: nextStep }
  }

  public startPlaying(config: ThrowConfig, now: number): void {
    this.throwConfig = config
    this.timerStartedAt = now
    this.state = 'playing'
  }

  public getElapsedMs(now: number): number {
    return Math.max(0, Math.round(now - this.timerStartedAt))
  }

  public getPlayingFrame(now: number): PlayingFrame | null {
    if (this.state !== 'playing' || !this.throwConfig) {
      return null
    }

    const elapsedMs = this.getElapsedMs(now)
    const y = getThrowY(elapsedMs, this.throwConfig)

    return {
      elapsedMs,
      y,
      hasFinishedThrow: isThrowFinished(elapsedMs, this.throwConfig),
    }
  }

  public endWithMissed(durationMs: number): YinYangSamuraiResult {
    this.state = 'result'
    return buildMissedResult(durationMs)
  }

  public resolveCut(line: CutLine, objectY: number, durationMs: number): YinYangSamuraiResult {
    const config = this.throwConfig
    if (!config) {
      this.state = 'result'
      return buildMissedResult(durationMs)
    }

    const circle = {
      x: config.centerX,
      y: objectY,
      radius: config.radius,
    }

    this.state = 'result'

    if (!doesLineIntersectCircle(line, circle)) {
      return buildMissedResult(durationMs)
    }

    return buildCutResult(line, circle, durationMs)
  }

}
