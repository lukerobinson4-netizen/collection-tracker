import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Search, Bookmark, LayoutGrid, List, AlignJustify,
  BarChart2, Settings, X, SlidersHorizontal
} from 'lucide-react'
import clsx from 'clsx'
import { useAppStore } from '../stores/appStore'
import { useCollections, useRooms, useShelves, useItems, useUpsertRoom, useDeleteRoom, useUpsertShelf, useDeleteShelf } from '../hooks/useData'
import { getConfig } from '../lib/collectionTypes'
import type { CollectionType, DisplayMode, Room, Shelf, Item } from '../lib/types'
import ShelfView from '../components/views/ShelfView'
import GridView from '../components/views/GridView'
import ListView from '../components/views/ListView'
import RoomMapView from '../components/views/RoomMapView'
import ItemModal from '../components/items/ItemModal'
import Modal from '../components/shared/Modal'
import Button from '../components/shared/Button'
import { getSupabase } from '../lib/supabase'

// ─── Room modal ──────────────────────────────────────────────────────────────
function RoomModal({ open, onClose, room, collectionId }: { open: boolean; onClose: () => void; room?: Room | null; collectionId: string }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const upsert = useUpsertRoom()
  const del = useDeleteRoom()
  const isEditing = !!room

  useEffect(() => {
    if (open) { setName(room?.name ?? ''); setDesc(room?.description ?? '') }
  }, [open, room])

  const save = async () => {
    await upsert.mutateAsync({ ...(room ? { id: room.id } : {}), collection_id: collectionId, name, description: desc || null } as Room & { name: string; collection_id: string })
    onClose()
  }
  const remove = async () => {
    if (!room || !confirm('Delete this room and all its shelves?')) return
    await del.mutateAsync(room.id)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Room' : 'Add Room'} size="sm"
      footer={
        <div className="flex items-center justify-between w-full">
          {isEditing ? <Button variant="danger" size="sm" onClick={remove} loading={del.isPending}>Delete Room</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={upsert.isPending} disabled={!name.trim()}>Save</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div><label>Room name</label><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Living Room, Garage…" /></div>
        <div><label>Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Optional notes…" /></div>
      </div>
    </Modal>
  )
}

// ─── Shelf modal ─────────────────────────────────────────────────────────────
function ShelfModal({ open, onClose, shelf, roomId, accent }: { open: boolean; onClose: () => void; shelf?: Shelf | null; roomId?: string | null; accent: string }) {
  const [name, setName] = useState('')
  const [wide, setWide] = useState(6)
  const [tall, setTall] = useState(4)
  const upsert = useUpsertShelf()
  const del = useDeleteShelf()
  const isEditing = !!shelf

  useEffect(() => {
    if (open) { setName(shelf?.name ?? ''); setWide(shelf?.slots_wide ?? 6); setTall(shelf?.slots_tall ?? 4) }
  }, [open, shelf])

  const save = async () => {
    const rid = shelf?.room_id ?? roomId
    if (!rid) return
    await upsert.mutateAsync({ ...(shelf ? { id: shelf.id } : {}), room_id: rid, name, slots_wide: wide, slots_tall: tall } as Shelf & { name: string; room_id: string })
    onClose()
  }
  const remove = async () => {
    if (!shelf || !confirm('Delete this shelf?')) return
    await del.mutateAsync(shelf.id)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Shelf' : 'Add Shelf'} size="sm"
      footer={
        <div className="flex items-center justify-between w-full">
          {isEditing ? <Button variant="danger" size="sm" onClick={remove} loading={del.isPending}>Delete Shelf</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={upsert.isPending} disabled={!name.trim()}
              style={{ '--accent': accent } as React.CSSProperties}>Save</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div><label>Shelf name</label><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Top Shelf…" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label>Columns</label><input type="number" value={wide} min={1} max={20} onChange={e => setWide(+e.target.value)} /></div>
          <div><label>Rows</label><input type="number" value={tall} min={1} max={12} onChange={e => setTall(+e.target.value)} /></div>
        </div>
        {/* Preview */}
        <div className="rounded-xl overflow-hidden border border-[#2a2a2a]">
          <div className="px-2 pt-2 pb-0 flex flex-col gap-1 bg-[#0f0f0f]">
            {Array.from({ length: tall }).map((_, r) => (
              <div key={r} className="flex gap-1">
                {Array.from({ length: wide }).map((_, c) => <div key={c} className="flex-1 h-6 bg-[#1a1a1a] rounded border border-[#2a2a2a]" />)}
              </div>
            ))}
          </div>
          <div className="shelf-wood h-2 mx-2 mb-2 rounded" />
        </div>
        <p className="text-xs text-[#555] text-center">{wide} × {tall} = {wide * tall} slots</p>
      </div>
    </Modal>
  )
}

// ─── Settings modal ──────────────────────────────────────────────────────────
function CollectionSettingsModal({ open, onClose, collectionId, accent }: { open: boolean; onClose: () => void; collectionId: string; accent: string }) {
  const { collections, setCollections, addToast } = useAppStore()
  const col = collections.find(c => c.id === collectionId)
  const [name, setName] = useState(col?.name ?? '')
  const [desc, setDesc] = useState(col?.description ?? '')
  const [displayMode, setDisplayMode] = useState<DisplayMode>(col?.display_mode ?? 'shelf')
  const [isPublic, setIsPublic] = useState(col?.is_public ?? false)
  const [publicSlug, setPublicSlug] = useState(col?.public_slug ?? '')
  const cfg = col ? getConfig(col.type as CollectionType) : null
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open && col) {
      setName(col.name); setDesc(col.description ?? ''); setDisplayMode(col.display_mode)
      setIsPublic(col.is_public); setPublicSlug(col.public_slug ?? '')
    }
  }, [open, col])

  const generateSlug = () => {
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`
    setPublicSlug(slug)
  }

  const copyLink = () => {
    const url = `${window.location.origin}/share/${publicSlug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const save = async () => {
    setLoading(true)
    try {
      const sb = getSupabase()
      const updates: Record<string, unknown> = { name, description: desc || null, display_mode: displayMode, is_public: isPublic }
      if (isPublic && !publicSlug) generateSlug()
      if (publicSlug) updates.public_slug = publicSlug
      const { data, error } = await sb.from('collections').update(updates).eq('id', collectionId).select().single()
      if (error) throw error
      setCollections(collections.map(c => c.id === collectionId ? data : c))
      addToast('Settings saved')
      onClose()
    } catch (e: unknown) { addToast(e instanceof Error ? e.message : 'Failed', 'error') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Collection Settings" size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={loading} style={{ '--accent': accent } as React.CSSProperties}>Save</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div><label>Name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
        <div><label>Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} /></div>
        {cfg && (
          <div>
            <label>Display mode</label>
            <div className="flex gap-2 mt-1">
              {cfg.availableDisplayModes.map(m => (
                <button key={m} onClick={() => setDisplayMode(m)}
                  className={clsx('px-3 py-1.5 rounded-lg text-xs border transition-all capitalize',
                    displayMode === m ? 'border-white bg-white/10' : 'border-[#2a2a2a] text-[#666] hover:border-[#444]'
                  )}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Share */}
        <div className="border-t border-[#1e1e1e] pt-3">
          <div className="flex items-center justify-between mb-2">
            <label className="mb-0">Public share link</label>
            <button
              onClick={() => { setIsPublic(v => !v); if (!publicSlug) generateSlug() }}
              className={clsx('relative w-10 h-5 rounded-full transition-colors', isPublic ? 'bg-[var(--accent)]' : 'bg-[#333]')}
              style={{ '--accent': accent } as React.CSSProperties}
            >
              <span className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', isPublic ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
          </div>
          {isPublic && (
            <div className="space-y-2">
              <div className="flex gap-1">
                <input value={publicSlug} onChange={e => setPublicSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))}
                  placeholder="your-slug" className="flex-1 text-xs" />
                <button onClick={generateSlug} className="px-2 py-1 text-xs border border-[#2a2a2a] rounded-lg text-[#666] hover:text-white transition-colors whitespace-nowrap">
                  Regenerate
                </button>
              </div>
              {publicSlug && (
                <button onClick={copyLink}
                  className="w-full text-xs text-left px-3 py-2 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] text-[#666] hover:text-white transition-colors truncate">
                  {copied ? '✓ Copied!' : `${window.location.origin}/share/${publicSlug}`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const VIEW_ICONS: Record<DisplayMode, React.ReactNode> = {
  shelf: <AlignJustify size={16} />,
  grid: <LayoutGrid size={16} />,
  list: <List size={16} />,
  room: <SlidersHorizontal size={16} />,
}

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setActiveCollection, collections, searchQuery, setSearchQuery, showWishlist, setShowWishlist } = useAppStore()

  useCollections()
  const { data: rooms = [] } = useRooms(id ?? null)
  const { data: shelves = [] } = useShelves(id ?? null)
  const { data: items = [] } = useItems(id ?? null)

  const col = collections.find(c => c.id === id)
  const cfg = col ? getConfig(col.type as CollectionType) : getConfig('custom')
  const accent = col?.accent_color ?? cfg.accentColor

  const [displayMode, setDisplayMode] = useState<DisplayMode>(col?.display_mode ?? 'grid')
  const [itemModal, setItemModal] = useState<{ open: boolean; item?: Item | null; shelfId?: string | null; row?: number | null; col?: number | null }>({ open: false })
  const [roomModal, setRoomModal] = useState<{ open: boolean; room?: Room | null }>({ open: false })
  const [shelfModal, setShelfModal] = useState<{ open: boolean; shelf?: Shelf | null; roomId?: string | null }>({ open: false })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    if (id) setActiveCollection(id)
  }, [id, setActiveCollection])

  useEffect(() => {
    if (col) setDisplayMode(col.display_mode)
  }, [col?.display_mode])

  // Filter items by search
  const filteredItems = items.filter(i => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (i.name + ' ' + (i.brand ?? '') + ' ' + (i.type ?? '')).toLowerCase().includes(q)
  })

  // Stats
  const owned = items.filter(i => !i.wishlist && i.status !== 'sold' && i.status !== 'gifted').length
  const avgRating = (() => {
    const rated = items.filter(i => i.rating != null)
    if (!rated.length) return null
    return rated.reduce((a, b) => a + b.rating!, 0) / rated.length
  })()

  if (!col) return (
    <div className="min-h-dvh bg-[#0a0a0a] flex items-center justify-center text-[#444]">
      Loading…
    </div>
  )

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex flex-col" style={{ '--accent': accent } as React.CSSProperties}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#1a1a1a] px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-white/10 transition-colors shrink-0 touch-target">
            <ArrowLeft size={18} />
          </button>
          <span className="text-xl shrink-0">{cfg.icon}</span>
          <div className="min-w-0">
            <h1 className="font-semibold text-sm truncate">{col.name}</h1>
            <p className="text-[10px] text-[#555] truncate">{cfg.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* View mode switcher */}
          {cfg.availableDisplayModes.length > 1 && (
            <div className="hidden sm:flex items-center gap-0.5 bg-[#141414] border border-[#2a2a2a] rounded-lg p-0.5">
              {cfg.availableDisplayModes.filter(m => m !== 'room').map(m => (
                <button key={m} onClick={() => setDisplayMode(m)}
                  className={clsx('p-1.5 rounded transition-all', displayMode === m ? 'bg-white/10 text-white' : 'text-[#555] hover:text-[#888]')}>
                  {VIEW_ICONS[m]}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setSearchOpen(v => !v)} className="p-2 rounded-lg text-[#555] hover:text-white hover:bg-white/10 transition-colors touch-target">
            <Search size={18} />
          </button>
          <button onClick={() => setShowWishlist(!showWishlist)}
            className={clsx('p-2 rounded-lg transition-colors touch-target', showWishlist ? 'text-[var(--accent)] bg-[var(--accent)]/10' : 'text-[#555] hover:text-white hover:bg-white/10')}>
            <Bookmark size={18} />
          </button>
          <button onClick={() => navigate(`/stats?collection=${id}`)} className="p-2 rounded-lg text-[#555] hover:text-white hover:bg-white/10 transition-colors touch-target">
            <BarChart2 size={18} />
          </button>
          <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-lg text-[#555] hover:text-white hover:bg-white/10 transition-colors touch-target">
            <Settings size={18} />
          </button>
          <button onClick={() => setItemModal({ open: true })}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all"
            style={{ background: accent, color: '#000' }}>
            <Plus size={14} /> Add
          </button>
        </div>
      </header>

      {/* Search bar */}
      {searchOpen && (
        <div className="px-4 sm:px-6 py-2 border-b border-[#1a1a1a] flex items-center gap-2">
          <Search size={14} className="text-[#555] shrink-0" />
          <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search ${cfg.itemsLabel.toLowerCase()}…`}
            className="flex-1 bg-transparent border-none outline-none text-sm" />
          <button onClick={() => { setSearchOpen(false); setSearchQuery('') }} className="text-[#555] hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="px-4 sm:px-6 py-2 border-b border-[#1a1a1a] flex items-center gap-6 text-xs text-[#555] overflow-x-auto">
        <span style={{ color: accent }} className="font-mono font-semibold">{owned} {cfg.itemsLabel}</span>
        {items.filter(i => i.wishlist).length > 0 && (
          <span className="flex items-center gap-1"><Bookmark size={11} /> {items.filter(i => i.wishlist).length} wishlist</span>
        )}
        {avgRating != null && <span>Avg rating: <span className="font-mono font-semibold text-[#888]">{avgRating.toFixed(1)}</span></span>}
        {rooms.length > 0 && <span>{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>}
        {shelves.length > 0 && <span>{shelves.length} shelf/shelves</span>}
        {/* Mobile view switcher */}
        <div className="ml-auto flex items-center gap-0.5 sm:hidden">
          {cfg.availableDisplayModes.filter(m => m !== 'room').map(m => (
            <button key={m} onClick={() => setDisplayMode(m)}
              className={clsx('p-1 rounded transition-all', displayMode === m ? 'text-white' : 'text-[#444]')}>
              {VIEW_ICONS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {displayMode === 'shelf' && (
          <ShelfView
            rooms={rooms} shelves={shelves} items={filteredItems} cfg={cfg} accent={accent}
            onItemClick={item => setItemModal({ open: true, item })}
            onSlotClick={(shelfId, row, col) => setItemModal({ open: true, shelfId, row, col })}
            onAddRoom={() => setRoomModal({ open: true })}
            onEditRoom={room => setRoomModal({ open: true, room })}
            onAddShelf={roomId => setShelfModal({ open: true, roomId })}
            onEditShelf={shelf => setShelfModal({ open: true, shelf })}
          />
        )}
        {displayMode === 'grid' && (
          <GridView items={filteredItems} cfg={cfg} accent={accent} showWishlist={showWishlist}
            onItemClick={item => setItemModal({ open: true, item })}
            onAddItem={() => setItemModal({ open: true })}
          />
        )}
        {displayMode === 'list' && (
          <ListView items={filteredItems} cfg={cfg} accent={accent} showWishlist={showWishlist}
            onItemClick={item => setItemModal({ open: true, item })}
            onAddItem={() => setItemModal({ open: true })}
          />
        )}
        {displayMode === 'room' && (
          <RoomMapView
            rooms={rooms} shelves={shelves} items={filteredItems} cfg={cfg} accent={accent}
            collectionId={id!}
            onItemClick={item => setItemModal({ open: true, item })}
            onAddRoom={() => setRoomModal({ open: true })}
            onEditRoom={room => setRoomModal({ open: true, room })}
            onAddShelf={roomId => setShelfModal({ open: true, roomId })}
            onEditShelf={shelf => setShelfModal({ open: true, shelf })}
          />
        )}
      </div>

      {/* Modals */}
      <ItemModal
        open={itemModal.open}
        onClose={() => setItemModal({ open: false })}
        item={itemModal.item}
        defaultShelfId={itemModal.shelfId}
        defaultRow={itemModal.row}
        defaultCol={itemModal.col}
        shelves={shelves}
        cfg={cfg}
        collectionId={id!}
        accent={accent}
      />
      <RoomModal
        open={roomModal.open}
        onClose={() => setRoomModal({ open: false })}
        room={roomModal.room}
        collectionId={id!}
      />
      <ShelfModal
        open={shelfModal.open}
        onClose={() => setShelfModal({ open: false })}
        shelf={shelfModal.shelf}
        roomId={shelfModal.roomId}
        accent={accent}
      />
      <CollectionSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        collectionId={id!}
        accent={accent}
      />
    </div>
  )
}
