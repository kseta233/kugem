type CoinBadgeProps = {
  value: number
  testId?: string
}

export const CoinBadge = ({ value, testId }: CoinBadgeProps) => {
  return (
    <span className="coin-badge" data-testid={testId} aria-label={`Total coin ${value}`}>
      <span aria-hidden="true">◉</span>
      <strong>{value}</strong>
    </span>
  )
}
