import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type SessionSource = 'restored' | 'new'

export type AnonymousSession = {
  user: User
  source: SessionSource
}

const LOCAL_ANON_SESSION_KEY = 'miniplay.local.anonymous.user-id'

const readLocalAnonymousUserId = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(LOCAL_ANON_SESSION_KEY)
}

const writeLocalAnonymousUserId = (userId: string): void => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LOCAL_ANON_SESSION_KEY, userId)
}

const clearLocalAnonymousUserId = (): void => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(LOCAL_ANON_SESSION_KEY)
}

const clearLocalAppStorage = (): void => {
  if (typeof window === 'undefined') {
    return
  }

  const isAuthStorageKey = (key: string) =>
    key === LOCAL_ANON_SESSION_KEY ||
    key.startsWith('miniplay.') ||
    key.startsWith('sb-') ||
    key.includes('supabase.auth')

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index)
    if (key && isAuthStorageKey(key)) {
      window.localStorage.removeItem(key)
    }
  }

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index)
    if (key && isAuthStorageKey(key)) {
      window.sessionStorage.removeItem(key)
    }
  }
}

export const resetClientAppState = async (): Promise<void> => {
  clearLocalAnonymousUserId()
  clearLocalAppStorage()

  if (typeof window === 'undefined' || typeof window.caches === 'undefined') {
    return
  }

  try {
    const cacheKeys = await window.caches.keys()
    await Promise.all(cacheKeys.map((key) => window.caches.delete(key)))
  } catch {
    // Ignore cache API failures and continue restart flow.
  }
}

const getGoogleAuthRedirectTo = (): string => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5173/auth'
  }

  return `${window.location.origin}/auth`
}

const openOAuthPopup = (url: string): void => {
  if (typeof window === 'undefined') {
    return
  }

  const popup = window.open(url, 'miniplay-google-auth', 'popup=yes,width=480,height=720')
  if (popup) {
    popup.focus()
    return
  }

  window.location.assign(url)
}

export const getCurrentUser = async (): Promise<User | null> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    if (error.message.toLowerCase().includes('auth session missing')) {
      return null
    }
    throw error
  }

  return user
}

export const signInAnonymously = async (): Promise<AnonymousSession> => {
  const existingUser = await getCurrentUser()
  if (existingUser) {
    if (existingUser.is_anonymous) {
      const localAnonymousUserId = readLocalAnonymousUserId()
      const source: SessionSource = localAnonymousUserId === existingUser.id ? 'restored' : 'new'
      writeLocalAnonymousUserId(existingUser.id)

      return {
        user: existingUser,
        source,
      }
    }

    return {
      user: existingUser,
      source: 'restored',
    }
  }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    throw error ?? new Error('Anonymous sign in failed')
  }

  writeLocalAnonymousUserId(data.user.id)

  return {
    user: data.user,
    source: 'new',
  }
}

export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    throw error ?? new Error('Email sign in failed')
  }

  clearLocalAnonymousUserId()

  return data.user
}

export const signInWithGoogle = async (): Promise<void> => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getGoogleAuthRedirectTo(),
      skipBrowserRedirect: true,
    },
  })

  if (error) {
    throw error
  }

  if (!data?.url) {
    throw new Error('Google sign in URL unavailable')
  }

  openOAuthPopup(data.url)
}

export const signUpWithEmail = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error || !data.user) {
    throw error ?? new Error('Email sign up failed')
  }

  clearLocalAnonymousUserId()

  return data.user
}

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }

  clearLocalAnonymousUserId()
  clearLocalAppStorage()
}
