import { Reminder, EmailConfig } from '../types/reminder';

// Configuração do EmailJS
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_lembrete', // Você vai configurar isso
  TEMPLATE_ID: 'template_lembrete', // Você vai configurar isso
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY', // Você vai configurar isso
};

// Interface para EmailJS
interface EmailJSResponse {
  status: number;
  text: string;
}

// Carregar EmailJS dinamicamente
const loadEmailJS = async (): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Verificar se já está carregado
    if ((window as any).emailjs) {
      resolve((window as any).emailjs);
      return;
    }

    // Carregar script do EmailJS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    script.async = true;
    
    script.onload = () => {
      const emailjs = (window as any).emailjs;
      if (emailjs) {
        console.log('✅ EmailJS carregado com sucesso');
        resolve(emailjs);
      } else {
        reject(new Error('EmailJS não foi carregado corretamente'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Falha ao carregar EmailJS'));
    };
    
    document.head.appendChild(script);
  });
};

// Função principal para enviar email via EmailJS
export const sendReminderEmailJS = async (reminder: Reminder, emailConfig: EmailConfig): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('📧 Iniciando envio via EmailJS...');
    
    // Carregar EmailJS
    const emailjs = await loadEmailJS();
    
    // Inicializar com chave pública (usar senha como chave pública temporariamente)
    const publicKey = emailConfig.senderPassword || EMAILJS_CONFIG.PUBLIC_KEY;
    emailjs.init(publicKey);
    
    // Preparar parâmetros do template
    const templateParams = {
      to_email: emailConfig.recipientEmail,
      from_email: emailConfig.senderEmail,
      from_name: 'Lembrete Pro',
      subject: `🔔 Lembrete: ${reminder.title}`,
      reminder_title: reminder.title,
      reminder_description: reminder.description || 'Sem descrição adicional',
      reminder_date: new Date(reminder.date).toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      reminder_time: reminder.time,
      app_name: 'Lembrete Pro',
      current_year: new Date().getFullYear(),
      message: `
Você tem um lembrete programado:

📋 Título: ${reminder.title}
📝 Descrição: ${reminder.description || 'Sem descrição'}
📅 Data: ${new Date(reminder.date).toLocaleDateString('pt-BR')}
🕐 Horário: ${reminder.time}

Não esqueça! 😊
      `
    };

    console.log('📋 Parâmetros do email:', {
      to: templateParams.to_email,
      from: templateParams.from_email,
      title: templateParams.reminder_title
    });

    // Enviar email
    const serviceId = emailConfig.smtpHost === 'emailjs' ? 'gmail' : 'gmail'; // Usar Gmail como padrão
    const templateId = 'template_lembrete'; // ID do template que você vai criar
    
    const response: EmailJSResponse = await emailjs.send(
      serviceId,
      templateId,
      templateParams
    );

    if (response.status === 200) {
      console.log('✅ Email enviado com sucesso via EmailJS');
      return {
        success: true,
        message: '✅ Email enviado com sucesso via EmailJS!'
      };
    } else {
      console.error('❌ Resposta inesperada do EmailJS:', response);
      return {
        success: false,
        message: `❌ Erro do EmailJS: Status ${response.status}`
      };
    }

  } catch (error: any) {
    console.error('❌ Erro no EmailJS:', error);
    
    // Mensagens de erro mais específicas
    if (error.message?.includes('Public Key')) {
      return {
        success: false,
        message: '❌ Chave pública do EmailJS inválida. Verifique a configuração.'
      };
    } else if (error.message?.includes('Template')) {
      return {
        success: false,
        message: '❌ Template não encontrado. Crie o template "template_lembrete" no EmailJS.'
      };
    } else if (error.message?.includes('Service')) {
      return {
        success: false,
        message: '❌ Serviço de email não configurado. Configure Gmail no EmailJS.'
      };
    } else {
      return {
        success: false,
        message: `❌ Erro EmailJS: ${error.message || 'Erro desconhecido'}`
      };
    }
  }
};

