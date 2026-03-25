import { useState, useEffect, useRef } from 'react'
import { Camera, Bookmark, BookmarkCheck, Trash2, ScanLine, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import BarcodeScanner from './BarcodeScanner'
import type { LookupResult } from '../../lib/lookup'
import type { Item, Shelf } from '../../lib/types'
import type { CollectionTypeConfig } from '../../lib/collectionTypes'
import { useUpsertItem, useDeleteItem, uploadPhoto } from '../../hooks/useData'
import { useAppStore } from '../../stores/appStore'

interface Props {
  open: boolean
  onClose: () => void
  item?: Item | null
  defaultShelfId?: string | null
  defaultRow?: number | null
  defaultCol?: number | null
  shelves: Shelf[]
  cfg: CollectionTypeConfig
  collectionId: string
  accent: string
}

type FormData = Omit<Partial<Item>, 'id' | 'created_at' | 'updated_at'>

const STATUS_OPTIONS = [
  { value: 'owned', label: 'Owned' },
  { value: 'full', label: 'Full' },
  { value: 'partial', label: 'Partial' },
  { value: 'empty', label: 'Empty / Finished' },
  { value: 'gifted', label: 'Gifted / Given Away' },
  { value: 'sold', label: 'Sold' },
]

export default function ItemModal({ open, onClose, item, defaultShelfId, defaultRow, defaultCol, shelves, cfg, collectionId, accent }: Props) {
  const { user } = useAppStore()
  const upsert = useUpsertItem()
  const deleteItem = useDeleteItem()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState<FormData>({})
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  // Slot picker state
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const [selectedCol, setSelectedCol] = useState<number | null>(null)

  const isEditing = !!item?.id

  useEffect(() => {
    if (!open) return
    if (item) {
      setForm({
        name: item.name, brand: item.brand, type: item.type,
        year: item.year, region: item.region, abv: item.abv,
        notes: item.notes, rating: item.rating, status: item.status,
        purchase_price: item.purchase_price, purchase_date: item.purchase_date,
        purchase_store: item.purchase_store, photo_url: item.photo_url,
        tags: item.tags, wishlist: item.wishlist,
        market_price_low: item.market_price_low,
        market_price_avg: item.market_price_avg,
        market_price_high: item.market_price_high,
        market_price_currency: item.market_price_currency,
        market_price_source: item.market_price_source,
        market_price_updated: item.market_price_updated,
      })
      setPhotoPreview(item.photo_url ?? null)
      setSelectedShelfId(item.shelf_id ?? null)
      setSelectedRow(item.shelf_row ?? null)
      setSelectedCol(item.shelf_col ?? null)
    } else {
      setForm({ status: 'owned', wishlist: false, tags: [] })
      setPhotoPreview(null)
      setPhotoFile(null)
      setSelectedShelfId(defaultShelfId ?? null)
      setSelectedRow(defaultRow ?? null)
      setSelectedCol(defaultCol ?? null)
    }
  }, [open, item, defaultShelfId, defaultRow, defaultCol])

  const set = (key: keyof FormData, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const selectedShelf = shelves.find(s => s.id === selectedShelfId)

  // Build occupied map for slot picker
  const { items } = useAppStore()
  const occupied = new Set(
    items
      .filter(i => i.shelf_id === selectedShelfId && i.id !== item?.id)
      .map(i => `${i.shelf_row},${i.shelf_col}`)
  )

  const handleSave = async () => {
    if (!form.name?.trim()) return
    try {
      let photo_url = form.photo_url ?? null
      if (photoFile && user) {
        setUploading(true)
        photo_url = await uploadPhoto(photoFile, user.id)
        setUploading(false)
      }
      await upsert.mutateAsync({
        ...(item?.id ? { id: item.id } : {}),
        collection_id: collectionId,
        name: form.name!.trim(),
        brand: form.brand ?? null,
        type: form.type ?? null,
        year: form.year ?? null,
        region: form.region ?? null,
        abv: form.abv ?? null,
        notes: form.notes ?? null,
        rating: form.rating ?? null,
        status: form.status ?? 'owned',
        purchase_price: form.purchase_price ?? null,
        purchase_date: form.purchase_date ?? null,
        purchase_store: form.purchase_store ?? null,
        photo_url,
        tags: form.tags ?? [],
        wishlist: form.wishlist ?? false,
        shelf_id: selectedShelfId,
        shelf_row: selectedRow,
        shelf_col: selectedCol,
        market_price_low: form.market_price_low ?? null,
        market_price_avg: form.market_price_avg ?? null,
        market_price_high: form.market_price_high ?? null,
        market_price_currency: form.market_price_currency ?? null,
        market_price_source: form.market_price_source ?? null,
        market_price_updated: form.market_price_updated ?? null,
      })
      onClose()
    } catch { /* error shown via toast */ } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!item?.id) return
    if (!confirm(`Delete "${item.name}"?`)) return
    await deleteItem.mutateAsync(item.id)
    onClose()
  }

  const handleScanResult = (result: LookupResult) => {
    setScannerOpen(false)
    if (result.name) set('name', result.name)
    if (result.brand) set('brand', result.brand)
    if (result.type) set('type', result.type)
    // Auto-fill product image (stored as external URL — no upload needed)
    if (result.imageUrl && !form.photo_url) {
      set('photo_url', result.imageUrl)
      setPhotoPreview(result.imageUrl)
    }
    // Store market prices
    if (result.prices) {
      set('market_price_low', result.prices.low)
      set('market_price_avg', result.prices.avg)
      set('market_price_high', result.prices.high)
      set('market_price_currency', result.prices.currency)
      set('market_price_source', result.prices.source)
      set('market_price_updated', result.prices.updated)
    }
  }

  return (
    <>
    {scannerOpen && <BarcodeScanner onResult={handleScanResult} onClose={() => setScannerOpen(false)} />}
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full pr-8">
          <span>{isEditing ? `Edit ${cfg.itemLabel}` : `Add ${cfg.itemLabel}`}</span>
          {!isEditing && (
            <button onClick={() => setScannerOpen(true)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#3a3a3a] transition-all">
              <ScanLine size={13} /> Scan Barcode
            </button>
          )}
        </div>
      }
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          {isEditing
            ? <Button variant="danger" size="sm" onClick={handleDelete} loading={deleteItem.isPending}>
                <Trash2 size={14} /> Delete
              </Button>
            : <span />
          }
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}
              loading={upsert.isPending || uploading}
              disabled={!form.name?.trim()}
              style={{ '--accent': accent } as React.CSSProperties}>
              Save {cfg.itemLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Photo + status column (mobile: stacked, desktop: side by side) */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Photo */}
          <div className="sm:w-36 shrink-0">
            <div
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center cursor-pointer hover:border-[#3a3a3a] transition-colors overflow-hidden relative group"
            >
              {photoPreview
                ? <img src={photoPreview} className="w-full h-full object-cover" alt="preview" />
                : <div className="flex flex-col items-center gap-2 text-[#444] group-hover:text-[#666] transition-colors">
                    <Camera size={24} />
                    <span className="text-xs">Add Photo</span>
                  </div>
              }
              {photoPreview && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            {photoPreview && (
              <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); set('photo_url', null) }}
                className="mt-1 w-full text-xs text-[#555] hover:text-red-400 transition-colors">
                Remove photo
              </button>
            )}
          </div>

          {/* Core fields */}
          <div className="flex-1 space-y-3">
            <div>
              <label>Name *</label>
              <input autoFocus value={form.name ?? ''} onChange={e => set('name', e.target.value)}
                placeholder={cfg.placeholder} />
            </div>
            {cfg.fields.brand && (
              <div>
                <label>{cfg.brandLabel ?? 'Brand'}</label>
                <input value={form.brand ?? ''} onChange={e => set('brand', e.target.value)}
                  placeholder={`e.g. ${cfg.brandLabel ?? 'Brand'}`} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label>{cfg.typeLabel ?? 'Type'}</label>
                <select value={form.type ?? ''} onChange={e => set('type', e.target.value)}>
                  <option value="">— Select —</option>
                  {cfg.itemTypes.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label>Status</label>
                <select value={form.status ?? 'owned'} onChange={e => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Extra fields */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cfg.fields.year && (
            <div>
              <label>{cfg.yearLabel ?? 'Year'}</label>
              <input type="number" value={form.year ?? ''} onChange={e => set('year', e.target.value ? +e.target.value : null)}
                placeholder="e.g. 2019" min={1800} max={2099} />
            </div>
          )}
          {cfg.fields.region && (
            <div>
              <label>{cfg.regionLabel ?? 'Region'}</label>
              <input value={form.region ?? ''} onChange={e => set('region', e.target.value)}
                placeholder="e.g. Kentucky" />
            </div>
          )}
          {cfg.fields.abv && (
            <div>
              <label>ABV %</label>
              <input type="number" value={form.abv ?? ''} step={0.1} min={0} max={100}
                onChange={e => set('abv', e.target.value ? +e.target.value : null)} placeholder="46.5" />
            </div>
          )}
        </div>

        {/* Rating */}
        <div>
          <label>Rating (0–10)
            <span className="ml-2 font-mono font-semibold" style={{ color: accent }}>
              {form.rating != null ? form.rating.toFixed(1) : '—'}
            </span>
          </label>
          <input type="range" min={0} max={10} step={0.5}
            value={form.rating ?? 0}
            onChange={e => set('rating', +e.target.value)}
            className="w-full accent-[var(--accent)] cursor-pointer"
            style={{ '--accent': accent } as React.CSSProperties}
          />
        </div>

        {/* Market prices (populated via barcode scan) */}
        {(form.market_price_low != null || form.market_price_avg != null || form.market_price_high != null) && (
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <TrendingUp size={13} className="text-[#555]" />
              <span className="text-xs text-[#555] uppercase tracking-wide">Market Prices</span>
              {form.market_price_source && (
                <span className="ml-auto text-xs text-[#333]">via {form.market_price_source}</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2.5">
              {[
                { label: 'Low', val: form.market_price_low, color: '#10b981' },
                { label: 'Avg', val: form.market_price_avg, color: '#f59e0b' },
                { label: 'High', val: form.market_price_high, color: '#ef4444' },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center bg-[#141414] rounded-lg py-2">
                  <p className="text-xs text-[#444] mb-1">{label}</p>
                  <p className="font-mono font-semibold text-sm" style={{ color }}>
                    {val != null
                      ? val.toLocaleString('en-US', { style: 'currency', currency: form.market_price_currency ?? 'USD', maximumFractionDigits: 0 })
                      : '—'}
                  </p>
                </div>
              ))}
            </div>
            {form.market_price_avg != null && (
              <button
                type="button"
                onClick={() => set('purchase_price', form.market_price_avg)}
                className="text-xs text-[#555] hover:text-[#888] transition-colors underline underline-offset-2"
              >
                Use avg as purchase price
              </button>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label>Notes</label>
          <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={3}
            placeholder="Tasting notes, thoughts, details…" />
        </div>

        {/* Purchase */}
        <details className="group">
          <summary className="text-xs text-[#555] uppercase tracking-wide cursor-pointer hover:text-[#888] transition-colors list-none flex items-center gap-1">
            <span className="border border-[#2a2a2a] rounded px-2 py-0.5 group-open:border-[#3a3a3a]">Purchase info</span>
          </summary>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <label>Price</label>
              <input type="number" value={form.purchase_price ?? ''} min={0} step={0.01}
                onChange={e => set('purchase_price', e.target.value ? +e.target.value : null)} placeholder="0.00" />
            </div>
            <div>
              <label>Date</label>
              <input type="date" value={form.purchase_date ?? ''}
                onChange={e => set('purchase_date', e.target.value || null)} />
            </div>
            <div>
              <label>Store / Source</label>
              <input value={form.purchase_store ?? ''} onChange={e => set('purchase_store', e.target.value)}
                placeholder="e.g. Total Wine" />
            </div>
          </div>
        </details>

        {/* Wishlist toggle */}
        <button
          onClick={() => set('wishlist', !form.wishlist)}
          className={clsx(
            'flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-all',
            form.wishlist ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-[#2a2a2a] text-[#666] hover:border-[#3a3a3a]'
          )}
          style={{ '--accent': accent } as React.CSSProperties}
        >
          {form.wishlist ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          {form.wishlist ? 'On Wishlist' : 'Add to Wishlist'}
        </button>

        {/* Shelf placement */}
        {shelves.length > 0 && (
          <details className="group">
            <summary className="text-xs text-[#555] uppercase tracking-wide cursor-pointer hover:text-[#888] transition-colors list-none flex items-center gap-1">
              <span className="border border-[#2a2a2a] rounded px-2 py-0.5 group-open:border-[#3a3a3a]">
                Shelf placement {selectedShelfId && selectedRow != null ? '✓' : ''}
              </span>
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <label>Shelf</label>
                <select value={selectedShelfId ?? ''} onChange={e => { setSelectedShelfId(e.target.value || null); setSelectedRow(null); setSelectedCol(null) }}>
                  <option value="">— None —</option>
                  {shelves.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {selectedShelf && (
                <div>
                  <label>Pick a slot</label>
                  <div className="rounded-xl overflow-hidden border border-[#2a2a2a]">
                    <div className="px-2 pt-2 pb-0 flex flex-col gap-1 bg-[#0f0f0f]">
                      {Array.from({ length: selectedShelf.slots_tall }).map((_, row) => (
                        <div key={row} className="flex gap-1">
                          {Array.from({ length: selectedShelf.slots_wide }).map((_, col) => {
                            const key = `${row},${col}`
                            const isOcc = occupied.has(key)
                            const isSel = selectedRow === row && selectedCol === col
                            return (
                              <div key={col}
                                onClick={() => !isOcc && (setSelectedRow(row), setSelectedCol(col))}
                                className={clsx(
                                  'flex-1 h-8 rounded cursor-pointer transition-all border',
                                  isOcc ? 'bg-[#2a2a2a] border-[#333] cursor-not-allowed' :
                                  isSel ? 'border-[var(--accent)] bg-[var(--accent)]/20' :
                                  'bg-[#1a1a1a] border-[#222] hover:bg-[#222] hover:border-[#333]'
                                )}
                                style={{ '--accent': accent } as React.CSSProperties}
                              />
                            )
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="shelf-wood h-3 mx-2 mb-2 rounded" />
                  </div>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </Modal>
    </>
  )
}
