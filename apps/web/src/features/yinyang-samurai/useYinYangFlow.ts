import { useCallback, useState } from 'react'
import { createSharePost, shareGameResult, type CreateSharePostResult } from '@/features/share/share.service'
import type { SubmitScoreResult } from '@/features/sessions/sessions.service'
import type { YinYangSamuraiResult as YinYangSamuraiPlayResult } from '@/features/games/yinyang-samurai/types/yinyangSamurai.types'
import type { Game } from '@/types/game'

interface UseYinYangFlowParams {
  selectedGame: Game | null
  sessionId: string | null
  currentGameId: string | null
  isRegisteredProfile: boolean
  onRequireRegister: () => void
  onRefreshProfile: () => Promise<void>
  onLoadLeaderboard: (gameId: string) => void
  onStartSession: () => Promise<boolean>
}

export function useYinYangFlow({
  selectedGame,
  sessionId,
  currentGameId,
  isRegisteredProfile,
  onRequireRegister,
  onRefreshProfile,
  onLoadLeaderboard,
  onStartSession,
}: UseYinYangFlowParams) {
  const [yinYangPlayResult, setYinYangPlayResult] = useState<YinYangSamuraiPlayResult | null>(null)
  const [isYinYangResultOpen, setIsYinYangResultOpen] = useState(false)
  const [submittedScore, setSubmittedScore] = useState<number | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitScoreResult | null>(null)
  const [playDurationMs, setPlayDurationMs] = useState<number | null>(null)
  const [shareResult, setShareResult] = useState<CreateSharePostResult | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [nativeShareStatus, setNativeShareStatus] = useState<string | null>(null)

  const reset = useCallback(() => {
    setYinYangPlayResult(null)
    setIsYinYangResultOpen(false)
    setSubmittedScore(null)
    setSubmitResult(null)
    setPlayDurationMs(null)
    setShareResult(null)
    setShareError(null)
    setNativeShareStatus(null)
  }, [])

  const onFinishPlay = useCallback(
    (result: YinYangSamuraiPlayResult) => {
      const maxScore = Number(selectedGame?.config.maxScore ?? 1000)
      const computedScore = Math.max(0, Math.min(maxScore, result.score))

      setShareError(null)
      setNativeShareStatus(null)
      setSubmittedScore(computedScore)
      setSubmitResult(null)
      setPlayDurationMs(result.durationMs)
      setYinYangPlayResult(result)
      setIsYinYangResultOpen(true)

      if (currentGameId) {
        onLoadLeaderboard(currentGameId)
      }
    },
    [currentGameId, onLoadLeaderboard, selectedGame?.config.maxScore],
  )

  const ensureShareLink = useCallback(async (): Promise<string | null> => {
    if (!isRegisteredProfile) {
      onRequireRegister()
      setShareError(null)
      setNativeShareStatus(null)
      return null
    }

    if (shareResult?.shareUrl) {
      return shareResult.shareUrl
    }

    if (!selectedGame || !sessionId || typeof submittedScore !== 'number' || typeof playDurationMs !== 'number') {
      setShareError('Result is not ready to share yet.')
      return null
    }

    const caption = yinYangPlayResult
      ? `I scored ${yinYangPlayResult.accuracy.toFixed(2)}% in ${selectedGame.title}! Can you cut better than me?`
      : `I scored ${submittedScore} in ${selectedGame.title}`

    try {
      setShareLoading(true)
      setShareError(null)

      if (!submitResult?.scoreId) {
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

        if (currentGameId) {
          onLoadLeaderboard(currentGameId)
        }

        await onRefreshProfile()
        return share.shareUrl
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
    currentGameId,
    isRegisteredProfile,
    onLoadLeaderboard,
    onRefreshProfile,
    onRequireRegister,
    playDurationMs,
    selectedGame,
    sessionId,
    shareResult?.shareUrl,
    submitResult?.scoreId,
    submittedScore,
    yinYangPlayResult,
  ])

  const onNativeShare = useCallback(async () => {
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
          url: shareUrl,
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
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`)
        setNativeShareStatus('Share text copied to clipboard.')
      } catch {
        setNativeShareStatus('Unable to share automatically. Copy the share URL manually.')
      }
      return
    }

    setNativeShareStatus('Sharing is not supported in this browser.')
  }, [ensureShareLink, selectedGame, yinYangPlayResult])

  const onPlayAgain = useCallback(() => {
    reset()
    void onStartSession()
  }, [onStartSession, reset])

  return {
    yinYangPlayResult,
    isYinYangResultOpen,
    submittedScore,
    submitResult,
    playDurationMs,
    shareResult,
    shareError,
    shareLoading,
    nativeShareStatus,
    onFinishPlay,
    onNativeShare,
    onPlayAgain,
    closePopup: () => setIsYinYangResultOpen(false),
    reset,
  }
}
