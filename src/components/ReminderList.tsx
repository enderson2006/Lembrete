import React from 'react';
import { Clock, Calendar, Edit3, Trash2, Check, Undo, Bell, BellOff } from 'lucide-react';
import { Reminder } from '../types/reminder';
import { isPast, createLocalDate } from '../utils/reminderUtils';

interface ReminderListProps {
  reminders: Reminder[];
  selectedDate: string;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
}

const ReminderList: React.FC<ReminderListProps> = ({
  reminders,
  selectedDate,
  onEdit,
  onDelete,
  onToggleComplete,
}) => {
  const selectedDateObj = createLocalDate(selectedDate);
  const dateString = selectedDateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dayReminders = reminders.filter(reminder => reminder.date === selectedDate);
  const sortedReminders = [...dayReminders].sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    return a.time.localeCompare(b.time);
  });

  if (sortedReminders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 capitalize">
          {dateString}
        </h3>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum lembrete para este dia</p>
          <p className="text-sm text-gray-400 mt-1">Clique em um dia do calendário para adicionar lembretes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 capitalize">
        {dateString}
      </h3>
      
      <div className="space-y-3">
        {sortedReminders.map((reminder) => {
          const isOverdue = !reminder.completed && isPast(reminder.date, reminder.time);
          
          return (
            <div
              key={reminder.id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                reminder.completed
                  ? 'bg-gray-50 border-gray-200'
                  : isOverdue
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <button
                      onClick={() => onToggleComplete(reminder.id)}
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        reminder.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {reminder.completed && <Check className="h-3 w-3" />}
                    </button>
                    
                    <h4
                      className={`font-medium truncate ${
                        reminder.completed
                          ? 'text-gray-500 line-through'
                          : isOverdue
                          ? 'text-red-700'
                          : 'text-gray-900'
                      }`}
                    >
                      {reminder.title}
                    </h4>

                    {/* Notification indicator */}
                    <div className="flex-shrink-0">
                      {reminder.notification_enabled ? (
                        <Bell className="h-4 w-4 text-blue-500" title="Notificação ativada" />
                      ) : (
                        <BellOff className="h-4 w-4 text-gray-400" title="Notificação desativada" />
                      )}
                    </div>
                  </div>

                  {reminder.description && (
                    <p
                      className={`text-sm mb-2 ${
                        reminder.completed
                          ? 'text-gray-400'
                          : isOverdue
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {reminder.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-xs">
                    <span
                      className={`flex items-center ${
                        reminder.completed
                          ? 'text-gray-400'
                          : isOverdue
                          ? 'text-red-500'
                          : 'text-gray-500'
                      }`}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {reminder.time}
                    </span>
                    
                    {isOverdue && !reminder.completed && (
                      <span className="text-red-500 font-medium">
                        Atrasado
                      </span>
                    )}
                    
                    {reminder.completed && (
                      <span className="text-green-600 font-medium">
                        Concluído
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {reminder.completed ? (
                    <button
                      onClick={() => onToggleComplete(reminder.id)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Marcar como pendente"
                    >
                      <Undo className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onEdit(reminder)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Editar lembrete"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => onDelete(reminder.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Excluir lembrete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReminderList;