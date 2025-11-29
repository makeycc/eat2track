import { useState } from 'react';
import { DiaryEntry, Macros, Product } from '../types';

function roundToInt(value: number) {
  return Math.round(value);
}

function calculatePortionMacros(product: Product, weight: number, override?: Partial<Macros>): Macros {
  const factor = weight / 100;
  const base: Macros = {
    calories: product.calories * factor,
    protein: product.protein * factor,
    fat: product.fat * factor,
    carbs: product.carbs * factor,
  };

  if (!override) return base;
  return {
    calories: override.calories ?? base.calories,
    protein: override.protein ?? base.protein,
    fat: override.fat ?? base.fat,
    carbs: override.carbs ?? base.carbs,
  };
}

type EditorProps = {
  entry: DiaryEntry;
  onSave: (entry: DiaryEntry) => void;
  onCancel: () => void;
};

function EntryEditor({ entry, onSave, onCancel }: EditorProps) {
  const [weight, setWeight] = useState(entry.weight.toString());
  const [macros, setMacros] = useState<Partial<Macros>>(entry.macrosOverride ?? {});

  const updateMacro = (key: keyof Macros, value: string) => {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      setMacros((prev) => ({ ...prev, [key]: numeric }));
    }
  };

  return (
    <div className="entry-editor">
      <div className="editor-row">
        <label>
          Вес, г
          <input
            type="number"
            min={0}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <small>округляем математически и без дробей</small>
      </div>
      <div className="editor-grid">
        {(['calories', 'protein', 'fat', 'carbs'] as (keyof Macros)[]).map((key) => (
          <label key={key} className="editor-field">
            {key === 'calories' ? 'Калории' : key === 'protein' ? 'Белки' : key === 'fat' ? 'Жиры' : 'Углеводы'}
            <input
              type="number"
              inputMode="numeric"
              value={macros[key] ?? ''}
              placeholder="авто"
              onChange={(e) => updateMacro(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="editor-actions">
        <button type="button" className="ghost" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="button"
          onClick={() =>
            onSave({
              ...entry,
              weight: roundToInt(Number(weight) || 0),
              macrosOverride: Object.keys(macros).length ? macros : undefined,
            })
          }
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}

type FoodListProps = {
  entries: DiaryEntry[];
  onUpdate: (entry: DiaryEntry) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function FoodList({ entries, onUpdate, onDelete }: FoodListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="food-list">
      {entries.map((entry) => {
        const macros = calculatePortionMacros(entry.product, entry.weight, entry.macrosOverride);
        const isEditing = editingId === entry.id;
        return (
          <div key={entry.id} className="food-card">
            <div className="food-header">
              <div>
                <div className="food-title">{entry.product.name}</div>
                <div className="food-sub">{entry.weight} г · {roundToInt(macros.calories)} ккал</div>
              </div>
              <div className="food-actions">
                <button type="button" className="ghost" onClick={() => setEditingId(entry.id)}>
                  Редактировать
                </button>
                <button type="button" className="ghost danger" onClick={() => onDelete(entry.id)}>
                  Удалить
                </button>
              </div>
            </div>
            <div className="macro-row">
              <span>Б: {roundToInt(macros.protein)} г</span>
              <span>Ж: {roundToInt(macros.fat)} г</span>
              <span>У: {roundToInt(macros.carbs)} г</span>
            </div>
            {isEditing && (
              <EntryEditor
                entry={entry}
                onSave={(updated) => {
                  onUpdate(updated);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