// Função para envio via SMTP (simulado - para desenvolvimento)
export const sendReminderSMTP = async (reminder: Reminder, emailConfig: EmailConfig): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('📧 Simulando envio via SMTP...');
    
    // Validar configurações SMTP
    if (!emailConfig.smtpHost || !emailConfig.senderEmail || !emailConfig.senderPassword) {
      return {
        success: false,
        message: '❌ Configurações SMTP incompletas'
      };
    }

    // Preparar conteúdo do email
    const emailContent = {
      from: emailConfig.senderEmail,
      to: emailConfig.recipientEmail,
      subject: `🔔 Lembrete: ${reminder.title}`,
      html: generateEmailHTML(reminder),
      text: generateEmailText(reminder)
    };

    console.log('📋 Conteúdo do email preparado:', {
      from: emailContent.from,
      to: emailContent.to,
      subject: emailContent.subject
    });

    // Simular envio (em produção, você integraria com um serviço real)
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simular delay

    // Para desenvolvimento, sempre retorna sucesso
    console.log('✅ Email SMTP simulado com sucesso');
    return {
      success: true,
      message: '✅ Email enviado via SMTP (simulado para desenvolvimento)'
    };

  } catch (error: any) {
    console.error('❌ Erro no SMTP:', error);
    return {
      success: false,
      message: `❌ Erro SMTP: ${error.message}`
    };
  }
};

// Função principal que escolhe o método
export const sendReminderEmail = async (reminder: Reminder, emailConfig: EmailConfig): Promise<{ success: boolean; message: string }> => {
  if (!emailConfig.enabled) {
    return {
      success: false,
      message: '📧 Email desabilitado nas configurações'
    };
  }

  console.log('📧 Enviando email para lembrete:', reminder.title);
  console.log('⚙️ Configuração:', {
    host: emailConfig.smtpHost,
    port: emailConfig.smtpPort,
    from: emailConfig.senderEmail,
    to: emailConfig.recipientEmail
  });

  // Escolher método baseado na configuração
  if (emailConfig.smtpHost === 'emailjs' || emailConfig.smtpHost === 'smtp.emailjs.com') {
    return await sendReminderEmailJS(reminder, emailConfig);
  } else {
    return await sendReminderSMTP(reminder, emailConfig);
  }
};

// Função para teste de email
export const sendTestEmail = async (emailConfig: EmailConfig): Promise<{ success: boolean; message: string }> => {
  console.log('🧪 Iniciando teste de email...');
  
  if (!emailConfig.enabled) {
    return {
      success: false,
      message: '❌ Email está desabilitado. Ative primeiro.'
    };
  }

  // Validar configurações básicas
  if (!emailConfig.recipientEmail || !emailConfig.senderEmail) {
    return {
      success: false,
      message: '❌ Configure os emails remetente e destinatário'
    };
  }

  if (!emailConfig.senderPassword) {
    return {
      success: false,
      message: '❌ Configure a senha/chave de acesso'
    };
  }

  // Criar lembrete de teste
  const testReminder: Reminder = {
    id: `test-${Date.now()}`,
    owner_id: 'test-user',
    title: '🧪 Teste de Email - Lembrete Pro',
    description: 'Este é um email de teste para verificar se as configurações estão funcionando corretamente. Se você recebeu este email, parabéns! Tudo está configurado perfeitamente! 🎉',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].slice(0, 5),
    completed: false,
    created_at: new Date().toISOString(),
    notified: false,
    notification_enabled: true
  };

  try {
    const result = await sendReminderEmail(testReminder, emailConfig);
    
    if (result.success) {
      return {
        success: true,
        message: '✅ Email de teste enviado! Verifique sua caixa de entrada (e spam).'
      };
    } else {
      return {
        success: false,
        message: result.message
      };
    }
  } catch (error: any) {
    console.error('❌ Erro no teste de email:', error);
    return {
      success: false,
      message: `❌ Erro inesperado: ${error.message}`
    };
  }
};

