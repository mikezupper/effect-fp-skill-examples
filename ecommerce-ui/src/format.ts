// Pure formatting helpers — unit-tested in node.

export const formatPrice = (cents: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  )

export const productHue = (sku: string): number =>
  [...sku].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7)
