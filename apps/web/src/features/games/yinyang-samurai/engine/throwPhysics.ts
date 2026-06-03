import type { ThrowConfig } from '@/features/games/yinyang-samurai/types/yinyangSamurai.types'

export const THROW_DURATION_MS = 2800

const PEAK_TIME_RATIO = 0.42

type QuadraticCoefficients = {
  a: number
  b: number
  c: number
}

const getParabolaCoefficients = (config: ThrowConfig): QuadraticCoefficients => {
  const t0 = 0
  const t1 = config.durationMs * PEAK_TIME_RATIO
  const t2 = config.durationMs

  const y0 = config.startY
  const y1 = config.peakY
  const y2 = config.endY

  const denominator = (t0 - t1) * (t0 - t2) * (t1 - t2)

  const a =
    (t2 * (y1 - y0) + t1 * (y0 - y2) + t0 * (y2 - y1)) /
    denominator
  const b =
    (t2 * t2 * (y0 - y1) + t1 * t1 * (y2 - y0) + t0 * t0 * (y1 - y2)) /
    denominator
  const c =
    (t1 * t2 * (t1 - t2) * y0 +
      t2 * t0 * (t2 - t0) * y1 +
      t0 * t1 * (t0 - t1) * y2) /
    denominator

  return { a, b, c }
}

export const createThrowConfig = (
  width: number,
  height: number,
  radius = Math.max(44, Math.min(68, width * 0.12)),
): ThrowConfig => {
  return {
    startY: height + radius,
    peakY: height * 0.4,
    endY: height + radius * 1.2,
    durationMs: THROW_DURATION_MS,
    radius,
    centerX: width / 2,
  }
}

export const getThrowY = (elapsedMs: number, config: ThrowConfig): number => {
  const clamped = Math.max(0, Math.min(elapsedMs, config.durationMs))
  const { a, b, c } = getParabolaCoefficients(config)
  return a * clamped * clamped + b * clamped + c
}

export const isThrowFinished = (elapsedMs: number, config: ThrowConfig): boolean => {
  return elapsedMs >= config.durationMs
}
