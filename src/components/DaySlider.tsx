import { useEffect, useMemo, useState } from 'react';

const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

type DaySliderProps = {
  selectedDate: string; // ISO date string
  onChange: (date: string) => void;
};

export function DaySlider({ selectedDate, onChange }: DaySliderProps) {
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate));

  useEffect(() => {
    setViewDate(new Date(selectedDate));
  }, [selectedDate]);

  const days = useMemo(() => {
    const center = new Date(selectedDate);
    const start = new Date(center);
    start.setDate(center.getDate() - 3);
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
  }, [selectedDate]);

  const monthNameFormatter = useMemo(
    () => new Intl.DateTimeFormat('ru-RU', { month: 'long' }),
    []
  );

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, idx) => ({
        label: monthNameFormatter.format(new Date(2024, idx, 1)),
        value: idx,
      })),
    [monthNameFormatter]
  );

  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, idx) => {
        const date = new Date(2024, 0, 1 + idx);
        return weekdayFormatter.format(date).replace('.', '');
      }),
    []
  );

  const currentMonthDays = useMemo(() => {
    const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const startOffset = (startOfMonth.getDay() + 6) % 7; // Monday-first offset
    const daysInMonth = endOfMonth.getDate();

    return [
      ...Array.from({ length: startOffset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, idx) => idx + 1),
    ];
  }, [viewDate]);

  const handleSelectDate = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const iso = selected.toISOString().slice(0, 10);
    onChange(iso);
    setPickerOpen(false);
  };

  return (
    <div className="day-slider-wrapper">
      <div className="day-slider-header">
        <div>
          <p className="eyebrow">Текущая неделя</p>
          <h2>Выберите день</h2>
        </div>
        <button
          type="button"
          className="calendar-button"
          onClick={() => setPickerOpen((open) => !open)}
          aria-label="Открыть календарь"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M7 3v2M17 3v2M5 8h14M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{dateFormatter.format(new Date(selectedDate))}</span>
        </button>
        {isPickerOpen && (
          <div className="date-picker">
            <div className="date-picker__header">
              <select
                value={viewDate.getMonth()}
                onChange={(event) =>
                  setViewDate((prev) =>
                    new Date(prev.getFullYear(), Number(event.target.value), prev.getDate())
                  )
                }
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="date-picker__year"
                value={viewDate.getFullYear()}
                onChange={(event) =>
                  setViewDate((prev) =>
                    new Date(Number(event.target.value), prev.getMonth(), prev.getDate())
                  )
                }
              />
            </div>
            <div className="date-picker__weekdays">
              {weekdays.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="date-picker__grid">
              {currentMonthDays.map((day, idx) => {
                if (!day) return <span key={`empty-${idx}`} />;

                const iso = new Date(
                  viewDate.getFullYear(),
                  viewDate.getMonth(),
                  day
                )
                  .toISOString()
                  .slice(0, 10);
                const isSelected = iso === selectedDate;
                const isToday = iso === new Date().toISOString().slice(0, 10);

                return (
                  <button
                    type="button"
                    key={iso}
                    className={`date-picker__cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => handleSelectDate(day)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
