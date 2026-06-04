import { useCallback, useEffect, useState } from 'react'
import { type AppRoute, isSameRoute, resolvePathFromRoute, resolveRouteFromPath } from '@/app/routes'

export function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>(() => {
    if (typeof window === 'undefined') {
      return { name: 'home' }
    }
    return resolveRouteFromPath(window.location.pathname)
  })

  useEffect(() => {
    const onPopState = () => {
      setRoute(resolveRouteFromPath(window.location.pathname))
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigateToRoute = useCallback(
    (nextRoute: AppRoute) => {
      if (isSameRoute(nextRoute, route)) {
        return
      }

      const nextPath = resolvePathFromRoute(nextRoute)
      window.history.pushState({}, '', nextPath)
      setRoute(nextRoute)
    },
    [route],
  )

  return {
    route,
    setRoute,
    navigateToRoute,
  }
}
