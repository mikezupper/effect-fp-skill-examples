import type { ReactiveController, ReactiveControllerHost } from "lit"
import { isServer } from "lit"
import { matchRoute } from "./routes.js"

// Canonical platform-native router (lit-web-apps/references/routing.md):
// URLPattern matching + Navigation API interception, click/popstate fallback.
//
// SSR nuance: the server renders the initial page as a slotted light-DOM child
// of <app-shell> so it hydrates in place. The router therefore does NOT render
// an outlet for the initial route — it only lazy-loads the page's definition.
// From the first SPA navigation on, the outlet replaces the slot.

let seeded: unknown = undefined
export function seedData(): unknown {
  if (isServer) return null
  if (seeded === undefined) {
    const el = document.getElementById("__DATA__")
    seeded = el?.textContent ? JSON.parse(el.textContent) : null
  }
  return seeded
}

export class Router implements ReactiveController {
  outlet: unknown = null
  #navigated = false

  constructor(private host: ReactiveControllerHost & HTMLElement) {
    host.addController(this)
  }

  hostConnected() {
    if ("navigation" in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).navigation.addEventListener("navigate", (e: any) => {
        if (!e.canIntercept || e.hashChange || e.downloadRequest) return
        const url = new URL(e.destination.url)
        if (!matchRoute(url)) return // let the browser handle unknown URLs
        e.intercept({ handler: () => this.#show(url) })
      })
    } else {
      document.addEventListener("click", this.#onClick)
      window.addEventListener("popstate", () => void this.#show(new URL(location.href)))
    }
    // Initial route: only ensure the page element's definition loads → hydrates.
    void matchRoute(new URL(location.href))?.route.enter?.()
  }

  async #show(url: URL) {
    const match = matchRoute(url)
    if (!match) return
    await match.route.enter?.()
    const data = (await match.route.load?.(match.params, url)) ?? null
    const apply = () => {
      if (!this.#navigated) {
        this.#navigated = true
        this.host.replaceChildren() // retire the server-rendered slotted page
      }
      this.outlet = match.route.template(data as never)
      document.title = match.route.meta(data as never).title
      this.host.requestUpdate()
    }
    // Free animated navigation where supported (Tier B enhancement).
    if (document.startViewTransition) document.startViewTransition(apply)
    else apply()
  }

  #onClick = (e: MouseEvent) => {
    const a = (e.composedPath() as Element[]).find((el) => el.localName === "a") as
      | HTMLAnchorElement
      | undefined
    if (!a || a.origin !== location.origin || a.target !== "" || e.metaKey || e.ctrlKey) return
    e.preventDefault()
    history.pushState(null, "", a.href)
    void this.#show(new URL(a.href))
  }
}
