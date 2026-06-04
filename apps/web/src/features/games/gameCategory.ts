import type { HomeCategory } from '@/shared/components'
import type { Game } from '@/types/game'

export const classifyCategory = (game: Game): HomeCategory => {
  const text = `${game.slug} ${game.title}`.toLowerCase()

  if (text.includes('reaction') || text.includes('reflex')) {
    return 'Reflex'
  }

  if (text.includes('memory') || text.includes('match') || text.includes('puzzle')) {
    return 'Puzzle'
  }

  if (text.includes('speed') || text.includes('tap')) {
    return 'Action'
  }

  return 'Coming Soon'
}

export const toCardVariant = (category: HomeCategory): 'reaction' | 'memory' | 'speed' | 'locked' => {
  if (category === 'Reflex') {
    return 'reaction'
  }
  if (category === 'Puzzle') {
    return 'memory'
  }
  if (category === 'Action') {
    return 'speed'
  }
  return 'locked'
}
