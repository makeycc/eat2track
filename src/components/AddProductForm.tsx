import { BrowserMultiFormatReader } from '@zxing/browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DiaryEntry, Product } from '../types';

const catalogSeed: Product[] = [
  { id: 'p1', name: 'Куриная грудка', calories: 165, protein: 31, fat: 3.6, carbs: 0, barcode: '200000000001' },
  { id: 'p2', name: 'Рис отварной', calories: 130, protein: 2.7, fat: 0.3, carbs: 28, barcode: '200000000002' },
  { id: 'p3', name: 'Авокадо', calories: 160, protein: 2, fat: 15, carbs: 9, barcode: '200000000003' },
  { id: 'p4', name: 'Яблоко', calories: 52, protein: 0.3, fat: 0.2, carbs: 14 },
];

const emptyProduct = (name = '', barcode = ''): Product => ({
  id: '',
  name,
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  barcode,
});

type AddProductFormProps = {
  onSubmit: (entry: DiaryEntry) => void;
  onSearch: (query: string) => void;
  history: string[];
};

type FormMode = 'idle' | 'weight' | 'manual';

export function AddProductForm({ onSubmit, onSearch, history }: AddProductFormProps) {
  const [catalog, setCatalog] = useState<Product[]>(catalogSeed);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [manualProduct, setManualProduct] = useState<Product>(emptyProduct());
  const [weight, setWeight] = useState('100');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<FormMode>('idle');
  const [isScanning, setIsScanning] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const macrosSummary = useMemo(() => {
    if (!selectedProduct) return null;
    const grams = Math.max(1, Math.round(Number(weight) || 0));
    const factor = grams / 100;
    return {
      calories: Math.round(selectedProduct.calories * factor),
      protein: Math.round(selectedProduct.protein * factor),
      fat: Math.round(selectedProduct.fat * factor),
      carbs: Math.round(selectedProduct.carbs * factor),
    };
  }, [selectedProduct, weight]);

  const resetState = () => {
    setSelectedProduct(null);
    setManualProduct(emptyProduct());
    setWeight('100');
    setMode('idle');
  };

  const startManual = (name = '', barcode = '') => {
    setMode('manual');
    setSelectedProduct(null);
    setManualProduct(emptyProduct(name, barcode));
    setWeight('100');
  };

  const startWeightOnly = (product: Product) => {
    setSelectedProduct(product);
    setMode('weight');
    setWeight('100');
  };

  const performSearch = (value: string) => {
    const term = value.trim();
    if (!term) return;
    onSearch(term);
    setQuery(term);

    const lower = term.toLowerCase();
    const results = catalog.filter(
      (item) => item.name.toLowerCase().includes(lower) || (item.barcode && item.barcode.includes(term)),
    );

    setSearchResults(results);

    if (results.length > 0) {
      startWeightOnly(results[0]);
    } else {
      startManual(term, /\d+/.test(term) ? term : '');
    }
  };

  const handleScannerDecode = (barcode: string) => {
    setScanError(null);
    performSearch(barcode);
  };

  const handleSaveSelected = () => {
    if (!selectedProduct) return;
    const grams = Math.max(1, Math.round(Number(weight) || 0));
    onSubmit({
      id: crypto.randomUUID(),
      product: selectedProduct,
      weight: grams,
    });
    resetState();
  };

  const handleSaveManual = () => {
    if (!manualProduct.name.trim()) return;
    const grams = Math.max(1, Math.round(Number(weight) || 0));
    const newProduct: Product = { ...manualProduct, id: crypto.randomUUID(), barcode: manualProduct.barcode || undefined };
    setCatalog((prev) => [...prev, newProduct]);
    onSubmit({
      id: crypto.randomUUID(),
      product: newProduct,
      weight: grams,
    });
    resetState();
  };

  useEffect(() => {
    if (!isScanning || !videoRef.current) return undefined;

    let cancelled = false;
    let stream: MediaStream | null = null;
    const reader = new BrowserMultiFormatReader();

    const stopScanner = () => {
      if (typeof (reader as unknown as { reset?: () => void }).reset === 'function') {
        (reader as unknown as { reset?: () => void }).reset?.();
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const startScanner = async () => {
      try {
        setScanError(null);
        if (!navigator.mediaDevices?.getUserMedia) {
          setScanError('Сканер недоступен в этом браузере.');
          setIsScanning(false);
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (!videoRef.current || cancelled) return;

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const result = await reader.decodeOnceFromVideoDevice(undefined, videoRef.current);

        if (!cancelled && result) {
          const barcode = result.getText();
          handleScannerDecode(barcode);
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setScanError('Доступ к камере отклонен. Разрешите доступ и попробуйте снова.');
        } else {
          setScanError('Не удалось открыть камеру. Проверьте разрешения и попробуйте снова.');
        }
      } finally {
        if (!cancelled) {
          setIsScanning(false);
        }
        stopScanner();
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isScanning]);

  return (
    <div className="add-product">
      <div className="scanner-block">
        <div className="scanner-header">
          <div>
            <div className="block-label">Сканер штрих-кода</div>
            <p className="scanner-sub">Наведи камеру на упаковку — мы попробуем найти продукт.</p>
          </div>
          <div className="scanner-actions">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setScanError(null);
                setIsScanning(true);
              }}
            >
              Перезапустить
            </button>
          </div>
        </div>
        <div className="scanner-shell">
          <video ref={videoRef} className="scanner-video" muted playsInline />
          <div className="scanner-overlay">
            {isScanning ? 'Сканируем…' : 'Сканер на паузе — перезапусти, чтобы считать код'}
          </div>
        </div>
        {scanError && <div className="scanner-error">{scanError}</div>}
      </div>

      <div className="search-area">
        <div className="block-label">Поиск по базе</div>
        <div className="search-bar">
          <input
            type="search"
            placeholder="Название или штрих-код"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') performSearch(query);
            }}
          />
          <button type="button" onClick={() => performSearch(query)}>
            Искать
          </button>
          <button type="button" className="ghost" onClick={() => startManual(query)}>
            Ручной ввод
          </button>
        </div>

        {!!history.length && (
          <div className="history">
            <div className="history-title">История</div>
            <div className="history-list">
              {history.map((item) => (
                <button key={item} type="button" className="history-chip" onClick={() => performSearch(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {!!searchResults.length && (
          <div className="search-results">
            <div className="results-title">Найдено</div>
            <div className="results-list">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`result-card ${selectedProduct?.id === item.id ? 'active' : ''}`}
                  onClick={() => startWeightOnly(item)}
                >
                  <div className="result-name">{item.name}</div>
                  <div className="result-sub">{item.calories} ккал · Б{item.protein} / Ж{item.fat} / У{item.carbs}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'idle' && <div className="empty-hint">Отсканируйте упаковку или воспользуйтесь поиском.</div>}
      </div>

      {mode === 'weight' && selectedProduct && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="block-label">Ввод веса</div>
              <div className="card-title">{selectedProduct.name}</div>
              <div className="card-sub">{selectedProduct.calories} ккал на 100 г</div>
            </div>
            <button type="button" className="ghost" onClick={resetState}>
              Отмена
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
            {macrosSummary && (
              <div className="macro-preview">
                <div>{macrosSummary.calories} ккал</div>
                <div>Б {macrosSummary.protein} г</div>
                <div>Ж {macrosSummary.fat} г</div>
                <div>У {macrosSummary.carbs} г</div>
              </div>
            )}
          </div>
          <div className="cta-row">
            <button type="button" className="ghost" onClick={resetState}>
              Отмена
            </button>
            <button type="button" onClick={handleSaveSelected}>
              Сохранить вес
            </button>
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="block-label">Ручной ввод</div>
              <div className="card-sub">Если продукт не нашли, заполните КБЖУ и вес</div>
            </div>
            <button type="button" className="ghost" onClick={resetState}>
              Отмена
            </button>
          </div>
          <div className="manual-grid">
            <label>
              Название
              <input
                value={manualProduct.name}
                onChange={(e) => setManualProduct((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Например, гречка вареная"
              />
            </label>
            <label>
              Штрих-код (опционально)
              <input
                value={manualProduct.barcode ?? ''}
                onChange={(e) => setManualProduct((prev) => ({ ...prev, barcode: e.target.value }))}
                placeholder="Для будущих сканов"
              />
            </label>
            <label>
              Калории (ккал)
              <input
                type="number"
                inputMode="numeric"
                value={manualProduct.calories}
                onChange={(e) => setManualProduct((prev) => ({ ...prev, calories: Number(e.target.value) }))}
              />
            </label>
            <label>
              Белки (г)
              <input
                type="number"
                inputMode="numeric"
                value={manualProduct.protein}
                onChange={(e) => setManualProduct((prev) => ({ ...prev, protein: Number(e.target.value) }))}
              />
            </label>
            <label>
              Жиры (г)
              <input
                type="number"
                inputMode="numeric"
                value={manualProduct.fat}
                onChange={(e) => setManualProduct((prev) => ({ ...prev, fat: Number(e.target.value) }))}
              />
            </label>
            <label>
              Углеводы (г)
              <input
                type="number"
                inputMode="numeric"
                value={manualProduct.carbs}
                onChange={(e) => setManualProduct((prev) => ({ ...prev, carbs: Number(e.target.value) }))}
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
          <div className="cta-row">
            <button type="button" className="ghost" onClick={resetState}>
              Отмена
            </button>
            <button type="button" onClick={handleSaveManual}>
              Сохранить продукт
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
