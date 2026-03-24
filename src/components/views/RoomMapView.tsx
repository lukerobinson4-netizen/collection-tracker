import { useState, useRef, useCallback } from 'react'
import { Plus, Settings, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import clsx from 'clsx'
import type { Room, Shelf, Item } from '../../lib/types'
import type { CollectionTypeConfig } from '../../lib/collectionTypes'
import { getSupabase } from '../../lib/supabase'
import { useAppStore } from '../../stores/appStore'

const CELL = 24         // grid cell size px
const SHELF_W = 6       // default shelf width in cells
const SHELF_H_PER_ROW = 1.5 // cells per shelf row

interface ShelfPos { x: number; y: number }

interface Props {
  rooms: Room[]
  shelves: Shelf[]
  items: Item[]
  cfg: CollectionTypeConfig
  onItemClick: (item: Item) => void
  onAddRoom: () => void
  onEditRoom: (room: Room) => void
  onAddShelf: (roomId: string) => void
  onEditShelf: (shelf: Shelf) => void
  accent: string
  collectionId: string
}

// Persist shelf position to Supabase (position_x / position_y on shelf — added via migration)
async function saveShelfPosition(shelfId: string, x: number, y: number) {
  const sb = getSupabase()
  await sb.from('shelves').update({ position_x: x, position_y: y }).eq('id', shelfId)
}

// ─── Draggable shelf card ─────────────────────────────────────────────────────
function ShelfCard({ shelf, items, accent, cfg, onEdit, onItemClick, pos, onPosChange }: {
  shelf: Shelf & { position_x?: number; position_y?: number }
  items: Item[]
  accent: string
  cfg: CollectionTypeConfig
  onEdit: () => void
  onItemClick: (i: Item) => void
  pos: ShelfPos
  onPosChange: (p: ShelfPos) => void
}) {
  const shelfItems = items.filter(i => i.shelf_id === shelf.id)
  const filled = shelfItems.length
  const total = shelf.slots_wide * shelf.slots_tall
  const pct = total > 0 ? filled / total : 0
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const cardWidth = Math.max(shelf.slots_wide, 4) * CELL
  const cardHeight = Math.ceil(shelf.slots_tall * SHELF_H_PER_ROW) * CELL + 36

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y }
    setDragging(true)

    const onMove = (me: MouseEvent) => {
      if (!dragStart.current) return
      const dx = me.clientX - dragStart.current.mx
      const dy = me.clientY - dragStart.current.my
      const newX = Math.max(0, Math.round((dragStart.current.ox + dx) / CELL) * CELL)
      const newY = Math.max(0, Math.round((dragStart.current.oy + dy) / CELL) * CELL)
      onPosChange({ x: newX, y: newY })
    }
    const onUp = () => {
      if (!dragStart.current) return
      setDragging(false)
      dragStart.current = null
      // Persist to DB
      saveShelfPosition(shelf.id, pos.x / CELL, pos.y / CELL)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Touch drag
  const onTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    const t = e.touches[0]
    dragStart.current = { mx: t.clientX, my: t.clientY, ox: pos.x, oy: pos.y }
    setDragging(true)

    const onMove = (te: TouchEvent) => {
      if (!dragStart.current) return
      const touch = te.touches[0]
      const dx = touch.clientX - dragStart.current.mx
      const dy = touch.clientY - dragStart.current.my
      const newX = Math.max(0, Math.round((dragStart.current.ox + dx) / CELL) * CELL)
      const newY = Math.max(0, Math.round((dragStart.current.oy + dy) / CELL) * CELL)
      onPosChange({ x: newX, y: newY })
    }
    const onEnd = () => {
      setDragging(false)
      dragStart.current = null
      saveShelfPosition(shelf.id, pos.x / CELL, pos.y / CELL)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
  }

  return (
    <div
      className={clsx(
        'absolute select-none rounded-xl border overflow-hidden transition-shadow',
        dragging ? 'shadow-2xl shadow-black/50 z-20 scale-105 border-[var(--accent)]' : 'border-[#2a2a2a] z-10 hover:border-[#3a3a3a] cursor-grab'
      )}
      style={{ left: pos.x, top: pos.y, width: cardWidth, '--accent': accent } as React.CSSProperties}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-[#1a1a1a] border-b border-[#222]">
        <span className="text-xs font-medium truncate flex-1">{shelf.name}</span>
        <button onClick={onEdit} className="p-0.5 rounded text-[#555] hover:text-white transition-colors ml-1">
          <Settings size={11} />
        </button>
      </div>

      {/* Shelf graphic */}
      <div className="bg-[#0f0f0f] px-2 pt-2 pb-0">
        {Array.from({ length: shelf.slots_tall }).map((_, row) => (
          <div key={row} className="flex gap-0.5 mb-0.5">
            {Array.from({ length: shelf.slots_wide }).map((_, col) => {
              const item = items.find(i => i.shelf_id === shelf.id && i.shelf_row === row && i.shelf_col === col)
              return (
                <div key={col}
                  onClick={() => item && onItemClick(item)}
                  className={clsx(
                    'flex-1 h-8 rounded-sm transition-all',
                    item ? 'cursor-pointer hover:brightness-110' : 'bg-[#1a1a1a] border border-dashed border-[#2a2a2a]'
                  )}
                  style={item ? { background: `linear-gradient(to bottom, ${accent}33, ${accent}55)` } : {}}
                >
                  {item?.photo_url && (
                    <img src={item.photo_url} alt="" className="w-full h-full object-cover rounded-sm pointer-events-none" />
                  )}
                </div>
              )
            })}
          </div>
        ))}
        <div className="shelf-wood h-2 mx-1 mb-1.5 rounded" />
      </div>

      {/* Footer fill bar */}
      <div className="px-2 pb-2 bg-[#0f0f0f]">
        <div className="h-1 bg-[#1c1c1c] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: accent }} />
        </div>
        <p className="text-[9px] text-[#444] mt-1 text-right font-mono">{filled}/{total}</p>
      </div>
    </div>
  )
}

// ─── Main RoomMapView ─────────────────────────────────────────────────────────
export default function RoomMapView({ rooms, shelves, items, cfg, onItemClick, onAddRoom, onEditRoom, onAddShelf, onEditShelf, accent, collectionId }: Props) {
  const [activeRoom, setActiveRoom] = useState<string | null>(rooms[0]?.id ?? null)
  const [zoom, setZoom] = useState(1)
  const { setShelves } = useAppStore()

  // Local position state (initialised from DB position_x/y)
  const [positions, setPositions] = useState<Record<string, ShelfPos>>(() => {
    const init: Record<string, ShelfPos> = {}
    shelves.forEach((s, i) => {
      const sx = (s as Shelf & { position_x?: number }).position_x
      const sy = (s as Shelf & { position_y?: number }).position_y
      init[s.id] = {
        x: sx != null ? sx * CELL : (i % 3) * (CELL * 10),
        y: sy != null ? sy * CELL : Math.floor(i / 3) * (CELL * 9),
      }
    })
    return init
  })

  const room = rooms.find(r => r.id === activeRoom)
  const roomShelves = shelves.filter(s => (s as Shelf & { room_id?: string }).room_id === activeRoom)

  const updatePos = useCallback((shelfId: string, p: ShelfPos) => {
    setPositions(prev => ({ ...prev, [shelfId]: p }))
  }, [])

  const canvasSize = { w: CELL * 40, h: CELL * 30 }

  if (rooms.length === 0) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">🏠</div>
        <p className="text-[#555] text-sm mb-4">No rooms yet. Create one to get started.</p>
        <button onClick={onAddRoom} className="px-4 py-2 rounded-xl border border-[#2a2a2a] text-sm text-[#666] hover:text-white hover:border-[#444] transition-all">
          <Plus size={14} className="inline mr-1" /> Add Room
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Room tabs + controls */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-1 overflow-x-auto">
          {rooms.map(r => (
            <div key={r.id} className="flex items-center gap-1 shrink-0">
              <button onClick={() => setActiveRoom(r.id)}
                className={clsx('px-3 py-1.5 rounded-lg text-sm transition-all whitespace-nowrap',
                  activeRoom === r.id ? 'bg-white/10 text-white' : 'text-[#666] hover:text-[#aaa]')}>
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

        <div className="flex items-center gap-1 ml-2 shrink-0">
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))}
            className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-white/10 transition-colors">
            <ZoomIn size={15} />
          </button>
          <span className="text-xs text-[#555] font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))}
            className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-white/10 transition-colors">
            <ZoomOut size={15} />
          </button>
          <button onClick={() => setZoom(1)}
            className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-white/10 transition-colors">
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-[#0a0a0a]">
        <div
          className="relative origin-top-left transition-transform"
          style={{
            transform: `scale(${zoom})`,
            width: canvasSize.w,
            height: canvasSize.h,
            backgroundImage: `radial-gradient(circle, #1e1e1e 1px, transparent 1px)`,
            backgroundSize: `${CELL}px ${CELL}px`,
          }}
        >
          {/* Room label */}
          {room && (
            <div className="absolute top-3 left-3 text-xs font-medium text-[#333] uppercase tracking-widest pointer-events-none">
              {room.name}
            </div>
          )}

          {/* Shelf cards */}
          {roomShelves.map(shelf => (
            <ShelfCard
              key={shelf.id}
              shelf={shelf as Shelf & { position_x?: number; position_y?: number }}
              items={items}
              accent={accent}
              cfg={cfg}
              onEdit={() => onEditShelf(shelf)}
              onItemClick={onItemClick}
              pos={positions[shelf.id] ?? { x: 0, y: 0 }}
              onPosChange={p => updatePos(shelf.id, p)}
            />
          ))}

          {/* Add shelf button */}
          {room && (
            <button
              onClick={() => onAddShelf(room.id)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#2a2a2a] text-[#444] hover:border-[#3a3a3a] hover:text-[#666] transition-all text-sm bg-[#0a0a0a]/80 backdrop-blur"
            >
              <Plus size={14} /> Add Shelf
            </button>
          )}

          {room && roomShelves.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-[#333] text-sm">Click "Add Shelf" to place shelves in this room</p>
            </div>
          )}
        </div>
      </div>

      {/* Hint */}
      <div className="px-4 py-2 border-t border-[#1a1a1a] text-xs text-[#444] text-center">
        Drag shelves to rearrange. Click items to view details.
      </div>
    </div>
  )
}
