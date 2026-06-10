import { json, errorJson } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'

const GAME_SERVICE_HMAC_SECRET = Deno.env.get('GAME_SERVICE_HMAC_SECRET')

type EnvelopePlayer = {
  userId: string
  displayName?: string
  seat: number
}

type MatchOutcome = {
  winnerId: string | null
  player1UserId: string
  player2UserId: string
  player1Score: number
  player2Score: number
  rounds: unknown[]
}

type SubmitSessionEnvelope = {
  envelopeId: string
  sessionId: string
  roomId: string
  gameType: string
  gameVersion: string
  players: EnvelopePlayer[]
  outcome: MatchOutcome
  startedAt: string
  endedAt: string
  envelopeCreatedAt: string
  resultHash: string
  signature: string
}

async function computeHmac(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const msgData = encoder.encode(message)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const sig = await crypto.subtle.sign('HMAC', key, msgData)
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function verifySignature(envelope: SubmitSessionEnvelope, secret: string): Promise<boolean> {
  const { resultHash: _rh, signature, ...body } = envelope
  const serialized = JSON.stringify(body)
  const expected = await computeHmac(secret, serialized)
  return expected === signature
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  if (req.method !== 'POST') {
    return errorJson(405, 'METHOD_NOT_ALLOWED')
  }

  if (!GAME_SERVICE_HMAC_SECRET) {
    console.error('GAME_SERVICE_HMAC_SECRET is not set')
    return errorJson(500, 'INTERNAL_SERVER_ERROR')
  }

  let envelope: SubmitSessionEnvelope
  try {
    envelope = await req.json()
  } catch {
    return errorJson(400, 'INVALID_REQUEST')
  }

  // Basic shape validation
  if (
    !envelope ||
    typeof envelope.sessionId !== 'string' ||
    typeof envelope.roomId !== 'string' ||
    typeof envelope.gameType !== 'string' ||
    !envelope.outcome ||
    typeof envelope.signature !== 'string' ||
    typeof envelope.resultHash !== 'string'
  ) {
    return errorJson(400, 'INVALID_PAYLOAD')
  }

  // Verify HMAC signature
  let signatureValid: boolean
  try {
    const expected = await verifySignature(envelope, GAME_SERVICE_HMAC_SECRET)
    // Use timing-safe comparison
    const { resultHash: _rh, signature, ...body } = envelope
    const serialized = JSON.stringify(body)
    const actualHmac = await computeHmac(GAME_SERVICE_HMAC_SECRET, serialized)
    signatureValid = timingSafeEqual(actualHmac, envelope.signature)
  } catch {
    return errorJson(500, 'SIGNATURE_VERIFICATION_FAILED')
  }

  if (!signatureValid) {
    return errorJson(401, 'INVALID_SIGNATURE')
  }

  const outcome = envelope.outcome

  // Insert match result (upsert by session_id to handle retries)
  const { error: insertError } = await adminClient
    .from('match_results')
    .upsert(
      {
        session_id: envelope.sessionId,
        room_id: envelope.roomId,
        game_type: envelope.gameType,
        game_version: envelope.gameVersion,
        player1_user_id: outcome.player1UserId,
        player2_user_id: outcome.player2UserId,
        winner_user_id: outcome.winnerId ?? null,
        player1_score: outcome.player1Score,
        player2_score: outcome.player2Score,
        rounds: outcome.rounds,
        result_hash: envelope.resultHash,
        started_at: envelope.startedAt,
        ended_at: envelope.endedAt,
        submitted_at: envelope.envelopeCreatedAt,
      },
      { onConflict: 'session_id', ignoreDuplicates: true },
    )

  if (insertError) {
    console.error('Failed to insert match result:', insertError.message)
    return errorJson(500, 'RESULT_INSERT_FAILED', insertError.message)
  }

  return json(200, { ok: true, sessionId: envelope.sessionId })
})
