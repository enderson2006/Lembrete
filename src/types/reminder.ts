export interface Reminder {
  id: string;
  owner_id: string; // Changed from user_id to owner_id
  assigned_to_user_id?: string | null; // New field for assignment
  title: string;
  description: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  completed: boolean;
  created_at: string;
  notified: boolean;
  notification_enabled: boolean;
}

export interface Profile {
  id: string;
  email: string;
  display_name?: string | null;
  created_at: string;
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