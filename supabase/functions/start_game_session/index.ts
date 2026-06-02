import { corsHeaders, errorJson, json } from '../_shared/cors.ts'
import { adminClient, getAuthenticatedUser } from '../_shared/supabase.ts'

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

  let payload: { gameSlug?: string; clientMeta?: Record<string, unknown> }
  try {
    payload = await req.json()
  } catch {
    return errorJson(400, 'INVALID_REQUEST')
  }

  const gameSlug = payload.gameSlug?.trim()
  if (!gameSlug) {
    return errorJson(400, 'INVALID_GAME_SLUG')
  }

  const { data: game, error: gameError } = await adminClient
    .from('games')
    .select('id, version, config, status')
    .eq('slug', gameSlug)
    .eq('status', 'active')
    .maybeSingle<{
      id: string
      version: number
      config: Record<string, unknown>
      status: 'active'
    }>()

  if (gameError) {
    return errorJson(500, 'GAME_LOOKUP_FAILED', gameError.message)
  }

  if (!game) {
    return errorJson(404, 'GAME_NOT_FOUND_OR_INACTIVE')
  }

  const now = new Date().toISOString()
  const nonce = crypto.randomUUID()

  const { data: session, error: sessionError } = await adminClient
    .from('game_sessions')
    .insert({
      user_id: user.id,
      game_id: game.id,
      game_version: game.version,
      nonce,
      status: 'started',
      started_at: now,
      client_meta: payload.clientMeta ?? {},
    })
    .select('id, started_at')
    .single<{ id: string; started_at: string }>()

  if (sessionError || !session) {
    return errorJson(500, 'SESSION_CREATE_FAILED', sessionError?.message)
  }

  return json(200, {
    sessionId: session.id,
    gameId: game.id,
    gameVersion: game.version,
    nonce,
    startedAt: session.started_at,
    config: game.config,
  })
})
