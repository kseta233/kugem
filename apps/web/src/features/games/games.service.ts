import { supabase } from '@/lib/supabase'
import type { Game } from '@/types/game'

export const getGames = async (): Promise<Game[]> => {
  const { data, error } = await supabase
    .from('games')
    .select('id, slug, title, description, thumbnail_url, status, version, config, created_at, updated_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as Game[]
}

export const getGameBySlug = async (slug: string): Promise<Game | null> => {
  const { data, error } = await supabase
    .from('games')
    .select('id, slug, title, description, thumbnail_url, status, version, config, created_at, updated_at')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle<Game>()

  if (error) {
    throw error
  }

  return data
}
