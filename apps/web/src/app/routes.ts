export type AppRoute =
  | { name: 'home' }
  | { name: 'profile' }
  | { name: 'coin-ledger' }
  | { name: 'auth' }
  | { name: 'yinyang-intro' }
  | { name: 'yinyang-play' }
  | { name: 'share'; slug: string }

export const HOME_PATH = '/'
export const PROFILE_PATH = '/profile'
export const COIN_LEDGER_PATH = '/profile/coin-ledger'
export const AUTH_PATH = '/auth'
export const YINYANG_INTRO_PATH = '/game/yinyang/intro'
export const YINYANG_PLAY_PATH = '/game/yinyang/play'

export const resolveRouteFromPath = (pathname: string): AppRoute => {
  if (pathname.toLowerCase() === PROFILE_PATH) {
    return { name: 'profile' }
  }

  if (pathname.toLowerCase() === COIN_LEDGER_PATH) {
    return { name: 'coin-ledger' }
  }

  if (pathname.toLowerCase() === AUTH_PATH) {
    return { name: 'auth' }
  }

  if (pathname.toLowerCase() === YINYANG_INTRO_PATH) {
    return { name: 'yinyang-intro' }
  }

  if (pathname.toLowerCase() === YINYANG_PLAY_PATH) {
    return { name: 'yinyang-play' }
  }

  const shareMatch = pathname.match(/^\/share\/([^/]+)\/?$/i)
  if (shareMatch?.[1]) {
    return {
      name: 'share',
      slug: decodeURIComponent(shareMatch[1]),
    }
  }

  return { name: 'home' }
}

export const resolvePathFromRoute = (route: AppRoute): string => {
  if (route.name === 'profile') {
    return PROFILE_PATH
  }
  if (route.name === 'coin-ledger') {
    return COIN_LEDGER_PATH
  }
  if (route.name === 'auth') {
    return AUTH_PATH
  }
  if (route.name === 'yinyang-intro') {
    return YINYANG_INTRO_PATH
  }
  if (route.name === 'yinyang-play') {
    return YINYANG_PLAY_PATH
  }
  if (route.name === 'share') {
    return `/share/${encodeURIComponent(route.slug)}`
  }
  return HOME_PATH
}

export const isSameRoute = (left: AppRoute, right: AppRoute): boolean => {
  if (left.name !== right.name) {
    return false
  }

  if (left.name === 'share' && right.name === 'share') {
    return left.slug === right.slug
  }

  return true
}
