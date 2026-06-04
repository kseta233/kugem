import { corsHeaders, errorJson, json } from '../_shared/cors.ts'
import { adminClient, getAuthenticatedUser } from '../_shared/supabase.ts'

type LeaderboardRow = {
  user_id: string
  score: number
  rank: number
  achieved_at: string
  profiles:
    | {
        display_name: string | null
        avatar_url: string | null
      }
    | Array<{
        display_name: string | null
        avatar_url: string | null
      }>
    | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorJson(405, 'METHOD_NOT_ALLOWED')
  }

  const user = await getAuthenticatedUser(req)
  if (!user) {
    return errorJson(401, 'UNAUTHORIZED')
  }

  let payload: { gameId?: string }
  try {
    payload = await req.json()
  } catch {
    return errorJson(400, 'INVALID_REQUEST')
  }

  const gameId = payload.gameId?.trim()
  if (!gameId) {
    return errorJson(400, 'INVALID_GAME_ID')
  }

  const { data, error } = await adminClient
    .from('leaderboard')
    .select('user_id, score, rank, achieved_at, profiles!inner(display_name, avatar_url)')
    .eq('game_id', gameId)
    .order('rank', { ascending: true })
    .returns<LeaderboardRow[]>()

  if (error) {
    return errorJson(500, 'LEADERBOARD_LOOKUP_FAILED', error.message)
  }

  return json(
    200,
    (data ?? []).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles

      return {
        user_id: row.user_id,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        score: row.score,
        rank: row.rank,
        created_at: row.achieved_at,
      }
    }),
  )
})