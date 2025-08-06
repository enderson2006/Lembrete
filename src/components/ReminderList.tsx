import React, { useState } from 'react';
import { Clock, CheckCircle, AlertCircle, Calendar, Image, X, Trash2, Edit } from 'lucide-react';
import { Reminder } from '../types/reminder';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateTime, isPast } from '../utils/reminderUtils';

interface ReminderListProps {
  reminders: Reminder[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
}

const ReminderList: React.FC<ReminderListProps> = ({
  reminders,
  onToggleComplete,
  onDelete,
  onEdit,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const getStatusIcon = (reminder: Reminder) => {
    if (reminder.completed) {
      return <CheckCircle className="w-5 h-5 text-cyan-400" />;
    }
    if (isPast(reminder.date, reminder.time) && !reminder.completed) {
      return <AlertCircle className="w-5 h-5 text-orange-400" />;
    }
    return <Clock className="w-5 h-5 text-blue-400" />;
  };

  const getStatusText = (reminder: Reminder) => {
    if (reminder.completed) return 'Concluído';
    if (isPast(reminder.date, reminder.time)) return 'Vencido';
    return 'Pendente';
  };

  const getDateText = (dateString: string, timeString: string) => {
    const date = parseDateTime(dateString, timeString);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  const getTimeText = (dateString: string, timeString: string) => {
    const date = parseDateTime(dateString, timeString);
    return format(date, 'HH:mm');
  };

  const sortedReminders = [...reminders].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return parseDateTime(a.date, a.time).getTime() - parseDateTime(b.date, b.time).getTime();
  });

  if (reminders.length === 0) {
    return (
      <div className="neo-card text-center py-12">
        <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Nenhum lembrete encontrado</p>
        <p className="text-gray-500 text-sm mt-2">
          Crie seu primeiro lembrete para começar!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sortedReminders.map((reminder) => (
          <div
            key={reminder.id}
            className={`neo-card hover:scale-[1.02] transition-all duration-300 ${
              reminder.completed ? 'opacity-75' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <button
                onClick={() => onToggleComplete(reminder.id)}
                className="mt-1 hover:scale-110 transition-transform"
              >
                {getStatusIcon(reminder)}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={`font-medium text-white ${
                      reminder.completed ? 'line-through text-gray-400' : ''
                    }`}
                  >
                    {reminder.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(reminder)}
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(reminder.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {reminder.description && (
                  <p className="text-gray-300 text-sm mt-1 line-clamp-2">
                    {reminder.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">
                      {getDateText(reminder.date, reminder.time)} às {getTimeText(reminder.date, reminder.time)}
                    </span>
                  </div>

                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    reminder.completed
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : isPast(reminder.date, reminder.time)
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {getStatusText(reminder)}
                  </div>
                </div>

                {reminder.image && (
                  <div className="mt-3">
                    <button
                      onClick={() => setSelectedImage(reminder.image!)}
                      className="relative group"
                    >
                      <img
                        src={reminder.image}
                        alt="Anexo do lembrete"
                        className="w-16 h-16 object-cover rounded-lg border border-gray-600 hover:border-cyan-400 transition-colors"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Image className="w-6 h-6 text-white" />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox para visualização de imagem */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedImage}
              alt="Visualização ampliada"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ReminderList;