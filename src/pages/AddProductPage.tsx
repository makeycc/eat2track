import { Link } from 'react-router-dom';
import { AddProductForm } from '../components/AddProductForm';
import { DaySlider } from '../components/DaySlider';
import { useDiaryStore } from '../store/useDiaryStore';
import { useEffect } from 'react';

export function AddProductPage() {
  const selectedDate = useDiaryStore((state) => state.selectedDate);
  const setSelectedDate = useDiaryStore((state) => state.setSelectedDate);
  const addEntry = useDiaryStore((state) => state.addEntry);
  const recordSearch = useDiaryStore((state) => state.recordSearch);
  const searchHistory = useDiaryStore((state) => state.searchHistory);
  const fetchEntries = useDiaryStore((state) => state.fetchEntries);

  useEffect(() => {
    fetchEntries(selectedDate);
  }, [fetchEntries, selectedDate]);

  return (
    <>
      <DaySlider selectedDate={selectedDate} onChange={setSelectedDate} />

      <section>
        <div className="section-header">
          <div>
            <h2>Добавить продукт</h2>
            <span className="hint">дата: {selectedDate}</span>
          </div>
          <Link to="/" className="nav-button ghost">Назад</Link>
        </div>
        <AddProductForm onSubmit={addEntry} onSearch={recordSearch} history={searchHistory} />
      </section>
    </>
  );
}
