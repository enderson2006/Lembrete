import { Reminder } from '../types/reminder';
import { EmailConfig } from '../types/reminder';
import { supabase } from '../lib/supabase';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showNotification = (reminder: Reminder): void => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(`Lembrete: ${reminder.title}`, {
      body: reminder.description,
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: reminder.id,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);
  }
};

export const checkForDueReminders = (reminders: Reminder[]): Reminder[] => {
  const now = new Date();
  const dueReminders: Reminder[] = [];

  reminders.forEach(reminder => {
    if (!reminder.notified && !reminder.completed && reminder.notification_enabled) {
      const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
      const timeDiff = reminderDateTime.getTime() - now.getTime();
      
      // Notify if within 1 minute of the reminder time
      if (timeDiff <= 60000 && timeDiff >= -60000) {
        dueReminders.push(reminder);
      }
    }
  });

  return dueReminders;
};

export const sendEmailNotification = async (reminder: Reminder, emailConfig: EmailConfig): Promise<boolean> => {
  if (!emailConfig.enabled) {
    console.log('📧 Email notifications are disabled');
    return false;
  }

  try {
    console.log('📧 Sending email notification for reminder:', reminder.title);
    
    // For now, use a simple email service or simulate
    // Since Supabase Edge Functions for email require additional setup
    const emailData = {
      to: emailConfig.recipientEmail,
      from: emailConfig.senderEmail,
      subject: `Lembrete: ${reminder.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1>🔔 Lembrete Pro</h1>
            <p>Você tem um lembrete programado!</p>
          </div>
          <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px;">
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h2>${reminder.title}</h2>
              ${reminder.description ? `<p>${reminder.description}</p>` : ''}
              <div style="color: #6b7280; font-size: 14px; margin-top: 10px;">
                📅 Data: ${new Date(reminder.date).toLocaleDateString('pt-BR')}<br>
                🕐 Horário: ${reminder.time}
              </div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
            <p>Este email foi enviado automaticamente pelo Lembrete Pro</p>
          </div>
        </div>
      `
    };

    // Use EmailJS or similar service for actual email sending
    // For now, we'll use a simple fetch to a email service
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: 'gmail', // You'll need to configure this
        template_id: 'template_reminder',
        user_id: 'your_emailjs_user_id',
        template_params: {
          to_email: emailConfig.recipientEmail,
          from_email: emailConfig.senderEmail,
          subject: emailData.subject,
          message: emailData.html,
          reminder_title: reminder.title,
          reminder_description: reminder.description || '',
          reminder_date: new Date(reminder.date).toLocaleDateString('pt-BR'),
          reminder_time: reminder.time
        }
      })
    });

    if (response.ok) {
      console.log('✅ Email notification sent successfully');
      return true;
    } else {
      console.error('❌ Failed to send email:', response.statusText);
      return false;
    }

  } catch (error) {
    console.error('❌ Error sending email notification:', error);
    return false;
  }
};
