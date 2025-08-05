import React, { useState, useEffect } from 'react';
import { X, Archive, Trash2, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { CleanupConfig as CleanupConfigType } from '../types/reminder';

interface CleanupConfigProps {
  isOpen: boolean;
  onClose: () => void;
  config: CleanupConfigType;
  onSave: (config: CleanupConfigType) => void;
}

const CleanupConfig: React.FC<CleanupConfigProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [formData, setFormData] = useState<CleanupConfigType>(config);

  useEffect(() => {
    setFormData(config);
  }, [config, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleInputChange = (field: keyof CleanupConfigType, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
      <div className="card-glass max-w-md w-full max-h-[90vh] overflow-y-auto transition-colors animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-glass">
          <div className="flex items-center space-x-3">
            <Archive className="h-6 w-6" style={{ color: 'var(--neon-orange)' }} />
            <h3 className="text-lg font-semibold transition-colors" style={{ color: 'var(--text-primary)' }}>
              Configurações de Limpeza
            </h3>
          </div>
          <button
            onClick={onClose}
            className="glass-hover p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Auto Cleanup Toggle */}
          <div className="glass p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5" style={{ color: 'var(--neon-cyan)' }} />
                <div>
                  <h4 className="font-medium transition-colors" style={{ color: 'var(--text-primary)' }}>
                    Limpeza Automática
                  </h4>
                  <p className="text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    Limpar lembretes antigos automaticamente
                  </p>
                </div>
              </div>
              <div 
                className={`toggle-switch ${formData.autoCleanupEnabled ? 'active' : ''}`}
                onClick={() => handleInputChange('autoCleanupEnabled', !formData.autoCleanupEnabled)}
              />
            </div>

            {formData.autoCleanupEnabled && (
              <div className="space-y-4 pt-4 border-t border-glass">
                {/* Completed Reminders */}
                <div>
                  <label className="flex items-center text-sm font-medium mb-2 transition-colors neon-glow" style={{ color: 'var(--text-primary)' }}>
                  <label className="flex items-center text-sm font-medium mb-2 transition-colors" style={{ color: 'var(--text-primary)' }}>
                    <Archive className="h-4 w-4 mr-2" />
                    Lembretes Concluídos
                  </label>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Arquivar após</span>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.cleanupCompletedAfterDays}
                      onChange={(e) => handleInputChange('cleanupCompletedAfterDays', parseInt(e.target.value))}
                      className="input-glass w-20 text-center"
                    />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>dias</span>
                  </div>
                </div>

                {/* Overdue Reminders */}
                <div>
                  <label className="flex items-center text-sm font-medium mb-2 transition-colors neon-glow" style={{ color: 'var(--text-primary)' }}>
                  <label className="flex items-center text-sm font-medium mb-2 transition-colors" style={{ color: 'var(--text-primary)' }}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Lembretes Vencidos
                  </label>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Apagar após</span>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.cleanupOverdueAfterDays}
                      onChange={(e) => handleInputChange('cleanupOverdueAfterDays', parseInt(e.target.value))}
                      className="input-glass w-20 text-center"
                    />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>dias</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="glass p-4 rounded-lg border-l-4" style={{ borderLeftColor: 'var(--neon-orange)' }}>
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 mt-0.5" style={{ color: 'var(--neon-orange)' }} />
              <div>
                <h4 className="font-medium transition-colors" style={{ color: 'var(--text-primary)' }}>
                  Atenção
                </h4>
                <p className="text-sm mt-1 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  A limpeza automática é irreversível. Lembretes removidos não podem ser recuperados.
                  Use a limpeza manual para ter mais controle sobre o processo.
                </p>
              </div>
            </div>
          </div>

          {/* Last Cleanup Info */}
          {formData.lastCleanup && (
            <div className="glass p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" style={{ color: 'var(--neon-cyan)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Última limpeza: {new Date(formData.lastCleanup).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-neon"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CleanupConfig;