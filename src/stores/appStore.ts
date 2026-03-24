import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { Collection, Room, Shelf, Item } from '../lib/types'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface AppState {
  // Auth
  user: User | null
  setUser: (user: User | null) => void

  // Collections
  collections: Collection[]
  setCollections: (c: Collection[]) => void
  activeCollectionId: string | null
  setActiveCollection: (id: string | null) => void

  // Rooms + Shelves + Items
  rooms: Room[]
  setRooms: (r: Room[]) => void
  shelves: Shelf[]
  setShelves: (s: Shelf[]) => void
  items: Item[]
  setItems: (i: Item[]) => void

  // View state
  activeRoomId: string | null
  setActiveRoom: (id: string | null) => void
  activeShelfId: string | null
  setActiveShelf: (id: string | null) => void

  // Derived helpers
  activeCollection: Collection | null
  activeRoom: Room | null
  activeShelf: Shelf | null

  // Toast
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void

  // Search / filter
  searchQuery: string
  setSearchQuery: (q: string) => void
  showWishlist: boolean
  setShowWishlist: (v: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),

  collections: [],
  setCollections: (collections) => set({ collections }),
  activeCollectionId: null,
  setActiveCollection: (id) => set({ activeCollectionId: id, activeRoomId: null, activeShelfId: null }),

  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  shelves: [],
  setShelves: (shelves) => set({ shelves }),
  items: [],
  setItems: (items) => set({ items }),

  activeRoomId: null,
  setActiveRoom: (id) => set({ activeRoomId: id, activeShelfId: null }),
  activeShelfId: null,
  setActiveShelf: (id) => set({ activeShelfId: id }),

  get activeCollection() {
    const { collections, activeCollectionId } = get()
    return collections.find(c => c.id === activeCollectionId) ?? null
  },
  get activeRoom() {
    const { rooms, activeRoomId } = get()
    return rooms.find(r => r.id === activeRoomId) ?? null
  },
  get activeShelf() {
    const { shelves, activeShelfId } = get()
    return shelves.find(s => s.id === activeShelfId) ?? null
  },

  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), 3500)
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  showWishlist: false,
  setShowWishlist: (v) => set({ showWishlist: v }),
}))
