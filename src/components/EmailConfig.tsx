import React, { useState, useEffect } from 'react';
import { Settings, Mail, Save, Eye, EyeOff } from 'lucide-react';
import { EmailConfig as EmailConfigType } from '../types/reminder';

interface EmailConfigProps {
  isOpen: boolean;
  onClose: () => void;
  config: EmailConfigType;
  onSave: (config: EmailConfigType) => void;
}

const EmailConfig: React.FC<EmailConfigProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [formData, setFormData] = useState<EmailConfigType>(config);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    setFormData(config);
    setErrors({});
  }, [config, isOpen]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (formData.enabled) {
      if (!formData.smtpHost.trim()) {
        newErrors.smtpHost = 'Servidor SMTP é obrigatório';
      }

      if (!formData.smtpPort || formData.smtpPort <= 0) {
        newErrors.smtpPort = 'Porta SMTP deve ser um número válido';
      }

      if (!formData.senderEmail.trim()) {
        newErrors.senderEmail = 'E-mail remetente é obrigatório';
      } else if (!/\S+@\S+\.\S+/.test(formData.senderEmail)) {
        newErrors.senderEmail = 'E-mail remetente inválido';
      }

      if (!formData.senderPassword.trim()) {
        newErrors.senderPassword = 'Senha é obrigatória';
      }

      if (!formData.recipientEmail.trim()) {
        newErrors.recipientEmail = 'E-mail destinatário é obrigatório';
      } else if (!/\S+@\S+\.\S+/.test(formData.recipientEmail)) {
        newErrors.recipientEmail = 'E-mail destinatário inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSave(formData);
    onClose();
  };

  const handleInputChange = (field: keyof EmailConfigType, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">
              Configurações de E-mail
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <Mail className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Enable Email */}
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white transition-colors">Ativar envio por e-mail</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">Receba lembretes por e-mail quando programados</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => handleInputChange('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-700"></div>
            </label>
          </div>

          {formData.enabled && (
            <>
              {/* SMTP Host */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 transition-colors">
                  Servidor SMTP
                </label>
                <input
                  type="text"
                  value={formData.smtpHost}
                  onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    errors.smtpHost ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="smtp.gmail.com"
                />
                {errors.smtpHost && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.smtpHost}</p>
                )}
              </div>

              {/* SMTP Port */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 transition-colors">
                  Porta SMTP
                </label>
                <input
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    errors.smtpPort ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="587"
                />
                {errors.smtpPort && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.smtpPort}</p>
                )}
              </div>

              {/* Sender Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 transition-colors">
                  E-mail remetente
                </label>
                <input
                  type="email"
                  value={formData.senderEmail}
                  onChange={(e) => handleInputChange('senderEmail', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    errors.senderEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="seu-email@gmail.com"
                />
                {errors.senderEmail && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.senderEmail}</p>
                )}
              </div>

              {/* Sender Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 transition-colors">
                  Senha do e-mail
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.senderPassword}
                    onChange={(e) => handleInputChange('senderPassword', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                      errors.senderPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Sua senha ou senha de app"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.senderPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.senderPassword}</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Para Gmail, use uma senha de app em vez da senha normal
                </p>
              </div>

              {/* Recipient Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 transition-colors">
                  E-mail destinatário
                </label>
                <input
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    errors.recipientEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="destinatario@gmail.com"
                />
                {errors.recipientEmail && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.recipientEmail}</p>
                )}
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Salvar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailConfig;