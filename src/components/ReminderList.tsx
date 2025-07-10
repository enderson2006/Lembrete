import React from 'react';
import { Clock, Calendar, Edit3, Trash2, Check, Undo, Bell, BellOff, User, Users } from 'lucide-react';
import { Reminder } from '../types/reminder';
import { isPast, createLocalDate } from '../utils/reminderUtils';

interface ReminderListProps {
  reminders: Reminder[];
  selectedDate: string;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  currentUserId: string;
}

const ReminderList: React.FC<ReminderListProps> = ({
  reminders,
  selectedDate,
  onEdit,
  onDelete,
  onToggleComplete,
  currentUserId,
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 capitalize transition-colors">
          {dateString}
        </h3>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3 transition-colors" />
          <p className="text-gray-500 dark:text-gray-400 transition-colors">Nenhum lembrete para este dia</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 transition-colors">Clique em um dia do calendário para adicionar lembretes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 capitalize transition-colors">
        {dateString}
      </h3>
      
      <div className="space-y-3">
        {sortedReminders.map((reminder) => {
          const isOverdue = !reminder.completed && isPast(reminder.date, reminder.time);
          const isOwner = reminder.owner_id === currentUserId;
          const isAssigned = reminder.assigned_to_user_id === currentUserId || 
                           (reminder.assigned_users && reminder.assigned_users.some(user => user.id === currentUserId));
          
          return (
            <div
              key={reminder.id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                reminder.completed
                  ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  : isOverdue
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm'
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
                          : 'border-gray-300 dark:border-gray-500 hover:border-green-500 dark:hover:border-green-400'
                      }`}
                    >
                      {reminder.completed && <Check className="h-3 w-3" />}
                    </button>
                    
                    <h4
                      className={`font-medium truncate transition-colors ${
                        reminder.completed
                          ? 'text-gray-500 dark:text-gray-400 line-through'
                          : isOverdue
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {reminder.title}
                    </h4>

                    {/* Assignment indicator */}
                    <div className="flex-shrink-0">
                      {(reminder.assigned_to_user_id || (reminder.assigned_users && reminder.assigned_users.length > 0)) ? (
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-purple-500 dark:text-purple-400" title="Lembrete compartilhado" />
                          {reminder.assigned_users && reminder.assigned_users.length > 1 && (
                            <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full">
                              +{reminder.assigned_users.length}
                            </span>
                          )}
                          {!isOwner && (
                            <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                              Atribuído
                            </span>
                          )}
                        </div>
                      ) : (
                        <User className="h-4 w-4 text-gray-400 dark:text-gray-500" title="Lembrete pessoal" />
                      )}
                    </div>

                    {/* Notification indicator */}
                    <div className="flex-shrink-0">
                      {reminder.notification_enabled ? (
                        <Bell className="h-4 w-4 text-blue-500 dark:text-blue-400" title="Notificação ativada" />
                      ) : (
                        <BellOff className="h-4 w-4 text-gray-400 dark:text-gray-500" title="Notificação desativada" />
                      )}
                    </div>
                  </div>

                  {reminder.description && (
                    <p
                      className={`text-sm mb-2 transition-colors ${
                        reminder.completed
                          ? 'text-gray-400 dark:text-gray-500'
                          : isOverdue
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {reminder.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-xs">
                    <span
                      className={`flex items-center transition-colors ${
                        reminder.completed
                          ? 'text-gray-400 dark:text-gray-500'
                          : isOverdue
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {reminder.time}
                    </span>
                    
                    {isOverdue && !reminder.completed && (
                      <span className="text-red-500 dark:text-red-400 font-medium">
                        Atrasado
                      </span>
                    )}
                    
                    {reminder.completed && (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Concluído
                      </span>
                    )}

                    {!isOwner && (
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        Atribuído por outro usuário
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {reminder.completed ? (
                    <button
                      onClick={() => onToggleComplete(reminder.id)}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Marcar como pendente"
                    >
                      <Undo className="h-4 w-4" />
                    </button>
                  ) : (
                    // Only show edit button for owners
                    isOwner && (
                      <button
                        onClick={() => onEdit(reminder)}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Editar lembrete"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )
                  )}
                  
                  {/* Only show delete button for owners */}
                  {isOwner && (
                    <button
                      onClick={() => onDelete(reminder.id)}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Excluir lembrete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
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