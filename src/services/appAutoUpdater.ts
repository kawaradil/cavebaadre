declare const __APP_BUILD_ID__: string;

export const CURRENT_APP_BUILD_ID: string =
  typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';

const RELOAD_TS_KEY = 'baadre_auto_update_reload_ts';
const RELOAD_BUILD_KEY = 'baadre_auto_update_reload_build';
const MIN_RELOAD_COOLDOWN_MS = 20_000;
const VERSION_POLL_INTERVAL_MS = 2 * 60 * 1000; // Check every 2 minutes while active

let isUpdateDeferred = false;
let pendingTargetBuildId: string | null = null;
let isReloadingNow = false;
let notifyUpdatingListeners: Array<() => void> = [];

/**
 * Checks if an error corresponds to a stale lazy-loaded JS/CSS chunk after a new deployment
 */
export function isStaleChunkError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    err instanceof Error
      ? `${err.name} ${err.message}`
      : typeof err === 'string'
      ? err
      : JSON.stringify(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('importing a module script failed') ||
    lower.includes('error loading dynamically imported module') ||
    lower.includes('chunkloaderror') ||
    lower.includes('loading chunk') ||
    lower.includes('loading css chunk')
  );
}

function canPerformAutoReload(targetBuildId: string): boolean {
  if (isReloadingNow) return false;
  try {
    const now = Date.now();
    const lastTs = Number(sessionStorage.getItem(RELOAD_TS_KEY) || '0');
    const lastBuild = sessionStorage.getItem(RELOAD_BUILD_KEY) || '';

    if (now - lastTs < MIN_RELOAD_COOLDOWN_MS) {
      return false;
    }
    if (
      targetBuildId &&
      targetBuildId !== 'sw-update' &&
      targetBuildId !== 'chunk-recovery' &&
      lastBuild === targetBuildId
    ) {
      return false;
    }
  } catch {
    // Ignore storage restriction errors
  }
  return true;
}

/**
 * Purges all stale CacheStorage entries, activates any waiting Service Worker,
 * and performs a cache-busted reload that works reliably on Android WebAPK & iOS Home Screen WebClips.
 */
export async function forceCleanAppReload(
  targetBuildId: string = 'manual',
  bypassCooldown: boolean = false
): Promise<void> {
  if (typeof window === 'undefined') return;

  if (!bypassCooldown && !canPerformAutoReload(targetBuildId)) {
    return;
  }

  if (!bypassCooldown && isUpdateDeferred) {
    pendingTargetBuildId = targetBuildId;
    return;
  }

  isReloadingNow = true;
  pendingTargetBuildId = null;

  try {
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
    sessionStorage.setItem(RELOAD_BUILD_KEY, targetBuildId);
  } catch {}

  // Notify UI so a brief smooth indicator appears before refresh
  for (const listener of notifyUpdatingListeners) {
    try {
      listener();
    } catch {}
  }

  try {
    // 1. Instruct active/waiting Service Workers to skipWaiting and purge old caches
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (reg) => {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          if (reg.active) {
            reg.active.postMessage({ type: 'PURGE_CACHES' });
          }
          await reg.update().catch(() => {});
        })
      );
    }

    // 2. Clear browser CacheStorage directly from window context
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key).catch(() => false)));
    }
  } catch {}

  // Short visual grace period (450ms) so the update indicator renders smoothly
  await new Promise((resolve) => setTimeout(resolve, 450));

  try {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('_v', `${targetBuildId}_${Date.now()}`);
    window.location.replace(nextUrl.toString());
  } catch {
    window.location.reload();
  }
}

/**
 * Temporarily defer automatic reloads while a user is filling out a form/modal,
 * and immediately apply any queued update once they finish or close the modal.
 */
export function setAutoUpdateDeferred(deferred: boolean): void {
  isUpdateDeferred = deferred;
  if (!deferred && pendingTargetBuildId) {
    const queued = pendingTargetBuildId;
    pendingTargetBuildId = null;
    void forceCleanAppReload(queued);
  }
}

