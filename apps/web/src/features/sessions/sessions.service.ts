import { supabase } from '@/lib/supabase'
import type { GameConfig } from '@/types/game'

export type StartGameSessionResult = {
  sessionId: string
  gameId: string
  gameVersion: number
  nonce: string
  startedAt: string
  config: GameConfig
}

export type SubmitScoreResult = {
  scoreId: string
  validationStatus: 'valid' | 'suspicious' | 'rejected'
  coinReward: number
  totalCoin: number | null
  rankHint: number | null
}

export const startGameSession = async (gameSlug: string): Promise<StartGameSessionResult> => {
  const { data, error } = await supabase.functions.invoke('start_game_session', {
    body: {
      gameSlug,
      clientMeta: {
        platform: 'web',
        appVersion: import.meta.env.VITE_APP_VERSION ?? '0.1.0',
        userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
      },
    },
  })

  if (error) {
    throw error
  }

  if (!data?.sessionId || !data?.gameId) {
    throw new Error('Invalid start_game_session response')
  }

  return data as StartGameSessionResult
}

export const submitScore = async (
  sessionId: string,
  score: number,
  durationMs: number,
): Promise<SubmitScoreResult> => {
  const { data, error } = await supabase.functions.invoke('submit_score', {
    body: {
      sessionId,
      score,
      durationMs,
    },
  })

  if (error) {
    throw error
  }

  if (!data?.scoreId || !data?.validationStatus) {
    throw new Error('Invalid submit_score response')
  }

  return data as SubmitScoreResult
}