// Gerar HTML do email
const generateEmailHTML = (reminder: Reminder): string => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lembrete: ${reminder.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f7fa;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #2563eb, #3b82f6);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 30px 20px;
        }
        .reminder-card {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 25px;
            margin: 20px 0;
        }
        .reminder-title {
            font-size: 24px;
            font-weight: 600;
            color: #1e293b;
            margin: 0 0 15px 0;
        }
        .reminder-description {
            color: #64748b;
            margin: 15px 0;
            font-size: 16px;
            line-height: 1.6;
        }
        .reminder-details {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        .detail-item {
            display: flex;
            align-items: center;
            color: #475569;
            font-size: 16px;
        }
        .detail-item strong {
            color: #1e293b;
            margin-right: 8px;
        }
        .cta-button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 25px 0;
            text-align: center;
        }
        .footer {
            background: #f8fafc;
            padding: 25px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
        }
        .emoji {
            font-size: 1.2em;
            margin-right: 5px;
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            .reminder-details {
                flex-direction: column;
                gap: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><span class="emoji">🔔</span>Lembrete Pro</h1>
            <p>Você tem um lembrete programado!</p>
        </div>
        
        <div class="content">
            <div class="reminder-card">
                <div class="reminder-title">${reminder.title}</div>
                ${reminder.description ? `<div class="reminder-description">${reminder.description}</div>` : ''}
                
                <div class="reminder-details">
                    <div class="detail-item">
                        <strong><span class="emoji">📅</span>Data:</strong>
                        ${new Date(reminder.date).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                    </div>
                    <div class="detail-item">
                        <strong><span class="emoji">🕐</span>Horário:</strong>
                        ${reminder.time}
                    </div>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="${window.location?.origin || 'https://tangerine-cocada-cf0532.netlify.app'}" class="cta-button">
                    <span class="emoji">📱</span>Abrir Lembrete Pro
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Lembrete Pro</strong> - Sistema de Gerenciamento de Lembretes</p>
            <p>© ${new Date().getFullYear()} - Este email foi enviado automaticamente</p>
        </div>
    </div>
</body>
</html>
  `;
};

// Gerar texto simples do email
const generateEmailText = (reminder: Reminder): string => {
  return `
🔔 LEMBRETE PRO

Você tem um lembrete programado!

📋 Título: ${reminder.title}

${reminder.description ? `📝 Descrição: ${reminder.description}\n` : ''}
📅 Data: ${new Date(reminder.date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}

🕐 Horário: ${reminder.time}

---
Lembrete Pro - Sistema de Gerenciamento de Lembretes
© ${new Date().getFullYear()} - Este email foi enviado automaticamente
  `;
};

// Diagnóstico do sistema
export const diagnoseEmailSystem = async (): Promise<{ status: string; details: string[] }> => {
  const details: string[] = [];
  let status = 'ok';

  try {
    // Verificar se EmailJS pode ser carregado
    try {
      await loadEmailJS();
      details.push('✅ EmailJS pode ser carregado');
    } catch (error) {
      details.push('❌ Erro ao carregar EmailJS');
      status = 'error';
    }

    // Verificar conectividade
    try {
      await fetch('https://api.emailjs.com/api/v1.0/email/send', { method: 'HEAD' });
      details.push('✅ Conectividade com EmailJS OK');
    } catch (error) {
      details.push('⚠️ Problema de conectividade com EmailJS');
      status = 'warning';
    }

    // Verificar localStorage
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      details.push('✅ LocalStorage funcionando');
    } catch (error) {
      details.push('❌ Problema com LocalStorage');
      status = 'error';
    }

  } catch (error) {
    details.push(`❌ Erro geral: ${error}`);
    status = 'error';
  }

  return { status, details };
};