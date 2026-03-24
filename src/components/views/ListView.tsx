import { useState } from 'react'
import { Plus, ChevronUp, ChevronDown, Star, Bookmark } from 'lucide-react'
import clsx from 'clsx'
import type { Item } from '../../lib/types'
import type { CollectionTypeConfig } from '../../lib/collectionTypes'

type SortKey = 'name' | 'brand' | 'type' | 'year' | 'rating' | 'status' | 'created_at'

interface Props {
  items: Item[]
  cfg: CollectionTypeConfig
  onItemClick: (item: Item) => void
  onAddItem: () => void
  accent: string
  showWishlist?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  full: '#10b981', partial: '#f59e0b', empty: '#6b7280',
  gifted: '#8b5cf6', sold: '#ef4444', owned: '#3b82f6',
}

export default function ListView({ items, cfg, onItemClick, onAddItem, accent, showWishlist }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const displayed = (showWishlist ? items.filter(i => i.wishlist) : items.filter(i => !i.wishlist))
    .slice().sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })

  const setSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : null

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="text-left px-3 py-2 text-xs text-[#555] uppercase tracking-wide cursor-pointer hover:text-[#888] transition-colors select-none whitespace-nowrap"
      onClick={() => setSort(k)}>
      <span className="flex items-center gap-1">{label}<SortIcon k={k} /></span>
    </th>
  )

  if (displayed.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-16">
          <div className="text-5xl mb-3">{cfg.icon}</div>
          <p className="text-[#555] text-sm mb-4">
            {showWishlist ? 'No wishlist items.' : `No ${cfg.itemsLabel.toLowerCase()} yet.`}
          </p>
          {!showWishlist && (
            <button onClick={onAddItem}
              className="px-4 py-2 rounded-xl border border-[#2a2a2a] text-sm text-[#666] hover:text-white hover:border-[#444] transition-all">
              <Plus size={14} className="inline mr-1" /> Add {cfg.itemLabel}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[#1e1e1e]">
            <th className="w-8 px-2" />
            <Th k="name" label="Name" />
            {cfg.fields.brand && <Th k="brand" label={cfg.brandLabel ?? 'Brand'} />}
            <Th k="type" label={cfg.typeLabel ?? 'Type'} />
            {cfg.fields.year && <Th k="year" label={cfg.yearLabel ?? 'Year'} />}
            <Th k="rating" label="Rating" />
            <Th k="status" label="Status" />
          </tr>
        </thead>
        <tbody>
          {displayed.map(item => (
            <tr key={item.id} onClick={() => onItemClick(item)}
              className="border-b border-[#111] hover:bg-white/[0.02] cursor-pointer transition-colors group">
              <td className="px-2 py-2.5">
                {item.photo_url
                  ? <img src={item.photo_url} alt="" className="w-7 h-7 rounded object-cover" />
                  : <div className="w-7 h-7 rounded bg-[#1c1c1c] flex items-center justify-center text-xs">{cfg.icon}</div>
                }
              </td>
              <td className="px-3 py-2.5 font-medium">
                <span className="flex items-center gap-1.5">
                  {item.wishlist && <Bookmark size={11} style={{ color: accent }} />}
                  {item.name}
                </span>
              </td>
              {cfg.fields.brand && <td className="px-3 py-2.5 text-[#666] text-xs">{item.brand ?? '—'}</td>}
              <td className="px-3 py-2.5 text-xs" style={{ color: item.type ? accent : '#444' }}>{item.type ?? '—'}</td>
              {cfg.fields.year && <td className="px-3 py-2.5 text-[#666] text-xs font-mono">{item.year ?? '—'}</td>}
              <td className="px-3 py-2.5">
                {item.rating != null
                  ? <span className="flex items-center gap-1 text-xs font-mono">
                      <Star size={10} style={{ color: accent }} fill={accent} />
                      {item.rating.toFixed(1)}
                    </span>
                  : <span className="text-[#444] text-xs">—</span>
                }
              </td>
              <td className="px-3 py-2.5">
                <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full')}
                  style={{ background: `${STATUS_COLORS[item.status] ?? '#666'}22`, color: STATUS_COLORS[item.status] ?? '#666' }}>
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!showWishlist && (
        <button onClick={onAddItem}
          className="mt-4 w-full py-3 border border-dashed border-[#222] rounded-xl text-[#444] hover:border-[#333] hover:text-[#666] transition-all flex items-center justify-center gap-2 text-sm">
          <Plus size={14} /> Add {cfg.itemLabel}
        </button>
      )}
    </div>
  )
}
