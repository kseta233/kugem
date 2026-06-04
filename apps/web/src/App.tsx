import { useCallback, useEffect, useRef, useState } from 'react'
import { useAnonymousAuth } from '@/features/auth/useAnonymousAuth'
import { getGames } from '@/features/games/games.service'
import { getTopScoresByGame } from '@/features/leaderboard/leaderboard.service'
import {
  startGameSession,
  submitScore,
  type StartGameSessionResult,
  type SubmitScoreResult,
} from '@/features/sessions/sessions.service'
import {
  createSharePost,
  shareGameResult,
  type CreateSharePostResult,
} from '@/features/share/share.service'
import { getPublicSharePostBySlug, type PublicSharePost } from '@/features/share/share.service'
import {
  YinYangSamuraiGame,
  YinYangSamuraiResult,
  type YinYangSamuraiPlayResult,
} from '@/features/games/yinyang-samurai'
import { Button, Card, CoinBadge, HomeCategoryChips, HomeGameCard, Page } from '@/shared/components'
import type { HomeCategory } from '@/shared/components'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { AuthScreen } from '@/screens/AuthScreen'
import { RegisterPromptModal } from '@/screens/RegisterPromptModal'
import { ShareScreen } from '@/screens/ShareScreen'
import { SplashScreen } from '@/screens/SplashScreen'
import { WelcomeScreen } from '@/screens/WelcomeScreen'
import type { Game } from '@/types/game'
import type { LeaderboardItem } from '@/types/leaderboard'

type GameScreen = 'catalog' | 'detail' | 'play' | 'result'
type AppPhase = 'splash' | 'splash-exiting' | 'welcome' | 'welcome-exiting' | 'main'
type AppRoute =
  | { name: 'home' }
  | { name: 'profile' }
  | { name: 'auth' }
  | { name: 'yinyang-intro' }
  | { name: 'yinyang-play' }
  | { name: 'share'; slug: string }

const HOME_PATH = '/'
const PROFILE_PATH = '/profile'
const AUTH_PATH = '/auth'
const YINYANG_INTRO_PATH = '/game/yinyang/intro'
const YINYANG_PLAY_PATH = '/game/yinyang/play'

const resolveRouteFromPath = (pathname: string): AppRoute => {
  if (pathname.toLowerCase() === PROFILE_PATH) {
    return { name: 'profile' }
  }

  if (pathname.toLowerCase() === AUTH_PATH) {
    return { name: 'auth' }
  }

  if (pathname.toLowerCase() === YINYANG_INTRO_PATH) {
    return { name: 'yinyang-intro' }
  }

  if (pathname.toLowerCase() === YINYANG_PLAY_PATH) {
    return { name: 'yinyang-play' }
  }

  const shareMatch = pathname.match(/^\/share\/([^/]+)\/?$/i)
  if (shareMatch?.[1]) {
    return {
      name: 'share',
      slug: decodeURIComponent(shareMatch[1]),
    }
  }

  return { name: 'home' }
}

const resolvePathFromRoute = (route: AppRoute): string => {
  if (route.name === 'profile') {
    return PROFILE_PATH
  }
  if (route.name === 'auth') {
    return AUTH_PATH
  }
  if (route.name === 'yinyang-intro') {
    return YINYANG_INTRO_PATH
  }
  if (route.name === 'yinyang-play') {
    return YINYANG_PLAY_PATH
  }
  if (route.name === 'share') {
    return `/share/${encodeURIComponent(route.slug)}`
  }
  return HOME_PATH
}

const isSameRoute = (left: AppRoute, right: AppRoute): boolean => {
  if (left.name !== right.name) {
    return false
  }

  if (left.name === 'share' && right.name === 'share') {
    return left.slug === right.slug
  }

  return true
}

const classifyCategory = (game: Game): HomeCategory => {
  const text = `${game.slug} ${game.title}`.toLowerCase()

  if (text.includes('reaction') || text.includes('reflex')) {
    return 'Reflex'
  }

  if (text.includes('memory') || text.includes('match') || text.includes('puzzle')) {
    return 'Puzzle'
  }

  if (text.includes('speed') || text.includes('tap')) {
    return 'Action'
  }

  return 'Coming Soon'
}

