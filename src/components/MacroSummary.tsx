import { Macros } from '../types';

type MacroSummaryProps = {
  macros: Macros;
};

const macroLabels: Record<keyof Macros, string> = {
  calories: 'Калории',
  protein: 'Белки',
  fat: 'Жиры',
  carbs: 'Углеводы',
};

export function MacroSummary({ macros }: MacroSummaryProps) {
  return (
    <div className="macro-summary">
      {Object.entries(macros).map(([key, value]) => (
        <div key={key} className="macro-card">
          <div className="macro-label">{macroLabels[key as keyof Macros]}</div>
          <div className="macro-value">{Math.round(value)}</div>
          <div className="macro-unit">{key === 'calories' ? 'ккал' : 'г'}</div>
        </div>
      ))}
    </div>
  );
}
