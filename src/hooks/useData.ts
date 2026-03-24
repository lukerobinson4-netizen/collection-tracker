import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabase'
import { useAppStore } from '../stores/appStore'
import type { Collection, Room, Shelf, Item } from '../lib/types'

// ─── Collections ─────────────────────────────────────────────────────────────

export function useCollections() {
  const setCollections = useAppStore(s => s.setCollections)
  return useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const sb = getSupabase()
      const { data, error } = await sb.from('collections').select('*').order('created_at')
      if (error) throw error
      setCollections(data ?? [])
      return (data ?? []) as Collection[]
    },
  })
}

export function useUpsertCollection() {
  const qc = useQueryClient()
  const addToast = useAppStore(s => s.addToast)
  return useMutation({
    mutationFn: async (payload: Partial<Collection> & { name: string; type: string }) => {
      const sb = getSupabase()
      const { data: { user } } = await sb.auth.getUser()
      const record = { ...payload, user_id: user!.id }
      const { data, error } = payload.id
        ? await sb.from('collections').update(record).eq('id', payload.id).select().single()
        : await sb.from('collections').insert(record).select().single()
      if (error) throw error
      return data as Collection
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collections'] }); addToast('Collection saved') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })
}

export function useDeleteCollection() {
  const qc = useQueryClient()
  const addToast = useAppStore(s => s.addToast)
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('collections').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collections'] }); addToast('Collection deleted') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

export function useRooms(collectionId: string | null) {
  const setRooms = useAppStore(s => s.setRooms)
  return useQuery({
    queryKey: ['rooms', collectionId],
    enabled: !!collectionId,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('rooms').select('*')
        .eq('collection_id', collectionId!).order('created_at')
      if (error) throw error
      setRooms(data ?? [])
      return (data ?? []) as Room[]
    },
  })
}

export function useUpsertRoom() {
  const qc = useQueryClient()
  const addToast = useAppStore(s => s.addToast)
  const collectionId = useAppStore(s => s.activeCollectionId)
  return useMutation({
    mutationFn: async (payload: Partial<Room> & { name: string; collection_id: string }) => {
      const sb = getSupabase()
      const { data, error } = payload.id
        ? await sb.from('rooms').update(payload).eq('id', payload.id).select().single()
        : await sb.from('rooms').insert(payload).select().single()
      if (error) throw error
      return data as Room
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms', collectionId] }); addToast('Room saved') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })
}

export function useDeleteRoom() {
  const qc = useQueryClient()
  const addToast = useAppStore(s => s.addToast)
  const collectionId = useAppStore(s => s.activeCollectionId)
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('rooms').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms', collectionId] }); addToast('Room deleted') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })
}

// ─── Shelves ─────────────────────────────────────────────────────────────────

export function useShelves(collectionId: string | null) {
  const setShelves = useAppStore(s => s.setShelves)
  return useQuery({
    queryKey: ['shelves', collectionId],
    enabled: !!collectionId,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('shelves')
        .select('*, rooms!inner(collection_id)').eq('rooms.collection_id', collectionId!)
      if (error) throw error
      setShelves(data ?? [])
      return (data ?? []) as Shelf[]
    },
  })
}

export function useUpsertShelf() {
  const qc = useQueryClient()
  const addToast = useAppStore(s => s.addToast)
  const collectionId = useAppStore(s => s.activeCollectionId)
  return useMutation({
    mutationFn: async (payload: Partial<Shelf> & { name: string; room_id: string }) => {
      const sb = getSupabase()
      const { data, error } = payload.id
        ? await sb.from('shelves').update(payload).eq('id', payload.id).select().single()
        : await sb.from('shelves').insert(payload).select().single()
      if (error) throw error
      return data as Shelf
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shelves', collectionId] }); addToast('Shelf saved') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })
}

export function useDeleteShelf() {
  const qc = useQueryClient()
  const addToast = useAppStore(s => s.addToast)
  const collectionId = useAppStore(s => s.activeCollectionId)
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('shelves').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shelves', collectionId] }); addToast('Shelf deleted') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })
}

// ─── Items ───────────────────────────────────────────────────────────────────

export function useItems(collectionId: string | null) {
  const setItems = useAppStore(s => s.setItems)
  return useQuery({
    queryKey: ['items', collectionId],
    enabled: !!collectionId,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('items')
        .select('*').eq('collection_id', collectionId!).order('name')
      if (error) throw error
      setItems(data ?? [])
      return (data ?? []) as Item[]
    },
  })
}

export function useUpsertItem() {
  const qc = useQueryClient()
  const addToast = useAppStore(s => s.addToast)
  const collectionId = useAppStore(s => s.activeCollectionId)
  return useMutation({
    mutationFn: async (payload: Partial<Item> & { name: string; collection_id: string }) => {
      const sb = getSupabase()
      const { data, error } = payload.id
        ? await sb.from('items').update(payload).eq('id', payload.id).select().single()
        : await sb.from('items').insert(payload).select().single()
      if (error) throw error
      return data as Item
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items', collectionId] }); addToast('Item saved') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  const addToast = useAppStore(s => s.addToast)
  const collectionId = useAppStore(s => s.activeCollectionId)
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items', collectionId] }); addToast('Item deleted') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })
}

export async function uploadPhoto(file: File, userId: string): Promise<string> {
  const sb = getSupabase()
  const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`
  const { error } = await sb.storage.from('item-photos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = sb.storage.from('item-photos').getPublicUrl(path)
  return data.publicUrl
}
