import { useState } from 'react';
import { DiaryEntry, Product } from '../types';

const emptyProduct: Product = {
  id: '',
  name: '',
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
};

type AddProductFormProps = {
  onSubmit: (entry: DiaryEntry) => void;
  onSearch: (query: string) => void;
  history: string[];
};

export function AddProductForm({ onSubmit, onSearch, history }: AddProductFormProps) {
  const [product, setProduct] = useState<Product>(emptyProduct);
  const [weight, setWeight] = useState('100');
  const [query, setQuery] = useState('');

  const handleSubmit = () => {
    if (!product.name.trim()) return;
    const grams = Math.round(Number(weight) || 0);
    onSubmit({
      id: crypto.randomUUID(),
      product: { ...product, id: crypto.randomUUID() },
      weight: grams,
    });
    setProduct(emptyProduct);
    setWeight('100');
  };

  return (
    <div className="add-product">
      <div className="block-label">Добавить продукт</div>
      <div className="search-bar">
        <input
          type="search"
          placeholder="Поиск по базе..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            if (!query.trim()) return;
            onSearch(query.trim());
          }}
        >
          Искать
        </button>
      </div>

      {!!history.length && (
        <div className="history">
          <div className="history-title">История</div>
          <div className="history-list">
            {history.map((item) => (
              <button key={item} type="button" className="history-chip" onClick={() => setQuery(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="block-label">Ручной ввод</div>
      <div className="manual-grid">
        <label>
          Название
          <input
            value={product.name}
            onChange={(e) => setProduct((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Например, гречка вареная"
          />
        </label>
        <label>
          Калории (ккал)
          <input
            type="number"
            inputMode="numeric"
            value={product.calories}
            onChange={(e) => setProduct((prev) => ({ ...prev, calories: Number(e.target.value) }))}
          />
        </label>
        <label>
          Белки (г)
          <input
            type="number"
            inputMode="numeric"
            value={product.protein}
            onChange={(e) => setProduct((prev) => ({ ...prev, protein: Number(e.target.value) }))}
          />
        </label>
        <label>
          Жиры (г)
          <input
            type="number"
            inputMode="numeric"
            value={product.fat}
            onChange={(e) => setProduct((prev) => ({ ...prev, fat: Number(e.target.value) }))}
          />
        </label>
        <label>
          Углеводы (г)
          <input
            type="number"
            inputMode="numeric"
            value={product.carbs}
            onChange={(e) => setProduct((prev) => ({ ...prev, carbs: Number(e.target.value) }))}
          />
        </label>
        <label>
          Вес (г)
          <input
            type="number"
            inputMode="numeric"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </label>
      </div>

      <button type="button" className="primary" onClick={handleSubmit}>
        Сохранить
      </button>
    </div>
  );
}
