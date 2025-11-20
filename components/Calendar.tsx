import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, generateCalendarGrid } from '../lib/utils';
import { Task } from '../types';

interface CalendarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  tasks: Task[];
}

export const Calendar: React.FC<CalendarProps> = ({ selectedDate, onSelectDate, tasks }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = React.useMemo(() => generateCalendarGrid(year, month), [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Helper to check if a day has tasks
  const hasTasksOnDate = (dateStr: string) => {
    return tasks.some(t => t.date === dateStr && !t.completed);
  };

  return (
    <div className="p-4 bg-secondary/20 rounded-2xl border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">
          {monthName} <span className="text-zinc-500">{year}</span>
        </h2>
        <div className="flex gap-1">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={handleNextMonth} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-zinc-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isSelected = day.date === selectedDate;
          const hasActivity = hasTasksOnDate(day.date);
          
          return (
            <button
              key={`${day.date}-${index}`}
              onClick={() => onSelectDate(day.date)}
              className={cn(
                "relative h-10 w-full rounded-lg flex items-center justify-center text-sm transition-all duration-200",
                day.isCurrentMonth ? "text-zinc-300" : "text-zinc-700",
                day.isToday && !isSelected && "bg-white/5 text-white font-semibold",
                isSelected && "bg-primary text-white shadow-lg shadow-primary/25 scale-105 z-10 font-semibold",
                !isSelected && !day.isToday && "hover:bg-white/5"
              )}
            >
              {parseInt(day.date.split('-')[2], 10)}
              
              {/* Task Dot Indicator */}
              {hasActivity && !isSelected && (
                <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};