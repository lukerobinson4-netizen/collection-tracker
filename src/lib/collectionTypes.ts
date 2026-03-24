import type { CollectionType, DisplayMode } from './types'

export interface CollectionTypeConfig {
  type: CollectionType
  label: string
  icon: string
  accentColor: string
  defaultDisplayMode: DisplayMode
  availableDisplayModes: DisplayMode[]
  itemTypes: string[]
  fields: {
    year?: boolean
    region?: boolean
    abv?: boolean
    brand?: boolean
  }
  itemLabel: string        // singular
  itemsLabel: string       // plural
  brandLabel?: string
  typeLabel?: string
  regionLabel?: string
  yearLabel?: string
  placeholder: string
}

export const COLLECTION_TYPES: Record<CollectionType, CollectionTypeConfig> = {
  whiskey: {
    type: 'whiskey', label: 'Whiskey', icon: '🥃',
    accentColor: '#d97706',
    defaultDisplayMode: 'shelf',
    availableDisplayModes: ['shelf', 'grid', 'list', 'room'],
    itemTypes: ['Bourbon', 'Scotch', 'Irish', 'Japanese', 'Canadian', 'Rye', 'Tennessee', 'Single Malt', 'Blended', 'Other'],
    fields: { year: true, region: true, abv: true, brand: true },
    itemLabel: 'Bottle', itemsLabel: 'Bottles',
    brandLabel: 'Distillery', regionLabel: 'Region', yearLabel: 'Vintage',
    placeholder: 'e.g. Blanton\'s Original, Pappy Van Winkle…',
  },
  wine: {
    type: 'wine', label: 'Wine', icon: '🍷',
    accentColor: '#9f1239',
    defaultDisplayMode: 'shelf',
    availableDisplayModes: ['shelf', 'grid', 'list', 'room'],
    itemTypes: ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert', 'Fortified', 'Orange', 'Other'],
    fields: { year: true, region: true, abv: true, brand: true },
    itemLabel: 'Bottle', itemsLabel: 'Bottles',
    brandLabel: 'Winery', regionLabel: 'Appellation',
    placeholder: 'e.g. Opus One, Château Margaux…',
  },
  beer: {
    type: 'beer', label: 'Beer', icon: '🍺',
    accentColor: '#b45309',
    defaultDisplayMode: 'grid',
    availableDisplayModes: ['shelf', 'grid', 'list'],
    itemTypes: ['IPA', 'Stout', 'Lager', 'Pale Ale', 'Porter', 'Sour', 'Saison', 'Wheat', 'Hefeweizen', 'Other'],
    fields: { year: false, region: true, abv: true, brand: true },
    itemLabel: 'Beer', itemsLabel: 'Beers',
    brandLabel: 'Brewery',
    placeholder: 'e.g. Pliny the Elder, Heady Topper…',
  },
  books: {
    type: 'books', label: 'Books', icon: '📚',
    accentColor: '#0ea5e9',
    defaultDisplayMode: 'shelf',
    availableDisplayModes: ['shelf', 'grid', 'list'],
    itemTypes: ['Fiction', 'Non-Fiction', 'Sci-Fi', 'Fantasy', 'Biography', 'History', 'Science', 'Art', 'Comics', 'Other'],
    fields: { year: true, region: false, abv: false, brand: true },
    itemLabel: 'Book', itemsLabel: 'Books',
    brandLabel: 'Author', yearLabel: 'Published',
    placeholder: 'e.g. Dune, Sapiens…',
  },
  vinyl: {
    type: 'vinyl', label: 'Vinyl', icon: '💿',
    accentColor: '#7c3aed',
    defaultDisplayMode: 'grid',
    availableDisplayModes: ['shelf', 'grid', 'list'],
    itemTypes: ['LP', 'EP', '7"', '12"', 'Picture Disc', 'Coloured', 'Box Set', 'Other'],
    fields: { year: true, region: false, abv: false, brand: true },
    itemLabel: 'Record', itemsLabel: 'Records',
    brandLabel: 'Artist', typeLabel: 'Format', yearLabel: 'Year',
    placeholder: 'e.g. Dark Side of the Moon, Kind of Blue…',
  },
  comics: {
    type: 'comics', label: 'Comics', icon: '📖',
    accentColor: '#db2777',
    defaultDisplayMode: 'grid',
    availableDisplayModes: ['grid', 'list'],
    itemTypes: ['Single Issue', 'Trade Paperback', 'Hardcover', 'Graphic Novel', 'Manga', 'Other'],
    fields: { year: true, region: false, abv: false, brand: true },
    itemLabel: 'Issue', itemsLabel: 'Issues',
    brandLabel: 'Publisher', yearLabel: 'Year',
    placeholder: 'e.g. Amazing Spider-Man #1…',
  },
  tools: {
    type: 'tools', label: 'Tools', icon: '🔧',
    accentColor: '#64748b',
    defaultDisplayMode: 'grid',
    availableDisplayModes: ['grid', 'list', 'room'],
    itemTypes: ['Hand Tool', 'Power Tool', 'Measuring', 'Cutting', 'Fastening', 'Clamping', 'Storage', 'Other'],
    fields: { year: false, region: false, abv: false, brand: true },
    itemLabel: 'Tool', itemsLabel: 'Tools',
    brandLabel: 'Brand',
    placeholder: 'e.g. DeWalt Drill, Stanley Plane…',
  },
  lego: {
    type: 'lego', label: 'LEGO', icon: '🧱',
    accentColor: '#e11d48',
    defaultDisplayMode: 'grid',
    availableDisplayModes: ['grid', 'list'],
    itemTypes: ['City', 'Technic', 'Star Wars', 'Harry Potter', 'Icons', 'Creator', 'Ideas', 'Architecture', 'Art', 'Other'],
    fields: { year: true, region: false, abv: false, brand: false },
    itemLabel: 'Set', itemsLabel: 'Sets',
    yearLabel: 'Release Year', typeLabel: 'Theme',
    placeholder: 'e.g. Millennium Falcon, Eiffel Tower…',
  },
  art: {
    type: 'art', label: 'Art', icon: '🎨',
    accentColor: '#f59e0b',
    defaultDisplayMode: 'grid',
    availableDisplayModes: ['grid', 'list', 'room'],
    itemTypes: ['Painting', 'Print', 'Drawing', 'Sculpture', 'Photography', 'Digital', 'Mixed Media', 'Other'],
    fields: { year: true, region: true, abv: false, brand: true },
    itemLabel: 'Piece', itemsLabel: 'Pieces',
    brandLabel: 'Artist', regionLabel: 'Origin',
    placeholder: 'e.g. Sunset Study, Abstract #3…',
  },
  'trading-cards': {
    type: 'trading-cards', label: 'Trading Cards', icon: '🃏',
    accentColor: '#10b981',
    defaultDisplayMode: 'grid',
    availableDisplayModes: ['grid', 'list'],
    itemTypes: ['Sports', 'Pokémon', 'Magic: The Gathering', 'Yu-Gi-Oh!', 'Flesh & Blood', 'Vintage', 'Other'],
    fields: { year: true, region: false, abv: false, brand: true },
    itemLabel: 'Card', itemsLabel: 'Cards',
    brandLabel: 'Set / Publisher', yearLabel: 'Year',
    placeholder: 'e.g. Charizard Holo, Rookie Mantle…',
  },
  games: {
    type: 'games', label: 'Games', icon: '🎮',
    accentColor: '#6366f1',
    defaultDisplayMode: 'grid',
    availableDisplayModes: ['grid', 'list', 'shelf'],
    itemTypes: ['Board Game', 'Video Game', 'Card Game', 'RPG', 'Console', 'PC', 'Retro', 'Other'],
    fields: { year: true, region: false, abv: false, brand: true },
    itemLabel: 'Game', itemsLabel: 'Games',
    brandLabel: 'Publisher / Developer',
    placeholder: 'e.g. Catan, The Last of Us…',
  },
  sneakers: {
    type: 'sneakers', label: 'Sneakers', icon: '👟',
    accentColor: '#f97316',
    defaultDisplayMode: 'grid',
    availableDisplayModes: ['grid', 'list'],
    itemTypes: ['Running', 'Basketball', 'Lifestyle', 'Skate', 'Training', 'Retro', 'Collaboration', 'Other'],
    fields: { year: true, region: false, abv: false, brand: true },
    itemLabel: 'Pair', itemsLabel: 'Pairs',
    brandLabel: 'Brand', yearLabel: 'Release Year',
    placeholder: 'e.g. Air Jordan 1 Chicago, Yeezy 350…',
  },
  watches: {
    type: 'watches', label: 'Watches', icon: '⌚',
    accentColor: '#84cc16',
    defaultDisplayMode: 'grid',
    availableDisplayModes: ['grid', 'list'],
    itemTypes: ['Dress', 'Sport', 'Diver', 'Pilot', 'Field', 'Chronograph', 'Smartwatch', 'Vintage', 'Other'],
    fields: { year: true, region: true, abv: false, brand: true },
    itemLabel: 'Watch', itemsLabel: 'Watches',
    brandLabel: 'Manufacturer', regionLabel: 'Country of Origin',
    placeholder: 'e.g. Rolex Submariner, Omega Speedmaster…',
  },
  cameras: {
    type: 'cameras', label: 'Cameras', icon: '📷',
    accentColor: '#06b6d4',
    defaultDisplayMode: 'grid',
    availableDisplayModes: ['grid', 'list'],
    itemTypes: ['DSLR', 'Mirrorless', 'Film SLR', 'Rangefinder', 'Medium Format', 'Point & Shoot', 'Instant', 'Lens', 'Other'],
    fields: { year: true, region: true, abv: false, brand: true },
    itemLabel: 'Camera', itemsLabel: 'Cameras',
    brandLabel: 'Brand', regionLabel: 'Country of Origin',
    placeholder: 'e.g. Leica M6, Canon AE-1…',
  },
  custom: {
    type: 'custom', label: 'Custom', icon: '📦',
    accentColor: '#6b7280',
    defaultDisplayMode: 'grid',
    availableDisplayModes: ['shelf', 'grid', 'list', 'room'],
    itemTypes: ['Type A', 'Type B', 'Type C', 'Other'],
    fields: { year: true, region: true, abv: false, brand: true },
    itemLabel: 'Item', itemsLabel: 'Items',
    placeholder: 'Add your item…',
  },
}

export const COLLECTION_TYPE_LIST = Object.values(COLLECTION_TYPES)

export function getConfig(type: CollectionType): CollectionTypeConfig {
  return COLLECTION_TYPES[type] ?? COLLECTION_TYPES.custom
}
