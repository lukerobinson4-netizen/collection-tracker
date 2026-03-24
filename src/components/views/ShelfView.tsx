import { useState } from 'react'
import { Plus, Settings } from 'lucide-react'
import clsx from 'clsx'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { Room, Shelf, Item } from '../../lib/types'
import type { CollectionTypeConfig } from '../../lib/collectionTypes'
import { useUpsertItem } from '../../hooks/useData'

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

// ─── Draggable item slot ──────────────────────────────────────────────────────
function DraggableItem({ item, accent, onClick }: { item: Item; accent: string; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={e => { if (!isDragging) { e.stopPropagation(); onClick() } }}
      className={clsx(
        'absolute inset-0 rounded-sm cursor-grab active:cursor-grabbing touch-none',
        isDragging ? 'opacity-30' : 'hover:brightness-110'
      )}
      style={{ background: `linear-gradient(to bottom, ${accent}22, ${accent}44)`, borderBottom: `2px solid ${accent}` }}
    >
      {item.photo_url ? (
        <img src={item.photo_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover rounded-sm pointer-events-none" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-1 pointer-events-none">
          <span className="text-[10px] text-center font-medium leading-tight line-clamp-2 text-white/80">{item.name}</span>
          {item.rating != null && (
            <span className="text-[9px] mt-0.5 font-mono" style={{ color: accent }}>{item.rating.toFixed(1)}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Droppable empty slot ─────────────────────────────────────────────────────
function DroppableSlot({ id, onAdd, accent, isDraggingAny }: { id: string; onAdd: () => void; accent: string; isDraggingAny: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      onClick={onAdd}
      className={clsx(
        'flex-1 relative min-w-0 h-14 rounded-sm transition-all group',
        'bg-[#1a1a1a] border border-dashed',
        isOver
          ? 'border-[var(--accent)] bg-[var(--accent)]/10 scale-105'
          : isDraggingAny
          ? 'border-[#3a3a3a] hover:border-[var(--accent)]/60'
          : 'border-[#2a2a2a] hover:bg-[#222] hover:border-[#3a3a3a]'
      )}
      style={{ '--accent': accent } as React.CSSProperties}
    >
      {!isDraggingAny && (
        <Plus size={12} className="absolute inset-0 m-auto text-[#444] group-hover:text-[#666] transition-colors" />
      )}
    </div>
  )
}

// ─── Occupied slot (also droppable for swapping) ──────────────────────────────
function OccupiedSlot({ id, item, accent, onClick }: { id: string; item: Item; accent: string; onClick: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex-1 relative min-w-0 h-14 rounded-sm transition-all',
        isOver && 'ring-2 ring-red-400/60 opacity-60'
      )}
    >
      <DraggableItem item={item} accent={accent} onClick={onClick} />
    </div>
  )
}

// ─── Shelf grid ───────────────────────────────────────────────────────────────
function ShelfGrid({ shelf, items, onItemClick, onSlotClick, accent, isDraggingAny }: {
  shelf: Shelf
  items: Item[]
  onItemClick: (i: Item) => void
  onSlotClick: (shelfId: string, row: number, col: number) => void
  accent: string
  isDraggingAny: boolean
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
              const slotId = `${shelf.id}::${row}::${col}`
              return item ? (
                <OccupiedSlot key={col} id={slotId} item={item} accent={accent} onClick={() => onItemClick(item)} />
              ) : (
                <DroppableSlot key={col} id={slotId} onAdd={() => onSlotClick(shelf.id, row, col)} accent={accent} isDraggingAny={isDraggingAny} />
              )
            })}
          </div>
        ))}
      </div>
      <div className="shelf-wood h-3 mx-2 mb-2 rounded" />
    </div>
  )
}

