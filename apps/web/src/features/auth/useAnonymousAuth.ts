import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { signInAnonymously, signOut } from '@/features/auth/auth.service'
import type { SessionSource } from '@/features/auth/auth.service'
import { getProfile, upsertProfile, updateProfile } from '@/features/profile/profile.service'
import type { Profile } from '@/types/profile'

type UseAnonymousAuthResult = {
  user: User | null
  profile: Profile | null
  sessionSource: SessionSource | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  signOutAndRestart: () => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
}

const DEFAULT_DISPLAY_NAME = 'Guest'

const createFallbackProfile = (user: User): Profile => ({
  id: user.id,
  username: null,
  display_name: DEFAULT_DISPLAY_NAME,
  avatar_url: null,
  app_status: user.is_anonymous ? 'anonymous' : 'registered',
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

  const bootstrap = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const session = await signInAnonymously()
      const authedUser = session.user
      setUser(authedUser)
      setSessionSource(session.source)

      try {
        await upsertProfile({
          id: authedUser.id,
          display_name: DEFAULT_DISPLAY_NAME,
          app_status: authedUser.is_anonymous ? 'anonymous' : 'registered',
        })

        const nextProfile = await getProfile(authedUser.id)
        setProfile(nextProfile ?? createFallbackProfile(authedUser))
      } catch {
        setProfile(createFallbackProfile(authedUser))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected auth error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

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
  }
}
