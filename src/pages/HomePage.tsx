import { useMemo } from 'react';
import { DaySlider } from '../components/DaySlider';
import { MacroSummary } from '../components/MacroSummary';
import { FoodList } from '../components/FoodList';
import { DiaryEntry, Macros } from '../types';
import { useDiaryStore } from '../store/useDiaryStore';

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

export function HomePage() {
  const selectedDate = useDiaryStore((state) => state.selectedDate);
  const setSelectedDate = useDiaryStore((state) => state.setSelectedDate);
  const entries = useDiaryStore((state) => state.entries[state.selectedDate] ?? []);
  const updateEntry = useDiaryStore((state) => state.updateEntry);
  const deleteEntry = useDiaryStore((state) => state.deleteEntry);

  const totals = useMemo(() => calculateDailyTotals(entries), [entries]);

  return (
    <>
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
        <FoodList entries={entries} onUpdate={updateEntry} onDelete={deleteEntry} />
      </section>
    </>
  );
}
