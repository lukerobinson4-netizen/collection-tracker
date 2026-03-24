import { useState } from 'react'
import { Plus, Settings } from 'lucide-react'
import clsx from 'clsx'
import type { Room, Shelf, Item } from '../../lib/types'
import type { CollectionTypeConfig } from '../../lib/collectionTypes'

interface Props {
  rooms: Room[]
  shelves: Shelf[]
  items: Item[]
  cfg: CollectionTypeConfig
  onItemClick: (item: Item) => void
  onSlotClick: (shelfId: string, row: number, col: number) => void
  onAddRoom: () => void
  onEditRoom: (room: Room) => void
  onAddShelf: (roomId: string) => void
  onEditShelf: (shelf: Shelf) => void
  accent: string
}

function ShelfGrid({ shelf, items, onItemClick, onSlotClick, accent }: {
  shelf: Shelf
  items: Item[]
  onItemClick: (i: Item) => void
  onSlotClick: (shelfId: string, row: number, col: number) => void
  accent: string
}) {
  const slotMap = new Map<string, Item>()
  items.forEach(item => {
    if (item.shelf_id === shelf.id && item.shelf_row != null && item.shelf_col != null) {
      slotMap.set(`${item.shelf_row},${item.shelf_col}`, item)
    }
  })

  return (
    <div className="rounded-xl overflow-hidden border border-[#2a2a2a]">
      <div className="px-3 pt-3 pb-0 flex flex-col gap-1.5 bg-[#0f0f0f]">
        {Array.from({ length: shelf.slots_tall }).map((_, row) => (
          <div key={row} className="flex gap-1.5 items-end">
            {Array.from({ length: shelf.slots_wide }).map((_, col) => {
              const item = slotMap.get(`${row},${col}`)
              return (
                <div
                  key={col}
                  onClick={() => item ? onItemClick(item) : onSlotClick(shelf.id, row, col)}
                  title={item?.name}
                  className={clsx(
                    'flex-1 relative rounded-sm cursor-pointer transition-all group',
                    'min-w-0 h-14 flex flex-col items-center justify-end pb-1',
                    item
                      ? 'hover:brightness-110'
                      : 'bg-[#1a1a1a] hover:bg-[#222] border border-dashed border-[#2a2a2a] hover:border-[#3a3a3a]'
                  )}
                  style={item ? { background: `linear-gradient(to bottom, ${accent}22, ${accent}44)`, borderBottom: `2px solid ${accent}` } : {}}
                >
                  {item ? (
                    item.photo_url
                      ? <img src={item.photo_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover rounded-sm" />
                      : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center px-1">
                          <span className="text-[10px] text-center font-medium leading-tight line-clamp-2 text-white/80">{item.name}</span>
                          {item.rating != null && (
                            <span className="text-[9px] mt-0.5 font-mono" style={{ color: accent }}>{item.rating.toFixed(1)}</span>
                          )}
                        </div>
                      )
                  ) : (
                    <Plus size={12} className="text-[#444] group-hover:text-[#666] transition-colors" />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {/* Wood ledge */}
      <div className="shelf-wood h-3 mx-2 mb-2 rounded" />
    </div>
  )
}

export default function ShelfView({ rooms, shelves, items, cfg, onItemClick, onSlotClick, onAddRoom, onEditRoom, onAddShelf, onEditShelf, accent }: Props) {
  const [activeRoom, setActiveRoom] = useState<string | null>(rooms[0]?.id ?? null)
  const room = rooms.find(r => r.id === activeRoom)
  const roomShelves = shelves.filter(s => {
    // shelves have room_id - need to match
    return (s as Shelf & { room_id?: string }).room_id === activeRoom
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Room tabs */}
      <div className="flex items-center gap-1 px-4 sm:px-6 py-3 border-b border-[#1a1a1a] overflow-x-auto">
        {rooms.map(r => (
          <div key={r.id} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setActiveRoom(r.id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm transition-all whitespace-nowrap',
                activeRoom === r.id ? 'bg-white/10 text-white' : 'text-[#666] hover:text-[#aaa]'
              )}
            >
              {r.name}
            </button>
            <button onClick={() => onEditRoom(r)} className="p-1 rounded text-[#444] hover:text-[#777] transition-colors">
              <Settings size={12} />
            </button>
          </div>
        ))}
        <button onClick={onAddRoom}
          className="px-3 py-1.5 rounded-lg text-sm text-[#444] hover:text-[#777] border border-dashed border-[#2a2a2a] hover:border-[#3a3a3a] transition-all shrink-0 flex items-center gap-1">
          <Plus size={12} /> Room
        </button>
      </div>

      {/* Shelves */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
        {room && roomShelves.length === 0 && (
          <div className="text-center py-10 text-[#444]">
            <p className="mb-3 text-sm">No shelves in {room.name} yet.</p>
          </div>
        )}
        {roomShelves.map(shelf => (
          <div key={shelf.id}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#888]">{shelf.name}</span>
              <div className="flex items-center gap-2 text-xs text-[#555]">
                <span>{items.filter(i => i.shelf_id === shelf.id).length}/{shelf.slots_wide * shelf.slots_tall} slots</span>
                <button onClick={() => onEditShelf(shelf)} className="p-1 rounded hover:text-[#777] transition-colors">
                  <Settings size={12} />
                </button>
              </div>
            </div>
            <ShelfGrid shelf={shelf} items={items} onItemClick={onItemClick} onSlotClick={onSlotClick} accent={accent} />
          </div>
        ))}

        {room && (
          <button onClick={() => onAddShelf(room.id)}
            className="w-full py-4 border-2 border-dashed border-[#222] rounded-xl text-[#444] hover:border-[#333] hover:text-[#666] transition-all flex items-center justify-center gap-2 text-sm">
            <Plus size={16} /> Add Shelf to {room.name}
          </button>
        )}

        {!room && rooms.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🏠</div>
            <p className="text-[#555] text-sm mb-4">No rooms yet. Create one to start adding shelves.</p>
            <button onClick={onAddRoom}
              className="px-4 py-2 rounded-xl border border-[#2a2a2a] text-sm text-[#666] hover:text-white hover:border-[#444] transition-all">
              <Plus size={14} className="inline mr-1" /> Add First Room
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
