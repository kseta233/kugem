export type GameStatus = 'draft' | 'active' | 'inactive' | 'archived'

export type GameConfig = {
  timeLimitMs?: number
  maxScore?: number
  maxScorePerSecond?: number
  rewardCoin?: number
  leaderboardEnabled?: boolean
  shareEnabled?: boolean
}

export type Game = {
  id: string
  slug: string
  title: string
  description: string | null
  thumbnail_url: string | null
  status: GameStatus
  version: number
  config: GameConfig
  created_at: string
  updated_at: string
}
