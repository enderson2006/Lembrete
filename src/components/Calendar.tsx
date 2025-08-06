import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { ViewMode } from '../types/reminder';
import { formatDate } from '../utils/reminderUtils';

interface CalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  daysWithReminders: Set<number>;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  currentDate,
  onDateChange,
  selectedDate,
  onDateSelect,
  daysWithReminders,
  viewMode,
  onViewModeChange,
}) => {
  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const navigateMonth = (direction: number) => {
    const newDate = new Date(year, month + direction, 1);
    onDateChange(newDate);
  };

  const getDaysToShow = () => {
    const days = [];
    
    // Previous month's days
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day),
      });
    }

    // Next month's days
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day),
      });
    }

    return days;
  };

  const getWeekDays = () => {
    const selectedDateObj = new Date(selectedDate);
    const startOfWeek = new Date(selectedDateObj);
    startOfWeek.setDate(selectedDateObj.getDate() - selectedDateObj.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return formatDate(date) === selectedDate;
  };

  const hasReminder = (date: Date) => {
    if (date.getMonth() !== month) return false;
    return daysWithReminders.has(date.getDate());
  };

  return (
    <div className="card-glass p-6 transition-colors animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <CalendarIcon className="h-6 w-6 neon-glow" style={{ color: 'var(--neon-cyan)' }} />
          <h2 className="text-xl font-semibold transition-colors" style={{ color: 'var(--text-primary)' }}>
            {monthNames[month]} {year}
          </h2>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex glass rounded-lg p-1 transition-colors">
            <button
              onClick={() => onViewModeChange('month')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                viewMode === 'month'
                  ? 'glass-hover neon-glow shadow-sm'
                  : 'hover:glass-hover'
              }`}
              style={{ 
                color: viewMode === 'month' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                background: viewMode === 'month' ? 'var(--bg-glass-hover)' : 'transparent'
              }}
            >
              Mês
            </button>
            <button
              onClick={() => onViewModeChange('week')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                viewMode === 'week'
                  ? 'glass-hover neon-glow shadow-sm'
                  : 'hover:glass-hover'
              }`}
              style={{ 
                color: viewMode === 'week' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                background: viewMode === 'week' ? 'var(--bg-glass-hover)' : 'transparent'
              }}
            >
              Semana
            </button>
          </div>

          {/* Navigation */}
          <div className="flex space-x-1">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 glass-hover rounded-lg transition-colors neon-glow"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 glass-hover rounded-lg transition-colors neon-glow"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'month' ? (
        <div className="grid grid-cols-7 gap-2">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium py-2 transition-colors" style={{ color: 'var(--text-secondary)' }}>
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {getDaysToShow().map((dayInfo, index) => {
            const dateString = formatDate(dayInfo.date);
            return (
              <button
                key={index}
                onClick={() => onDateSelect(dateString)}
                className={`calendar-day relative h-12 rounded-lg transition-all duration-200 ${
                  dayInfo.isCurrentMonth
                    ? isSelected(dayInfo.date)
                      ? 'selected text-white shadow-md scale-105'
                      : isToday(dayInfo.date)
                      ? 'glass-hover neon-glow'
                      : 'glass-hover'
                    : 'opacity-50'
                } ${hasReminder(dayInfo.date) ? 'has-reminder' : ''}`}
                style={{ 
                  color: dayInfo.isCurrentMonth 
                    ? isSelected(dayInfo.date) 
                      ? 'white' 
                      : isToday(dayInfo.date)
                        ? 'var(--neon-cyan)'
                        : 'var(--text-primary)'
                    : 'var(--text-secondary)'
                }}
              >
                <span className="text-sm font-medium">{dayInfo.day}</span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Week View */
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium py-2 transition-colors" style={{ color: 'var(--text-secondary)' }}>
              {day}
            </div>
          ))}
          
          {getWeekDays().map((date, index) => {
            const dateString = formatDate(date);
            return (
              <button
                key={index}
                onClick={() => onDateSelect(dateString)}
                className={`calendar-day relative h-16 rounded-lg transition-all duration-200 ${
                  isSelected(date)
                    ? 'selected text-white shadow-md scale-105'
                    : isToday(date)
                    ? 'glass-hover neon-glow'
                    : 'glass-hover'
                } ${hasReminder(date) ? 'has-reminder' : ''}`}
                style={{ 
                  color: isSelected(date) 
                    ? 'white' 
                    : isToday(date)
                      ? 'var(--neon-cyan)'
                      : 'var(--text-primary)'
                }}
              >
                <span className="text-lg font-medium">{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Calendar;