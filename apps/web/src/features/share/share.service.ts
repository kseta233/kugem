import { supabase } from '@/lib/supabase'

export type CreateSharePostInput = {
  scoreId: string
  caption?: string
  mediaUrl?: string
}

export type CreateSharePostResult = {
  postId: string
  shareSlug: string
  shareUrl: string
}

export type PublicSharePost = {
  postId: string
  shareSlug: string
  caption: string | null
  mediaUrl: string | null
  createdAt: string
  isPublic: boolean
  gameTitle: string
  gameSlug: string
  score: number
  durationMs: number
  validationStatus: 'valid' | 'suspicious' | 'rejected'
  displayName: string | null
  avatarUrl: string | null
}

export const createSharePost = async (
  input: CreateSharePostInput,
): Promise<CreateSharePostResult> => {
  const { data, error } = await supabase.functions.invoke('create_share_post', {
    body: input,
  })

  if (error) {
    throw error
  }

  if (!data?.postId || !data?.shareSlug || !data?.shareUrl) {
    throw new Error('Invalid create_share_post response')
  }

  return data as CreateSharePostResult
}

export const getPublicSharePostBySlug = async (shareSlug: string): Promise<PublicSharePost | null> => {
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, user_id, caption, media_url, share_slug, is_public, created_at, game_id, score_id')
    .eq('share_slug', shareSlug)
    .eq('is_public', true)
    .maybeSingle<{
      id: string
      user_id: string
      caption: string | null
      media_url: string | null
      share_slug: string
      is_public: boolean
      created_at: string
      game_id: string
      score_id: string | null
    }>()

  if (postError) {
    throw postError
  }

  if (!post || !post.score_id) {
    return null
  }

  const [{ data: game, error: gameError }, { data: score, error: scoreError }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from('games')
      .select('title, slug')
      .eq('id', post.game_id)
      .single<{ title: string; slug: string }>(),
    supabase
      .from('scores')
      .select('score, duration_ms, validation_status')
      .eq('id', post.score_id)
      .single<{ score: number; duration_ms: number; validation_status: 'valid' | 'suspicious' | 'rejected' }>(),
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', post.user_id)
      .maybeSingle<{ display_name: string | null; avatar_url: string | null }>(),
  ])

  if (gameError) {
    throw gameError
  }

  if (scoreError) {
    throw scoreError
  }

  if (profileError) {
    throw profileError
  }

  return {
    postId: post.id,
    shareSlug: post.share_slug,
    caption: post.caption,
    mediaUrl: post.media_url,
    createdAt: post.created_at,
    isPublic: post.is_public,
    gameTitle: game.title,
    gameSlug: game.slug,
    score: score.score,
    durationMs: score.duration_ms,
    validationStatus: score.validation_status,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  }
}