/**
 * Checks both `/version.json` and Service Worker registration for any newer deployment.
 */
export async function checkForAppUpdate(): Promise<void> {
  if (typeof window === 'undefined' || isReloadingNow) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  // 1. Trigger Service Worker byte-diff update check bypassing HTTP cache
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg) {
        if (reg.waiting && navigator.serviceWorker.controller) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        await reg.update().catch(() => {});
      }
    } catch {}
  }

  // 2. Compare compiled bundle buildId against live server /version.json
  if (CURRENT_APP_BUILD_ID === 'dev') {
    return;
  }

  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) return;
    const data = await response.json();
    const remoteBuildId = typeof data?.buildId === 'string' ? data.buildId.trim() : '';

    if (
      remoteBuildId &&
      remoteBuildId !== 'dev' &&
      remoteBuildId !== CURRENT_APP_BUILD_ID
    ) {
      await forceCleanAppReload(remoteBuildId);
    }
  } catch {
    // Ignore transient network errors when mobile signal fluctuates
  }
}

/**
 * Subscribes to all mobile lifecycle events (app launch, home-screen resume,
 * bfcache restore, network reconnect, SW controller swap, and stale chunk recovery)
 * to automatically keep installed mobile PWAs on the latest version.
 */
export function subscribeToAutoUpdater(onUpdating: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  notifyUpdatingListeners.push(onUpdating);

  const hadControllerAtBoot =
    'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller);

  // Watch Service Worker updates & controller swaps
  const handleControllerChange = () => {
    if (!hadControllerAtBoot) return;
    void forceCleanAppReload('sw-update');
  };

  const handleSwMessage = (event: MessageEvent) => {
    const data = event.data || {};
    if (data.type === 'SW_ACTIVATED_NEW_VERSION') {
      const incomingBuildId = String(data.buildId || '').trim();
      if (
        CURRENT_APP_BUILD_ID !== 'dev' &&
        incomingBuildId &&
        incomingBuildId !== '__SW_BUILD_ID__' &&
        incomingBuildId !== CURRENT_APP_BUILD_ID
      ) {
        void forceCleanAppReload(incomingBuildId);
      } else if (hadControllerAtBoot && CURRENT_APP_BUILD_ID !== 'dev') {
        void forceCleanAppReload(incomingBuildId || 'sw-update');
      }
    }
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker.addEventListener('message', handleSwMessage);

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (
              installing.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => {});
  }

  // Mobile app resume / foreground / reconnect triggers
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void checkForAppUpdate();
    }
  };

  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      // Restored from iOS Safari / Android back-forward memory cache
      void checkForAppUpdate();
    }
  };

  const handleFocus = () => {
    void checkForAppUpdate();
  };

  const handleOnline = () => {
    void checkForAppUpdate();
  };

  // Automatic recovery if a lazy-loaded module hash changed after a new deployment
  const handleVitePreloadError = (event: Event) => {
    event.preventDefault();
    void forceCleanAppReload('chunk-recovery');
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (isStaleChunkError(event.reason)) {
      event.preventDefault();
      void forceCleanAppReload('chunk-recovery');
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pageshow', handlePageShow);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('online', handleOnline);
  window.addEventListener('vite:preloadError', handleVitePreloadError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // Initial startup check right after first paint
  const initialTimer = window.setTimeout(() => {
    void checkForAppUpdate();
  }, 1200);

  // Periodic background check while app remains open on screen
  const intervalId = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void checkForAppUpdate();
    }
  }, VERSION_POLL_INTERVAL_MS);

  return () => {
    notifyUpdatingListeners = notifyUpdatingListeners.filter((fn) => fn !== onUpdating);
    window.clearTimeout(initialTimer);
    window.clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pageshow', handlePageShow);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('vite:preloadError', handleVitePreloadError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
  };
}
