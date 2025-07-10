import { Reminder, Profile } from '../types/reminder';
import { supabase } from '../lib/supabase';

// Database operations
export const fetchReminders = async (userId: string): Promise<Reminder[]> => {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .or(`owner_id.eq.${userId},assigned_to_user_id.eq.${userId}`)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    console.error('Error fetching reminders:', error);
    return [];
  }

  return data || [];
};

export const fetchProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('display_name', { ascending: true });

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }

  return data || [];
};

export const createProfile = async (userId: string, email: string, displayName?: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      id: userId,
      email,
      display_name: displayName || email.split('@')[0]
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    return null;
  }

  return data;
};

export const addReminder = async (reminder: Omit<Reminder, 'id' | 'created_at'>): Promise<Reminder | null> => {
  const { data, error } = await supabase
    .from('reminders')
    .insert([reminder])
    .select()
    .single();

  if (error) {
    console.error('Error adding reminder:', error);
    return null;
  }

  return data;
};

export const updateReminder = async (
  reminder: Reminder, 
  assignedUserIds: string[] = []
): Promise<Reminder | null> => {
  const { data, error } = await supabase
    .from('reminders')
    .update({
      title: reminder.title,
      description: reminder.description,
      date: reminder.date,
      time: reminder.time,
      completed: reminder.completed,
      notified: reminder.notified,
      notification_enabled: reminder.notification_enabled,
      assigned_to_user_id: reminder.assigned_to_user_id,
    })
    .eq('id', reminder.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating reminder:', error);
    return null;
  }

  // Update assignments - remove old ones and add new ones
  if (assignedUserIds.length >= 0) {
    // Remove existing assignments
    await supabase
      .from('reminder_assignments')
      .delete()
      .eq('reminder_id', reminder.id);

    // Add new assignments
    if (assignedUserIds.length > 0) {
      const assignments = assignedUserIds.map(userId => ({
        reminder_id: reminder.id,
        user_id: userId
      }));

      const { error: assignmentError } = await supabase
        .from('reminder_assignments')
        .insert(assignments);

      if (assignmentError) {
        console.error('Error updating reminder assignments:', assignmentError);
      }
    }
  }

  return data;
};

export const deleteReminder = async (reminderId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId);

  if (error) {
    console.error('Error deleting reminder:', error);
    return false;
  }

  return true;
};

// Legacy localStorage functions (kept for migration purposes)
export const saveReminders = (reminders: Reminder[]): void => {
  localStorage.setItem('reminders', JSON.stringify(reminders));
};

export const loadReminders = (): Reminder[] => {
  const stored = localStorage.getItem('reminders');
  return stored ? JSON.parse(stored) : [];
};

// Utility functions
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTime = (date: Date): string => {
  return date.toTimeString().split(' ')[0].slice(0, 5);
};

// Create a Date object from a date string in local timezone
export const createLocalDate = (dateString: string): Date => {
  // Append T00:00:00 to force local timezone interpretation
  return new Date(`${dateString}T00:00:00`);
};

export const parseDateTime = (date: string, time: string): Date => {
  return new Date(`${date}T${time}`);
};

export const isToday = (dateString: string): boolean => {
  const today = new Date();
  const date = createLocalDate(dateString);
  return date.toDateString() === today.toDateString();
};

export const isPast = (dateString: string, timeString: string): boolean => {
  const now = new Date();
  const reminderDate = parseDateTime(dateString, timeString);
  return reminderDate < now;
};

export const getRemindersForDate = (reminders: Reminder[], date: string): Reminder[] => {
  return reminders.filter(reminder => reminder.date === date);
};

export const getDaysWithReminders = (reminders: Reminder[], year: number, month: number): Set<number> => {
  const days = new Set<number>();
  reminders.forEach(reminder => {
    const reminderDate = createLocalDate(reminder.date);
    if (reminderDate.getFullYear() === year && reminderDate.getMonth() === month) {
      days.add(reminderDate.getDate());
    }
  });
  return days;
};

// Migration function to move localStorage data to Supabase
export const migrateLocalStorageToSupabase = async (userId: string): Promise<void> => {
  const localReminders = loadReminders();
  
  if (localReminders.length === 0) {
    return;
  }

  console.log(`Migrating ${localReminders.length} reminders to Supabase...`);

  for (const reminder of localReminders) {
    const reminderData = {
      owner_id: userId, // Changed from user_id to owner_id
      title: reminder.title,
      description: reminder.description,
      date: reminder.date,
      time: reminder.time,
      completed: reminder.completed,
      notified: reminder.notified,
      notification_enabled: reminder.notification_enabled ?? true,
      assigned_to_user_id: null, // New reminders are not assigned by default
    };

    await addReminder(reminderData);
  }

  // Clear localStorage after successful migration
  localStorage.removeItem('reminders');
  console.log('Migration completed successfully!');
};