// ─── Drag overlay card ────────────────────────────────────────────────────────
function DragCard({ item, accent }: { item: Item; accent: string }) {
  return (
    <div
      className="w-14 h-14 rounded-sm shadow-2xl pointer-events-none rotate-2 scale-110"
      style={{ background: `linear-gradient(to bottom, ${accent}44, ${accent}88)`, borderBottom: `2px solid ${accent}` }}
    >
      {item.photo_url
        ? <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover rounded-sm" />
        : (
          <div className="w-full h-full flex flex-col items-center justify-center px-1">
            <span className="text-[10px] text-center font-medium leading-tight text-white">{item.name}</span>
          </div>
        )
      }
    </div>
  )
}

// ─── Main ShelfView ───────────────────────────────────────────────────────────
export default function ShelfView({ rooms, shelves, items, cfg, onItemClick, onSlotClick, onAddRoom, onEditRoom, onAddShelf, onEditShelf, accent }: Props) {
  const [activeRoom, setActiveRoom] = useState<string | null>(rooms[0]?.id ?? null)
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const upsert = useUpsertItem()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const room = rooms.find(r => r.id === activeRoom)
  const roomShelves = shelves.filter(s => (s as Shelf & { room_id?: string }).room_id === activeRoom)
  const draggedItem = draggedItemId ? items.find(i => i.id === draggedItemId) ?? null : null

  const handleDragStart = (e: DragStartEvent) => setDraggedItemId(String(e.active.id))

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggedItemId(null)
    if (!e.over || !draggedItem) return

    const parts = String(e.over.id).split('::')
    if (parts.length !== 3) return
    const [targetShelfId, targetRow, targetCol] = parts
    const newRow = parseInt(targetRow)
    const newCol = parseInt(targetCol)

    // Check if target is occupied by a different item
    const occupant = items.find(i =>
      i.shelf_id === targetShelfId && i.shelf_row === newRow && i.shelf_col === newCol && i.id !== draggedItem.id
    )
    if (occupant) return

    // Skip if same position
    if (draggedItem.shelf_id === targetShelfId && draggedItem.shelf_row === newRow && draggedItem.shelf_col === newCol) return

    upsert.mutate({ ...draggedItem, shelf_id: targetShelfId, shelf_row: newRow, shelf_col: newCol })
  }

  // Auto-select first room when rooms load
  if (rooms.length > 0 && !activeRoom) setActiveRoom(rooms[0].id)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
          <button
            onClick={onAddRoom}
            className="px-3 py-1.5 rounded-lg text-sm text-[#444] hover:text-[#777] border border-dashed border-[#2a2a2a] hover:border-[#3a3a3a] transition-all shrink-0 flex items-center gap-1"
          >
            <Plus size={12} /> Room
          </button>
        </div>

        {/* Shelves */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
          {room && roomShelves.length === 0 && (
            <div className="text-center py-10 text-[#444] text-sm">No shelves in {room.name} yet.</div>
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
              <ShelfGrid
                shelf={shelf}
                items={items}
                onItemClick={onItemClick}
                onSlotClick={onSlotClick}
                accent={accent}
                isDraggingAny={!!draggedItemId}
              />
            </div>
          ))}

          {room && (
            <button
              onClick={() => onAddShelf(room.id)}
              className="w-full py-4 border-2 border-dashed border-[#222] rounded-xl text-[#444] hover:border-[#333] hover:text-[#666] transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} /> Add Shelf to {room.name}
            </button>
          )}

          {rooms.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🏠</div>
              <p className="text-[#555] text-sm mb-4">No rooms yet.</p>
              <button onClick={onAddRoom} className="px-4 py-2 rounded-xl border border-[#2a2a2a] text-sm text-[#666] hover:text-white hover:border-[#444] transition-all">
                <Plus size={14} className="inline mr-1" /> Add First Room
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating drag overlay */}
      <DragOverlay>
        {draggedItem && <DragCard item={draggedItem} accent={accent} />}
      </DragOverlay>
    </DndContext>
  )
}
