import { Reminder } from '../types/reminder';

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
