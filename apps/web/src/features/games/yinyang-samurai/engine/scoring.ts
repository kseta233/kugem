import { getDistancePointToInfiniteLine } from '@/features/games/yinyang-samurai/engine/cutDetection'
import { getResultGrade } from '@/features/games/yinyang-samurai/engine/resultGrade'
import type { CutLine, YinYangSamuraiResult } from '@/features/games/yinyang-samurai/types/yinyangSamurai.types'

type Circle = {
  x: number
  y: number
  radius: number
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}

const toTwoDecimals = (value: number): number => {
  return Number(value.toFixed(2))
}

const getAreaRatio = (distanceFromCenter: number, radius: number): number => {
  const d = clamp(Math.abs(distanceFromCenter), 0, radius)

  const smallerArea =
    radius * radius * Math.acos(d / radius) - d * Math.sqrt(Math.max(0, radius * radius - d * d))
  const totalArea = Math.PI * radius * radius
  const biggerArea = totalArea - smallerArea

  if (smallerArea <= 0 || biggerArea <= 0) {
    return 0
  }

  return smallerArea / biggerArea
}

export const toYinYangScore = (accuracy: number): number => {
  return Math.round(clamp(accuracy, 0, 100) * 10)
}

export const buildMissedResult = (durationMs: number): YinYangSamuraiResult => {
  const accuracy = 0
  return {
    accuracy,
    score: 0,
    durationMs,
    grade: 'Missed Cut',
    isMissed: true,
  }
}

export const buildCutResult = (line: CutLine, circle: Circle, durationMs: number): YinYangSamuraiResult => {
  const distance = getDistancePointToInfiniteLine(circle.x, circle.y, line)

  if (!Number.isFinite(distance) || distance >= circle.radius) {
    return buildMissedResult(durationMs)
  }

  const ratio = getAreaRatio(distance, circle.radius)
  const accuracy = toTwoDecimals(clamp(ratio * 100, 0, 100))

  return {
    accuracy,
    score: toYinYangScore(accuracy),
    durationMs,
    grade: getResultGrade(accuracy),
    isMissed: false,
  }
}
