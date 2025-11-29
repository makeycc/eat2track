import { useMemo, useState } from 'react';
import { DaySlider } from './components/DaySlider';
import { MacroSummary } from './components/MacroSummary';
import { FoodList } from './components/FoodList';
import { AddProductForm } from './components/AddProductForm';
import { DiaryEntry, Macros, Product } from './types';

const sampleProducts: Product[] = [
  { id: 'p1', name: 'Куриная грудка', calories: 165, protein: 31, fat: 3.6, carbs: 0 },
  { id: 'p2', name: 'Рис отварной', calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  { id: 'p3', name: 'Авокадо', calories: 160, protein: 2, fat: 15, carbs: 9 },
];

function calculateDailyTotals(entries: DiaryEntry[]): Macros {
  return entries.reduce(
    (acc, entry) => {
      const factor = entry.weight / 100;
      const macros = entry.macrosOverride;
      acc.calories += macros?.calories ?? entry.product.calories * factor;
      acc.protein += macros?.protein ?? entry.product.protein * factor;
      acc.fat += macros?.fat ?? entry.product.fat * factor;
      acc.carbs += macros?.carbs ?? entry.product.carbs * factor;
      return acc;
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
  const [entries, setEntries] = useState<Record<string, DiaryEntry[]>>({
    [getTodayISO()]: sampleProducts.map((product) => ({ id: crypto.randomUUID(), product, weight: 200 })),
  });
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const currentEntries = entries[selectedDate] ?? [];
  const totals = useMemo(() => calculateDailyTotals(currentEntries), [currentEntries]);

  const upsertEntry = (entry: DiaryEntry) => {
    setEntries((prev) => {
      const dayEntries = prev[selectedDate] ?? [];
      const idx = dayEntries.findIndex((item) => item.id === entry.id);
      if (idx === -1) return { ...prev, [selectedDate]: [...dayEntries, entry] };
      const updated = [...dayEntries];
      updated[idx] = entry;
      return { ...prev, [selectedDate]: updated };
    });
  };

  const deleteEntry = (id: string) => {
    setEntries((prev) => {
      const dayEntries = prev[selectedDate] ?? [];
      return { ...prev, [selectedDate]: dayEntries.filter((item) => item.id !== id) };
    });
  };

  const handleSearch = (query: string) => {
    setSearchHistory((prev) => [query, ...prev.filter((item) => item !== query)].slice(0, 6));
  };

  const handleCreate = (entry: DiaryEntry) => {
    upsertEntry(entry);
    setSelectedDate(selectedDate);
  };

  return (
    <div className="app-shell">
      <header>
        <div>
          <p className="eyebrow">eat2track · телеграм мини-апп</p>
          <h1>Дневник питания</h1>
        </div>
        <div className="today-chip">{selectedDate}</div>
      </header>

      <DaySlider selectedDate={selectedDate} onChange={setSelectedDate} />

      <section>
        <h2>Сводка</h2>
        <MacroSummary macros={totals} />
      </section>

      <section>
        <div className="section-header">
          <h2>Продукты</h2>
          <span className="hint">редактируйте вес и КБЖУ без лишних шагов</span>
        </div>
        <FoodList entries={currentEntries} onUpdate={upsertEntry} onDelete={deleteEntry} />
      </section>

      <section>
        <AddProductForm onSubmit={handleCreate} onSearch={handleSearch} history={searchHistory} />
      </section>
    </div>
  );
}
