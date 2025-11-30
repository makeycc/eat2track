import { useNavigate } from 'react-router-dom';
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

type FoodListProps = {
  entries: DiaryEntry[];
  onDelete: (id: string) => Promise<void>;
};

export function FoodList({ entries, onDelete }: FoodListProps) {
  const navigate = useNavigate();

  return (
    <div className="food-list">
      {entries.map((entry) => {
        const macros = calculatePortionMacros(entry.product, entry.weight, entry.macrosOverride);
        return (
          <div key={entry.id} className="food-card">
            <div className="food-header">
              <div>
                <div className="food-title">{entry.product.name}</div>
                <div className="food-sub">{entry.weight} г · {roundToInt(macros.calories)} ккал</div>
              </div>
              <div className="food-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => navigate('/product', { state: { entryId: entry.id } })}
                >
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
          </div>
        );
      })}
    </div>
  );
}
