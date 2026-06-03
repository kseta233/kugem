import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { signInAnonymously, signInWithEmail, signOut, signUpWithEmail } from '@/features/auth/auth.service'
import type { SessionSource } from '@/features/auth/auth.service'
import { getProfile, upsertProfile, updateProfile } from '@/features/profile/profile.service'
import type { Profile } from '@/types/profile'
import type { UserAppStatus } from '@/types/profile'

type UseAnonymousAuthResult = {
  user: User | null
  profile: Profile | null
  sessionSource: SessionSource | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  signOutAndRestart: () => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (displayName: string, email: string, password: string) => Promise<void>
}

const DEFAULT_DISPLAY_NAME = 'Guest'

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

  const refresh = useCallback(async () => {
    await bootstrap()
  }, [bootstrap])

  const signOutAndRestart = useCallback(async () => {
    await signOut()
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
    async (displayName: string, email: string, password: string) => {
      setLoading(true)
      setError(null)

      try {
        const authedUser = await signUpWithEmail(email.trim(), password)
        setUser(authedUser)
        setSessionSource('new')
        await syncProfile(authedUser, displayName)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Email sign-up failed'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [syncProfile],
  )

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const updated = await updateProfile(user.id, {
        display_name: displayName.trim() || DEFAULT_DISPLAY_NAME,
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
    signInWithEmail: signInWithEmailCredentials,
    signUpWithEmail: signUpWithEmailCredentials,
  }
}
