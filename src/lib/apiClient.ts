import { getAppCheckTokenHeader } from './firebase';

/**
 * Tracks whether the Node.js / Express backend (/api/*) is reachable in the current hosting environment.
 * On pure static hosts (e.g. cavebaadre.com, *.web.app, *.firebaseapp.com), Firebase Hosting serves
 * index.html (text/html) for unknown paths unless backed by Cloud Run.
 * Detecting this once prevents any wasted network round-trips or 404/HTML parse errors.
 */
function isKnownStaticHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === 'cavebaadre.com' ||
    host.endsWith('.cavebaadre.com') ||
    host.endsWith('.web.app') ||
    host.endsWith('.firebaseapp.com')
  );
}

let backendReachable: boolean | null = isKnownStaticHost() ? false : null;

export function isBackendApiAvailable(): boolean {
  if (backendReachable === false) return false;
  return true;
}

export interface SafeApiResult<T = any> {
  handled: boolean;
  ok: boolean;
  status: number;
  data: T | null;
}

/**
 * Performs a fetch to `/api/*` only if the backend server is available, automatically
 * attaching Firebase App Check headers and verifying that the response is genuine JSON
 * (not an SPA index.html fallback).
 */
export async function safeApiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<SafeApiResult<T>> {
  if (backendReachable === false) {
    return { handled: false, ok: false, status: 0, data: null };
  }

  try {
    const appCheckHeader = await getAppCheckTokenHeader();
    const mergedHeaders: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      ...appCheckHeader,
    };

    const res = await fetch(url, {
      ...options,
      headers: mergedHeaders,
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      // Static hosting returned index.html or plain text for /api/* -> mark backend unavailable
      backendReachable = false;
      return { handled: false, ok: false, status: res.status, data: null };
    }

    backendReachable = true;
    const data = (await res.json().catch(() => null)) as T | null;
    return {
      handled: true,
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch {
    return { handled: false, ok: false, status: 0, data: null };
  }
}
