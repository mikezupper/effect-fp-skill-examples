import { css, html, LitElement } from "lit"
import { customElement, property, state } from "lit/decorators.js"
import { formatPrice, productHue } from "../format.js"
import { seedData } from "../router.js"
import type { ProductDto } from "../services/types.js"
import { shared } from "../styles/shared.js"

@customElement("product-page")
export class ProductPage extends LitElement {
  @property({ attribute: false }) product: ProductDto | null =
    (seedData() as ProductDto | null) ?? null
  @state() private quantity = 1

  static styles = [
    shared,
    css`
      .back {
        font-size: var(--step--1);
        color: var(--text-muted);
      }
      .back:hover {
        color: var(--text);
      }
      article {
        margin-block-start: var(--space);
        display: grid;
        gap: calc(var(--space) * 1.5);
      }
      @media (min-width: 760px) {
        article {
          grid-template-columns: minmax(0, 5fr) minmax(0, 4fr);
          align-items: start;
        }
      }
      .art {
        aspect-ratio: 4 / 3;
        border-radius: var(--radius);
        overflow: clip;
        display: grid;
        place-content: center;
        font-size: clamp(4rem, 12vw, 7rem);
        background:
          radial-gradient(
            circle at 30% 20%,
            oklch(78% 0.12 var(--card-hue) / 0.65),
            transparent 60%
          ),
          linear-gradient(
            135deg in oklch,
            oklch(62% 0.13 var(--card-hue)),
            oklch(45% 0.1 calc(var(--card-hue) + 40))
          );
        box-shadow: var(--shadow);
      }
      .info {
        display: grid;
        gap: var(--space-s);
      }
      h1 {
        font-size: var(--step-2);
        text-wrap: balance;
      }
      .sku {
        font-size: var(--step--1);
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
      }
      .price {
        font-size: var(--step-2);
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }
      .desc {
        color: var(--text-muted);
        max-inline-size: 55ch;
        text-wrap: pretty;
      }
      .stock {
        font-size: var(--step--1);
        color: var(--ok);
      }
      .stock.low {
        color: var(--danger);
      }
      .buy {
        display: flex;
        gap: var(--space-s);
        align-items: center;
        margin-block-start: var(--space-s);
      }
      select {
        min-block-size: 44px;
        padding-inline: 0.7em;
        border: 1px solid var(--border);
        border-radius: var(--radius-s);
        background: var(--surface-raised);
        color: var(--text);
      }
    `,
  ]

  override render() {
    const p = this.product
    if (p === null) return html`<p>Product not found. <a href="/"><u>Back to the depot</u></a></p>`
    const out = p.stock === 0
    return html`
      <a class="back" href="/">← Back to the depot</a>
      <article style="--card-hue: ${productHue(p.sku)}">
        <div class="art">📦</div>
        <div class="info">
          <p class="sku">${p.sku}</p>
          <h1>${p.name}</h1>
          <p class="price">${formatPrice(p.priceCents)}</p>
          <p class="desc">${p.description}</p>
          <p class="stock ${p.stock < 5 ? "low" : ""}">
            ${out ? "Out of stock" : p.stock < 5 ? `Only ${p.stock} left` : "In stock"}
          </p>
          <div class="buy">
            <label>
              Qty
              <select
                @change=${(e: Event) =>
                  (this.quantity = Number((e.target as HTMLSelectElement).value))}
              >
                ${[1, 2, 3, 4, 5].map((n) => html`<option ?selected=${n === this.quantity}>${n}</option>`)}
              </select>
            </label>
            <button
              class="btn"
              ?disabled=${out}
              @click=${() =>
                this.dispatchEvent(
                  new CustomEvent("add-to-cart", {
                    detail: { productId: p.id, quantity: this.quantity },
                    bubbles: true,
                    composed: true,
                  })
                )}
            >
              Add to cart
            </button>
          </div>
        </div>
      </article>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "product-page": ProductPage
  }
}
