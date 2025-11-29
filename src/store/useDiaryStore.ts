import { create } from 'zustand';
import { DiaryEntry, Product } from '../types';

const sampleProducts: Product[] = [
  { id: 'p1', name: 'Куриная грудка', calories: 165, protein: 31, fat: 3.6, carbs: 0 },
  { id: 'p2', name: 'Рис отварной', calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  { id: 'p3', name: 'Авокадо', calories: 160, protein: 2, fat: 15, carbs: 9 },
];

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

type DiaryState = {
  selectedDate: string;
  entries: Record<string, DiaryEntry[]>;
  searchHistory: string[];
  setSelectedDate: (date: string) => void;
  addEntry: (entry: DiaryEntry) => void;
  updateEntry: (entry: DiaryEntry) => void;
  deleteEntry: (id: string) => void;
  recordSearch: (query: string) => void;
};

const todayISO = getTodayISO();

export const useDiaryStore = create<DiaryState>((set) => ({
  selectedDate: todayISO,
  entries: {
    [todayISO]: sampleProducts.map((product) => ({ id: crypto.randomUUID(), product, weight: 200 })),
  },
  searchHistory: [],
  setSelectedDate: (date) => set({ selectedDate: date }),
  addEntry: (entry) =>
    set((state) => {
      const date = state.selectedDate;
      const dayEntries = state.entries[date] ?? [];
      return { ...state, entries: { ...state.entries, [date]: [...dayEntries, entry] } };
    }),
  updateEntry: (entry) =>
    set((state) => {
      const date = state.selectedDate;
      const dayEntries = state.entries[date] ?? [];
      const idx = dayEntries.findIndex((item) => item.id === entry.id);
      if (idx === -1) return state;
      const updated = [...dayEntries];
      updated[idx] = entry;
      return { ...state, entries: { ...state.entries, [date]: updated } };
    }),
  deleteEntry: (id) =>
    set((state) => {
      const date = state.selectedDate;
      const dayEntries = state.entries[date] ?? [];
      return { ...state, entries: { ...state.entries, [date]: dayEntries.filter((item) => item.id !== id) } };
    }),
  recordSearch: (query) =>
    set((state) => ({
      searchHistory: [query, ...state.searchHistory.filter((item) => item !== query)].slice(0, 6),
    })),
}));
