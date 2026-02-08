/**
 * Route prefetching utilities
 * Preload lazy chunks on hover/intent for instant navigation
 */

// Store component loaders for prefetching
const componentCache = new Map<string, () => Promise<any>>();
const loadedComponents = new Map<string, any>();

/**
 * Register a component for prefetching
 */
export function registerPrefetch(
  route: string,
  loader: () => Promise<any>
): void {
  componentCache.set(route, loader);
}

/**
 * Prefetch a specific route's component
 */
export function prefetchRoute(route: string): void {
  const loader = componentCache.get(route);
  if (!loader || loadedComponents.has(route)) return;

  // Start loading in background
  loader()
    .then((mod) => {
      loadedComponents.set(route, mod);
    })
    .catch(() => {
      // Silently fail - will retry on actual navigation
    });
}

/**
 * Check if a route is already loaded
 */
export function isRouteLoaded(route: string): boolean {
  return loadedComponents.has(route);
}

/**
 * Prefetch multiple routes (eager preload)
 */
export function prefetchRoutes(routes: string[]): void {
  routes.forEach((route, index) => {
    // Stagger prefetch to not overwhelm network
    setTimeout(() => prefetchRoute(route), index * 100);
  });
}

/**
 * React hook for hover prefetching
 */
export function usePrefetchOnHover(route: string) {
  return {
    onMouseEnter: () => prefetchRoute(route),
    onTouchStart: () => prefetchRoute(route),
  };
}
