import { css, html, LitElement } from "lit"
import { customElement, property } from "lit/decorators.js"
import { repeat } from "lit/directives/repeat.js"
import { seedData } from "../router.js"
import type { CatalogData } from "../routes.js"
import type { CategoryTree } from "../services/types.js"
import { shared } from "../styles/shared.js"
import "../components/product-card.js"

const empty: CatalogData = { categories: [], products: [], search: "", category: "" }

@customElement("home-page")
export class HomePage extends LitElement {
  // Server sets this via template binding; on the client the binding from the
  // server-only document is never re-applied, so we self-seed from __DATA__.
  @property({ attribute: false }) data: CatalogData = (seedData() as CatalogData) ?? empty

  static styles = [
    shared,
    css`
      :host {
        display: grid;
        gap: calc(var(--space) * 1.5);
      }
      .hero h1 {
        font-size: var(--step-3);
        letter-spacing: -0.02em;
        text-wrap: balance;
        /* Gradient headline (modern-css craft). */
        background: linear-gradient(
          100deg in oklch,
          var(--text),
          oklch(from var(--brand) calc(l - 0.05) c h) 85%
        );
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .hero p {
        color: var(--text-muted);
        max-inline-size: 55ch;
        text-wrap: pretty;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-s);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        min-block-size: 44px;
        padding-inline: 1em;
        border: 1px solid var(--border);
        border-radius: 999px;
        font-size: var(--step--1);
        font-weight: 600;
      }
      .chip:hover {
        background: var(--brand-subtle);
      }
      .chip[aria-current="true"] {
        background: var(--brand);
        border-color: var(--brand);
        color: var(--on-brand);
      }
      .chip .sub {
        color: inherit;
        opacity: 0.65;
        margin-inline-start: 0.5ch;
        font-weight: 400;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(17rem, 100%), 1fr));
        gap: var(--space);
      }
      .none {
        text-align: center;
        color: var(--text-muted);
        padding-block: calc(var(--space) * 2);
      }
      .result-line {
        color: var(--text-muted);
        font-size: var(--step--1);
      }
    `,
  ]

  override render() {
    const { categories, products, search, category } = this.data
    return html`
      ${search === "" && category === ""
        ? html`<section class="hero">
            <h1>Field-tested gear for the two-track life.</h1>
            <p>
              Every order rides the happy path — and when it can't, you get a typed error and
              your stock back. Guaranteed atomically.
            </p>
          </section>`
        : html`<p class="result-line">
            ${products.length} result${products.length === 1 ? "" : "s"}
            ${search ? html` for “${search}”` : ""}${category ? html` in ${category}` : ""}
            — <a href="/"><u>clear</u></a>
          </p>`}

      <nav class="chips" aria-label="Categories">
        <a class="chip" href="/" aria-current=${category === ""}>All</a>
        ${this.#flatten(categories).map(
          (c) => html`
            <a class="chip" href="/?category=${c.node.slug}" aria-current=${category === c.node.slug}>
              ${"· ".repeat(c.depth)}${c.node.name}
            </a>
          `
        )}
      </nav>

      ${products.length === 0
        ? html`<p class="none">Nothing in the depot matches. Try another track.</p>`
        : html`
            <div class="grid">
              ${repeat(
                products,
                (p) => p.id,
                (p) => html`<product-card .product=${p}></product-card>`
              )}
            </div>
          `}
    `
  }

  #flatten(
    nodes: ReadonlyArray<CategoryTree>,
    depth = 0
  ): Array<{ node: CategoryTree; depth: number }> {
    return nodes.flatMap((node) => [
      { node, depth },
      ...this.#flatten(node.children, depth + 1),
    ])
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-page": HomePage
  }
}
