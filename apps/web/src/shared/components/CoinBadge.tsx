import { Icon } from '@/shared/components/Icon'

type CoinBadgeProps = {
  value: number
  testId?: string
}

export const CoinBadge = ({ value, testId }: CoinBadgeProps) => {
  return (
    <span className="coin-badge" data-testid={testId} aria-label={`Total coin ${value}`}>
      <Icon name="coin" size={16} className="app-icon app-icon--coin" />
      <strong>{value}</strong>
    </span>
  )
}
