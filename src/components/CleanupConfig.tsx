import React, { useState, useEffect } from 'react';
import { Settings, Trash2, Archive, Calendar, Check } from 'lucide-react';

interface CleanupSettings {
  autoCleanupEnabled: boolean;
  cleanupCompletedAfterDays: number;
  cleanupOverdueAfterDays: number;
}

interface CleanupConfigProps {
  onCleanupNow: (settings: CleanupSettings) => void;
}

const CleanupConfig: React.FC<CleanupConfigProps> = ({ onCleanupNow }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<CleanupSettings>({
    autoCleanupEnabled: false,
    cleanupCompletedAfterDays: 7,
    cleanupOverdueAfterDays: 30,
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('cleanupSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = (newSettings: CleanupSettings) => {
    setSettings(newSettings);
    localStorage.setItem('cleanupSettings', JSON.stringify(newSettings));
  };

  const handleCleanupNow = () => {
    onCleanupNow(settings);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="neo-button-secondary flex items-center gap-2 text-sm"
      >
        <Settings className="w-4 h-4" />
        Limpeza
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="neo-card w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Configurações de Limpeza
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-gray-300 flex items-center gap-2">
              <Archive className="w-4 h-4 text-purple-400" />
              Limpeza Automática
            </label>
            <button
              onClick={() => saveSettings({ ...settings, autoCleanupEnabled: !settings.autoCleanupEnabled })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.autoCleanupEnabled ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.autoCleanupEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400" />
                Arquivar concluídos após (dias):
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.cleanupCompletedAfterDays}
                onChange={(e) => saveSettings({ ...settings, cleanupCompletedAfterDays: parseInt(e.target.value) || 7 })}
                className="neo-input w-full"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-400" />
                Apagar vencidos após (dias):
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.cleanupOverdueAfterDays}
                onChange={(e) => saveSettings({ ...settings, cleanupOverdueAfterDays: parseInt(e.target.value) || 30 })}
                className="neo-input w-full"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleCleanupNow}
              className="neo-button-primary flex-1 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Agora
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="neo-button-secondary flex-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CleanupConfig;