import { SignalWatcher } from "@lit-labs/signals"
import { Task } from "@lit/task"
import { css, html, LitElement } from "lit"
import { customElement } from "lit/decorators.js"
import { repeat } from "lit/directives/repeat.js"
import { formatDate, formatPrice } from "../format.js"
import { api } from "../services/api.js"
import { session } from "../state/session.js"
import { shared } from "../styles/shared.js"

@customElement("orders-page")
export class OrdersPage extends SignalWatcher(LitElement) {
  // csr route: fetches client-side via @lit/task, keyed on the session token —
  // signing in/out re-runs it automatically; AbortSignal handles races.
  private orders = new Task(this, {
    args: () => [session.get()?.token] as const,
    task: async ([token]) => {
      if (token === undefined) return null
      return api.orders(token)
    },
  })

  static styles = [
    shared,
    css`
      :host {
        display: grid;
        gap: var(--space);
      }
      h1 {
        font-size: var(--step-2);
      }
      .order {
        background: var(--surface-raised);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: var(--space);
        display: grid;
        gap: var(--space-s);
      }
      .head {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-s);
        justify-content: space-between;
        align-items: baseline;
      }
      .when {
        color: var(--text-muted);
        font-size: var(--step--1);
      }
      .total {
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }
      /* Lines align across rows via grid columns. */
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: 0.35rem var(--space);
      }
      li {
        display: grid;
        grid-template-columns: subgrid;
        grid-column: span 3;
        border-block-start: 1px solid var(--border);
        padding-block-start: 0.35rem;
      }
      .n {
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
      }
      .p {
        font-variant-numeric: tabular-nums;
        text-align: end;
      }
      .signin,
      .empty {
        display: grid;
        place-items: center;
        gap: var(--space-s);
        padding-block: calc(var(--space) * 2);
        text-align: center;
        color: var(--text-muted);
      }
      .skeleton {
        block-size: 8rem;
        border-radius: var(--radius);
        background: linear-gradient(
          100deg,
          color-mix(in oklch, var(--text) 6%, var(--surface)) 40%,
          color-mix(in oklch, var(--text) 12%, var(--surface)) 50%,
          color-mix(in oklch, var(--text) 6%, var(--surface)) 60%
        );
        background-size: 200% 100%;
        animation: shine 1.2s linear infinite;
      }
      @keyframes shine {
        to {
          background-position: -100% 0;
        }
      }
    `,
  ]

  // One shared template for INITIAL and PENDING: the server renders INITIAL
  // (tasks never run during SSR), the hydrating client render is already
  // PENDING — they must produce the identical template or hydration mismatches.
  #skeleton = () => html`<div class="skeleton"></div>`

  override render() {
    return html`
      <h1>Order history</h1>
      ${this.orders.render({
        initial: this.#skeleton,
        pending: this.#skeleton,
        error: () => html`<p class="empty">Couldn't load your orders. Try again.</p>`,
        complete: (orders) =>
          orders === null
            ? html`<div class="signin">
                <p>Sign in to see where your orders ended up.</p>
                <button
                  class="btn"
                  @click=${() =>
                    this.dispatchEvent(
                      new CustomEvent("require-auth", { bubbles: true, composed: true })
                    )}
                >
                  Sign in
                </button>
              </div>`
            : orders.length === 0
              ? html`<p class="empty">
                  No orders yet — <a href="/"><u>the depot awaits</u></a>.
                </p>`
              : repeat(
                  orders,
                  (o) => o.id,
                  (o) => html`
                    <section class="order">
                      <div class="head">
                        <span class="when">${formatDate(o.placedAt)}</span>
                        <span class="total">${formatPrice(o.totalCents)}</span>
                      </div>
                      <ul>
                        ${o.lines.map(
                          (l) => html`
                            <li>
                              <span>${l.name}</span>
                              <span class="n">×${l.quantity}</span>
                              <span class="p">${formatPrice(l.unitPriceCents * l.quantity)}</span>
                            </li>
                          `
                        )}
                      </ul>
                    </section>
                  `
                ),
      })}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "orders-page": OrdersPage
  }
}
