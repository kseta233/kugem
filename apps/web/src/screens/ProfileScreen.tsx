import type { User } from '@supabase/supabase-js'
import { Button, Card, CoinBadge, Icon, Page } from '@/shared/components'
import type { Profile } from '@/types/profile'

interface ProfileScreenProps {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  signingOut: boolean
  onBackToHome: () => void
  onRefresh: () => Promise<void>
  onSignOut: () => Promise<void>
}

export function ProfileScreen({
  user,
  profile,
  loading,
  error,
  signingOut,
  onBackToHome,
  onRefresh,
  onSignOut,
}: ProfileScreenProps) {
  const hasProfile = Boolean(profile)

  return (
    <Page
      title="Profile"
      leading={
        <button
          type="button"
          className="home-profile-pill"
          data-testid="back-to-home"
          onClick={onBackToHome}
        >
          <Icon name="arrow-left" size={16} className="app-icon" />
          <span>Home</span>
        </button>
      }
      trailing={<CoinBadge testId="profile-coin-badge" value={profile?.total_coin ?? 0} />}
    >
      {loading ? (
        <Card title="Loading">
          <p>Loading your profile data...</p>
        </Card>
      ) : null}

      {!loading && error ? (
        <Card title="Unable to load profile">
          <div className="status-block error">
            <p>{error}</p>
            <Button type="button" onClick={() => void onRefresh()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {!loading && !error && !hasProfile ? (
        <Card title="Profile unavailable">
          <div className="status-block empty">
            <p>Profile not found yet. Tap retry to sync profile.</p>
            <Button type="button" onClick={() => void onRefresh()}>
              Refresh
            </Button>
          </div>
        </Card>
      ) : null}

      {!loading && !error && hasProfile ? (
        <Card title="Account Settings">
          <div className="status-block success">
            <dl className="kv-list">
              <div>
                <dt>User ID</dt>
                <dd>{user?.id}</dd>
              </div>
              <div>
                <dt>Display Name</dt>
                <dd>{profile?.display_name ?? '-'}</dd>
              </div>
              <div>
                <dt>Total Play</dt>
                <dd>{profile?.total_play_count ?? 0}</dd>
              </div>
            </dl>

            <Button
              type="button"
              variant="secondary"
              fullWidth
              data-testid="signout-control"
              disabled={signingOut}
              onClick={() => void onSignOut()}
            >
              {signingOut ? 'Signing out...' : 'Sign out and create new anonymous session'}
            </Button>
          </div>
        </Card>
      ) : null}
    </Page>
  )
}