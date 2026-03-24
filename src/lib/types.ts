export type DisplayMode = 'shelf' | 'grid' | 'list' | 'room'

export type CollectionType =
  | 'whiskey' | 'wine' | 'beer'
  | 'books' | 'vinyl' | 'comics'
  | 'tools' | 'lego' | 'art'
  | 'trading-cards' | 'games' | 'sneakers'
  | 'watches' | 'cameras' | 'custom'

export type ItemStatus = 'owned' | 'full' | 'partial' | 'empty' | 'gifted' | 'sold'

export interface Collection {
  id: string
  user_id: string
  name: string
  type: CollectionType
  description: string | null
  display_mode: DisplayMode
  accent_color: string | null
  is_public: boolean
  public_slug: string | null
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  collection_id: string
  name: string
  description: string | null
  position_x: number | null
  position_y: number | null
  created_at: string
  updated_at: string
}

export interface Shelf {
  id: string
  room_id: string
  name: string
  slots_wide: number
  slots_tall: number
  position_x: number | null
  position_y: number | null
  created_at: string
  updated_at: string
}

export interface Item {
  id: string
  collection_id: string
  shelf_id: string | null
  shelf_row: number | null
  shelf_col: number | null
  name: string
  brand: string | null
  type: string | null
  year: number | null
  region: string | null
  abv: number | null
  notes: string | null
  rating: number | null
  status: ItemStatus
  purchase_price: number | null
  purchase_date: string | null
  purchase_store: string | null
  photo_url: string | null
  tags: string[]
  wishlist: boolean
  created_at: string
  updated_at: string
}

export interface SupabaseConfig {
  url: string
  anonKey: string
}
