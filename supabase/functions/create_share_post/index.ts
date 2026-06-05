import { corsHeaders, errorJson, json } from '../_shared/cors.ts'
import { adminClient, getAuthenticatedUser } from '../_shared/supabase.ts'

const createShareSlug = (): string => {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10)
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

  let payload: { scoreId?: string; caption?: string; mediaUrl?: string; appBaseUrl?: string }
  try {
    payload = await req.json()
  } catch {
    return errorJson(400, 'INVALID_REQUEST')
  }

  const scoreId = payload.scoreId?.trim()
  const caption = payload.caption?.trim() ?? null
  const mediaUrl = payload.mediaUrl?.trim() ?? null

  if (!scoreId) {
    return errorJson(400, 'INVALID_SCORE_ID')
  }

  const { data: score, error: scoreError } = await adminClient
    .from('scores')
    .select('id, game_id, user_id, validation_status')
    .eq('id', scoreId)
    .eq('user_id', user.id)
    .in('validation_status', ['valid', 'suspicious'])
    .maybeSingle<{
      id: string
      game_id: string
      user_id: string
      validation_status: 'valid' | 'suspicious'
    }>()

  if (scoreError) {
    return errorJson(500, 'SCORE_LOOKUP_FAILED', scoreError.message)
  }

  if (!score) {
    return errorJson(404, 'SCORE_NOT_FOUND_OR_NOT_SHAREABLE')
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('app_status')
    .eq('id', user.id)
    .single<{ app_status: 'anonymous' | 'unregistered' | 'registered' | 'blocked' }>()

  if (profileError) {
    return errorJson(500, 'PROFILE_LOOKUP_FAILED', profileError.message)
  }

  if (profile?.app_status !== 'registered') {
    return errorJson(403, 'REGISTRATION_REQUIRED')
  }

  const appBaseUrl = (Deno.env.get('APP_BASE_URL') ?? payload.appBaseUrl ?? 'http://localhost:5173').replace(/\/$/, '')

  for (let i = 0; i < 8; i += 1) {
    const shareSlug = createShareSlug()

    const { data: post, error: postError } = await adminClient
      .from('posts')
      .insert({
        user_id: user.id,
        game_id: score.game_id,
        score_id: score.id,
        caption,
        media_url: mediaUrl,
        share_slug: shareSlug,
        is_public: true,
      })
      .select('id, share_slug')
      .single<{ id: string; share_slug: string }>()

    if (!postError && post) {
      return json(200, {
        postId: post.id,
        shareSlug: post.share_slug,
        shareUrl: `${appBaseUrl}/share/${post.share_slug}`,
      })
    }

    if (postError?.code !== '23505') {
      return errorJson(500, 'POST_CREATE_FAILED', postError?.message)
    }
  }

  return errorJson(500, 'SHARE_SLUG_GENERATION_FAILED')
})
