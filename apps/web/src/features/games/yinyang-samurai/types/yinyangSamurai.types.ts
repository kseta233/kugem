export type GameState = 'instruction' | 'countdown' | 'playing' | 'result'

export type CutLine = {
  startX: number
  startY: number
  endX: number
  endY: number
}

export type ThrowConfig = {
  startY: number
  peakY: number
  endY: number
  durationMs: number
  radius: number
  centerX: number
}

export type CountdownTick = 3 | 2 | 1 | 'GO'

export type YinYangSamuraiResult = {
  accuracy: number
  score: number
  durationMs: number
  grade: string
  isMissed: boolean
}
