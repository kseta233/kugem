import { supabase } from '@/lib/supabase'
import type { LeaderboardItem } from '@/types/leaderboard'

export const getTopScoresByGame = async (
  gameId: string,
  limit = 10,
): Promise<LeaderboardItem[]> => {
  const { data, error } = await supabase
    .from('scores')
    .select('user_id, score, created_at, profiles!inner(display_name, avatar_url)')
    .eq('game_id', gameId)
    .eq('validation_status', 'valid')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles

    return {
      user_id: row.user_id,
      score: row.score,
      created_at: row.created_at,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    }
  })
}
