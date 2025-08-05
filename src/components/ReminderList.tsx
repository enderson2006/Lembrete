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
      <div className="card-glass p-6 transition-colors animate-slide-in-right">
        <h3 className="text-lg font-semibold mb-4 capitalize transition-colors" style={{ color: 'var(--text-primary)' }}>
          {dateString}
        </h3>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 mx-auto mb-3 transition-colors" style={{ color: 'var(--text-secondary)' }} />
          <p className="transition-colors" style={{ color: 'var(--text-secondary)' }}>Nenhum lembrete para este dia</p>
          <p className="text-sm mt-1 transition-colors" style={{ color: 'var(--text-secondary)' }}>Clique em um dia do calendário para adicionar lembretes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-glass p-6 transition-colors animate-slide-in-right">
      <h3 className="text-lg font-semibold mb-4 capitalize transition-colors" style={{ color: 'var(--text-primary)' }}>
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
              className={`p-4 rounded-lg border transition-all duration-200 glass floating ${
                reminder.completed
                  ? 'status-completed opacity-75'
                  : isOverdue
                  ? 'status-overdue'
                  : 'status-pending hover:glass-hover'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <button
                      onClick={() => onToggleComplete(reminder.id)}
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all neon-glow ${
                        reminder.completed
                          ? 'text-white'
                          : 'hover:scale-110'
                      }`}
                      style={{
                        backgroundColor: reminder.completed ? 'var(--neon-cyan)' : 'transparent',
                        borderColor: reminder.completed ? 'var(--neon-cyan)' : 'var(--border-glass)'
                      }}
                    >
                      {reminder.completed && <Check className="h-3 w-3" />}
                    </button>
                    
                    <h4
                      className={`font-medium truncate transition-colors ${
                        reminder.completed
                          ? 'line-through opacity-75'
                          : isOverdue
                          ? ''
                          : ''
                      }`}
                      style={{
                        color: reminder.completed 
                          ? 'var(--text-secondary)' 
                          : isOverdue 
                            ? '#FF4444' 
                            : 'var(--text-primary)'
                      }}
                    >
                      {reminder.title}
                    </h4>

                    {/* Assignment indicator */}
                    <div className="flex-shrink-0">
                      {(reminder.assigned_to_user_id || (reminder.assigned_users && reminder.assigned_users.length > 0)) ? (
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" style={{ color: 'var(--neon-purple)' }} title="Lembrete compartilhado" />
                          {reminder.assigned_users && reminder.assigned_users.length > 1 && (
                            <span className="text-xs glass px-1.5 py-0.5 rounded-full" style={{ color: 'var(--neon-purple)' }}>
                              +{reminder.assigned_users.length}
                            </span>
                          )}
                          {!isOwner && (
                            <span className="text-xs glass px-2 py-1 rounded-full" style={{ color: 'var(--neon-purple)' }}>
                              Atribuído
                            </span>
                          )}
                        </div>
                      ) : (
                        <User className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} title="Lembrete pessoal" />
                      )}
                    </div>

                    {/* Notification indicator */}
                    <div className="flex-shrink-0">
                      {reminder.notification_enabled ? (
                        <Bell className="h-4 w-4" style={{ color: 'var(--neon-blue)' }} title="Notificação ativada" />
                      ) : (
                        <BellOff className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} title="Notificação desativada" />
                      )}
                    </div>
                  </div>

                  {/* Image thumbnail */}
                  {reminder.image && (
                    <div className="mb-2">
                      <img
                        src={reminder.image}
                        alt="Reminder attachment"
                        className="w-16 h-16 object-cover rounded-lg cursor-pointer glass-hover transition-all"
                        onClick={() => {
                          // Open lightbox
                          const lightbox = document.createElement('div');
                          lightbox.className = 'lightbox-overlay';
                          lightbox.innerHTML = `
                            <div class="lightbox-content">
                              <img src="${reminder.image}" alt="Reminder attachment" class="max-w-full max-h-full" />
                            </div>
                          `;
                          lightbox.onclick = () => document.body.removeChild(lightbox);
                          document.body.appendChild(lightbox);
                        }}
                      />
                    </div>
                  )}

                  {reminder.description && (
                    <p
                      className={`text-sm mb-2 transition-colors ${
                        reminder.completed
                          ? 'opacity-75'
                          : isOverdue
                          ? ''
                          : ''
                      }`}
                      style={{
                        color: reminder.completed 
                          ? 'var(--text-secondary)' 
                          : isOverdue 
                            ? '#FF4444' 
                            : 'var(--text-secondary)'
                      }}
                    >
                      {reminder.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-xs">
                    <span
                      className={`flex items-center transition-colors ${
                        reminder.completed
                          ? 'opacity-75'
                          : isOverdue
                          ? ''
                          : ''
                      }`}
                      style={{
                        color: reminder.completed 
                          ? 'var(--text-secondary)' 
                          : isOverdue 
                            ? '#FF4444' 
                            : 'var(--text-secondary)'
                      }}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {reminder.time}
                    </span>
                    
                    {isOverdue && !reminder.completed && (
                      <span className="font-medium neon-glow" style={{ color: '#FF4444' }}>
                    {isOverdue && !reminder.completed && (
                      <span className="font-medium" style={{ color: '#FF4444' }}>
                        Atrasado
                      </span>
                    )}
                    
                    {reminder.completed && (
                      <span className="font-medium" style={{ color: 'var(--neon-cyan)' }}>
                        Concluído
                      </span>
                    )}

                    {!isOwner && (
                      <span className="font-medium" style={{ color: 'var(--neon-purple)' }}>
                        Atribuído por outro usuário
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {reminder.completed ? (
                    <button
                      onClick={() => onToggleComplete(reminder.id)}
                      className="p-1.5 glass-hover rounded transition-all"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Marcar como pendente"
                    >
                      <Undo className="h-4 w-4" />
                    </button>
                  ) : (
                    // Only show edit button for owners
                    isOwner && (
                      <button
                        onClick={() => onEdit(reminder)}
                        className="p-1.5 glass-hover rounded transition-all hover:text-neon-blue"
                        style={{ color: 'var(--text-secondary)' }}
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
                      className="p-1.5 glass-hover rounded transition-all"
                      style={{ color: 'var(--text-secondary)' }}
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