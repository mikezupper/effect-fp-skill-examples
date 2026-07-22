import { SignalWatcher } from "@lit-labs/signals"
import { css, html, LitElement } from "lit"
import { customElement, query, state } from "lit/decorators.js"
import { repeat } from "lit/directives/repeat.js"
import { formatPrice } from "../format.js"
import { cart, checkout, removeItem, setItem, type CheckoutResult } from "../state/cart.js"
import { shared } from "../styles/shared.js"

@customElement("cart-drawer")
export class CartDrawer extends SignalWatcher(LitElement) {
  @query("dialog") private dialog!: HTMLDialogElement
  @state() private result: CheckoutResult | null = null
  @state() private busy = false

  static styles = [
    shared,
    css`
      dialog {
        /* Side drawer in the top layer — platform focus management for free. */
        inset: 0 0 0 auto;
        inline-size: min(26rem, 92vw);
        block-size: 100dvh;
        max-block-size: 100dvh;
        margin: 0;
        border: 0;
        border-inline-start: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        padding: var(--space);
        display: grid;
        grid-template-rows: auto 1fr auto;
        gap: var(--space-s);
        overscroll-behavior: contain;
        transition:
          translate 0.28s ease-out,
          overlay 0.28s ease-out allow-discrete,
          display 0.28s ease-out allow-discrete;
      }
      dialog:not([open]) {
        translate: 100% 0;
      }
      dialog[open] {
        translate: 0 0;
      }
      /* Animate the ENTRY too — the @starting-style pattern (modern-css). */
      @starting-style {
        dialog[open] {
          translate: 100% 0;
        }
      }
      dialog::backdrop {
        background: oklch(15% 0.02 260 / 0.35);
        backdrop-filter: blur(3px);
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      h2 {
        font-size: var(--step-1);
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: var(--space-s);
        align-content: start;
        overflow-y: auto;
      }
      li {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.25rem var(--space-s);
        padding-block-end: var(--space-s);
        border-block-end: 1px solid var(--border);
      }
      .qty {
        display: inline-flex;
        align-items: center;
        gap: 0.5ch;
      }
      .qty button {
        min-inline-size: 32px;
        min-block-size: 32px;
        border: 1px solid var(--border);
        border-radius: var(--radius-s);
      }
      .qty button:hover {
        background: var(--brand-subtle);
      }
      .line-total {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        text-align: end;
      }
      .remove {
        color: var(--danger);
        font-size: var(--step--1);
        justify-self: start;
      }
      .empty {
        display: grid;
        place-content: center;
        gap: 0.5rem;
        text-align: center;
        color: var(--text-muted);
      }
      footer {
        display: grid;
        gap: var(--space-s);
      }
      .total {
        display: flex;
        justify-content: space-between;
        font-weight: 800;
        font-size: var(--step-1);
        font-variant-numeric: tabular-nums;
      }
      .notice {
        padding: var(--space-s);
        border-radius: var(--radius-s);
        font-size: var(--step--1);
      }
      .notice.err {
        background: color-mix(in oklch, var(--danger) 12%, var(--surface));
        color: var(--danger);
      }
      .notice.ok {
        background: color-mix(in oklch, var(--ok) 14%, var(--surface));
        color: var(--ok);
      }
    `,
  ]

  open() {
    this.result = null
    this.dialog.showModal()
  }

  override render() {
    const view = cart.get()
    const lines = view?.lines ?? []
    return html`
      <dialog closedby="any" aria-label="Shopping cart">
        <header>
          <h2>Your cart</h2>
          <button class="btn btn--ghost" @click=${() => this.dialog.close()}>Close</button>
        </header>

        ${lines.length === 0
          ? html`<div class="empty">
              <span style="font-size:2.5rem">🛒</span>
              <p>Nothing on the rails yet.</p>
            </div>`
          : html`
              <ul>
                ${repeat(
                  lines,
                  (l) => l.product.id,
                  (l) => html`
                    <li>
                      <strong>${l.product.name}</strong>
                      <span class="line-total">${formatPrice(l.lineTotalCents)}</span>
                      <span class="qty">
                        <button
                          aria-label="Decrease quantity"
                          ?disabled=${l.quantity <= 1}
                          @click=${() => void setItem(l.product.id, l.quantity - 1)}
                        >
                          −
                        </button>
                        ${l.quantity}
                        <button
                          aria-label="Increase quantity"
                          @click=${() => void setItem(l.product.id, l.quantity + 1)}
                        >
                          +
                        </button>
                      </span>
                      <button class="remove" @click=${() => void removeItem(l.product.id)}>
                        Remove
                      </button>
                    </li>
                  `
                )}
              </ul>
            `}

        <footer>
          ${this.result?.kind === "failed"
            ? html`<p class="notice err">${this.result.reason}</p>`
            : null}
          ${this.result?.kind === "placed"
            ? html`<p class="notice ok">
                Order placed — ${formatPrice(this.result.order.totalCents)}. See
                <a href="/orders" @click=${() => this.dialog.close()}><u>order history</u></a>.
              </p>`
            : null}
          <div class="total">
            <span>Total</span><span>${formatPrice(view?.totalCents ?? 0)}</span>
          </div>
          <button
            class="btn"
            ?disabled=${lines.length === 0 || this.busy}
            @click=${() => void this.#checkout()}
          >
            ${this.busy ? "Placing order…" : "Checkout"}
          </button>
        </footer>
      </dialog>
    `
  }

  async #checkout() {
    this.busy = true
    try {
      this.result = await checkout()
    } finally {
      this.busy = false
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cart-drawer": CartDrawer
  }
}
