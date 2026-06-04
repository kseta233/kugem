import { corsHeaders, errorJson, json } from '../_shared/cors.ts'
import { adminClient, getAuthenticatedUser } from '../_shared/supabase.ts'

type GameConfig = {
  timeLimitMs?: number
  maxScore?: number
  maxScorePerSecond?: number
  rewardCoin?: number
}

type ValidationStatus = 'valid' | 'suspicious' | 'rejected'

type ValidationResult = {
  status: ValidationStatus
  reason: string | null
}

type LeaderboardRow = {
  score_id: string
  user_id: string
  score: number
  rank: number
  achieved_at: string
}

const validateScore = (score: number, durationMs: number, config: GameConfig): ValidationResult => {
  if (!Number.isFinite(score) || !Number.isFinite(durationMs) || score < 0 || durationMs <= 0) {
    return { status: 'rejected', reason: 'INVALID_SCORE_OR_DURATION' }
  }

  const timeLimitMs = config.timeLimitMs ?? 30_000
  const maxScore = config.maxScore ?? 1_000
  const maxScorePerSecond = config.maxScorePerSecond ?? 50

  if (durationMs < 300) {
    return { status: 'rejected', reason: 'DURATION_TOO_FAST' }
  }

  if (durationMs > timeLimitMs * 3) {
    return { status: 'rejected', reason: 'DURATION_TOO_LONG' }
  }

  if (score > maxScore) {
    return { status: 'rejected', reason: 'SCORE_EXCEEDS_MAX_SCORE' }
  }

  const scorePerSecond = score / (durationMs / 1000)
  if (scorePerSecond > maxScorePerSecond) {
    return { status: 'suspicious', reason: 'SCORE_VELOCITY_TOO_HIGH' }
  }

  return { status: 'valid', reason: null }
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

  let payload: { sessionId?: string; score?: number; durationMs?: number }
  try {
    payload = await req.json()
  } catch {
    return errorJson(400, 'INVALID_REQUEST')
  }

  const sessionId = payload.sessionId?.trim()
  const score = payload.score
  const durationMs = payload.durationMs

  if (!sessionId || typeof score !== 'number' || typeof durationMs !== 'number') {
    return errorJson(400, 'INVALID_PAYLOAD')
  }

  const { data: session, error: sessionError } = await adminClient
    .from('game_sessions')
    .select('id, user_id, game_id, status, game_version')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle<{
      id: string
      user_id: string
      game_id: string
      status: 'started' | 'submitted' | 'expired' | 'rejected'
      game_version: number
    }>()

  if (sessionError) {
    return errorJson(500, 'SESSION_LOOKUP_FAILED', sessionError.message)
  }

  if (!session) {
    return errorJson(404, 'SESSION_NOT_FOUND')
  }

  if (session.status !== 'started') {
    return errorJson(409, 'SESSION_ALREADY_SUBMITTED')
  }

  const { data: game, error: gameError } = await adminClient
    .from('games')
    .select('id, config, version')
    .eq('id', session.game_id)
    .maybeSingle<{ id: string; config: GameConfig; version: number }>()

  if (gameError) {
    return errorJson(500, 'GAME_LOOKUP_FAILED', gameError.message)
  }

  if (!game) {
    return errorJson(404, 'GAME_NOT_FOUND')
  }

  const validation = validateScore(score, durationMs, game.config)

  if (validation.status === 'rejected') {
    const { error: rejectError } = await adminClient
      .from('game_sessions')
      .update({
        status: 'rejected',
        submitted_score: score,
        duration_ms: durationMs,
        ended_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    if (rejectError) {
      return errorJson(500, 'SESSION_REJECT_UPDATE_FAILED', rejectError.message)
    }

    return errorJson(400, 'SCORE_REJECTED', validation.reason ?? undefined)
  }

  const { data: scoreRecord, error: scoreInsertError } = await adminClient
    .from('scores')
    .insert({
      user_id: user.id,
      game_id: session.game_id,
      session_id: session.id,
      score,
      duration_ms: durationMs,
      validation_status: validation.status,
      validation_reason: validation.reason,
    })
    .select('id, created_at')
    .single<{ id: string; created_at: string }>()

  if (scoreInsertError || !scoreRecord) {
    return errorJson(500, 'SCORE_INSERT_FAILED', scoreInsertError?.message)
  }

  const { error: sessionUpdateError } = await adminClient
    .from('game_sessions')
    .update({
      status: 'submitted',
      submitted_score: score,
      duration_ms: durationMs,
      ended_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  if (sessionUpdateError) {
    return errorJson(500, 'SESSION_UPDATE_FAILED', sessionUpdateError.message)
  }

  const { data: currentProfile, error: currentProfileError } = await adminClient
    .from('profiles')
    .select('total_play_count, total_coin, app_status')
    .eq('id', user.id)
    .single<{ total_play_count: number; total_coin: number; app_status: 'anonymous' | 'unregistered' | 'registered' | 'blocked' }>()

  if (currentProfileError || !currentProfile) {
    return errorJson(500, 'PROFILE_LOOKUP_FAILED', currentProfileError?.message)
  }

  const { error: playCountUpdateError } = await adminClient
    .from('profiles')
    .update({ total_play_count: (currentProfile.total_play_count ?? 0) + 1 })
    .eq('id', user.id)

  if (playCountUpdateError) {
    return errorJson(500, 'PROFILE_PLAYCOUNT_UPDATE_FAILED', playCountUpdateError.message)
  }

  let enteredLeaderboard = false
  let leaderboardRank: number | null = null
  let coinReward = 0

  if (validation.status === 'valid') {
    const { data: refreshedLeaderboard, error: leaderboardError } = await adminClient.rpc(
      'refresh_game_leaderboard',
      {
        p_game_id: session.game_id,
      },
    )

    if (leaderboardError) {
      return errorJson(500, 'LEADERBOARD_REFRESH_FAILED', leaderboardError.message)
    }

    const leaderboardRows = (refreshedLeaderboard ?? []) as LeaderboardRow[]
    const matchedEntry = leaderboardRows.find((entry) => entry.score_id === scoreRecord.id)

    enteredLeaderboard = Boolean(matchedEntry)
    leaderboardRank = matchedEntry?.rank ?? null
  }

  let totalCoin: number | null = null
  const canReceiveCoinReward = currentProfile.app_status === 'registered'

  if (validation.status === 'valid' && enteredLeaderboard && canReceiveCoinReward) {
    coinReward = Math.max(0, Number(game.config.rewardCoin ?? 0))
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('total_coin')
    .eq('id', user.id)
    .single<{ total_coin: number }>()

  if (profileError || !profile) {
    return errorJson(500, 'PROFILE_LOOKUP_FAILED', profileError?.message)
  }

  if (coinReward > 0) {
    const nextTotalCoin = (profile.total_coin ?? 0) + coinReward

    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({ total_coin: nextTotalCoin })
      .eq('id', user.id)

    if (profileUpdateError) {
      return errorJson(500, 'PROFILE_COIN_UPDATE_FAILED', profileUpdateError.message)
    }

    const { error: ledgerError } = await adminClient.from('coin_ledger').insert({
      user_id: user.id,
      score_id: scoreRecord.id,
      transaction_type: 'reward',
      amount: coinReward,
      balance_after: nextTotalCoin,
      reason: 'LEADERBOARD_SHARE_REWARD',
      metadata: {
        sessionId: session.id,
        gameId: session.game_id,
        leaderboardRank,
      },
    })

    if (ledgerError) {
      return errorJson(500, 'COIN_LEDGER_INSERT_FAILED', ledgerError.message)
    }

    totalCoin = nextTotalCoin
  } else {
    totalCoin = profile.total_coin ?? 0
  }

  return json(200, {
    scoreId: scoreRecord.id,
    validationStatus: validation.status,
    enteredLeaderboard,
    coinReward,
    totalCoin,
    leaderboardRank,
    rankHint: leaderboardRank,
  })
})
