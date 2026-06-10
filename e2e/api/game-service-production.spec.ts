import { expect, test } from '@playwright/test'

const appSecret = process.env.E2E_GAME_SERVICE_APP_SECRET
const userA = process.env.E2E_GAME_SERVICE_USER_A
const userB = process.env.E2E_GAME_SERVICE_USER_B
const roomPassword = process.env.E2E_GAME_SERVICE_ROOM_PASSWORD ?? '1234'

const missingEnv = [
  ['E2E_GAME_SERVICE_APP_SECRET', appSecret],
  ['E2E_GAME_SERVICE_USER_A', userA],
  ['E2E_GAME_SERVICE_USER_B', userB],
].filter(([, value]) => !value)

test.describe('game-service production smoke', () => {
  test.skip(
    missingEnv.length > 0,
    `Missing required env vars: ${missingEnv.map(([name]) => name).join(', ')}`,
  )

  test('health endpoint is reachable', async ({ request }) => {
    const res = await request.get('/health')
    expect(res.ok()).toBeTruthy()

    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('game-service')
  })

  test('private room lifecycle works', async ({ request }) => {
    const createRes = await request.post('/v1/rooms', {
      headers: {
        'content-type': 'application/json',
        'x-app-secret': appSecret!,
        'x-user-id': userA!,
      },
      data: {
        gameType: 'rock-paper-scissors',
        maxPlayers: 2,
        isPrivate: true,
        password: roomPassword,
        displayName: 'Prod User A',
      },
    })

    expect(createRes.status(), await createRes.text()).toBe(201)
    const createBody = await createRes.json()

    const roomId = createBody.room.roomId as string
    const roomCode = createBody.room.roomCode as string

    const wrongJoinRes = await request.post(`/v1/rooms/${roomCode}/join`, {
      headers: {
        'content-type': 'application/json',
        'x-app-secret': appSecret!,
        'x-user-id': userB!,
      },
      data: {
        displayName: 'Prod User B',
        password: 'wrong-password',
      },
    })

    expect(wrongJoinRes.status()).toBe(403)

    const joinRes = await request.post(`/v1/rooms/${roomCode}/join`, {
      headers: {
        'content-type': 'application/json',
        'x-app-secret': appSecret!,
        'x-user-id': userB!,
      },
      data: {
        displayName: 'Prod User B',
        password: roomPassword,
      },
    })

    expect(joinRes.status(), await joinRes.text()).toBe(200)

    const readyARes = await request.post(`/v1/rooms/${roomId}/ready`, {
      headers: {
        'content-type': 'application/json',
        'x-app-secret': appSecret!,
        'x-user-id': userA!,
      },
      data: { isReady: true },
    })
    expect(readyARes.status()).toBe(200)

    const readyBRes = await request.post(`/v1/rooms/${roomId}/ready`, {
      headers: {
        'content-type': 'application/json',
        'x-app-secret': appSecret!,
        'x-user-id': userB!,
      },
      data: { isReady: true },
    })
    expect(readyBRes.status()).toBe(200)

    const startRes = await request.post(`/v1/rooms/${roomId}/start`, {
      headers: {
        'x-app-secret': appSecret!,
        'x-user-id': userA!,
      },
    })

    expect(startRes.status(), await startRes.text()).toBe(200)
    const startBody = await startRes.json()

    expect(startBody.room.status).toBe('started')
    expect(typeof startBody.room.sessionId).toBe('string')
    expect(startBody.session.status).toBe('started')
    expect(startBody.session.stateVersion).toBe(0)
  })
})
