import { useCallback, useEffect, useState } from 'react'
import { useAnonymousAuth } from '@/features/auth/useAnonymousAuth'
import { useAppPhase } from '@/app/useAppPhase'
import { useAppRoute } from '@/app/useAppRoute'
import { getGames } from '@/features/games/games.service'
import { classifyCategory, toCardVariant } from '@/features/games/gameCategory'
import { getTopScoresByGame } from '@/features/leaderboard/leaderboard.service'
import {
  startGameSession,
  submitScore,
  type StartGameSessionResult,
  type SubmitScoreResult,
} from '@/features/sessions/sessions.service'
import { createSharePost, type CreateSharePostResult } from '@/features/share/share.service'
import { getPublicSharePostBySlug, type PublicSharePost } from '@/features/share/share.service'
import { YinYangSamuraiScreen } from '@/features/yinyang-samurai/YinYangSamuraiScreen'
import type { HomeCategory } from '@/shared/components'
import { AuthScreen } from '@/screens/AuthScreen'
import { HomeScreen } from '@/screens/HomeScreen'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { RegisterPromptModal } from '@/screens/RegisterPromptModal'
import { ShareScreen } from '@/screens/ShareScreen'
import { SplashScreen } from '@/screens/SplashScreen'
import { WelcomeScreen } from '@/screens/WelcomeScreen'
import type { Game } from '@/types/game'
import type { LeaderboardItem } from '@/types/leaderboard'

type GameScreen = 'catalog' | 'detail' | 'play' | 'result'

