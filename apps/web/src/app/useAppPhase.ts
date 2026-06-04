import { useCallback, useEffect, useRef, useState } from 'react'

type AppPhase = 'splash' | 'splash-exiting' | 'welcome' | 'welcome-exiting' | 'main'

interface UseAppPhaseParams {
  loading: boolean
  routeName: 'home' | 'profile' | 'auth' | 'yinyang-intro' | 'yinyang-play' | 'share'
}

export function useAppPhase({ loading, routeName }: UseAppPhaseParams) {
  const [appPhase, setAppPhase] = useState<AppPhase>('splash')
  const splashDoneRef = useRef(false)
  const authDoneRef = useRef(false)
  const appPhaseRef = useRef<AppPhase>('splash')

  useEffect(() => {
    appPhaseRef.current = appPhase
  }, [appPhase])

  const tryAdvanceFromSplash = useCallback(() => {
    if (splashDoneRef.current && authDoneRef.current && appPhaseRef.current === 'splash') {
      setAppPhase('splash-exiting')
      setTimeout(
        () =>
          setAppPhase(
            routeName === 'share' ||
              routeName === 'auth' ||
              routeName === 'yinyang-intro' ||
              routeName === 'yinyang-play'
              ? 'main'
              : 'welcome',
          ),
        420,
      )
    }
  }, [routeName])

  useEffect(() => {
    const timer = setTimeout(() => {
      splashDoneRef.current = true
      tryAdvanceFromSplash()
    }, 2000)
    return () => clearTimeout(timer)
  }, [tryAdvanceFromSplash])

  useEffect(() => {
    if (!loading) {
      authDoneRef.current = true
      tryAdvanceFromSplash()
    }
  }, [loading, tryAdvanceFromSplash])

  const onContinueToGames = useCallback(() => {
    setAppPhase('welcome-exiting')
    setTimeout(() => setAppPhase('main'), 360)
  }, [])

  return {
    appPhase,
    setAppPhase,
    onContinueToGames,
  }
}
