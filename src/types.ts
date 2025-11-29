export type Macros = {
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
};

export type Product = Macros & {
  id: string;
  name: string;
  barcode?: string;
  notes?: string;
};

export type DiaryEntry = {
  id: string;
  product: Product;
  weight: number; // grams
  macrosOverride?: Partial<Macros>;
};
