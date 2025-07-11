import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, FileText, Bell, User, Users, UserMinus } from 'lucide-react';
import { Reminder, Profile } from '../types/reminder';
import { formatDate, formatTime } from '../utils/reminderUtils';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reminder: Omit<Reminder, 'id' | 'created_at' | 'owner_id'>, assignedUserIds: string[]) => void;
  selectedDate: string;
  editingReminder?: Reminder | null;
  profiles: Profile[];
  currentUserId: string;
}

const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  editingReminder,
  profiles,
  currentUserId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState('09:00');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [assignedToUserId, setAssignedToUserId] = useState<string | null>(null);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (editingReminder) {
      setTitle(editingReminder.title);
      setDescription(editingReminder.description);
      setDate(editingReminder.date);
      setTime(editingReminder.time);
      setNotificationEnabled(editingReminder.notification_enabled);
      setAssignedToUserId(editingReminder.assigned_to_user_id || null);
      setAssignedUserIds(editingReminder.assigned_users?.map(user => user.id) || []);
    } else {
      setTitle('');
      setDescription('');
      setDate(selectedDate);
      setTime('09:00');
      setNotificationEnabled(true);
      setAssignedToUserId(null);
      setAssignedUserIds([]);
    }
    setErrors({});
  }, [editingReminder, selectedDate, isOpen]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }

    if (!date) {
      newErrors.date = 'Data é obrigatória';
    }

    if (!time) {
      newErrors.time = 'Horário é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const reminderData = {
      title: title.trim(),
      description: description.trim(),
      date,
      time,
      completed: editingReminder?.completed || false,
      notified: editingReminder?.notified || false,
      notification_enabled: notificationEnabled,
      assigned_to_user_id: assignedUserIds.length > 0 ? assignedUserIds[0] : null, // For backward compatibility
    };

    onSave(reminderData, assignedUserIds);
    onClose();
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const availableProfiles = profiles.filter(profile => profile.id !== currentUserId);

  const addAssignedUser = (userId: string) => {
    if (!assignedUserIds.includes(userId)) {
      setAssignedUserIds(prev => [...prev, userId]);
    }
  };

  const removeAssignedUser = (userId: string) => {
    setAssignedUserIds(prev => prev.filter(id => id !== userId));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">
            {editingReminder ? 'Editar Lembrete' : 'Novo Lembrete'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 transition-colors">
              <FileText className="h-4 w-4 mr-2" />
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Digite o título do lembrete"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 transition-colors">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Adicione detalhes sobre o lembrete"
            />
          </div>

          {/* Date */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 transition-colors">
              <Calendar className="h-4 w-4 mr-2" />
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                errors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date}</p>
            )}
          </div>

          {/* Time */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 transition-colors">
              <Clock className="h-4 w-4 mr-2" />
              Horário
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                errors.time ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.time && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.time}</p>
            )}
          </div>

          {/* Assign to User */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 transition-colors">
              <Users className="h-4 w-4 mr-2" />
              Compartilhar com usuários (opcional)
            </label>
            
            {/* Selected Users */}
            {assignedUserIds.length > 0 && (
              <div className="mb-3 space-y-2">
                {assignedUserIds.map(userId => {
                  const user = profiles.find(p => p.id === userId);
                  if (!user) return null;
                  
                  return (
                    <div key={userId} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-200">
                          {user.display_name || user.email}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAssignedUser(userId)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Add User Dropdown */}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  addAssignedUser(e.target.value);
                  e.target.value = ''; // Reset selection
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">+ Adicionar usuário</option>
              {availableProfiles
                .filter(profile => !assignedUserIds.includes(profile.id))
                .map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.display_name || profile.email}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Selecione usuários para compartilhar este lembrete com eles
            </p>
          </div>

          {/* Notification Toggle */}
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white transition-colors">Notificar no horário</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">Receber notificação quando chegar a hora</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationEnabled}
                onChange={(e) => setNotificationEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-700"></div>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              {editingReminder ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReminderModal;