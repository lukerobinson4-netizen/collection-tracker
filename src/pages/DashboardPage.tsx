import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Package, Star, TrendingUp, MoreVertical, Pencil, Trash2, BarChart2, UserCircle } from 'lucide-react'
import clsx from 'clsx'
import { useCollections, useDeleteCollection } from '../hooks/useData'
import { useAppStore } from '../stores/appStore'
import { getConfig } from '../lib/collectionTypes'
import { COLLECTION_TYPE_LIST } from '../lib/collectionTypes'
import type { Collection, CollectionType, DisplayMode } from '../lib/types'
import Modal from '../components/shared/Modal'
import Button from '../components/shared/Button'
import { getSupabase } from '../lib/supabase'

function CollectionCard({ col, itemCount, onEdit }: { col: Collection; itemCount?: number; onEdit: () => void }) {
  const navigate = useNavigate()
  const { setActiveCollection } = useAppStore()
  const deleteCol = useDeleteCollection()
  const cfg = getConfig(col.type as CollectionType)
  const [menuOpen, setMenuOpen] = useState(false)
  const accent = col.accent_color ?? cfg.accentColor

  const open = () => {
    setActiveCollection(col.id)
    navigate(`/collection/${col.id}`)
  }

  return (
    <div
      className="group relative bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden hover:border-[#3a3a3a] transition-all cursor-pointer active:scale-[0.99]"
      onClick={open}
    >
      {/* Accent strip */}
      <div className="h-1 w-full" style={{ background: accent }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{cfg.icon}</span>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-[#666] hover:text-white transition-all"
          >
            <MoreVertical size={16} />
          </button>
        </div>

        <h3 className="font-semibold text-base mb-0.5 leading-snug">{col.name}</h3>
        <p className="text-xs text-[#555] mb-3">{cfg.label}</p>

        {col.description && (
          <p className="text-xs text-[#666] line-clamp-2 mb-3">{col.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-[#555]">
          <span className="flex items-center gap-1">
            <Package size={12} style={{ color: accent }} />
            {itemCount ?? 0} {cfg.itemsLabel.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Context menu */}
      {menuOpen && (
        <div
          className="absolute top-10 right-3 z-10 bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl shadow-xl py-1 min-w-[140px]"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => { onEdit(); setMenuOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 text-left">
            <Pencil size={13} /> Edit
          </button>
          <button onClick={() => { deleteCol.mutate(col.id); setMenuOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-500/10 text-red-400 text-left">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

function NewCollectionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, addToast } = useAppStore()
  const { refetch } = useCollections()
  const navigate = useNavigate()
  const { setActiveCollection } = useAppStore()
  const [type, setType] = useState<CollectionType>('whiskey')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('shelf')
  const [loading, setLoading] = useState(false)
  const cfg = getConfig(type)

  const handleTypeChange = (t: CollectionType) => {
    setType(t)
    setDisplayMode(getConfig(t).defaultDisplayMode)
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const sb = getSupabase()
      const { data: col, error } = await sb.from('collections').insert({
        user_id: user!.id, name: name.trim(), type, description: desc || null,
        display_mode: displayMode, accent_color: cfg.accentColor, is_public: false,
      }).select().single()
      if (error) throw error
      await refetch()
      addToast('Collection created!')
      setActiveCollection(col.id)
      navigate(`/collection/${col.id}`)
      onClose()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Collection" size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} loading={loading} disabled={!name.trim()}
            style={{ '--accent': cfg.accentColor } as React.CSSProperties}>
            Create Collection
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label>Type</label>
          <div className="grid grid-cols-4 gap-1.5 mt-1">
            {COLLECTION_TYPE_LIST.map(t => (
              <button key={t.type} onClick={() => handleTypeChange(t.type)}
                className={clsx(
                  'flex flex-col items-center gap-1 py-2 rounded-xl border text-xs transition-all',
                  type === t.type ? 'border-white bg-white/10' : 'border-[#2a2a2a] text-[#666] hover:border-[#444] hover:text-white'
                )}>
                <span className="text-lg">{t.icon}</span>
                <span className="leading-none">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label>Name</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            placeholder={`e.g. Dad's ${cfg.label}, The Collection…`} />
        </div>
        <div>
          <label>Description (optional)</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
            placeholder="A few words about this collection…" />
        </div>
        <div>
          <label>Default display</label>
          <div className="flex gap-2 mt-1">
            {cfg.availableDisplayModes.map(m => (
              <button key={m} onClick={() => setDisplayMode(m)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs border transition-all capitalize',
                  displayMode === m ? 'border-white bg-white/10 text-white' : 'border-[#2a2a2a] text-[#666] hover:border-[#444]'
                )}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function DashboardPage() {
  const { user } = useAppStore()
  const navigate = useNavigate()
  const { data: collections = [], isLoading } = useCollections()
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [editingCol, setEditingCol] = useState<Collection | null>(null)

  const totalItems = 0 // populated via separate query in production

  const email = user?.email ?? ''
  const initials = email.charAt(0).toUpperCase()

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#444] text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0a]">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#1a1a1a] px-4 sm:px-6 h-14 flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-widest">COLLECTIONS</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/stats')}
            className="p-2 rounded-lg text-[#666] hover:text-white hover:bg-white/10 transition-colors touch-target">
            <BarChart2 size={18} />
          </button>
          <button
            onClick={() => navigate('/profile')}
            title="Account settings"
            className="w-9 h-9 rounded-full bg-[#222] border border-[#333] flex items-center justify-center text-xs font-semibold text-[#888] hover:border-[#555] hover:text-white transition-colors"
          >
            {initials || <UserCircle size={16} />}
          </button>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        {/* Global stats row */}
        {collections.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: <Package size={16} />, label: 'Collections', value: collections.length },
              { icon: <Star size={16} />, label: 'Total Items', value: totalItems },
              { icon: <TrendingUp size={16} />, label: 'Types', value: new Set(collections.map(c => c.type)).size },
            ].map(s => (
              <div key={s.label} className="bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-[#555] mb-1">{s.icon}<span className="text-xs">{s.label}</span></div>
                <div className="text-xl font-semibold font-mono">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Collections grid */}
        {collections.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📦</div>
            <h2 className="text-xl font-semibold mb-2">No collections yet</h2>
            <p className="text-[#555] text-sm mb-6">Create your first collection to get started.</p>
            <Button variant="primary" onClick={() => setNewModalOpen(true)}
              style={{ '--accent': '#d97706' } as React.CSSProperties}>
              <Plus size={16} /> New Collection
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm text-[#555] uppercase tracking-widest font-medium">Your Collections</h2>
              <Button variant="secondary" size="sm" onClick={() => setNewModalOpen(true)}>
                <Plus size={14} /> Add Collection
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map(col => (
                <CollectionCard key={col.id} col={col} onEdit={() => setEditingCol(col)} />
              ))}
              {/* Add new card */}
              <button
                onClick={() => setNewModalOpen(true)}
                className="border-2 border-dashed border-[#2a2a2a] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-[#444] hover:border-[#444] hover:text-[#666] transition-all min-h-[140px]"
              >
                <Plus size={24} />
                <span className="text-sm">New Collection</span>
              </button>
            </div>
          </>
        )}
      </main>

      <NewCollectionModal open={newModalOpen} onClose={() => setNewModalOpen(false)} />
    </div>
  )
}