const toCardVariant = (category: HomeCategory): 'reaction' | 'memory' | 'speed' | 'locked' => {
  if (category === 'Reflex') {
    return 'reaction'
  }
  if (category === 'Puzzle') {
    return 'memory'
  }
  if (category === 'Action') {
    return 'speed'
  }
  return 'locked'
}

function App() {
  const {
    user,
    profile,
    sessionSource,
    loading,
    error,
    refresh,
    signOutAndRestart,
    updateDisplayName,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
  } = useAnonymousAuth()

  const [route, setRoute] = useState<AppRoute>(() => {
    if (typeof window === 'undefined') {
      return { name: 'home' }
    }
    return resolveRouteFromPath(window.location.pathname)
  })

  // ── App phase management ──────────────────────────────────────────────────
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
            route.name === 'share' ||
              route.name === 'auth' ||
              route.name === 'yinyang-intro' ||
              route.name === 'yinyang-play'
              ? 'main'
              : 'welcome',
          ),
        420,
      )
    }
  }, [route.name])

  // Minimum splash display: 2 s
  useEffect(() => {
    const timer = setTimeout(() => {
      splashDoneRef.current = true
      tryAdvanceFromSplash()
    }, 2000)
    return () => clearTimeout(timer)
  }, [tryAdvanceFromSplash])

  // Advance once auth finishes loading
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

  // ── Game screen state ─────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [screen, setScreen] = useState<GameScreen>('catalog')
  const [games, setGames] = useState<Game[]>([])
  const [gamesLoading, setGamesLoading] = useState(false)
  const [gamesError, setGamesError] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedGameCategory, setSelectedGameCategory] = useState<HomeCategory>('Reflex')
  const [currentSession, setCurrentSession] = useState<StartGameSessionResult | null>(null)
  const [playDurationMs, setPlayDurationMs] = useState<number | null>(null)
  const [submittedScore, setSubmittedScore] = useState<number | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitScoreResult | null>(null)
  const [submittingScore, setSubmittingScore] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)
  const [shareResult, setShareResult] = useState<CreateSharePostResult | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [nativeShareStatus, setNativeShareStatus] = useState<string | null>(null)
  const [publicSharePost, setPublicSharePost] = useState<PublicSharePost | null>(null)
  const [publicShareLoading, setPublicShareLoading] = useState(false)
  const [publicShareError, setPublicShareError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [startingSession, setStartingSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [registerPromptOpen, setRegisterPromptOpen] = useState(false)
  const [reactionTimeMs, setReactionTimeMs] = useState<number | null>(null)
  const [yinYangPlayResult, setYinYangPlayResult] = useState<YinYangSamuraiPlayResult | null>(null)
  const [isYinYangResultOpen, setIsYinYangResultOpen] = useState(false)
  const [homeCategory, setHomeCategory] = useState<HomeCategory>('All')

  const onSaveWelcomeDisplayName = useCallback(
    async (displayName: string) => {
      try {
        setSaving(true)
        await updateDisplayName(displayName)
      } finally {
        setSaving(false)
      }
    },
    [updateDisplayName],
  )

  useEffect(() => {
    const onPopState = () => {
      setRoute(resolveRouteFromPath(window.location.pathname))
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigateToRoute = useCallback(
    (nextRoute: AppRoute) => {
      if (isSameRoute(nextRoute, route)) {
        return
      }

      const nextPath = resolvePathFromRoute(nextRoute)
      window.history.pushState({}, '', nextPath)
      setRoute(nextRoute)
    },
    [route],
  )

  const onOpenAuthPage = useCallback(() => {
    setAppPhase('main')
    navigateToRoute({ name: 'auth' })
  }, [navigateToRoute])

  const onAuthBackToWelcome = useCallback(() => {
    setAppPhase('welcome')
    navigateToRoute({ name: 'home' })
  }, [navigateToRoute])

  const onAuthSignIn = useCallback(
    async (email: string, password: string) => {
      await signInWithEmail(email, password)
      setAppPhase('welcome')
      setScreen('catalog')
      navigateToRoute({ name: 'home' })
    },
    [navigateToRoute, signInWithEmail],
  )

  const onAuthSignUp = useCallback(
    async (displayName: string, email: string, password: string) => {
      await signUpWithEmail(displayName, email, password)
      setAppPhase('welcome')
      setScreen('catalog')
      navigateToRoute({ name: 'home' })
    },
    [navigateToRoute, signUpWithEmail],
  )

  const onAuthGoogle = useCallback(async () => {
    await signInWithGoogle()
  }, [signInWithGoogle])

  const hasProfile = Boolean(profile)
  const isRestoredSession = sessionSource === 'restored'
  const isRegisteredProfile = profile?.app_status === 'registered'
  const homeDisplayName = profile?.display_name?.trim() || 'Guest'

  const loadGames = useCallback(async () => {
    try {
      setGamesLoading(true)
      setGamesError(null)
      const data = await getGames()
      setGames(data)

      const reaction = data.find((game) => game.slug === 'reaction-time')
      if (reaction) {
        setSelectedGame(reaction)
        setSelectedGameCategory(classifyCategory(reaction))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch games'
      setGamesError(message)
    } finally {
      setGamesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (appPhase === 'main' && hasProfile) {
      void loadGames()
    }
  }, [appPhase, hasProfile, loadGames])

  const loadLeaderboard = useCallback(async (gameId: string) => {
    try {
      setLeaderboardLoading(true)
      setLeaderboardError(null)
      const data = await getTopScoresByGame(gameId, 10)
      setLeaderboard(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load leaderboard'
      setLeaderboardError(message)
    } finally {
      setLeaderboardLoading(false)
    }
  }, [])

  const loadPublicShare = useCallback(async (slug: string) => {
    try {
      setPublicShareLoading(true)
      setPublicShareError(null)
      const data = await getPublicSharePostBySlug(slug)
      setPublicSharePost(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load shared result'
      setPublicShareError(message)
      setPublicSharePost(null)
    } finally {
      setPublicShareLoading(false)
    }
  }, [])

  useEffect(() => {
    if (appPhase !== 'main' || route.name !== 'share' || loading || !user) {
      return
    }

    void loadPublicShare(route.slug)
  }, [appPhase, route, loading, user, loadPublicShare])

  useEffect(() => {
    if (registerPromptOpen && isRegisteredProfile) {
      setRegisterPromptOpen(false)
    }
  }, [isRegisteredProfile, registerPromptOpen])

  useEffect(() => {
    if (route.name !== 'auth' || !isRegisteredProfile) {
      return
    }

    setAppPhase('welcome')
    navigateToRoute({ name: 'home' })
  }, [isRegisteredProfile, navigateToRoute, route.name])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.opener || !isRegisteredProfile || route.name !== 'auth') {
      return
    }

    const timer = window.setTimeout(() => {
      window.close()
    }, 250)

    return () => window.clearTimeout(timer)
  }, [isRegisteredProfile, route.name])

  const onSignOut = async () => {
    try {
      setSigningOut(true)
      setScreen('catalog')
      navigateToRoute({ name: 'home' })
      setAppPhase('splash')
      await signOutAndRestart()
    } finally {
      setSigningOut(false)
    }
  }

  const onOpenDetail = (game: Game) => {
    setSelectedGame(game)
    setSelectedGameCategory(classifyCategory(game))
    setShareResult(null)
    setShareError(null)
    setNativeShareStatus(null)
    setSubmitResult(null)
    setSubmittedScore(null)
    setLeaderboard([])
    setLeaderboardError(null)
    setPlayDurationMs(null)
    setReactionTimeMs(null)
    setYinYangPlayResult(null)
    setIsYinYangResultOpen(false)

    if (game.slug === 'yinyang-samurai') {
      setSessionError(null)
      setShareError(null)
      setNativeShareStatus(null)
      setScreen('play')
      navigateToRoute({ name: 'yinyang-intro' })
      return
    }

    setScreen('detail')
  }

  const onBackToCatalog = () => {
    setScreen('catalog')
    setSessionError(null)
    setShareError(null)
  }

  const onStartSession = async ({ forYinYang = false }: { forYinYang?: boolean } = {}): Promise<boolean> => {
    if (!selectedGame) {
      setSessionError('No game selected')
      return false
    }

    try {
      setStartingSession(true)
      setSessionError(null)
      const session = await startGameSession(selectedGame.slug)
      setCurrentSession(session)
      setSessionId(session.sessionId)
      setYinYangPlayResult(null)
      setIsYinYangResultOpen(false)
      setScreen('play')

       if (forYinYang) {
        navigateToRoute({ name: 'yinyang-play' })
      }
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start game session'
      setSessionError(message)
      return false
    } finally {
      setStartingSession(false)
    }
  }

  const onFinishPlay = async (customResult?: YinYangSamuraiPlayResult) => {
    if (!sessionId || !currentSession || !selectedGame) {
      setSessionError('Session not found. Start a new game session.')
      return
    }

    const isYinYang = selectedGame.slug === 'yinyang-samurai'
    const ms = customResult?.durationMs ?? Math.floor(160 + Math.random() * 240)
    const maxScore = Number(selectedGame.config.maxScore ?? 1000)
    const computedScore = customResult
      ? Math.max(0, Math.min(maxScore, customResult.score))
      : Math.max(0, Math.min(maxScore, Math.round(maxScore - ms * 2)))

    if (isYinYang) {
      setSessionError(null)
      setShareResult(null)
      setShareError(null)
      setNativeShareStatus(null)
      setSubmittedScore(computedScore)
      setSubmitResult(null)
      setPlayDurationMs(ms)
      setYinYangPlayResult(customResult ?? null)
      setIsYinYangResultOpen(true)

      if (currentSession.gameId) {
        void loadLeaderboard(currentSession.gameId)
      }

      setScreen('play')
      return
    }

    try {
      setSubmittingScore(true)
      setSessionError(null)
      setShareResult(null)
      setShareError(null)

      const result = await submitScore(sessionId, computedScore, ms)

      setSubmittedScore(computedScore)
      setSubmitResult(result)
      setPlayDurationMs(ms)
      setYinYangPlayResult(customResult ?? null)
      setIsYinYangResultOpen(isYinYang)

      if (currentSession.gameId) {
        void loadLeaderboard(currentSession.gameId)
      }

      await refresh()
      setScreen('result')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit score'
      setSessionError(message)
    } finally {
      setSubmittingScore(false)
    }

    setReactionTimeMs(ms)
  }

  const onFinishYinYangPlay = (result: YinYangSamuraiPlayResult) => {
    void onFinishPlay(result)
  }

  const onPlayAgain = () => {
    setReactionTimeMs(null)
    setPlayDurationMs(null)
    setSubmitResult(null)
    setSubmittedScore(null)
    setYinYangPlayResult(null)
    setIsYinYangResultOpen(false)
    void onStartSession({ forYinYang: isYinYangSelected })
  }

  const onCreateShare = async () => {
    if (!submitResult?.scoreId || !selectedGame) {
      return
    }

    if (!isRegisteredProfile) {
      setRegisterPromptOpen(true)
      setShareError(null)
      setNativeShareStatus(null)
      return
    }

    try {
      setShareLoading(true)
      setShareError(null)

      const share = await createSharePost({
        scoreId: submitResult.scoreId,
        caption: yinYangPlayResult
          ? `I scored ${yinYangPlayResult.accuracy.toFixed(2)}% in ${selectedGame.title}! Can you cut better than me?`
          : `I scored ${submittedScore ?? 0} in ${selectedGame.title}`,
      })

      setShareResult(share)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create share link'
      setShareError(message)
    } finally {
      setShareLoading(false)
    }
  }

  const ensureShareLink = useCallback(async (): Promise<string | null> => {
    if (!isRegisteredProfile) {
      setRegisterPromptOpen(true)
      setShareError(null)
      setNativeShareStatus(null)
      return null
    }

    if (shareResult?.shareUrl) {
      return shareResult.shareUrl
    }

    if (!selectedGame) {
      return null
    }

    const caption = yinYangPlayResult
      ? `I scored ${yinYangPlayResult.accuracy.toFixed(2)}% in ${selectedGame.title}! Can you cut better than me?`
      : `I scored ${submittedScore ?? 0} in ${selectedGame.title}`

    try {
      setShareLoading(true)
      setShareError(null)

      if (
        selectedGame.slug === 'yinyang-samurai' &&
        !submitResult?.scoreId &&
        sessionId &&
        typeof submittedScore === 'number' &&
        typeof playDurationMs === 'number'
      ) {
        const share = await shareGameResult({
          sessionId,
          score: submittedScore,
          durationMs: playDurationMs,
          caption,
        })

        setSubmitResult({
          scoreId: share.scoreId,
          validationStatus: share.validationStatus,
          enteredLeaderboard: share.enteredLeaderboard,
          coinReward: share.coinReward,
          totalCoin: share.totalCoin,
          leaderboardRank: share.leaderboardRank,
          rankHint: share.rankHint,
        })
        setShareResult({
          postId: share.postId,
          shareSlug: share.shareSlug,
          shareUrl: share.shareUrl,
        })

        if (currentSession?.gameId) {
          void loadLeaderboard(currentSession.gameId)
        }

        await refresh()
        return share.shareUrl
      }

      if (!submitResult?.scoreId) {
        setShareError('Result is not ready to share yet.')
        return null
      }

      const share = await createSharePost({
        scoreId: submitResult.scoreId,
        caption,
      })

      setShareResult(share)
      return share.shareUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create share link'
      setShareError(message)
      return null
    } finally {
      setShareLoading(false)
    }
  }, [
    currentSession?.gameId,
    loadLeaderboard,
    playDurationMs,
    refresh,
    selectedGame,
    sessionId,
    shareResult?.shareUrl,
    submitResult?.scoreId,
    submittedScore,
    isRegisteredProfile,
    yinYangPlayResult,
  ])

  const onNativeShareYinYang = useCallback(async () => {
    if (!selectedGame || !yinYangPlayResult) {
      return
    }

    setNativeShareStatus(null)
    const shareUrl = await ensureShareLink()
    if (!shareUrl) {
      return
    }
    const text = `I scored ${yinYangPlayResult.accuracy.toFixed(2)}% in ${selectedGame.title}! Can you cut better than me?`

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: `${selectedGame.title} Result`,
          text,
          url: shareUrl ?? undefined,
        })
        setNativeShareStatus('Shared successfully.')
        return
      }
    } catch (err) {
      const isAbortError = err instanceof DOMException && err.name === 'AbortError'
      if (isAbortError) {
        setNativeShareStatus('Share cancelled.')
        return
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        const clipboardText = shareUrl ? `${text}\n${shareUrl}` : text
        await navigator.clipboard.writeText(clipboardText)
        setNativeShareStatus('Share text copied to clipboard.')
      } catch {
        setNativeShareStatus('Unable to share automatically. Copy the share URL manually.')
      }
      return
    }

    setNativeShareStatus('Sharing is not supported in this browser.')
  }, [ensureShareLink, selectedGame, yinYangPlayResult])

  const visibleGames = games.filter((game) => {
    const category = classifyCategory(game)
    return homeCategory === 'All' || homeCategory === category
  })

  const onOpenProfile = () => {
    navigateToRoute({ name: 'profile' })
  }

  const onBackToHome = () => {
    navigateToRoute({ name: 'home' })
  }

  const onOpenYinYangIntro = () => {
    if (!selectedGame || selectedGame.slug !== 'yinyang-samurai') {
      return
    }

    setSessionError(null)
    setShareError(null)
    setNativeShareStatus(null)
    setYinYangPlayResult(null)
    setIsYinYangResultOpen(false)
    setSubmitResult(null)
    setShareResult(null)
    setScreen('play')
    navigateToRoute({ name: 'yinyang-intro' })
  }

  const onCloseYinYangFullscreen = () => {
    setScreen('detail')
    setSessionError(null)
    setIsYinYangResultOpen(false)
    navigateToRoute({ name: 'home' })
  }

  const onCloseYinYangPopup = () => {
    setIsYinYangResultOpen(false)
  }

  const isYinYangSelected = selectedGame?.slug === 'yinyang-samurai'
  const isYinYangRoute = route.name === 'yinyang-intro' || route.name === 'yinyang-play'

  useEffect(() => {
    if (!isYinYangRoute) {
      return
    }

    const yinYangGame = games.find((game) => game.slug === 'yinyang-samurai')
    if (!yinYangGame) {
      return
    }

    setSelectedGame((prev) => (prev?.id === yinYangGame.id ? prev : yinYangGame))
    setSelectedGameCategory(classifyCategory(yinYangGame))
    setScreen('play')
  }, [games, isYinYangRoute])

  return (
    <>
      {/* Splash — visible during initial load, fades out when exiting */}
      {(appPhase === 'splash' || appPhase === 'splash-exiting') && (
        <SplashScreen isExiting={appPhase === 'splash-exiting'} />
      )}

      {/* Welcome — sits beneath the splash during splash-exiting, then top layer */}
      {(appPhase === 'splash-exiting' ||
        appPhase === 'welcome' ||
        appPhase === 'welcome-exiting') && (
        <WelcomeScreen
          profile={profile}
          sessionSource={sessionSource}
          isExiting={appPhase === 'welcome-exiting'}
          savingDisplayName={saving}
          onSaveDisplayName={onSaveWelcomeDisplayName}
          onOpenAuth={onOpenAuthPage}
          onContinue={onContinueToGames}
        />
      )}

      {/* Main app — full game catalog + session flow */}
      {appPhase === 'main' && (
        route.name === 'auth' ? (
          <AuthScreen
            loading={loading}
            error={error}
            onBack={onAuthBackToWelcome}
            onGoogleAuth={onAuthGoogle}
            onSignIn={onAuthSignIn}
            onSignUp={onAuthSignUp}
          />
        ) : route.name === 'profile' ? (
          <ProfileScreen
            user={user}
            profile={profile}
            loading={loading}
            error={error}
            signingOut={signingOut}
            onBackToHome={onBackToHome}
            onRefresh={refresh}
            onSignOut={onSignOut}
          />
        ) : route.name === 'share' ? (
          <ShareScreen
            slug={route.slug}
            loading={publicShareLoading}
            error={publicShareError}
            sharePost={publicSharePost}
            onBackToHome={onBackToHome}
            onRetry={() => loadPublicShare(route.slug)}
          />
        ) : (
      <Page
        title="MiniPlay"
        leading={
          <button
            type="button"
            className="home-profile-pill"
            aria-label="Open profile"
            data-testid="open-profile-page"
            onClick={onOpenProfile}
          >
            <span className="home-profile-avatar" aria-hidden="true">
              {profile?.display_name?.slice(0, 1).toUpperCase() ?? 'G'}
            </span>
            <span>Profile</span>
          </button>
        }
        trailing={<CoinBadge testId="profile-coin-badge" value={profile?.total_coin ?? 0} />}
      >
      {loading ? (
        <Card title="Loading">
          <p>Loading your profile and game data...</p>
        </Card>
      ) : null}

      {!loading && error ? (
        <Card title="Unable to load profile">
          <div className="status-block error">
            <p>{error}</p>
            <Button type="button" onClick={() => void refresh()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {!loading && !error && !hasProfile ? (
        <Card title="Profile unavailable">
          <div className="status-block empty">
            <p>Profile not found yet. Tap retry to sync profile.</p>
            <Button type="button" onClick={() => void refresh()}>
              Refresh
            </Button>
          </div>
        </Card>
      ) : null}

      <Card title="Game Catalog" className="game-card" data-testid="game-catalog">
        {screen === 'catalog' ? (
          <>
            {!loading && !error && hasProfile ? (
              <section className="home-hero" data-testid="anonymous-auth-ready">
                <h2>{homeDisplayName}, Ready for Challenge?</h2>
                <p>Pick a game to earn coins and top the leaderboard.</p>
                <div
                  data-testid="session-persistence-indicator"
                  className={`session-indicator ${isRestoredSession ? 'is-restored' : 'is-new'}`}
                >
                  <span className="session-dot" aria-hidden="true" />
                  <span>
                    {isRestoredSession
                      ? 'Local guest session restored'
                      : 'Local guest session started'}
                  </span>
                </div>
              </section>
            ) : null}

            {!loading && !error && hasProfile ? (
              <>
                <HomeCategoryChips value={homeCategory} onChange={setHomeCategory} />

                <section className="home-games-grid" data-testid="game-catalog-list">
                  {gamesLoading ? <p>Loading active games...</p> : null}
                  {gamesError ? <p className="inline-error">{gamesError}</p> : null}
                  {!gamesLoading && !gamesError && visibleGames.length === 0 ? (
                    <p>No active games found.</p>
                  ) : null}

                  {!gamesLoading &&
                    !gamesError &&
                    visibleGames.map((game) => {
                      const category = classifyCategory(game)
                      const reward = Number(game.config.rewardCoin ?? 0)
                      const isReaction = game.slug === 'reaction-time'

                      return (
                        <HomeGameCard
                          key={game.id}
                          title={game.title}
                          category={category}
                          reward={reward}
                          variant={toCardVariant(category)}
                          testId={isReaction ? 'reaction-game-card' : undefined}
                          buttonTestId={isReaction ? 'open-reaction-detail' : undefined}
                          onAction={() => onOpenDetail(game)}
                        />
                      )
                    })}
                </section>
              </>
            ) : null}
          </>
        ) : null}

        {screen === 'detail' ? (
          <section className="detail-panel" data-testid="reaction-detail-screen">
            <h3>{selectedGame?.title ?? 'Game Detail'}</h3>
            <p>{selectedGame?.description ?? 'Start a new session to begin.'}</p>
            <p>Category: {selectedGameCategory}</p>
            <p>Reward: +{Number(selectedGame?.config.rewardCoin ?? 0)} coins</p>
            {sessionError ? (
              <p className="inline-error" data-testid="session-start-error">
                {sessionError}
              </p>
            ) : null}
            <div className="detail-actions">
              <Button
                fullWidth
                data-testid="start-game-session"
                disabled={startingSession}
                onClick={() => {
                  if (selectedGame?.slug === 'yinyang-samurai') {
                    onOpenYinYangIntro()
                    return
                  }
                  void onStartSession()
                }}
              >
                {startingSession
                  ? 'Starting session...'
                  : selectedGame?.slug === 'yinyang-samurai'
                    ? 'Open Intro'
                    : 'Start Game Session'}
              </Button>
              <Button fullWidth variant="secondary" onClick={onBackToCatalog}>
                Back to Catalog
              </Button>
            </div>
          </section>
        ) : null}

        {screen === 'play' ? (
          isYinYangSelected ? (
            !isYinYangRoute ? null : (
              <section className="yys-fullscreen" data-testid="yinyang-fullscreen-shell" aria-label="YinYang Samurai fullscreen">
                <button
                  type="button"
                  className="yys-close-btn"
                  aria-label="Close game"
                  onClick={onCloseYinYangFullscreen}
                >
                  <span aria-hidden="true">×</span>
                </button>

                <div className="yys-fullscreen-inner">
                  <YinYangSamuraiGame
                    onFinish={onFinishYinYangPlay}
                    submitting={submittingScore}
                    autoStart={route.name === 'yinyang-play'}
                    showInstruction={route.name === 'yinyang-intro'}
                    onStartAttempt={() => onStartSession({ forYinYang: true })}
                  />

                  <small data-testid="session-started-state">Session active: {sessionId ?? '-'}</small>
                  {sessionError ? <small className="inline-error">{sessionError}</small> : null}

                  {route.name === 'yinyang-play' && yinYangPlayResult && isYinYangResultOpen ? (
                    <div className="yys-result-popup" data-testid="yinyang-result-popup">
                      <div className="yys-result-popup__confetti" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                      <YinYangSamuraiResult
                        result={yinYangPlayResult}
                        submitResult={submitResult}
                        shareLoading={shareLoading}
                        onNativeShare={() => void onNativeShareYinYang()}
                        onPlayAgain={onPlayAgain}
                        onClosePopup={onCloseYinYangPopup}
                        shareError={shareError}
                        shareUrl={shareResult?.shareUrl ?? null}
                        nativeShareStatus={nativeShareStatus}
                        leaderboard={leaderboard}
                      />
                    </div>
                  ) : null}
                </div>
              </section>
            )
          ) : (
            <section className="game-frame" data-testid="game-play-screen" aria-label="Portrait game area preview">
              <div className="game-frame-inner">
                <p>TAP TO SCORE</p>
                <button
                  type="button"
                  className="tap-orb"
                  data-testid="tap-play-area"
                  aria-label="Tap play area"
                  disabled={submittingScore}
                  onClick={() => void onFinishPlay()}
                >
                  {submittingScore ? 'Submitting...' : 'Tap'}
                </button>
                <small data-testid="session-started-state">
                  Session active: {sessionId ?? '-'}
                </small>
                {sessionError ? <small className="inline-error">{sessionError}</small> : null}
              </div>
            </section>
          )
        ) : null}

        {screen === 'result' ? (
          isYinYangSelected && yinYangPlayResult ? null : (
            <section className="result-panel" data-testid="score-result-screen">
              <h3>{selectedGame?.title ?? 'Result'}</h3>
              <p data-testid="reaction-time-result">{reactionTimeMs ?? 0}ms</p>
              <p>Score: {submittedScore ?? 0}</p>
              <p>Validation: {submitResult?.validationStatus ?? '-'}</p>
              <CoinBadge value={submitResult?.coinReward ?? 0} />
              {typeof submitResult?.rankHint === 'number' ? <p>Rank hint: #{submitResult.rankHint}</p> : null}
              {typeof submitResult?.totalCoin === 'number' ? <p>Total coin: {submitResult.totalCoin}</p> : null}
              {playDurationMs ? <p>Duration: {playDurationMs}ms</p> : null}

              <section className="detail-actions">
                <Button fullWidth variant="secondary" disabled={shareLoading} onClick={() => void onCreateShare()}>
                  {shareLoading ? 'Creating Share...' : 'Create Share Link'}
                </Button>
              </section>

              {shareError ? <p className="inline-error">{shareError}</p> : null}
              {shareResult ? (
                <p>
                  Share URL:{' '}
                  <a href={shareResult.shareUrl} target="_blank" rel="noreferrer">
                    {shareResult.shareUrl}
                  </a>
                </p>
              ) : null}

              <section>
                <h4>Leaderboard</h4>
                {leaderboardLoading ? <p>Loading leaderboard...</p> : null}
                {leaderboardError ? <p className="inline-error">{leaderboardError}</p> : null}
                {!leaderboardLoading && !leaderboardError && leaderboard.length === 0 ? (
                  <p>No leaderboard data yet.</p>
                ) : null}
                {!leaderboardLoading && !leaderboardError && leaderboard.length > 0 ? (
                  <ol>
                    {leaderboard.map((item) => (
                      <li key={`${item.user_id}-${item.created_at}`}>
                        {(item.display_name ?? 'Guest')} - {item.score}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </section>

              <div className="detail-actions">
                <Button fullWidth data-testid="play-again-action" disabled={startingSession} onClick={onPlayAgain}>
                  {startingSession ? 'Starting...' : 'Play Again'}
                </Button>
                <Button fullWidth variant="secondary" onClick={onBackToCatalog}>
                  Back to Games
                </Button>
              </div>
            </section>
          )
        ) : null}
      </Card>

      <footer className="foot-note">New home design active. More games unlock in Phase 2.</footer>
      </Page>
        )
      )}

      <RegisterPromptModal
        open={registerPromptOpen}
        loading={loading}
        error={error}
        onClose={() => setRegisterPromptOpen(false)}
        onGoogleAuth={onAuthGoogle}
        onOpenAuthPage={() => {
          setRegisterPromptOpen(false)
          setAppPhase('main')
          navigateToRoute({ name: 'auth' })
        }}
      />
    </>
  )
}

export default App
