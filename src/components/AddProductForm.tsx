import { BrowserMultiFormatReader } from '@zxing/browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { NewDiaryEntry, Product } from '../types';

const PRODUCT_CACHE_KEY = 'eat2track-products-cache';

const emptyProduct = (name = '', barcode = ''): Product => ({
  id: '',
  name,
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  barcode,
});

function loadCachedProducts(): Product[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRODUCT_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Product[];
  } catch (error) {
    console.warn('Failed to parse product cache', error);
    return [];
  }
}

function persistProducts(products: Product[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(products));
  } catch (error) {
    console.warn('Failed to persist product cache', error);
  }
}

type AddProductFormProps = {
  onSubmit: (entry: NewDiaryEntry) => Promise<void>;
  onSearch: (query: string) => void;
  history: string[];
};

type FormMode = 'idle' | 'weight' | 'manual';

export function AddProductForm({ onSubmit, onSearch, history }: AddProductFormProps) {
  const [catalog, setCatalog] = useState<Product[]>(() => loadCachedProducts());
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [manualProduct, setManualProduct] = useState<Product>(emptyProduct());
  const [weight, setWeight] = useState('100');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<FormMode>('idle');
  const [isScanning, setIsScanning] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'ready' | 'error'>('idle');
  const [decoderStatus, setDecoderStatus] = useState<'idle' | 'ready' | 'decoded' | 'error'>('idle');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
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
    setDecoderStatus('idle');
    setLastScannedCode(null);
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

  const performSearch = async (value: string) => {
    const term = value.trim();
    if (!term) return;
    onSearch(term);
    setQuery(term);

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, calories, protein, fat, carbs, barcode, notes')
        .or(`name.ilike.%${term}%,barcode.eq.${term}`)
        .limit(10);

      if (error) throw error;

      const results = (data ?? []) as Product[];
      setSearchResults(results);
      if (results.length) {
        setCatalog((prev) => {
          const merged = [...prev];
          results.forEach((item) => {
            if (!merged.find((p) => p.id === item.id)) merged.push(item);
          });
          persistProducts(merged);
          return merged;
        });
        startWeightOnly(results[0]);
      } else {
        startManual(term, /\d+/.test(term) ? term : '');
      }
    } catch (error) {
      console.warn('Search failed, using cached products', error);
      const lower = term.toLowerCase();
      const fallback = catalog.filter(
        (item) => item.name.toLowerCase().includes(lower) || (item.barcode && item.barcode.includes(term)),
      );
      setSearchResults(fallback);
      if (fallback.length) {
        startWeightOnly(fallback[0]);
      } else {
        startManual(term, /\d+/.test(term) ? term : '');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleScannerDecode = (barcode: string) => {
    setScanError(null);
    setLastScannedCode(barcode);
    setDecoderStatus('decoded');
    performSearch(barcode);
  };

  const handleSaveSelected = async () => {
    if (!selectedProduct) return;
    const grams = Math.max(1, Math.round(Number(weight) || 0));
    setIsSaving(true);
    await onSubmit({
      product: selectedProduct,
      weight: grams,
    });
    setIsSaving(false);
    resetState();
  };

  const handleSaveManual = async () => {
    if (!manualProduct.name.trim()) return;
    const grams = Math.max(1, Math.round(Number(weight) || 0));
    const newProduct: Product = {
      ...manualProduct,
      id: manualProduct.id || crypto.randomUUID(),
      barcode: manualProduct.barcode || undefined,
    };

    setIsSaving(true);
    const { data, error } = await supabase
      .from('products')
      .upsert({
        id: newProduct.id,
        name: newProduct.name,
        calories: newProduct.calories,
        protein: newProduct.protein,
        fat: newProduct.fat,
        carbs: newProduct.carbs,
        barcode: newProduct.barcode ?? null,
        notes: newProduct.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.warn('Failed to save product online, keeping local copy', error);
    }

    const savedProduct = (data as Product | null) ?? newProduct;
    setCatalog((prev) => {
      const merged = [...prev.filter((item) => item.id !== savedProduct.id), savedProduct];
      persistProducts(merged);
      return merged;
    });
    setSearchResults((prev) => {
      const filtered = prev.filter((item) => item.id !== savedProduct.id);
      return [savedProduct, ...filtered];
    });

    await onSubmit({
      product: savedProduct,
      weight: grams,
    });
    setIsSaving(false);
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
        setCameraStatus('requesting');
        setDecoderStatus('idle');
        setLastScannedCode(null);
        if (!navigator.mediaDevices?.getUserMedia) {
          setScanError('Сканер недоступен в этом браузере.');
          setIsScanning(false);
          setCameraStatus('error');
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (!videoRef.current || cancelled) return;

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraStatus('ready');
        setDecoderStatus('ready');

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
        setCameraStatus('error');
        setDecoderStatus('error');
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
                setCameraStatus('idle');
                setDecoderStatus('idle');
                setLastScannedCode(null);
              }}
            >
              Перезапустить
            </button>
            <button type="button" className="ghost" onClick={() => startManual(query || lastScannedCode || '')}>
              Ручной ввод
            </button>
          </div>
        </div>
        <div className="scanner-status-grid">
          <div className={`status-chip ${cameraStatus === 'ready' ? 'success' : cameraStatus === 'error' ? 'error' : 'pending'}`}>
            Камера: {cameraStatus === 'ready' ? 'готова' : cameraStatus === 'error' ? 'ошибка' : 'запрашиваем доступ'}
          </div>
          <div className={`status-chip ${decoderStatus === 'decoded' ? 'success' : decoderStatus === 'error' ? 'error' : 'pending'}`}>
            Декодер: {decoderStatus === 'decoded' ? 'штрих-код считан' : decoderStatus === 'error' ? 'ошибка' : 'ожидание'}
          </div>
          <div className="status-chip neutral">
            {lastScannedCode ? `Последний код: ${lastScannedCode}` : 'Код пока не считан'}
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
          <button type="button" onClick={() => performSearch(query)} disabled={isSearching}>
            {isSearching ? 'Ищем…' : 'Искать'}
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
            <button type="button" onClick={handleSaveSelected} disabled={isSaving}>
              {isSaving ? 'Сохраняем…' : 'Сохранить'}
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
            <button type="button" onClick={handleSaveManual} disabled={isSaving}>
              {isSaving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
