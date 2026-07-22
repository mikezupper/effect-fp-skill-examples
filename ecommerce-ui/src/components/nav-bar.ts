import { SignalWatcher } from "@lit-labs/signals"
import { css, html, LitElement } from "lit"
import { customElement } from "lit/decorators.js"
import { cartCount } from "../state/cart.js"
import { session, signOut } from "../state/session.js"
import { shared } from "../styles/shared.js"

@customElement("nav-bar")
export class NavBar extends SignalWatcher(LitElement) {
  static styles = [
    shared,
    css`
      header {
        position: sticky;
        inset-block-start: 0;
        z-index: 10;
        background: color-mix(in oklch, var(--surface) 82%, transparent);
        backdrop-filter: blur(12px);
        border-block-end: 1px solid var(--border);
      }
      .wrap {
        display: flex;
        align-items: center;
        gap: var(--space);
        max-inline-size: 72rem;
        margin-inline: auto;
        padding: var(--space-s) var(--space);
      }
      .logo {
        font-weight: 800;
        font-size: var(--step-1);
        letter-spacing: -0.02em;
        white-space: nowrap;
      }
      .logo .dot {
        color: var(--brand);
      }
      form {
        flex: 1;
        display: flex;
        min-inline-size: 8rem;
      }
      input[type="search"] {
        inline-size: 100%;
        min-block-size: 44px;
        padding-inline: 0.9em;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--surface-raised);
        color: var(--text);
      }
      input[type="search"]::placeholder {
        color: var(--text-muted);
      }
      nav {
        display: flex;
        align-items: center;
        gap: var(--space-s);
      }
      .cart-btn {
        position: relative;
        min-inline-size: 44px;
        min-block-size: 44px;
        display: grid;
        place-content: center;
        border-radius: var(--radius-s);
        border: 1px solid var(--border);
      }
      .cart-btn:hover {
        background: var(--brand-subtle);
      }
      .count {
        position: absolute;
        inset-block-start: -0.4rem;
        inset-inline-end: -0.4rem;
        min-inline-size: 1.35rem;
        block-size: 1.35rem;
        display: grid;
        place-content: center;
        font-size: 0.72rem;
        font-weight: 700;
        border-radius: 999px;
        background: var(--brand);
        color: var(--on-brand);
      }
      .who {
        font-size: var(--step--1);
        color: var(--text-muted);
        max-inline-size: 14ch;
        overflow: clip;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @media (max-width: 640px) {
        .who {
          display: none;
        }
      }
    `,
  ]

  override render() {
    const s = session.get()
    const count = cartCount.get()
    return html`
      <header>
        <div class="wrap">
          <a class="logo" href="/">Railway<span class="dot">·</span>Supply</a>
          <form action="/" method="get" role="search">
            <input
              type="search"
              name="search"
              placeholder="Search the depot…"
              aria-label="Search products"
            />
          </form>
          <nav>
            <a href="/orders" class="btn btn--ghost">Orders</a>
            ${s === null
              ? html`<button
                  class="btn btn--ghost"
                  @click=${() => this.dispatchEvent(new CustomEvent("require-auth"))}
                >
                  Sign in
                </button>`
              : html`
                  <span class="who" title=${s.email}>${s.email}</span>
                  <button class="btn btn--ghost" @click=${() => signOut()}>Sign out</button>
                `}
            <button
              class="cart-btn"
              aria-label="Open cart (${count} items)"
              @click=${() => this.dispatchEvent(new CustomEvent("open-cart"))}
            >
              🛒 ${count > 0 ? html`<span class="count">${count}</span>` : null}
            </button>
          </nav>
        </div>
      </header>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "nav-bar": NavBar
  }
}
