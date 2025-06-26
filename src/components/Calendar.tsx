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
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">
            {monthNames[month]} {year}
          </h2>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('month')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => onViewModeChange('week')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Semana
            </button>
          </div>

          {/* Navigation */}
          <div className="flex space-x-1">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'month' ? (
        <div className="grid grid-cols-7 gap-2">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
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
                className={`relative h-12 rounded-lg transition-all duration-200 ${
                  dayInfo.isCurrentMonth
                    ? isSelected(dayInfo.date)
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : isToday(dayInfo.date)
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'hover:bg-gray-100 text-gray-700'
                    : 'text-gray-400 hover:text-gray-500'
                }`}
              >
                <span className="text-sm font-medium">{dayInfo.day}</span>
                {hasReminder(dayInfo.date) && (
                  <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    isSelected(dayInfo.date) ? 'bg-white' : 'bg-green-500'
                  }`} />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Week View */
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          
          {getWeekDays().map((date, index) => {
            const dateString = formatDate(date);
            return (
              <button
                key={index}
                onClick={() => onDateSelect(dateString)}
                className={`relative h-16 rounded-lg transition-all duration-200 ${
                  isSelected(date)
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : isToday(date)
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span className="text-lg font-medium">{date.getDate()}</span>
                {hasReminder(date) && (
                  <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    isSelected(date) ? 'bg-white' : 'bg-green-500'
                  }`} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Calendar;