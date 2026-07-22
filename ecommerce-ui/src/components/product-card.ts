import { css, html, LitElement } from "lit"
import { customElement, property } from "lit/decorators.js"
import { formatPrice, productHue } from "../format.js"
import type { ProductDto } from "../services/types.js"
import { shared } from "../styles/shared.js"

@customElement("product-card")
export class ProductCard extends LitElement {
  @property({ attribute: false }) product!: ProductDto

  static styles = [
    shared,
    css`
      /* Component responds to ITS container, not the viewport (modern-css). */
      :host {
        display: block;
        container-type: inline-size;
      }
      article {
        display: grid;
        gap: var(--space-s);
        block-size: 100%;
        padding: var(--space-s);
        background: var(--surface-raised);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        transition:
          translate 0.2s ease-out,
          box-shadow 0.2s ease-out;
      }
      @supports (corner-shape: squircle) {
        article {
          corner-shape: squircle;
        }
      }
      @media (hover: hover) and (pointer: fine) {
        article:hover {
          translate: 0 -3px;
          box-shadow: var(--shadow-high);
        }
      }
      .art {
        aspect-ratio: 4 / 3;
        border-radius: var(--radius-s);
        overflow: clip;
        display: grid;
        place-content: center;
        font-size: clamp(2rem, 18cqi, 4rem);
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
      }
      h3 {
        font-size: var(--step-0);
        line-height: 1.2;
        text-wrap: balance;
      }
      .desc {
        font-size: var(--step--1);
        color: var(--text-muted);
        text-wrap: pretty;
      }
      .row {
        display: flex;
        align-items: center;
        gap: var(--space-s);
        margin-block-start: auto;
      }
      .price {
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }
      .stock {
        font-size: var(--step--1);
        color: var(--ok);
      }
      .stock.low {
        color: var(--danger);
      }
      .row .btn {
        margin-inline-start: auto;
      }
      /* Wide card → horizontal media layout, driven by container width. */
      @container (min-width: 26rem) {
        article {
          grid-template-columns: 10rem 1fr;
        }
        .art {
          aspect-ratio: 1;
          grid-row: span 3;
        }
      }
    `,
  ]

  override render() {
    const p = this.product
    const out = p.stock === 0
    return html`
      <article style="--card-hue: ${productHue(p.sku)}">
        <a class="art" href="/products/${p.id}" aria-label="View ${p.name}">📦</a>
        <h3><a href="/products/${p.id}">${p.name}</a></h3>
        <p class="desc">${p.description}</p>
        <div class="row">
          <span class="price">${formatPrice(p.priceCents)}</span>
          <span class="stock ${p.stock < 5 ? "low" : ""}">
            ${out ? "Out of stock" : p.stock < 5 ? `Only ${p.stock} left` : "In stock"}
          </span>
          <button
            class="btn"
            ?disabled=${out}
            @click=${() =>
              this.dispatchEvent(
                new CustomEvent("add-to-cart", {
                  detail: { productId: p.id },
                  bubbles: true,
                  composed: true,
                })
              )}
          >
            Add
          </button>
        </div>
      </article>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "product-card": ProductCard
  }
}
