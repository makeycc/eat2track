import { useMemo } from 'react';

const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

type DaySliderProps = {
  selectedDate: string; // ISO date string
  onChange: (date: string) => void;
};

export function DaySlider({ selectedDate, onChange }: DaySliderProps) {
  const days = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 3);
    return Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(start);
      date.setDate(start.getDate() + idx);
      const iso = date.toISOString().slice(0, 10);
      return {
        label: weekdayFormatter.format(date),
        dateLabel: dateFormatter.format(date),
        value: iso,
        isToday: iso === new Date().toISOString().slice(0, 10),
      };
    });
  }, []);

  return (
    <div className="day-slider">
      {days.map((day) => (
        <button
          key={day.value}
          type="button"
          className={`day-chip ${selectedDate === day.value ? 'active' : ''}`}
          onClick={() => onChange(day.value)}
        >
          <span className="weekday">{day.label}</span>
          <span className="date">{day.dateLabel}</span>
          {day.isToday && <span className="today">• сегодня</span>}
        </button>
      ))}
    </div>
  );
}
