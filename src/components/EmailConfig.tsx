import React, { useState, useEffect } from 'react';
import { Settings, Mail, Save, Eye, EyeOff, Send, CheckCircle, AlertCircle, HelpCircle, ExternalLink } from 'lucide-react';
import { EmailConfig as EmailConfigType } from '../types/reminder';
import { sendTestEmail, diagnoseEmailSystem } from '../utils/emailService';

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
  const [testEmailStatus, setTestEmailStatus] = useState<{
    loading: boolean;
    success: boolean | null;
    message: string;
  }>({
    loading: false,
    success: null,
    message: ''
  });
  const [showHelp, setShowHelp] = useState(false);
  const [diagnosis, setDiagnosis] = useState<{ status: string; details: string[] } | null>(null);

  useEffect(() => {
    setFormData(config);
    setErrors({});
    setTestEmailStatus({ loading: false, success: null, message: '' });
    setShowHelp(false);
    setDiagnosis(null);
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

  const handleTestEmail = async () => {
    if (!validateForm()) {
      return;
    }

    setTestEmailStatus({ loading: true, success: null, message: 'Enviando email de teste...' });

    try {
      const result = await sendTestEmail(formData);
      setTestEmailStatus({
        loading: false,
        success: result.success,
        message: result.message
      });

      // Clear status after 5 seconds
      setTimeout(() => {
        setTestEmailStatus({ loading: false, success: null, message: '' });
      }, 5000);

    } catch (error) {
      setTestEmailStatus({
        loading: false,
        success: false,
        message: `❌ Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    }
  };
  if (!isOpen) return null;
  const handleDiagnosis = async () => {
    setTestEmailStatus({ loading: true, success: null, message: 'Executando diagnóstico...' });
    
    try {
      const result = await diagnoseEmailSystem();
      setDiagnosis(result);
      setTestEmailStatus({
        loading: false,
        success: result.status === 'ok',
        message: result.status === 'ok' ? '✅ Sistema funcionando' : '⚠️ Problemas detectados'
      });
    } catch (error) {
      setTestEmailStatus({
        loading: false,
        success: false,
        message: `❌ Erro no diagnóstico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    }
  };


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
          {/* Help Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-800 dark:text-blue-200">Como configurar email</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
              >
                {showHelp ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            
            {showHelp && (
              <div className="mt-3 text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <div className="font-medium">📧 Opção 1 - EmailJS (Recomendado):</div>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Acesse <a href="https://www.emailjs.com/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center">emailjs.com <ExternalLink className="h-3 w-3 ml-1" /></a></li>
                  <li>Crie conta gratuita</li>
                  <li>Configure Gmail como serviço</li>
                  <li>Crie template com ID: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">template_lembrete</code></li>
                  <li>Use sua chave pública como "senha" aqui</li>
                </ol>
                
                <div className="font-medium mt-3">🔧 Configuração aqui:</div>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Servidor SMTP:</strong> <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">emailjs</code></li>
                  <li><strong>Porta:</strong> <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">587</code></li>
                  <li><strong>Email remetente:</strong> Seu Gmail</li>
                  <li><strong>Senha:</strong> Sua chave pública do EmailJS</li>
                  <li><strong>Email destinatário:</strong> Onde receber lembretes</li>
                </ul>
              </div>
            )}
          </div>
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
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 <strong>Dica para Gmail:</strong>
                  </p>
                  <ol className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-4 list-decimal">
                    <li>Ative a verificação em 2 etapas</li>
                    <li>Vá em "Senhas de app" nas configurações</li>
                    <li>Gere uma senha específica para este app</li>
                    <li>Use essa senha aqui (não sua senha normal)</li>
                  </ol>
                </div>
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
              
              {/* Test Email Button */}
              <div className="pt-4 border-t dark:border-gray-600">
                {/* Diagnosis Results */}
                {diagnosis && (
                  <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">🔍 Diagnóstico do Sistema:</h4>
                    <div className="space-y-1 text-sm">
                      {diagnosis.details.map((detail, index) => (
                        <div key={index} className="text-gray-700 dark:text-gray-300">{detail}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test Email Status */}
                {testEmailStatus.message && (
                  <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
                    testEmailStatus.success === true
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : testEmailStatus.success === false
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  }`}>
                    {testEmailStatus.loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : testEmailStatus.success === true ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : testEmailStatus.success === false ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="text-sm">{testEmailStatus.message}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleTestEmail}
                    disabled={testEmailStatus.loading || !formData.enabled}
                    className="w-full px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {testEmailStatus.loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>📧 Enviar Email de Teste</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleDiagnosis}
                    disabled={testEmailStatus.loading}
                    className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {testEmailStatus.loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Diagnosticando...</span>
                      </>
                    ) : (
                      <>
                        <HelpCircle className="h-4 w-4" />
                        <span>🔍 Diagnosticar Sistema</span>
                      </>
                    )}
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Use o diagnóstico se o teste falhar
                </p>
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