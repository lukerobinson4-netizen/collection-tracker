import { Plus, Star, Bookmark } from 'lucide-react'
import clsx from 'clsx'
import type { Item } from '../../lib/types'
import type { CollectionTypeConfig } from '../../lib/collectionTypes'

interface Props {
  items: Item[]
  cfg: CollectionTypeConfig
  onItemClick: (item: Item) => void
  onAddItem: () => void
  accent: string
  showWishlist?: boolean
}

function ItemCard({ item, cfg, onItemClick, accent }: { item: Item; cfg: CollectionTypeConfig; onItemClick: (i: Item) => void; accent: string }) {
  return (
    <div
      onClick={() => onItemClick(item)}
      className={clsx(
        'group relative bg-[#141414] border border-[#222] rounded-xl overflow-hidden cursor-pointer',
        'hover:border-[#3a3a3a] hover:shadow-lg transition-all active:scale-[0.98]',
        item.wishlist && 'opacity-75 border-dashed'
      )}
    >
      {/* Photo or placeholder */}
      <div className="aspect-square bg-[#0f0f0f] flex items-center justify-center relative overflow-hidden">
        {item.photo_url ? (
          <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="text-4xl opacity-30">{cfg.icon}</div>
        )}
        {item.wishlist && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1">
            <Bookmark size={12} style={{ color: accent }} />
          </div>
        )}
        {item.rating != null && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
            <Star size={10} style={{ color: accent }} fill={accent} />
            <span className="text-[10px] font-mono font-semibold text-white">{item.rating.toFixed(1)}</span>
          </div>
        )}
        {item.status === 'empty' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-[10px] text-white/60 uppercase tracking-wider">Empty</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-semibold leading-snug line-clamp-2">{item.name}</p>
        {item.brand && <p className="text-[10px] text-[#555] mt-0.5 truncate">{item.brand}</p>}
        {item.type && <p className="text-[10px] mt-0.5" style={{ color: accent }}>{item.type}</p>}
      </div>
    </div>
  )
}

export default function GridView({ items, cfg, onItemClick, onAddItem, accent, showWishlist }: Props) {
  const displayed = showWishlist ? items.filter(i => i.wishlist) : items.filter(i => !i.wishlist)

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
      {displayed.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">{cfg.icon}</div>
          <p className="text-[#555] text-sm mb-4">
            {showWishlist ? 'No wishlist items yet.' : `No ${cfg.itemsLabel.toLowerCase()} yet.`}
          </p>
          {!showWishlist && (
            <button onClick={onAddItem}
              className="px-4 py-2 rounded-xl border border-[#2a2a2a] text-sm text-[#666] hover:text-white hover:border-[#444] transition-all">
              <Plus size={14} className="inline mr-1" /> Add {cfg.itemLabel}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {displayed.map(item => (
            <ItemCard key={item.id} item={item} cfg={cfg} onItemClick={onItemClick} accent={accent} />
          ))}
          {!showWishlist && (
            <button onClick={onAddItem}
              className="aspect-square bg-[#141414] border-2 border-dashed border-[#222] rounded-xl flex flex-col items-center justify-center gap-2 text-[#444] hover:border-[#333] hover:text-[#666] transition-all">
              <Plus size={20} />
              <span className="text-xs">Add</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
