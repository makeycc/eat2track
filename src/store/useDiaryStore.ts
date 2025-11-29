import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { DiaryEntry, NewDiaryEntry, Product } from '../types';

const DEFAULT_USER_ID = 'demo-user';

const STORAGE_KEY = 'eat2track-cache-v1';

type StoredState = {
  entries: Record<string, DiaryEntry[]>;
};

function loadCache(): StoredState {
  if (typeof localStorage === 'undefined') return { entries: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: {} };
    return JSON.parse(raw) as StoredState;
  } catch (error) {
    console.warn('Failed to parse cache', error);
    return { entries: {} };
  }
}

function persistCache(entries: Record<string, DiaryEntry[]>) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries } satisfies StoredState));
  } catch (error) {
    console.warn('Failed to persist cache', error);
  }
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

type DiaryState = {
  selectedDate: string;
  entries: Record<string, DiaryEntry[]>;
  searchHistory: string[];
  setSelectedDate: (date: string) => void;
  fetchEntries: (date?: string) => Promise<void>;
  addEntry: (entry: NewDiaryEntry) => Promise<void>;
  updateEntry: (entry: DiaryEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  recordSearch: (query: string) => void;
};

const todayISO = getTodayISO();
const cached = loadCache();

const mapEntryFromDb = (row: {
  id: string;
  weight: number;
  date: string;
  override_macros: Record<string, number> | null;
  products: Product | Product[] | null;
}): DiaryEntry => {
  const product = Array.isArray(row.products) ? row.products[0] : row.products;

  if (!product) {
    throw new Error('Entry is missing linked product');
  }

  return {
    id: row.id,
    weight: row.weight,
    macrosOverride: row.override_macros ?? undefined,
    product,
  };
};

export const useDiaryStore = create<DiaryState>((set, get) => ({
  selectedDate: todayISO,
  entries: cached.entries,
  searchHistory: [],
  setSelectedDate: (date) => set({ selectedDate: date }),
  fetchEntries: async (date) => {
    const targetDate = date ?? get().selectedDate;
    const { data, error } = await supabase
      .from('diary_entries')
      .select('id, weight, date, override_macros, products:product_id(id, name, calories, protein, fat, carbs, barcode, notes)')
      .eq('user_id', DEFAULT_USER_ID)
      .eq('date', targetDate)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Failed to fetch entries, falling back to cache', error);
      set((state) => ({ ...state, entries: { ...state.entries, [targetDate]: state.entries[targetDate] ?? [] } }));
      return;
    }

    const parsed = (data ?? []).map(mapEntryFromDb);
    set((state) => {
      const nextEntries = { ...state.entries, [targetDate]: parsed };
      persistCache(nextEntries);
      return { ...state, entries: nextEntries };
    });
  },
  addEntry: async (entry) => {
    const date = get().selectedDate;
    const id = entry.id ?? crypto.randomUUID();
    const payload = {
      id,
      user_id: DEFAULT_USER_ID,
      date,
      product_id: entry.product.id,
      weight: entry.weight,
      override_macros: entry.macrosOverride ?? null,
    };

    const { error } = await supabase.from('diary_entries').upsert(payload);
    if (error) {
      console.warn('Failed to add entry, saving locally', error);
    }

    set((state) => {
      const dayEntries = state.entries[date] ?? [];
      const nextEntries = { ...state.entries, [date]: [...dayEntries, { ...entry, id }] };
      persistCache(nextEntries);
      return { ...state, entries: nextEntries };
    });
  },
  updateEntry: async (entry) => {
    const date = get().selectedDate;
    const payload = {
      id: entry.id,
      user_id: DEFAULT_USER_ID,
      date,
      product_id: entry.product.id,
      weight: entry.weight,
      override_macros: entry.macrosOverride ?? null,
    };

    const { error } = await supabase.from('diary_entries').upsert(payload);
    if (error) {
      console.warn('Failed to update entry, keeping local change', error);
    }

    set((state) => {
      const dayEntries = state.entries[date] ?? [];
      const idx = dayEntries.findIndex((item) => item.id === entry.id);
      if (idx === -1) return state;
      const updated = [...dayEntries];
      updated[idx] = entry;
      const nextEntries = { ...state.entries, [date]: updated };
      persistCache(nextEntries);
      return { ...state, entries: nextEntries };
    });
  },
  deleteEntry: async (id) => {
    const date = get().selectedDate;
    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('user_id', DEFAULT_USER_ID)
      .eq('id', id);

    if (error) {
      console.warn('Failed to delete entry, removing from cache only', error);
    }

    set((state) => {
      const dayEntries = state.entries[date] ?? [];
      const nextEntries = { ...state.entries, [date]: dayEntries.filter((item) => item.id !== id) };
      persistCache(nextEntries);
      return { ...state, entries: nextEntries };
    });
  },
  recordSearch: (query) =>
    set((state) => ({
      searchHistory: [query, ...state.searchHistory.filter((item) => item !== query)].slice(0, 6),
    })),
}));
