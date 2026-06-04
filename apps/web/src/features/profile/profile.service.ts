import { supabase } from '@/lib/supabase'
import type { Profile, UpsertProfileInput } from '@/types/profile'

type DeleteAccountInput = {
  email: string
  acceptedTerms: boolean
}

export const upsertProfile = async (input: UpsertProfileInput): Promise<void> => {
  const { error } = await supabase.from('profiles').upsert(input)
  if (error) {
    throw error
  }
}

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, app_status, total_coin, total_play_count, created_at, updated_at',
    )
    .eq('id', userId)
    .maybeSingle<Profile>()

  if (error) {
    throw error
  }

  return data
}

export const updateProfile = async (
  userId: string,
  patch: Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'username'>>,
): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select(
      'id, username, display_name, avatar_url, app_status, total_coin, total_play_count, created_at, updated_at',
    )
    .single<Profile>()

  if (error) {
    throw error
  }

  return data
}

export const deleteMyAccount = async (input: DeleteAccountInput): Promise<void> => {
  const { error } = await supabase.functions.invoke('delete_account', {
    body: input,
  })

  if (error) {
    throw error
  }
}
