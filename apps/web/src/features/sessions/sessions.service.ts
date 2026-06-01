export type StartGameSessionResult = {
  sessionId: string
  startedAt: string
}

export const startGameSession = async (gameSlug: string): Promise<StartGameSessionResult> => {
  // Phase-1 to Phase-4 scaffold: local session placeholder until Edge Function is wired.
  // Keeps UI and E2E flow deterministic in preview environments.
  return {
    sessionId: `local-${gameSlug}-${crypto.randomUUID()}`,
    startedAt: new Date().toISOString(),
  }
}
