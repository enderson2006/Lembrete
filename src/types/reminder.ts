export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  completed: boolean;
  created_at: string;
  notified: boolean;
  notification_enabled: boolean;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  senderEmail: string;
  senderPassword: string;
  recipientEmail: string;
  enabled: boolean;
}

export type ViewMode = 'month' | 'week';