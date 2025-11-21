import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

export const dateToYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export const todayYMD = (): string => dateToYMD(new Date());

export const getDaysInMonth = (year: number, month: number): Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const generateCalendarGrid = (year: number, month: number): { date: string; isCurrentMonth: boolean; isToday: boolean }[] => {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const daysInMonth = lastDayOfMonth.getDate();
  const startDay = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
  
  const grid = [];
  
  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
     const d = new Date(year, month - 1, prevMonthLastDay - i);
     grid.push({
       date: dateToYMD(d),
       isCurrentMonth: false,
       isToday: false
     });
  }
  
  // Current month
  const today = todayYMD();
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = dateToYMD(d);
    grid.push({
      date: dateStr,
      isCurrentMonth: true,
      isToday: dateStr === today
    });
  }
  
  // Next month padding (to fill 42 grid cells - 6 rows)
  const remainingCells = 42 - grid.length;
  for (let i = 1; i <= remainingCells; i++) {
     const d = new Date(year, month + 1, i);
     grid.push({
       date: dateToYMD(d),
       isCurrentMonth: false,
       isToday: false
     });
  }
  
  return grid;
};