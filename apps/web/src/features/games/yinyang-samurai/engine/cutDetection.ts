import type { CutLine } from '@/features/games/yinyang-samurai/types/yinyangSamurai.types'

type Circle = {
  x: number
  y: number
  radius: number
}

const getDistanceBetweenPoints = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.hypot(x2 - x1, y2 - y1)
}

const getDistancePointToSegment = (pointX: number, pointY: number, line: CutLine): number => {
  const ax = line.startX
  const ay = line.startY
  const bx = line.endX
  const by = line.endY

  const abx = bx - ax
  const aby = by - ay
  const abLengthSq = abx * abx + aby * aby

  if (abLengthSq === 0) {
    return getDistanceBetweenPoints(pointX, pointY, ax, ay)
  }

  const apx = pointX - ax
  const apy = pointY - ay
  const projection = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLengthSq))

  const closestX = ax + projection * abx
  const closestY = ay + projection * aby

  return getDistanceBetweenPoints(pointX, pointY, closestX, closestY)
}

export const isSwipeLargeEnough = (line: CutLine, minDistance = 18): boolean => {
  return getDistanceBetweenPoints(line.startX, line.startY, line.endX, line.endY) >= minDistance
}

export const doesLineIntersectCircle = (line: CutLine, circle: Circle): boolean => {
  const distance = getDistancePointToSegment(circle.x, circle.y, line)
  return distance <= circle.radius
}

export const getDistancePointToInfiniteLine = (pointX: number, pointY: number, line: CutLine): number => {
  const { startX, startY, endX, endY } = line
  const lineLength = Math.hypot(endX - startX, endY - startY)

  if (lineLength === 0) {
    return Number.POSITIVE_INFINITY
  }

  const numerator = Math.abs(
    (endY - startY) * pointX - (endX - startX) * pointY + endX * startY - endY * startX,
  )

  return numerator / lineLength
}
