import type { CutLine, ThrowConfig, YinYangSamuraiResult } from '@/features/games/yinyang-samurai/types/yinyangSamurai.types'
import { buildCutResult, buildMissedResult } from '@/features/games/yinyang-samurai/engine/scoring'
import { doesLineIntersectCircle } from '@/features/games/yinyang-samurai/engine/cutDetection'

// Lightweight scene helper to keep gameplay calculations decoupled from React view wiring.
export class YinYangSamuraiScene {
  public resolveCut(line: CutLine, config: ThrowConfig, objectY: number, durationMs: number): YinYangSamuraiResult {
    const circle = {
      x: config.centerX,
      y: objectY,
      radius: config.radius,
    }

    if (!doesLineIntersectCircle(line, circle)) {
      return buildMissedResult(durationMs)
    }

    return buildCutResult(line, circle, durationMs)
  }
}
