import { Button, Card } from '@/shared/components'

type HomeGameCardVariant = 'reaction' | 'memory' | 'speed' | 'locked'

interface HomeGameCardProps {
  title: string
  category: string
  reward: number
  variant: HomeGameCardVariant
  disabled?: boolean
  actionLabel?: string
  testId?: string
  buttonTestId?: string
  onAction?: () => void
}

export function HomeGameCard({
  title,
  category,
  reward,
  variant,
  disabled = false,
  actionLabel = 'Play',
  testId,
  buttonTestId,
  onAction,
}: HomeGameCardProps) {
  const cardClass = `home-game-card ${disabled ? 'is-disabled' : ''}`.trim()
  const mediaClass = `home-game-media home-game-media--${variant}`

  return (
    <Card className={cardClass} data-testid={testId}>
      <div className={mediaClass} aria-hidden="true">
        {variant === 'memory' ? (
          <span className="material-symbols-outlined home-media-icon">extension</span>
        ) : null}
        {variant === 'speed' ? (
          <span className="material-symbols-outlined home-media-icon">touch_app</span>
        ) : null}
        {variant === 'locked' ? (
          <span className="material-symbols-outlined home-media-icon">lock</span>
        ) : null}
        {variant !== 'locked' ? (
          <div className="home-reward-pill">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: 14 }}
            >
              monetization_on
            </span>
            <span>+{reward}</span>
          </div>
        ) : null}
      </div>

      <div className="home-game-meta">
        <h3>{title}</h3>
        <p>{category}</p>
      </div>

      <Button
        fullWidth
        className="home-play-button"
        onClick={onAction}
        disabled={disabled || !onAction}
        data-testid={buttonTestId}
      >
        {disabled ? (
          <span className="material-symbols-outlined" aria-hidden="true">
            hourglass_empty
          </span>
        ) : (
          <span className="material-symbols-outlined" aria-hidden="true">
            play_arrow
          </span>
        )}
        {actionLabel}
      </Button>
    </Card>
  )
}
