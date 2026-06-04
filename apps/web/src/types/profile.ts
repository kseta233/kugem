export type UserAppStatus = 'unregistered' | 'anonymous' | 'registered' | 'blocked'

export type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  app_status: UserAppStatus
  total_coin: number
  total_play_count: number
  created_at: string
  updated_at: string
}

export type UpsertProfileInput = {
  id: string
  display_name: string
  app_status: UserAppStatus
}

export type CoinLedgerEntry = {
  id: string
  user_id: string
  score_id: string | null
  transaction_type: 'reward' | 'adjustment' | 'spend' | 'refund'
  amount: number
  balance_after: number
  reason: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}
