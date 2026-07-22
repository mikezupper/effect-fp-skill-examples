import type { TemplateResult } from "lit"
import { html } from "lit"
import { api } from "./services/api.js"
import type { CategoryTree, ProductDto } from "./services/types.js"

export interface PageMeta {
  readonly title: string
  readonly description: string
}

export type Params = Record<string, string | undefined>

export interface Route<T = unknown> {
  readonly path: string
  readonly mode: "ssr" | "csr"
  readonly load?: (params: Params, url: URL) => Promise<T>
  readonly template: (data: T) => TemplateResult
  readonly meta: (data: T) => PageMeta
  readonly enter?: () => Promise<unknown>
}

export interface CatalogData {
  readonly categories: ReadonlyArray<CategoryTree>
  readonly products: ReadonlyArray<ProductDto>
  readonly search: string
  readonly category: string
}

const catalog: Route<CatalogData> = {
  path: "/",
  mode: "ssr", // public + SEO-relevant → server-rendered (skill decision table)
  enter: () => import("./pages/home-page.js"),
  load: async (_params, url) => {
    const search = url.searchParams.get("search") ?? ""
    const category = url.searchParams.get("category") ?? ""
    // ALL async work happens here — components never fetch during SSR.
    const [categories, products] = await Promise.all([
      api.categories(),
      api.products({ search, category }),
    ])
    return { categories, products, search, category }
  },
  template: (data) => html`<home-page .data=${data}></home-page>`,
  meta: (data) => ({
    title: data.search
      ? `“${data.search}” — Railway Supply Co.`
      : "Railway Supply Co. — Field-tested gear for the two-track life",
    description: "Laptops, audio and books. Errors handled, stock guaranteed atomically.",
  }),
}

const product: Route<ProductDto> = {
  path: "/products/:id",
  mode: "ssr",
  enter: () => import("./pages/product-page.js"),
  load: (params) => api.product(params["id"] ?? ""),
  template: (p) => html`<product-page .product=${p}></product-page>`,
  meta: (p) => ({ title: `${p.name} — Railway Supply Co.`, description: p.description }),
}

const orders: Route<null> = {
  path: "/orders",
  mode: "csr", // behind auth, no SEO value → client-rendered
  enter: () => import("./pages/orders-page.js"),
  template: () => html`<orders-page></orders-page>`,
  meta: () => ({ title: "Order history — Railway Supply Co.", description: "" }),
}

export type AnyRoute = Route<CatalogData> | Route<ProductDto> | Route<null>

export const routes: ReadonlyArray<AnyRoute> = [catalog, product, orders]

export function matchRoute(url: URL): { route: AnyRoute; params: Params } | null {
  for (const route of routes) {
    const m = new URLPattern({ pathname: route.path }).exec(url)
    if (m) return { route, params: m.pathname.groups as Params }
  }
  return null
}
