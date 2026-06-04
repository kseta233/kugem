import { supabase } from '@/lib/supabase'
import type { LeaderboardItem } from '@/types/leaderboard'

export const getTopScoresByGame = async (
  gameId: string,
  limit = 10,
): Promise<LeaderboardItem[]> => {
  const { data, error } = await supabase.functions.invoke('get_leaderboard', {
    body: {
      gameId,
    },
  })

  if (error) {
    throw error
  }

  if (!Array.isArray(data)) {
    throw new Error('Invalid get_leaderboard response')
  }

  return (data as LeaderboardItem[]).slice(0, limit)
}
