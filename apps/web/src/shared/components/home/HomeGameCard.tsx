import { Button, Card, Icon } from '@/shared/components'

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
          <Icon name="puzzle" className="home-media-icon" size={52} />
        ) : null}
        {variant === 'speed' ? (
          <Icon name="tap" className="home-media-icon" size={52} />
        ) : null}
        {variant === 'locked' ? (
          <Icon name="lock" className="home-media-icon" size={52} />
        ) : null}
        {variant !== 'locked' ? (
          <div className="home-reward-pill">
            <Icon name="coin" size={14} className="app-icon app-icon--coin" />
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
          <Icon name="hourglass" size={16} className="app-icon" />
        ) : (
          <Icon name="play" size={16} className="app-icon" />
        )}
        {actionLabel}
      </Button>
    </Card>
  )
}
