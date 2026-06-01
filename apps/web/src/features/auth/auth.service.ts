import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type SessionSource = 'restored' | 'new'

export type AnonymousSession = {
  user: User
  source: SessionSource
}

export const getCurrentUser = async (): Promise<User | null> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  return user
}

export const signInAnonymously = async (): Promise<AnonymousSession> => {
  const existingUser = await getCurrentUser()
  if (existingUser) {
    return {
      user: existingUser,
      source: 'restored',
    }
  }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    throw error ?? new Error('Anonymous sign in failed')
  }

  return {
    user: data.user,
    source: 'new',
  }
}

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}
