/**
 * Multi-source product lookup by barcode.
 * Sources: UPC Item DB · Google Books · Discogs · Open Food Facts
 */

export interface PriceData {
  low: number | null
  avg: number | null
  high: number | null
  currency: string
  source: string
  updated: string
}

export interface LookupResult {
  barcode: string
  name?: string
  brand?: string
  type?: string
  description?: string
  imageUrl?: string
  prices?: PriceData
}

const UA = 'CollectionTracker/1.0 (https://collection-tracker-app.netlify.app)'

function completenessScore(r: LookupResult): number {
  return (r.name ? 2 : 0) + (r.imageUrl ? 1 : 0) + (r.prices ? 3 : 0) + (r.brand ? 0.5 : 0)
}

// ─── UPC Item DB ──────────────────────────────────────────────────────────────
// Good for: general retail products (food, electronics, household, etc.)
// Free trial: 100 req/day, CORS-enabled
async function tryUpcItemDb(barcode: string): Promise<LookupResult | null> {
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`)
    if (!res.ok) return null
    const data = await res.json()
    const item = data.items?.[0]
    if (!item?.title) return null

    const offerPrices: number[] = (item.offers ?? [])
      .map((o: { price?: number }) => o.price)
      .filter((p: unknown): p is number => typeof p === 'number' && p > 0)

    const low: number | null = item.lowest_recorded_price ?? (offerPrices.length ? Math.min(...offerPrices) : null)
    const high: number | null = item.highest_recorded_price ?? (offerPrices.length ? Math.max(...offerPrices) : null)
    const avg: number | null = offerPrices.length
      ? offerPrices.reduce((a, b) => a + b, 0) / offerPrices.length
      : low != null && high != null ? (low + high) / 2 : null

    return {
      barcode,
      name: (item.title as string) || '',
      brand: (item.brand as string) || '',
      type: (item.category as string) || '',
      description: (item.description as string | undefined)?.slice(0, 300) ?? '',
      imageUrl: (item.images as string[] | undefined)?.[0] ?? null,
      prices: low != null || avg != null || high != null ? {
        low, avg, high,
        currency: (item.currency as string) || 'USD',
        source: 'UPC Item DB',
        updated: new Date().toISOString(),
      } : undefined,
    }
  } catch { return null }
}

// ─── Google Books ─────────────────────────────────────────────────────────────
// Good for: ISBN-10/13 — books, graphic novels, comics
async function tryGoogleBooks(barcode: string): Promise<LookupResult | null> {
  if (barcode.length !== 10 && barcode.length !== 13) return null
  if (barcode.length === 13 && !barcode.startsWith('97')) return null
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${barcode}&maxResults=1`
    )
    if (!res.ok) return null
    const data = await res.json()
    const vol = data.items?.[0]
    if (!vol) return null
    const vi = vol.volumeInfo ?? {}
    const si = vol.saleInfo ?? {}

    const thumbnail: string | null = vi.imageLinks?.thumbnail
      ? (vi.imageLinks.thumbnail as string)
          .replace('http:', 'https:')
          .replace('&edge=curl', '')
          .replace('zoom=1', 'zoom=2')
      : null

    const retailPrice: number | null = si?.retailPrice?.amount ?? null

    return {
      barcode,
      name: (vi.title as string) ?? '',
      brand: (vi.authors as string[] | undefined)?.[0] ?? '',
      type: 'Book',
      description: (vi.description as string | undefined)?.slice(0, 300) ?? '',
      imageUrl: thumbnail,
      prices: retailPrice != null ? {
        low: null,
        avg: retailPrice,
        high: null,
        currency: (si.retailPrice?.currencyCode as string) ?? 'USD',
        source: 'Google Books',
        updated: new Date().toISOString(),
      } : undefined,
    }
  } catch { return null }
}

// ─── Discogs ──────────────────────────────────────────────────────────────────
// Good for: vinyl records, CDs, music releases
async function tryDiscogs(barcode: string): Promise<LookupResult | null> {
  try {
    const searchRes = await fetch(
      `https://api.discogs.com/database/search?barcode=${barcode}&type=release&per_page=1`,
      { headers: { 'User-Agent': UA } }
    )
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const release = searchData.results?.[0]
    if (!release?.id) return null

    let prices: PriceData | undefined
    try {
      // price_suggestions returns per-condition prices (G → NM)
      const statsRes = await fetch(
        `https://api.discogs.com/marketplace/price_suggestions/${release.id as number}`,
        { headers: { 'User-Agent': UA } }
      )
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        const vals: number[] = Object.values(statsData)
          .map((v: unknown) => (v as { value?: number }).value)
          .filter((v): v is number => typeof v === 'number' && v > 0)
        if (vals.length) {
          prices = {
            low: Math.min(...vals),
            avg: vals.reduce((a, b) => a + b, 0) / vals.length,
            high: Math.max(...vals),
            currency: 'USD',
            source: 'Discogs',
            updated: new Date().toISOString(),
          }
        }
      }
    } catch { /* price lookup failed — still return metadata */ }

    return {
      barcode,
      name: (release.title as string) ?? '',
      brand: '',
      type: (release.format as string[] | undefined)?.join(', ') ?? 'Vinyl',
      imageUrl: (release.cover_image as string) || (release.thumb as string) || null,
      prices,
    }
  } catch { return null }
}

// ─── Open Food Facts ──────────────────────────────────────────────────────────
// Good for: food & beverage EAN/UPC — whiskey, wine, beer barcodes
async function tryOpenFoodFacts(barcode: string): Promise<LookupResult | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    return {
      barcode,
      name: (p.product_name as string) || (p.product_name_en as string) || '',
      brand: (p.brands as string) || '',
      type: (p.categories_tags as string[] | undefined)?.[0]?.replace('en:', '').replace(/-/g, ' ') ?? '',
      imageUrl: (p.image_url as string) || (p.image_front_url as string) || null,
    }
  } catch { return null }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  const settled = await Promise.allSettled([
    tryUpcItemDb(barcode),
    tryGoogleBooks(barcode),
    tryDiscogs(barcode),
    tryOpenFoodFacts(barcode),
  ])

  const results = settled
    .map(r => (r.status === 'fulfilled' ? r.value : null))
    .filter((r): r is LookupResult => r != null && !!(r.name || r.brand))
    .sort((a, b) => completenessScore(b) - completenessScore(a))

  if (results.length === 0) return { barcode }

  // Merge: highest-scoring result as base, fill gaps from others
  const merged: LookupResult = { ...results[0] }
  for (const r of results.slice(1)) {
    if (!merged.name && r.name) merged.name = r.name
    if (!merged.brand && r.brand) merged.brand = r.brand
    if (!merged.type && r.type) merged.type = r.type
    if (!merged.description && r.description) merged.description = r.description
    if (!merged.imageUrl && r.imageUrl) merged.imageUrl = r.imageUrl
    if (!merged.prices && r.prices) merged.prices = r.prices
  }

  return merged
}
