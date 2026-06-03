import slashUrl from '@/features/games/yinyang-samurai/sfx/slash.opus'

type SlashSfxPlayer = {
  play: () => void
  dispose: () => void
}

export const createSlashSfxPlayer = (): SlashSfxPlayer => {
  if (typeof Audio === 'undefined') {
    return {
      play: () => {},
      dispose: () => {},
    }
  }

  const audio = new Audio(slashUrl)
  audio.preload = 'auto'
  audio.volume = 0.9

  return {
    play: () => {
      const oneShot = audio.cloneNode(true) as HTMLAudioElement
      oneShot.volume = audio.volume
      void oneShot.play().catch(() => {})
    },
    dispose: () => {
      audio.pause()
      audio.src = ''
    },
  }
}
