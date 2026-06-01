export type UserAppStatus = 'anonymous' | 'registered' | 'blocked'

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
