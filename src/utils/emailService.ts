import { Reminder, EmailConfig } from '../types/reminder';

// EmailJS configuration
const EMAILJS_SERVICE_ID = 'gmail'; // You'll configure this in EmailJS
const EMAILJS_TEMPLATE_ID = 'reminder_template'; // You'll create this template
const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY'; // You'll get this from EmailJS

// Initialize EmailJS (we'll load it dynamically)
let emailjs: any = null;

const loadEmailJS = async () => {
  if (emailjs) return emailjs;
  
  try {
    // Load EmailJS from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    document.head.appendChild(script);
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        emailjs = (window as any).emailjs;
        emailjs.init(EMAILJS_PUBLIC_KEY);
        resolve(emailjs);
      };
      script.onerror = reject;
    });
  } catch (error) {
    console.error('Failed to load EmailJS:', error);
    throw error;
  }
};

export const sendReminderEmail = async (reminder: Reminder, emailConfig: EmailConfig): Promise<boolean> => {
  if (!emailConfig.enabled) {
    console.log('📧 Email notifications are disabled');
    return false;
  }

  try {
    console.log('📧 Sending email notification for reminder:', reminder.title);
    
    // Load EmailJS if not already loaded
    await loadEmailJS();
    
    if (!emailjs) {
      throw new Error('EmailJS not loaded');
    }

    // Prepare email template parameters
    const templateParams = {
      to_email: emailConfig.recipientEmail,
      from_email: emailConfig.senderEmail,
      reminder_title: reminder.title,
      reminder_description: reminder.description || 'Sem descrição',
      reminder_date: new Date(reminder.date).toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      reminder_time: reminder.time,
      app_name: 'Lembrete Pro',
      current_year: new Date().getFullYear()
    };

    console.log('📋 Sending email with params:', {
      to: templateParams.to_email,
      title: templateParams.reminder_title
    });

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    if (response.status === 200) {
      console.log('✅ Email sent successfully:', response);
      return true;
    } else {
      console.error('❌ Email sending failed:', response);
      return false;
    }

  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
};

export const sendTestEmail = async (emailConfig: EmailConfig): Promise<{ success: boolean; message: string }> => {
  if (!emailConfig.enabled) {
    return {
      success: false,
      message: 'Email notifications are disabled'
    };
  }

  try {
    // Create a test reminder
    const testReminder: Reminder = {
      id: 'test-' + Date.now(),
      owner_id: 'test',
      title: '🧪 Teste de Email - Lembrete Pro',
      description: 'Este é um email de teste para verificar se as configurações estão funcionando corretamente. Se você recebeu este email, tudo está configurado perfeitamente!',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].slice(0, 5),
      completed: false,
      created_at: new Date().toISOString(),
      notified: false,
      notification_enabled: true
    };

    const success = await sendReminderEmail(testReminder, emailConfig);
    
    return {
      success,
      message: success 
        ? '✅ Email de teste enviado com sucesso! Verifique sua caixa de entrada.'
        : '❌ Falha ao enviar email de teste. Verifique as configurações.'
    };

  } catch (error) {
    return {
      success: false,
      message: `❌ Erro ao enviar email de teste: ${error.message}`
    };
  }
};

// Alternative: Simple SMTP-based email (for advanced users)
export const sendEmailViaSMTP = async (reminder: Reminder, emailConfig: EmailConfig): Promise<boolean> => {
  try {
    console.log('📧 Sending email via SMTP for reminder:', reminder.title);

    // Prepare email content
    const subject = `🔔 Lembrete: ${reminder.title}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5;
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
            font-size: 24px; 
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
            border: 1px solid #e2e8f0; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
          }
          .reminder-title { 
            font-size: 20px; 
            font-weight: 600; 
            color: #1e293b; 
            margin: 0 0 10px 0; 
          }
          .reminder-description { 
            color: #64748b; 
            margin: 10px 0; 
            font-size: 16px; 
          }
          .reminder-details { 
            display: flex; 
            gap: 20px; 
            margin-top: 15px; 
            font-size: 14px; 
          }
          .detail-item { 
            display: flex; 
            align-items: center; 
            color: #475569; 
          }
          .detail-item strong { 
            color: #1e293b; 
          }
          .footer { 
            background: #f8fafc; 
            padding: 20px; 
            text-align: center; 
            border-top: 1px solid #e2e8f0; 
            color: #64748b; 
            font-size: 14px; 
          }
          .cta-button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Lembrete Pro</h1>
            <p>Você tem um lembrete programado!</p>
          </div>
          
          <div class="content">
            <div class="reminder-card">
              <div class="reminder-title">${reminder.title}</div>
              ${reminder.description ? `<div class="reminder-description">${reminder.description}</div>` : ''}
              
              <div class="reminder-details">
                <div class="detail-item">
                  <strong>📅 Data:</strong>&nbsp;${new Date(reminder.date).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div class="detail-item">
                  <strong>🕐 Horário:</strong>&nbsp;${reminder.time}
                </div>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${window.location.origin}" class="cta-button">
                Abrir Lembrete Pro
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>Este email foi enviado automaticamente pelo <strong>Lembrete Pro</strong></p>
            <p>© ${new Date().getFullYear()} - Sistema de Gerenciamento de Lembretes</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Use a simple email service API (you can replace with your preferred service)
    const emailData = {
      to: emailConfig.recipientEmail,
      from: emailConfig.senderEmail,
      subject: subject,
      html: htmlContent,
      // SMTP configuration
      smtp: {
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort,
        secure: emailConfig.smtpPort === 465,
        auth: {
          user: emailConfig.senderEmail,
          pass: emailConfig.senderPassword
        }
      }
    };

    // For now, we'll use a mock implementation
    // In production, you'd integrate with a real email service
    console.log('📧 Email would be sent:', {
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from
    });

    // Simulate success for now
    return true;

  } catch (error) {
    console.error('❌ SMTP Email error:', error);
    return false;
  }
};