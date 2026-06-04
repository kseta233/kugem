import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  resetClientAppState,
  signInAnonymously,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
} from '@/features/auth/auth.service'
import type { SessionSource } from '@/features/auth/auth.service'
import { getProfile, upsertProfile, updateProfile } from '@/features/profile/profile.service'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/profile'
import type { UserAppStatus } from '@/types/profile'

type UseAnonymousAuthResult = {
  user: User | null
  profile: Profile | null
  sessionSource: SessionSource | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  signOutAndRestart: (options?: { clearClientState?: boolean; hardReload?: boolean }) => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
  updateAvatarIcon: (iconKey: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
}

const DEFAULT_DISPLAY_NAME = 'Guest'

const mapProfileWriteError = (error: unknown): Error => {
  const messageText =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: string }).message)
      : ''

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as { code?: string }).code) === '23505'
  ) {
    return new Error('Display name already taken. Please choose another one.')
  }

  if (messageText.includes('DISPLAY_NAME_IMMUTABLE_AFTER_REGISTRATION')) {
    return new Error('Display name cannot be changed after registration.')
  }

  if (messageText.includes('DISPLAY_NAME_REQUIRED_FOR_REGISTERED')) {
    return new Error('Display name is required for registered accounts.')
  }

  return error instanceof Error ? error : new Error('Unable to save profile.')
}

const resolveUserStatus = (user: User): UserAppStatus => (user.is_anonymous ? 'unregistered' : 'registered')

const createFallbackProfile = (user: User, displayName: string = DEFAULT_DISPLAY_NAME): Profile => ({
  id: user.id,
  username: null,
  display_name: displayName,
  avatar_url: null,
  app_status: resolveUserStatus(user),
  total_coin: 0,
  total_play_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

export const useAnonymousAuth = (): UseAnonymousAuthResult => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessionSource, setSessionSource] = useState<SessionSource | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const syncProfile = useCallback(async (authedUser: User, preferredDisplayName?: string) => {
    const resolvedDisplayName = preferredDisplayName?.trim() || DEFAULT_DISPLAY_NAME
    const resolvedStatus = resolveUserStatus(authedUser)

    const existingProfile = await getProfile(authedUser.id)
    if (!existingProfile) {
      await upsertProfile({
        id: authedUser.id,
        display_name: resolvedDisplayName,
        app_status: resolvedStatus,
      })

      const createdProfile = await getProfile(authedUser.id)
      setProfile(createdProfile ?? createFallbackProfile(authedUser, resolvedDisplayName))
      return
    }

    const nextDisplayName = existingProfile.display_name?.trim() || resolvedDisplayName
    const requiresSync =
      existingProfile.app_status !== resolvedStatus || existingProfile.display_name !== nextDisplayName

    if (!requiresSync) {
      setProfile(existingProfile)
      return
    }

    await upsertProfile({
      id: authedUser.id,
      display_name: nextDisplayName,
      app_status: resolvedStatus,
    })

    const syncedProfile = await getProfile(authedUser.id)
    setProfile(syncedProfile ?? createFallbackProfile(authedUser, nextDisplayName))
  }, [])

  const bootstrap = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const session = await signInAnonymously()
      const authedUser = session.user
      setUser(authedUser)
      setSessionSource(session.source)
      await syncProfile(authedUser)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected auth error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [syncProfile])

  useEffect(() => {
    queueMicrotask(() => {
      void bootstrap()
    })
  }, [bootstrap])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authedUser = session?.user
      if (!authedUser || authedUser.is_anonymous) {
        return
      }

      setUser(authedUser)
      setSessionSource('new')
      void syncProfile(authedUser)
    })

    return () => subscription.unsubscribe()
  }, [syncProfile])

  const refresh = useCallback(async () => {
    await bootstrap()
  }, [bootstrap])

  const signOutAndRestart = useCallback(async (options?: { clearClientState?: boolean; hardReload?: boolean }) => {
    try {
      await signOut()
    } catch {
      // After account deletion, sign-out may fail because the auth user no longer exists.
      // Continue bootstrap to recover into a fresh anonymous session.
    }

    if (options?.clearClientState) {
      await resetClientAppState()
    }

    if (options?.hardReload && typeof window !== 'undefined') {
      window.location.replace('/')
      return
    }

    await bootstrap()
  }, [bootstrap])

  const signInWithEmailCredentials = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    try {
      const authedUser = await signInWithEmail(email.trim(), password)
      setUser(authedUser)
      setSessionSource('new')
      await syncProfile(authedUser)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Email sign-in failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [syncProfile])

  const signUpWithEmailCredentials = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      setError(null)

      try {
        const authedUser = await signUpWithEmail(email.trim(), password)
        setUser(authedUser)
        setSessionSource('new')
        await syncProfile(authedUser)
      } catch (err) {
        const mappedError = mapProfileWriteError(err)
        const message = mappedError.message || 'Email sign-up failed'
        setError(message)
        throw mappedError
      } finally {
        setLoading(false)
      }
    },
    [syncProfile],
  )

  const signInWithGoogleCredentials = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      await signInWithGoogle()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      if (profile?.app_status === 'registered') {
        throw new Error('Display name cannot be changed after registration.')
      }

      const nextDisplayName = displayName.trim() || DEFAULT_DISPLAY_NAME

      let updated
      try {
        updated = await updateProfile(user.id, {
          display_name: nextDisplayName,
        })
      } catch (error) {
        throw mapProfileWriteError(error)
      }

      setProfile(updated)
    },
    [profile?.app_status, user],
  )

  const updateAvatarIcon = useCallback(
    async (iconKey: string) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const updated = await updateProfile(user.id, {
        avatar_url: iconKey,
      })

      setProfile(updated)
    },
    [user],
  )

  return {
    user,
    profile,
    sessionSource,
    loading,
    error,
    refresh,
    signOutAndRestart,
    updateDisplayName,
    updateAvatarIcon,
    signInWithEmail: signInWithEmailCredentials,
    signUpWithEmail: signUpWithEmailCredentials,
    signInWithGoogle: signInWithGoogleCredentials,
  }
}
