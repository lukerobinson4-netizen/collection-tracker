import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, ChevronLeft } from 'lucide-react'
import clsx from 'clsx'
import { getSupabase } from '../lib/supabase'
import { useAppStore } from '../stores/appStore'
import { COLLECTION_TYPE_LIST, getConfig } from '../lib/collectionTypes'
import type { CollectionType } from '../lib/types'
import Button from '../components/shared/Button'

const STEPS = ['Collection Type', 'Name It', 'First Room', 'First Shelf', 'All Set!']

export default function SetupPage() {
  const navigate = useNavigate()
  const { user, addToast } = useAppStore()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [type, setType] = useState<CollectionType>('whiskey')
  const [colName, setColName] = useState('')
  const [colDesc, setColDesc] = useState('')
  const [roomName, setRoomName] = useState('')
  const [shelfName, setShelfName] = useState('')
  const [shelfWide, setShelfWide] = useState(6)
  const [shelfTall, setShelfTall] = useState(4)

  const cfg = getConfig(type)

  const canNext = [
    true,
    colName.trim().length > 0,
    roomName.trim().length > 0,
    shelfName.trim().length > 0,
    false,
  ]

  const next = () => { if (step < 4 && canNext[step]) setStep(s => s + 1) }
  const back = () => setStep(s => s - 1)

  const finish = async () => {
    setLoading(true)
    try {
      const sb = getSupabase()
      // Create collection
      const { data: col, error: ce } = await sb.from('collections').insert({
        user_id: user!.id, name: colName, type, description: colDesc || null,
        display_mode: cfg.defaultDisplayMode, accent_color: cfg.accentColor,
        is_public: false,
      }).select().single()
      if (ce) throw ce

      // Create room
      const { data: room, error: re } = await sb.from('rooms').insert({
        collection_id: col.id, name: roomName,
      }).select().single()
      if (re) throw re

      // Create shelf
      const { error: se } = await sb.from('shelves').insert({
        room_id: room.id, name: shelfName, slots_wide: shelfWide, slots_tall: shelfTall,
      })
      if (se) throw se

      addToast('Collection created!', 'success')
      navigate(`/collection/${col.id}`)
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Setup failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl tracking-widest mb-1">WELCOME</h1>
        <p className="text-[#555] text-sm">Let's set up your first collection</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
              i < step ? 'bg-emerald-500 text-black' :
              i === step ? 'bg-white text-black' :
              'bg-[#222] text-[#555] border border-[#333]'
            )}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx('w-8 h-px', i < step ? 'bg-emerald-500' : 'bg-[#333]')} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-xl bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6">
        {/* Step 0: Type */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">What are you collecting?</h2>
              <p className="text-[#666] text-sm">Choose a type — you can add more collections later.</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {COLLECTION_TYPE_LIST.map(t => (
                <button
                  key={t.type}
                  onClick={() => setType(t.type)}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center',
                    type === t.type
                      ? 'border-white bg-white/10 text-white'
                      : 'border-[#2a2a2a] text-[#888] hover:border-[#444] hover:text-white'
                  )}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <span className="text-xs font-medium leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{cfg.icon}</span>
              <div>
                <h2 className="text-xl font-semibold">Name your collection</h2>
                <p className="text-[#666] text-sm">Give it a name that means something to you.</p>
              </div>
            </div>
            <div>
              <label>Collection name</label>
              <input autoFocus value={colName} onChange={e => setColName(e.target.value)}
                placeholder={`e.g. The Good Stuff, Dad's ${cfg.label}…`}
                onKeyDown={e => e.key === 'Enter' && next()} />
            </div>
            <div>
              <label>Description (optional)</label>
              <textarea value={colDesc} onChange={e => setColDesc(e.target.value)} rows={2}
                placeholder="A few words about your collection…" />
            </div>
          </div>
        )}

        {/* Step 2: Room */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Create your first room</h2>
              <p className="text-[#666] text-sm">Rooms represent physical spaces — a living room, cellar, garage, or study.</p>
            </div>
            <div>
              <label>Room name</label>
              <input autoFocus value={roomName} onChange={e => setRoomName(e.target.value)}
                placeholder="e.g. Living Room, Cellar, Garage…"
                onKeyDown={e => e.key === 'Enter' && next()} />
            </div>
          </div>
        )}

        {/* Step 3: Shelf */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Add your first shelf</h2>
              <p className="text-[#666] text-sm">Define how wide and tall your shelf is. You can resize later.</p>
            </div>
            <div>
              <label>Shelf name</label>
              <input autoFocus value={shelfName} onChange={e => setShelfName(e.target.value)}
                placeholder="e.g. Main Shelf, Top Shelf…"
                onKeyDown={e => e.key === 'Enter' && next()} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label>Columns (wide)</label>
                <input type="number" value={shelfWide} min={1} max={20}
                  onChange={e => setShelfWide(Math.max(1, Math.min(20, +e.target.value)))} />
              </div>
              <div>
                <label>Rows (tall)</label>
                <input type="number" value={shelfTall} min={1} max={12}
                  onChange={e => setShelfTall(Math.max(1, Math.min(12, +e.target.value)))} />
              </div>
            </div>
            {/* Mini preview */}
            <div className="rounded-xl overflow-hidden border border-[#2a2a2a]">
              <div className="px-3 pt-3 pb-1 flex flex-col gap-1">
                {Array.from({ length: shelfTall }).map((_, row) => (
                  <div key={row} className="flex gap-1 items-end">
                    {Array.from({ length: shelfWide }).map((_, col) => (
                      <div key={col} className="flex-1 h-8 bg-[#222] rounded border border-[#333]" />
                    ))}
                  </div>
                ))}
              </div>
              <div className="shelf-wood h-3 mx-2 mb-2 rounded" />
            </div>
            <p className="text-xs text-[#555] text-center">{shelfWide} × {shelfTall} = {shelfWide * shelfTall} slots</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="text-center space-y-4 py-4">
            <div className="text-6xl mb-2">{cfg.icon}</div>
            <h2 className="text-2xl font-semibold">{colName}</h2>
            <p className="text-[#666] text-sm">Your collection is ready. Start adding items!</p>
            <Button variant="primary" size="lg" onClick={finish} loading={loading}
              style={{ '--accent': cfg.accentColor } as React.CSSProperties}>
              Open My Collection →
            </Button>
          </div>
        )}

        {/* Navigation */}
        {step < 4 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#1e1e1e]">
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              <ChevronLeft size={16} /> Back
            </Button>
            <Button variant="primary" onClick={next} disabled={!canNext[step]}
              style={{ '--accent': cfg.accentColor } as React.CSSProperties}>
              {step === 3 ? 'Create Collection' : 'Next'} <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
