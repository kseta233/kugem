import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

type ProfileRow = {
  id: string
  display_name: string
  app_status: 'anonymous' | 'registered' | 'blocked'
}

type StartGameSessionResponse = {
  sessionId: string
  gameId: string
  gameVersion: number
  nonce: string
  startedAt: string
  config: {
    rewardCoin?: number
  }
}

type SubmitScoreResponse = {
  scoreId: string
  validationStatus: 'valid' | 'suspicious' | 'rejected'
  coinReward: number
  totalCoin: number | null
  rankHint: number | null
}

type CreateSharePostResponse = {
  postId: string
  shareSlug: string
  shareUrl: string
}

const tryReadEnvValue = (filePath: string, key: string): string | null => {
  if (!fs.existsSync(filePath)) {
    return null
  }

  const line = fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${key}=`))

  if (!line) {
    return null
  }

  const [, value] = line.split('=', 2)
  return value?.trim() || null
}

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ??
  tryReadEnvValue(path.resolve(__dirname, '../apps/web/.env'), 'VITE_SUPABASE_URL')

const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ??
  tryReadEnvValue(path.resolve(__dirname, '../apps/web/.env'), 'VITE_SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY for API contract tests')
}

test.describe('Supabase function contracts', () => {
  test('start_game_session -> submit_score -> create_share_post', async () => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })

    const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
    expect(authError).toBeNull()
    expect(authData.user?.id).toBeTruthy()

    const userId = authData.user?.id
    expect(userId).toBeTruthy()
    if (!userId) {
      throw new Error('Anonymous user id missing')
    }

    const { error: profileUpsertError } = await supabase.from('profiles').upsert({
      id: userId,
      display_name: 'Contract Tester',
      app_status: 'anonymous',
    } satisfies ProfileRow)

    expect(profileUpsertError).toBeNull()

    const { data: startData, error: startError } = await supabase.functions.invoke('start_game_session', {
      body: {
        gameSlug: 'reaction-time',
        clientMeta: {
          platform: 'e2e-contract-test',
          appVersion: '0.1.0-test',
        },
      },
    })

    expect(startError).toBeNull()

    const startSession = startData as StartGameSessionResponse
    expect(startSession.sessionId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(startSession.gameId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(typeof startSession.gameVersion).toBe('number')
    expect(startSession.nonce.length).toBeGreaterThan(10)

    const { data: submitData, error: submitError } = await supabase.functions.invoke('submit_score', {
      body: {
        sessionId: startSession.sessionId,
        score: 300,
        durationMs: 10000,
      },
    })

    expect(submitError).toBeNull()

    const submitScoreResult = submitData as SubmitScoreResponse
    expect(submitScoreResult.scoreId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(['valid', 'suspicious']).toContain(submitScoreResult.validationStatus)
    expect(typeof submitScoreResult.coinReward).toBe('number')

    const { data: shareData, error: shareError } = await supabase.functions.invoke('create_share_post', {
      body: {
        scoreId: submitScoreResult.scoreId,
        caption: 'Contract test share',
      },
    })

    expect(shareError).toBeNull()

    const sharePost = shareData as CreateSharePostResponse
    expect(sharePost.postId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(sharePost.shareSlug.length).toBeGreaterThanOrEqual(6)
    expect(sharePost.shareUrl).toContain('/share/')
  })

  test('submit_score duplicate submission is rejected', async () => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })

    const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
    expect(authError).toBeNull()

    const userId = authData.user?.id
    if (!userId) {
      throw new Error('Anonymous user id missing')
    }

    const { error: profileUpsertError } = await supabase.from('profiles').upsert({
      id: userId,
      display_name: 'Contract Tester 2',
      app_status: 'anonymous',
    } satisfies ProfileRow)

    expect(profileUpsertError).toBeNull()

    const { data: startData, error: startError } = await supabase.functions.invoke('start_game_session', {
      body: {
        gameSlug: 'reaction-time',
      },
    })

    expect(startError).toBeNull()

    const sessionId = (startData as StartGameSessionResponse).sessionId

    const firstSubmit = await supabase.functions.invoke('submit_score', {
      body: {
        sessionId,
        score: 200,
        durationMs: 9000,
      },
    })

    expect(firstSubmit.error).toBeNull()

    const secondSubmit = await supabase.functions.invoke('submit_score', {
      body: {
        sessionId,
        score: 220,
        durationMs: 9200,
      },
    })

    expect(secondSubmit.error).not.toBeNull()
  })

  test('submit_score invalid payload is rejected', async () => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })

    const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
    expect(authError).toBeNull()

    const userId = authData.user?.id
    if (!userId) {
      throw new Error('Anonymous user id missing')
    }

    const { error: profileUpsertError } = await supabase.from('profiles').upsert({
      id: userId,
      display_name: 'Contract Tester 3',
      app_status: 'anonymous',
    } satisfies ProfileRow)

    expect(profileUpsertError).toBeNull()

    const invalidSubmit = await supabase.functions.invoke('submit_score', {
      body: {
        sessionId: '',
        score: -1,
        durationMs: 0,
      },
    })

    expect(invalidSubmit.error).not.toBeNull()
  })
})
