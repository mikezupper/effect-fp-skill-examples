import { css, html, isServer, LitElement } from "lit"
import { customElement, query } from "lit/decorators.js"
import { addToCart, refreshCart } from "../state/cart.js"
import { restoreSession, session } from "../state/session.js"
import { Router } from "../router.js"
import { shared } from "../styles/shared.js"
import "./nav-bar.js"
import "./cart-drawer.js"
import "./auth-dialog.js"
import type { AuthDialog } from "./auth-dialog.js"
import type { CartDrawer } from "./cart-drawer.js"

@customElement("app-shell")
export class AppShell extends LitElement {
  private router = new Router(this)

  @query("auth-dialog") private authDialog!: AuthDialog
  @query("cart-drawer") private cartDrawer!: CartDrawer

  static styles = [
    shared,
    css`
      main {
        /* Breakout page scaffold (modern-css recipe): content column + full-bleed rails */
        display: grid;
        grid-template-columns:
          [full-start] minmax(var(--space), 1fr)
          [content-start] min(100% - 2 * var(--space), 72rem)
          [content-end] minmax(var(--space), 1fr)
          [full-end];
        row-gap: calc(var(--space) * 1.5);
        padding-block: var(--space) calc(var(--space) * 3);
      }
      main > * {
        grid-column: content;
      }
      /* The server-rendered page arrives via <slot> — light-DOM children need
         ::slotted() to receive their grid placement. */
      slot::slotted(*) {
        grid-column: content;
      }
    `,
  ]

  override async firstUpdated() {
    // Client-only, AFTER hydration — of the WHOLE tree, not just this element.
    // Hydration is top-down: our firstUpdated fires before nav-bar/cart-drawer
    // and the slotted page have hydrated. Mutating shared signals before then
    // forces them to render fresh content mid-hydration → value mismatch and
    // duplicated DOM. So: wait for every signal-reading child to settle first.
    const slotted = this.shadowRoot?.querySelector("slot")?.assignedElements() ?? []
    const children = [...this.shadowRoot!.querySelectorAll("nav-bar, cart-drawer"), ...slotted]
    await Promise.all(
      children.map((el) => (el as Partial<LitElement>).updateComplete ?? Promise.resolve())
    )
    // Now restoring the session (never at module scope!) keeps the first client
    // render identical to the server's signed-out render; the signal update
    // re-renders the nav and drawer through the normal reactive path.
    restoreSession()
    if (session.get() !== null) void refreshCart()
  }

  override render() {
    return html`
      <nav-bar
        @open-cart=${() => this.cartDrawer.open()}
        @require-auth=${() => this.authDialog.open()}
      ></nav-bar>
      <main
        @add-to-cart=${(e: CustomEvent<{ productId: string; quantity?: number }>) =>
          this.#onAddToCart(e.detail.productId, e.detail.quantity ?? 1)}
      >
        ${this.router.outlet ?? html`<slot></slot>`}
      </main>
      <cart-drawer></cart-drawer>
      <auth-dialog></auth-dialog>
    `
  }

  async #onAddToCart(productId: string, quantity: number) {
    if (isServer) return
    if (session.get() === null) {
      this.authDialog.open()
      return
    }
    await addToCart(productId, quantity)
    this.cartDrawer.open()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-shell": AppShell
  }
}
