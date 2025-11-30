import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DaySlider } from '../components/DaySlider';
import { useDiaryStore } from '../store/useDiaryStore';
import { Macros } from '../types';

type LocationState = {
  entryId?: string;
};

type MacrosField = keyof Macros;

const macroLabels: Record<MacrosField, string> = {
  calories: 'Калории',
  protein: 'Белки',
  fat: 'Жиры',
  carbs: 'Углеводы',
};

export function ProductPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { entryId } = (location.state as LocationState | null) ?? {};

  const selectedDate = useDiaryStore((state) => state.selectedDate);
  const setSelectedDate = useDiaryStore((state) => state.setSelectedDate);
  const entries = useDiaryStore((state) => state.entries[state.selectedDate] ?? []);
  const fetchEntries = useDiaryStore((state) => state.fetchEntries);
  const updateEntry = useDiaryStore((state) => state.updateEntry);

  const entry = useMemo(
    () => entries.find((item) => item.id === entryId) ?? entries[0],
    [entries, entryId]
  );

  const [weight, setWeight] = useState(entry ? entry.weight.toString() : '');
  const [macrosOverride, setMacrosOverride] = useState<Partial<Macros>>(entry?.macrosOverride ?? {});

  useEffect(() => {
    fetchEntries(selectedDate);
  }, [fetchEntries, selectedDate]);

  useEffect(() => {
    if (!entry) return;
    setWeight(entry.weight.toString());
    setMacrosOverride(entry.macrosOverride ?? {});
  }, [entry?.id]);

  const normalizedOverride = useMemo(() => {
    const next: Partial<Macros> = {};
    (Object.keys(macrosOverride) as MacrosField[]).forEach((key) => {
      const value = macrosOverride[key];
      if (typeof value === 'number' && !Number.isNaN(value)) {
        next[key] = value;
      }
    });
    return next;
  }, [macrosOverride]);

  const previewMacros = useMemo(() => {
    if (!entry) return null;
    const grams = Math.max(1, Math.round(Number(weight) || 0));
    const factor = grams / 100;
    const base = {
      calories: entry.product.calories * factor,
      protein: entry.product.protein * factor,
      fat: entry.product.fat * factor,
      carbs: entry.product.carbs * factor,
    } satisfies Macros;

    return {
      calories: normalizedOverride.calories ?? base.calories,
      protein: normalizedOverride.protein ?? base.protein,
      fat: normalizedOverride.fat ?? base.fat,
      carbs: normalizedOverride.carbs ?? base.carbs,
    } satisfies Macros;
  }, [entry, normalizedOverride, weight]);

  const handleMacroChange = (key: MacrosField, value: string) => {
    if (!value.trim()) {
      setMacrosOverride((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      setMacrosOverride((prev) => ({ ...prev, [key]: numeric }));
    }
  };

  const handleSave = async () => {
    if (!entry) return;
    const grams = Math.max(1, Math.round(Number(weight) || 0));
    await updateEntry({
      ...entry,
      weight: grams,
      macrosOverride: Object.keys(normalizedOverride).length ? normalizedOverride : undefined,
    });
    navigate('/');
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (!entry) {
    return (
      <>
        <DaySlider selectedDate={selectedDate} onChange={setSelectedDate} />
        <section>
          <div className="section-header">
            <h2>Карточка продукта</h2>
            <button type="button" className="ghost" onClick={() => navigate('/')}>На главную</button>
          </div>
          <p className="hint">Нет продуктов за выбранную дату. Добавьте запись на главной странице.</p>
        </section>
      </>
    );
  }

  return (
    <>
      <DaySlider selectedDate={selectedDate} onChange={setSelectedDate} />

      <section>
        <div className="section-header">
          <div>
            <h2>Карточка продукта</h2>
            <p className="hint">Дата: {selectedDate}</p>
          </div>
          <button type="button" className="ghost" onClick={handleCancel}>
            Отмена
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{entry.product.name}</div>
              <div className="card-sub">{entry.product.calories} ккал на 100 г</div>
            </div>
            <button type="button" className="ghost" onClick={() => navigate('/add')}>
              Добавить другой
            </button>
          </div>

          <div className="weight-row">
            <label>
              Вес (г)
              <input
                type="number"
                inputMode="numeric"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </label>
            {previewMacros && (
              <div className="macro-preview">
                <div>{Math.round(previewMacros.calories)} ккал</div>
                <div>Б {Math.round(previewMacros.protein)} г</div>
                <div>Ж {Math.round(previewMacros.fat)} г</div>
                <div>У {Math.round(previewMacros.carbs)} г</div>
              </div>
            )}
          </div>

          <div className="editor-grid">
            {(Object.keys(macroLabels) as MacrosField[]).map((key) => (
              <label key={key} className="editor-field">
                {macroLabels[key]}
                <input
                  type="number"
                  inputMode="numeric"
                  value={macrosOverride[key] ?? ''}
                  placeholder="авто"
                  onChange={(e) => handleMacroChange(key, e.target.value)}
                />
              </label>
            ))}
          </div>

          <div className="cta-row">
            <button type="button" className="ghost" onClick={handleCancel}>
              Отмена
            </button>
            <button type="button" onClick={handleSave}>
              Сохранить
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
