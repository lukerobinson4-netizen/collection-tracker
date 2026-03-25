import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Star, Package, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useItems, useCollections } from '../hooks/useData'
import { getConfig } from '../lib/collectionTypes'
import type { CollectionType } from '../lib/types'

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center gap-2 text-[#555] mb-2">{icon}<span className="text-xs uppercase tracking-wide">{label}</span></div>
      <div className="text-2xl font-semibold font-mono">{value}</div>
      {sub && <div className="text-xs text-[#555] mt-0.5">{sub}</div>}
    </div>
  )
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#666] w-24 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[#1c1c1c] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-[#555] w-6 text-right shrink-0">{value}</span>
    </div>
  )
}

export default function StatsPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const collectionId = params.get('collection')
  const { collections } = useAppStore()
  useCollections()
  const { data: items = [] } = useItems(collectionId)

  const col = collections.find(c => c.id === collectionId)
  const cfg = col ? getConfig(col.type as CollectionType) : getConfig('custom')
  const accent = col?.accent_color ?? cfg.accentColor

  const stats = useMemo(() => {
    const owned = items.filter(i => !i.wishlist)
    const wishlist = items.filter(i => i.wishlist)
    const rated = owned.filter(i => i.rating != null)
    const avgRating = rated.length ? rated.reduce((a, b) => a + b.rating!, 0) / rated.length : null
    const totalValue = owned.filter(i => i.purchase_price).reduce((a, b) => a + (b.purchase_price ?? 0), 0)
    const avgValue = totalValue && owned.filter(i => i.purchase_price).length
      ? totalValue / owned.filter(i => i.purchase_price).length : null

    // Type breakdown
    const byType: Record<string, number> = {}
    owned.forEach(i => { if (i.type) byType[i.type] = (byType[i.type] ?? 0) + 1 })

    // Status breakdown
    const byStatus: Record<string, number> = {}
    owned.forEach(i => { byStatus[i.status] = (byStatus[i.status] ?? 0) + 1 })

    // Rating distribution (0-2, 2-4, 4-6, 6-8, 8-10)
    const ratingBuckets = [0, 0, 0, 0, 0]
    rated.forEach(i => {
      const idx = Math.min(Math.floor(i.rating! / 2), 4)
      ratingBuckets[idx]++
    })

    // Top rated
    const topRated = owned.filter(i => i.rating != null).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5)

    // Market value (using avg market prices from barcode lookups)
    const withMarketPrice = owned.filter(i => i.market_price_avg != null)
    const marketValueTotal = withMarketPrice.reduce((a, b) => a + (b.market_price_avg ?? 0), 0)
    const purchaseValueForSame = withMarketPrice.filter(i => i.purchase_price != null).reduce((a, b) => a + (b.purchase_price ?? 0), 0)
    const marketVsPurchase = purchaseValueForSame > 0 ? marketValueTotal - purchaseValueForSame : null

    // Top valued by market price
    const topByMarket = [...withMarketPrice]
      .sort((a, b) => (b.market_price_avg ?? 0) - (a.market_price_avg ?? 0))
      .slice(0, 5)

    return { owned, wishlist, avgRating, totalValue, avgValue, byType, byStatus, ratingBuckets, topRated, withMarketPrice, marketValueTotal, marketVsPurchase, topByMarket }
  }, [items])

  const maxType = Math.max(...Object.values(stats.byType), 1)

  const STATUS_COLORS: Record<string, string> = {
    full: '#10b981', partial: '#f59e0b', empty: '#6b7280',
    gifted: '#8b5cf6', sold: '#ef4444', owned: '#3b82f6',
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0a]" style={{ '--accent': accent } as React.CSSProperties}>
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#1a1a1a] px-4 sm:px-6 h-14 flex items-center gap-3">
        <button onClick={() => navigate(collectionId ? `/collection/${collectionId}` : '/')}
          className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-white/10 transition-colors touch-target">
          <ArrowLeft size={18} />
        </button>
        <span className="text-xl">{cfg.icon}</span>
        <div>
          <h1 className="font-semibold text-sm">{col ? col.name : 'All Collections'} — Stats</h1>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Package size={14} />} label={cfg.itemsLabel} value={stats.owned.length} />
          <StatCard icon={<Star size={14} />} label="Avg Rating" value={stats.avgRating != null ? stats.avgRating.toFixed(1) : '—'} />
          <StatCard icon={<DollarSign size={14} />} label="Total Value" value={stats.totalValue ? `$${stats.totalValue.toFixed(0)}` : '—'} />
          <StatCard icon={<TrendingUp size={14} />} label="Wishlist" value={stats.wishlist.length} />
        </div>

        {/* Type breakdown */}
        {Object.keys(stats.byType).length > 0 && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
            <h2 className="text-xs text-[#555] uppercase tracking-wide mb-4">By {cfg.typeLabel ?? 'Type'}</h2>
            <div className="space-y-2.5">
              {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <Bar key={type} label={type} value={count} max={maxType} color={accent} />
              ))}
            </div>
          </div>
        )}

        {/* Status breakdown */}
        {Object.keys(stats.byStatus).length > 0 && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
            <h2 className="text-xs text-[#555] uppercase tracking-wide mb-4">By Status</h2>
            <div className="space-y-2.5">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <Bar key={status} label={status.charAt(0).toUpperCase() + status.slice(1)} value={count}
                  max={stats.owned.length} color={STATUS_COLORS[status] ?? '#888'} />
              ))}
            </div>
          </div>
        )}

        {/* Rating distribution */}
        {stats.topRated.length > 0 && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
            <h2 className="text-xs text-[#555] uppercase tracking-wide mb-4">Rating Distribution</h2>
            <div className="space-y-2.5">
              {['0–2', '2–4', '4–6', '6–8', '8–10'].map((label, i) => (
                <Bar key={i} label={label} value={stats.ratingBuckets[i]} max={Math.max(...stats.ratingBuckets, 1)} color={accent} />
              ))}
            </div>
          </div>
        )}

        {/* Market value */}
        {stats.withMarketPrice.length > 0 && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4 space-y-4">
            <h2 className="text-xs text-[#555] uppercase tracking-wide">Market Value</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-[#0f0f0f] rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-[#555] mb-1">
                  <TrendingUp size={13} /><span className="text-xs">Est. Market Value</span>
                </div>
                <div className="text-xl font-semibold font-mono">
                  ${stats.marketValueTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-[#444] mt-0.5">{stats.withMarketPrice.length} of {stats.owned.length} items priced</div>
              </div>
              {stats.marketVsPurchase != null && (
                <div className="bg-[#0f0f0f] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-[#555] mb-1">
                    {stats.marketVsPurchase >= 0
                      ? <TrendingUp size={13} className="text-green-400" />
                      : <TrendingDown size={13} className="text-red-400" />}
                    <span className="text-xs">vs Purchase Price</span>
                  </div>
                  <div className={`text-xl font-semibold font-mono ${stats.marketVsPurchase >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.marketVsPurchase >= 0 ? '+' : ''}{stats.marketVsPurchase.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-[#444] mt-0.5">on items with both prices</div>
                </div>
              )}
            </div>

            {/* Top by market value */}
            {stats.topByMarket.length > 0 && (
              <div>
                <h3 className="text-xs text-[#444] mb-2">Most Valuable</h3>
                <div className="space-y-2">
                  {stats.topByMarket.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="text-xs text-[#444] font-mono w-4">{i + 1}</span>
                      {item.photo_url
                        ? <img src={item.photo_url} className="w-8 h-8 rounded object-cover" alt="" />
                        : <div className="w-8 h-8 rounded bg-[#1c1c1c] flex items-center justify-center text-sm">{cfg.icon}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {item.brand && <p className="text-xs text-[#555] truncate">{item.brand}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-semibold text-[#f59e0b]">
                          {(item.market_price_avg ?? 0).toLocaleString('en-US', { style: 'currency', currency: item.market_price_currency ?? 'USD', maximumFractionDigits: 0 })}
                        </p>
                        {item.purchase_price != null && (
                          <p className="text-xs text-[#444]">
                            paid {item.purchase_price.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top rated */}
        {stats.topRated.length > 0 && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
            <h2 className="text-xs text-[#555] uppercase tracking-wide mb-4">Top Rated</h2>
            <div className="space-y-2">
              {stats.topRated.map((item, i) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="text-xs text-[#444] font-mono w-4">{i + 1}</span>
                  {item.photo_url
                    ? <img src={item.photo_url} className="w-8 h-8 rounded object-cover" alt="" />
                    : <div className="w-8 h-8 rounded bg-[#1c1c1c] flex items-center justify-center text-sm">{cfg.icon}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.brand && <p className="text-xs text-[#555] truncate">{item.brand}</p>}
                  </div>
                  <span className="font-mono text-sm font-semibold flex items-center gap-1">
                    <Star size={12} style={{ color: accent }} fill={accent} />
                    {item.rating!.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
