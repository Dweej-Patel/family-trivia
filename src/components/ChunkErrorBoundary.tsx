import { Component, type ReactNode } from 'react'
import { loadPendingRoom } from '../multiplayer/session'

// Timestamp of our last auto-reload, so a reload that DIDN'T fix things falls
// through to the manual UI instead of looping forever. After the window passes,
// a future stale-deploy can self-heal again.
const RELOAD_KEY = 'ft.staleReload.v1'
const RELOAD_WINDOW_MS = 15000

/**
 * Reload to a fresh, cache-busted URL. A query value the cache hasn't seen
 * forces a fresh index.html + assets. If we were partway through a ?room= deep
 * link (whose query App already stripped), re-attach the stashed code so the
 * reloaded app re-enters the join flow rather than landing on home.
 */
function reloadFresh(): void {
  const url = new URL(window.location.href)
  url.searchParams.set('_', Date.now().toString(36))
  const pendingRoom = loadPendingRoom()
  if (pendingRoom && !url.searchParams.get('room')) {
    url.searchParams.set('room', pendingRoom)
  }
  window.location.replace(url.toString())
}

interface Props {
  children: ReactNode
}
interface State {
  failed: boolean
}

/**
 * Catches the one error a code-split SPA on a static host (GitHub Pages) reliably
 * hits: after a redeploy, a still-cached old bundle tries to lazy-load a chunk
 * whose hashed filename the new deploy removed — the dynamic import() rejects and
 * the screen goes blank. We respond by force-reloading once (cache-busting) to
 * pull the fresh build, and only show a manual "refresh" prompt if that fails.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(): void {
    let last = 0
    try {
      last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0
    } catch {
      /* sessionStorage blocked (private mode) — just attempt the reload */
    }
    const now = Date.now()
    // Only auto-reload if we haven't already tried within the window (otherwise
    // a genuinely broken build would reload endlessly).
    if (now - last > RELOAD_WINDOW_MS) {
      try {
        sessionStorage.setItem(RELOAD_KEY, String(now))
      } catch {
        /* ignore */
      }
      reloadFresh()
    }
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="text-6xl">🔄</div>
          <h1 className="font-display text-3xl font-bold text-white">
            Updating to the latest version…
          </h1>
          <p className="font-body text-lg text-white/70">
            If this doesn&apos;t clear in a moment, tap below.
          </p>
          <button
            onClick={() => {
              try {
                sessionStorage.removeItem(RELOAD_KEY)
              } catch {
                /* ignore */
              }
              reloadFresh()
            }}
            className="rounded-2xl border border-white/25 bg-gradient-to-br from-grape to-bubble px-6 py-3 font-display text-lg font-bold text-white shadow-playful"
          >
            ↻ Refresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
