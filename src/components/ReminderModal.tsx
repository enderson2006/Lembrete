import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, FileText, Bell, User, Users, UserMinus, Upload, Image as ImageIcon } from 'lucide-react';
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
  const [image, setImage] = useState<string>('');
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
      setImage(editingReminder.image || '');
    } else {
      setTitle('');
      setDescription('');
      setDate(selectedDate);
      setTime('09:00');
      setNotificationEnabled(true);
      setAssignedToUserId(null);
      setAssignedUserIds([]);
      setImage('');
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
      image: image || undefined,
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
        setErrors(prev => ({ ...prev, image: 'Apenas arquivos JPG, JPEG e PNG são aceitos' }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'Imagem deve ter no máximo 5MB' }));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setErrors(prev => ({ ...prev, image: '' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage('');
    setErrors(prev => ({ ...prev, image: '' }));
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
      <div className="card-glass max-w-md w-full max-h-[90vh] overflow-y-auto transition-colors animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-glass">
          <h3 className="text-lg font-semibold transition-colors neon-glow" style={{ color: 'var(--text-primary)' }}>
            {editingReminder ? 'Editar Lembrete' : 'Novo Lembrete'}
          </h3>
          <button
            onClick={handleClose}
            className="glass-hover p-2 rounded-lg transition-colors neon-glow"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="flex items-center text-sm font-medium mb-2 transition-colors" style={{ color: 'var(--text-primary)' }}>
              <FileText className="h-4 w-4 mr-2" />
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`input-glass w-full ${
                errors.title ? 'border-red-500' : ''
              }`}
              placeholder="Digite o título do lembrete"
            />
            {errors.title && (
              <p className="mt-1 text-sm" style={{ color: '#FF4444' }}>{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2 transition-colors" style={{ color: 'var(--text-primary)' }}>
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input-glass w-full"
              placeholder="Adicione detalhes sobre o lembrete"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="flex items-center text-sm font-medium mb-2 transition-colors" style={{ color: 'var(--text-primary)' }}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Imagem (opcional)
            </label>
            
            {image ? (
              <div className="relative">
                <img
                  src={image}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-lg glass border border-glass"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 glass-hover p-1 rounded-full transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="glass-hover border-2 border-dashed border-glass rounded-lg p-6 text-center transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Clique para adicionar uma imagem
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    JPG, JPEG ou PNG (máx. 5MB)
                  </p>
                </div>
              </div>
            )}
            
            {errors.image && (
              <p className="mt-1 text-sm" style={{ color: '#FF4444' }}>{errors.image}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="flex items-center text-sm font-medium mb-2 transition-colors" style={{ color: 'var(--text-primary)' }}>
              <Calendar className="h-4 w-4 mr-2" />
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`input-glass w-full ${
                errors.date ? 'border-red-500' : ''
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm" style={{ color: '#FF4444' }}>{errors.date}</p>
            )}
          </div>

          {/* Time */}
          <div>
            <label className="flex items-center text-sm font-medium mb-2 transition-colors" style={{ color: 'var(--text-primary)' }}>
              <Clock className="h-4 w-4 mr-2" />
              Horário
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={`input-glass w-full ${
                errors.time ? 'border-red-500' : ''
              }`}
            />
            {errors.time && (
              <p className="mt-1 text-sm" style={{ color: '#FF4444' }}>{errors.time}</p>
            )}
          </div>

          {/* Assign to User */}
          <div>
            <label className="flex items-center text-sm font-medium mb-2 transition-colors" style={{ color: 'var(--text-primary)' }}>
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
                        <User className="h-4 w-4" style={{ color: 'var(--neon-blue)' }} />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          {user.display_name || user.email}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAssignedUser(userId)}
                        className="glass-hover p-1 rounded transition-colors"
                        style={{ color: '#FF4444' }}
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
              className="input-glass w-full"
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
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Selecione usuários para compartilhar este lembrete com eles
            </p>
          </div>

          {/* Notification Toggle */}
          <div className="flex items-center justify-between p-4 glass rounded-lg transition-colors">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5" style={{ color: 'var(--neon-blue)' }} />
              <div>
                <h4 className="font-medium transition-colors" style={{ color: 'var(--text-primary)' }}>Notificar no horário</h4>
                <p className="text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}>Receber notificação quando chegar a hora</p>
              </div>
            </div>
            <div 
              className={`toggle-switch ${notificationEnabled ? 'active' : ''}`}
              onClick={() => setNotificationEnabled(!notificationEnabled)}
            />
            {/* <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationEnabled}
                onChange={(e) => setNotificationEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-700"></div>
            </label> */}
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 btn-neon"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
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