export function AppShell() {
  const {
    user,
    profile,
    sessionSource,
    loading,
    error,
    refresh,
    signOutAndRestart,
    updateDisplayName,
    updateAvatarIcon,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
  } = useAnonymousAuth()

  const { route, navigateToRoute } = useAppRoute()
  const { appPhase, setAppPhase, onContinueToGames } = useAppPhase({ loading, routeName: route.name })

  const [saving, setSaving] = useState(false)
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
  const [publicSharePost, setPublicSharePost] = useState<PublicSharePost | null>(null)
  const [publicShareLoading, setPublicShareLoading] = useState(false)
  const [publicShareError, setPublicShareError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [startingSession, setStartingSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [registerPromptOpen, setRegisterPromptOpen] = useState(false)
  const [reactionTimeMs, setReactionTimeMs] = useState<number | null>(null)
  const [homeCategory, setHomeCategory] = useState<HomeCategory>('All')

  const hasProfile = Boolean(profile)
  const isRestoredSession = sessionSource === 'restored'
  const isRegisteredProfile = profile?.app_status === 'registered'
  const homeDisplayName = profile?.display_name?.trim() || 'Guest'
  const profileInitial = profile?.display_name?.slice(0, 1).toUpperCase() ?? 'G'

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

  const onOpenAuthPage = useCallback(() => {
    setAppPhase('main')
    navigateToRoute({ name: 'auth' })
  }, [navigateToRoute, setAppPhase])

  const onAuthBackToWelcome = useCallback(() => {
    setAppPhase('welcome')
    navigateToRoute({ name: 'home' })
  }, [navigateToRoute, setAppPhase])

  const onAuthSignIn = useCallback(
    async (email: string, password: string) => {
      await signInWithEmail(email, password)
      setAppPhase('welcome')
      setScreen('catalog')
      navigateToRoute({ name: 'home' })
    },
    [navigateToRoute, setAppPhase, signInWithEmail],
  )

  const onAuthSignUp = useCallback(
    async (displayName: string, email: string, password: string) => {
      await signUpWithEmail(displayName, email, password)
      setAppPhase('welcome')
      setScreen('catalog')
      navigateToRoute({ name: 'home' })
    },
    [navigateToRoute, setAppPhase, signUpWithEmail],
  )

  const onAuthGoogle = useCallback(async () => {
    await signInWithGoogle()
  }, [signInWithGoogle])

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
  }, [appPhase, loadPublicShare, loading, route, user])

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
  }, [isRegisteredProfile, navigateToRoute, route.name, setAppPhase])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.opener || !isRegisteredProfile || route.name !== 'auth') {
      return
    }

    const timer = window.setTimeout(() => {
      window.close()
    }, 250)

    return () => window.clearTimeout(timer)
  }, [isRegisteredProfile, route.name])

  useEffect(() => {
    if (route.name !== 'yinyang-intro' && route.name !== 'yinyang-play') {
      return
    }

    const yinYangGame = games.find((game) => game.slug === 'yinyang-samurai')
    if (!yinYangGame) {
      return
    }

    setSelectedGame((prev) => (prev?.id === yinYangGame.id ? prev : yinYangGame))
    setSelectedGameCategory(classifyCategory(yinYangGame))
    setScreen('play')
  }, [games, route.name])

  const onSignOut = async () => {
    setScreen('catalog')
    navigateToRoute({ name: 'home' })
    setAppPhase('splash')
    await signOutAndRestart()
  }

  const resetResultState = () => {
    setShareResult(null)
    setShareError(null)
    setSubmitResult(null)
    setSubmittedScore(null)
    setLeaderboard([])
    setLeaderboardError(null)
    setPlayDurationMs(null)
    setReactionTimeMs(null)
    setSessionError(null)
  }

  const onOpenDetail = (game: Game) => {
    setSelectedGame(game)
    setSelectedGameCategory(classifyCategory(game))
    resetResultState()

    if (game.slug === 'yinyang-samurai') {
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

  const onStartSession = async (): Promise<boolean> => {
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
      setScreen('play')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start game session'
      setSessionError(message)
      return false
    } finally {
      setStartingSession(false)
    }
  }

  const onStartYinYangSession = async (): Promise<boolean> => {
    const success = await onStartSession()
    if (success) {
      navigateToRoute({ name: 'yinyang-play' })
    }
    return success
  }

  const onFinishPlay = async () => {
    if (!sessionId || !currentSession || !selectedGame) {
      setSessionError('Session not found. Start a new game session.')
      return
    }

    const ms = Math.floor(160 + Math.random() * 240)
    const maxScore = Number(selectedGame.config.maxScore ?? 1000)
    const computedScore = Math.max(0, Math.min(maxScore, Math.round(maxScore - ms * 2)))

    try {
      setSubmittingScore(true)
      setSessionError(null)
      setShareResult(null)
      setShareError(null)

      const result = await submitScore(sessionId, computedScore, ms)

      setSubmittedScore(computedScore)
      setSubmitResult(result)
      setPlayDurationMs(ms)

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

  const onPlayAgain = () => {
    setReactionTimeMs(null)
    setPlayDurationMs(null)
    setSubmitResult(null)
    setSubmittedScore(null)
    void onStartSession()
  }

  const onCreateShare = async () => {
    if (!submitResult?.scoreId || !selectedGame) {
      return
    }

    if (!isRegisteredProfile) {
      setRegisterPromptOpen(true)
      setShareError(null)
      return
    }

    try {
      setShareLoading(true)
      setShareError(null)

      const share = await createSharePost({
        scoreId: submitResult.scoreId,
        caption: `I scored ${submittedScore ?? 0} in ${selectedGame.title}`,
      })

      setShareResult(share)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create share link'
      setShareError(message)
    } finally {
      setShareLoading(false)
    }
  }

  const visibleGames = games
    .filter((game) => {
      const category = classifyCategory(game)
      return homeCategory === 'All' || homeCategory === category
    })
    .map((game) => {
      const category = classifyCategory(game)
      return {
        game,
        category,
        reward: Number(game.config.rewardCoin ?? 0),
        variant: toCardVariant(category),
        isReaction: game.slug === 'reaction-time',
      }
    })

  const onOpenProfile = () => {
    navigateToRoute({ name: 'profile' })
  }

  const onBackToHome = () => {
    navigateToRoute({ name: 'home' })
  }

  const onCloseYinYang = () => {
    setScreen('catalog')
    setSessionError(null)
    navigateToRoute({ name: 'home' })
  }

  const renderMainRoute = () => {
    switch (route.name) {
      case 'auth':
        return (
          <AuthScreen
            loading={loading}
            error={error}
            onBack={onAuthBackToWelcome}
            onGoogleAuth={onAuthGoogle}
            onSignIn={onAuthSignIn}
            onSignUp={onAuthSignUp}
          />
        )

      case 'profile':
        return (
          <ProfileScreen
            user={user}
            profile={profile}
            loading={loading}
            error={error}
            onBackToHome={onBackToHome}
            onRefresh={refresh}
            onSignOut={onSignOut}
            onUpdateAvatar={updateAvatarIcon}
          />
        )

      case 'share':
        return (
          <ShareScreen
            slug={route.slug}
            loading={publicShareLoading}
            error={publicShareError}
            sharePost={publicSharePost}
            onBackToHome={onBackToHome}
            onRetry={() => loadPublicShare(route.slug)}
          />
        )

      case 'yinyang-intro':
      case 'yinyang-play':
        return (
          <YinYangSamuraiScreen
            routeName={route.name}
            selectedGame={selectedGame}
            currentGameId={currentSession?.gameId ?? null}
            sessionId={sessionId}
            sessionError={sessionError}
            leaderboard={leaderboard}
            isRegisteredProfile={Boolean(isRegisteredProfile)}
            onRequireRegister={() => setRegisterPromptOpen(true)}
            onRefreshProfile={refresh}
            onLoadLeaderboard={(gameId) => void loadLeaderboard(gameId)}
            onStartSession={onStartYinYangSession}
            onClose={onCloseYinYang}
          />
        )

      default:
        return (
          <HomeScreen
            loading={loading}
            error={error}
            hasProfile={hasProfile}
            profileCoin={profile?.total_coin ?? 0}
            profileInitial={profileInitial}
            homeDisplayName={homeDisplayName}
            isRestoredSession={isRestoredSession}
            onRefresh={refresh}
            onOpenProfile={onOpenProfile}
            gamesLoading={gamesLoading}
            gamesError={gamesError}
            homeCategory={homeCategory}
            onChangeCategory={setHomeCategory}
            visibleGames={visibleGames}
            screen={screen}
            selectedGame={selectedGame}
            selectedGameCategory={selectedGameCategory}
            sessionError={sessionError}
            startingSession={startingSession}
            sessionId={sessionId}
            submittingScore={submittingScore}
            reactionTimeMs={reactionTimeMs}
            submittedScore={submittedScore}
            submitResult={submitResult}
            playDurationMs={playDurationMs}
            shareLoading={shareLoading}
            shareError={shareError}
            shareUrl={shareResult?.shareUrl ?? null}
            leaderboardLoading={leaderboardLoading}
            leaderboardError={leaderboardError}
            leaderboard={leaderboard}
            onOpenDetail={onOpenDetail}
            onStartSession={onStartSession}
            onBackToCatalog={onBackToCatalog}
            onFinishPlay={onFinishPlay}
            onCreateShare={onCreateShare}
            onPlayAgain={onPlayAgain}
          />
        )
    }
  }

  return (
    <>
      {(appPhase === 'splash' || appPhase === 'splash-exiting') && (
        <SplashScreen isExiting={appPhase === 'splash-exiting'} />
      )}

      {(appPhase === 'splash-exiting' || appPhase === 'welcome' || appPhase === 'welcome-exiting') && (
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

      {appPhase === 'main' ? renderMainRoute() : null}

      <RegisterPromptModal
        open={registerPromptOpen}
        error={error}
        onClose={() => setRegisterPromptOpen(false)}
        onOpenAuthPage={() => {
          setRegisterPromptOpen(false)
          setAppPhase('main')
          navigateToRoute({ name: 'auth' })
        }}
      />
    </>
  )
}
