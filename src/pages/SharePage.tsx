import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Star, Package, ExternalLink } from 'lucide-react'
import { getSupabase } from '../lib/supabase'
import { getConfig } from '../lib/collectionTypes'
import type { Collection, Item, CollectionType } from '../lib/types'

function ReadOnlyGrid({ items, cfg, accent }: { items: Item[]; cfg: ReturnType<typeof getConfig>; accent: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {items.filter(i => !i.wishlist).map(item => (
        <div key={item.id} className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden">
          <div className="aspect-square bg-[#0f0f0f] flex items-center justify-center relative overflow-hidden">
            {item.photo_url
              ? <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
              : <div className="text-4xl opacity-30">{cfg.icon}</div>
            }
            {item.rating != null && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
                <Star size={10} style={{ color: accent }} fill={accent} />
                <span className="text-[10px] font-mono font-semibold text-white">{item.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="p-2.5">
            <p className="text-xs font-semibold leading-snug line-clamp-2">{item.name}</p>
            {item.brand && <p className="text-[10px] text-[#555] mt-0.5 truncate">{item.brand}</p>}
            {item.type && <p className="text-[10px] mt-0.5" style={{ color: accent }}>{item.type}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SharePage() {
  const { slug } = useParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [collection, setCollection] = useState<Collection | null>(null)
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    if (!slug) return
    ;(async () => {
      try {
        const sb = getSupabase()
        const { data: col, error: ce } = await sb.from('collections')
          .select('*').eq('public_slug', slug).eq('is_public', true).single()
        if (ce || !col) { setError('Collection not found or is private.'); setLoading(false); return }
        setCollection(col)

        const { data: its } = await sb.from('items').select('*')
          .eq('collection_id', col.id).order('name')
        setItems(its ?? [])
      } catch {
        setError('Failed to load collection.')
      } finally {
        setLoading(false)
      }
    })()
  }, [slug])

  if (loading) return (
    <div className="min-h-dvh bg-[#0a0a0a] flex items-center justify-center text-[#444] text-sm">Loading…</div>
  )

  if (error || !collection) return (
    <div className="min-h-dvh bg-[#0a0a0a] flex flex-col items-center justify-center gap-3 text-center px-4">
      <div className="text-4xl">🔒</div>
      <p className="text-[#555] text-sm">{error || 'Collection not found.'}</p>
    </div>
  )

  const cfg = getConfig(collection.type as CollectionType)
  const accent = collection.accent_color ?? cfg.accentColor
  const ownedItems = items.filter(i => !i.wishlist)
  const avgRating = (() => {
    const rated = ownedItems.filter(i => i.rating != null)
    if (!rated.length) return null
    return rated.reduce((a, b) => a + b.rating!, 0) / rated.length
  })()

  return (
    <div className="min-h-dvh bg-[#0a0a0a]" style={{ '--accent': accent } as React.CSSProperties}>
      {/* Header */}
      <div className="border-b border-[#1a1a1a]" style={{ background: `linear-gradient(to bottom, ${accent}18, transparent)` }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start gap-4">
            <span className="text-5xl">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl sm:text-4xl tracking-widest mb-1">{collection.name}</h1>
              <p className="text-[#555] text-sm mb-3">{cfg.label}</p>
              {collection.description && <p className="text-[#888] text-sm">{collection.description}</p>}
              <div className="flex items-center gap-5 mt-3 text-xs text-[#555]">
                <span className="flex items-center gap-1.5" style={{ color: accent }}>
                  <Package size={12} /> {ownedItems.length} {cfg.itemsLabel}
                </span>
                {avgRating != null && (
                  <span className="flex items-center gap-1.5">
                    <Star size={12} style={{ color: accent }} /> {avgRating.toFixed(1)} avg rating
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {ownedItems.length === 0 ? (
          <div className="text-center py-16 text-[#444]">
            <div className="text-4xl mb-3">{cfg.icon}</div>
            <p className="text-sm">No items in this collection yet.</p>
          </div>
        ) : (
          <ReadOnlyGrid items={ownedItems} cfg={cfg} accent={accent} />
        )}
      </main>

      {/* Footer badge */}
      <div className="text-center py-6 border-t border-[#1a1a1a]">
        <a href="/" className="inline-flex items-center gap-1.5 text-xs text-[#444] hover:text-[#666] transition-colors">
          <ExternalLink size={11} /> Powered by Collection Tracker
        </a>
      </div>
    </div>
  )
}
