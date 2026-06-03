import type {
  CountdownTick,
  YinYangSamuraiResult,
} from '@/features/games/yinyang-samurai/types/yinyangSamurai.types'

type GameSfxPlayer = {
  playCountdownTick: (tick: CountdownTick) => void
  playResultPop: (result: YinYangSamuraiResult) => void
  dispose: () => void
}

const createAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) {
    return null
  }

  return new AudioContextCtor()
}

const playTone = (ctx: AudioContext, frequency: number, durationMs: number, gain = 0.05, type: OscillatorType = 'triangle') => {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

  gainNode.gain.setValueAtTime(0.0001, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000)

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start()
  oscillator.stop(ctx.currentTime + durationMs / 1000)
}

export const createGameSfxPlayer = (): GameSfxPlayer => {
  const ctx = createAudioContext()

  const ensureRunning = () => {
    if (!ctx) {
      return false
    }

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {})
    }

    return true
  }

  return {
    playCountdownTick: (tick) => {
      if (!ensureRunning() || !ctx) {
        return
      }

      if (tick === 'GO') {
        playTone(ctx, 880, 170, 0.07, 'square')
        playTone(ctx, 1120, 190, 0.05, 'square')
        return
      }

      playTone(ctx, 620, 120, 0.05, 'triangle')
    },
    playResultPop: (result) => {
      if (!ensureRunning() || !ctx) {
        return
      }

      if (result.isMissed) {
        playTone(ctx, 210, 220, 0.06, 'sawtooth')
        return
      }

      if (result.accuracy >= 95) {
        playTone(ctx, 760, 120, 0.06, 'square')
        playTone(ctx, 980, 140, 0.05, 'square')
        return
      }

      playTone(ctx, 520, 150, 0.05, 'triangle')
    },
    dispose: () => {
      if (!ctx) {
        return
      }

      void ctx.close().catch(() => {})
    },
  }
}
