import { Reminder } from '../types/reminder';
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

// Queue reminder for push notification
export const queueReminderNotification = async (reminder: Reminder): Promise<boolean> => {
  try {
    // Add to notification queue for the owner
    const { error: ownerError } = await supabase
      .from('notification_queue')
      .insert({
        reminder_id: reminder.id,
        user_id: reminder.owner_id,
        status: 'pending'
      });

    if (ownerError) {
      console.error('Failed to queue notification for owner:', ownerError);
      return false;
    }

    // If reminder is assigned to someone else, also queue for them
    if (reminder.assigned_to_user_id && reminder.assigned_to_user_id !== reminder.owner_id) {
      const { error: assignedError } = await supabase
        .from('notification_queue')
        .insert({
          reminder_id: reminder.id,
          user_id: reminder.assigned_to_user_id,
          status: 'pending'
        });

      if (assignedError) {
        console.error('Failed to queue notification for assigned user:', assignedError);
      }
    }

    // Trigger the push notification function
    const { error: functionError } = await supabase.functions.invoke('send-push-notification', {
      body: {
        reminderId: reminder.id,
        userId: reminder.owner_id
      }
    });

    if (functionError) {
      console.error('Failed to trigger push notification function:', functionError);
      return false;
    }

    // If assigned, also trigger for assigned user
    if (reminder.assigned_to_user_id && reminder.assigned_to_user_id !== reminder.owner_id) {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          reminderId: reminder.id,
          userId: reminder.assigned_to_user_id
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Error queuing reminder notification:', error);
    return false;
  }
};

// Process due reminders and queue them for push notifications
export const processDueReminders = async (reminders: Reminder[]): Promise<void> => {
  const dueReminders = checkForDueReminders(reminders);
  
  for (const reminder of dueReminders) {
    await queueReminderNotification(reminder);
  }
};