import React, { useState, useEffect } from 'react';
import { Plus, Settings, Bell, BellOff, LogOut } from 'lucide-react';
import Calendar from './components/Calendar';
import ReminderModal from './components/ReminderModal';
import ReminderList from './components/ReminderList';
import EmailConfig from './components/EmailConfig';
import Auth from './components/Auth';
import { useAuth } from './contexts/AuthContext';
import { Reminder, EmailConfig as EmailConfigType, ViewMode, Profile } from './types/reminder';
import {
  fetchReminders,
  fetchProfiles,
  createProfile,
  addReminder,
  updateReminder,
  deleteReminder,
  formatDate,
  getDaysWithReminders,
  migrateLocalStorageToSupabase,
  createLocalDate,
} from './utils/reminderUtils';
import {
  requestNotificationPermission,
  showNotification,
  checkForDueReminders,
} from './utils/notificationUtils';

function App() {
  const { user, loading, signOut } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmailConfigOpen, setIsEmailConfigOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [emailConfig, setEmailConfig] = useState<EmailConfigType>({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    senderEmail: '',
    senderPassword: '',
    recipientEmail: '',
    enabled: false,
  });

  // Load data on mount
  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setLoadingReminders(true);
        
        // Migrate localStorage data to Supabase if needed
        await migrateLocalStorageToSupabase(user.id);
        
        // Load reminders and profiles from Supabase
        const [userReminders, allProfiles] = await Promise.all([
          fetchReminders(user.id),
          fetchProfiles()
        ]);
        
        setReminders(userReminders);
        setProfiles(allProfiles);
        
        // Ensure current user has a profile
        const userProfile = allProfiles.find(p => p.id === user.id);
        if (!userProfile && user.email) {
          await createProfile(user.id, user.email);
          // Reload profiles after creating user profile
          const updatedProfiles = await fetchProfiles();
          setProfiles(updatedProfiles);
        }
        
        setLoadingReminders(false);
      };

      loadData();

      // Load email config from localStorage
      const savedEmailConfig = localStorage.getItem('emailConfig');
      if (savedEmailConfig) {
        setEmailConfig(JSON.parse(savedEmailConfig));
      }

      // Request notification permission
      requestNotificationPermission().then(setNotificationsEnabled);
    }
  }, [user]);

  // Check for due reminders every minute
  useEffect(() => {
    if (!user || !notificationsEnabled) return;

    const interval = setInterval(() => {
      const dueReminders = checkForDueReminders(reminders);
      dueReminders.forEach(async (reminder) => {
        // Only show notification if the individual reminder has notifications enabled
        if (reminder.notification_enabled) {
          showNotification(reminder);
          // Mark as notified in database
          const updatedReminder = { ...reminder, notified: true };
          const result = await updateReminder(updatedReminder);
          if (result) {
            setReminders(prev => 
              prev.map(r => r.id === reminder.id ? result : r)
            );
          }
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [reminders, notificationsEnabled, user]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show auth screen if user is not logged in
  if (!user) {
    return <Auth />;
  }

  const handleSaveReminder = async (reminderData: Omit<Reminder, 'id' | 'created_at' | 'owner_id'>) => {
    if (!user) return;

    if (editingReminder) {
      // Update existing reminder
      const updatedReminder = {
        ...editingReminder,
        ...reminderData,
      };
      
      const result = await updateReminder(updatedReminder);
      if (result) {
        setReminders(prev => prev.map(r => r.id === result.id ? result : r));
      }
    } else {
      // Add new reminder
      const newReminderData = {
        ...reminderData,
        owner_id: user.id, // Changed from user_id to owner_id
      };
      
      const result = await addReminder(newReminderData);
      if (result) {
        setReminders(prev => [...prev, result]);
      }
    }
    
    setEditingReminder(null);
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsModalOpen(true);
  };

  const handleDeleteReminder = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lembrete?')) {
      const success = await deleteReminder(id);
      if (success) {
        setReminders(prev => prev.filter(r => r.id !== id));
      }
    }
  };

  const handleToggleComplete = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    const updatedReminder = { ...reminder, completed: !reminder.completed };
    const result = await updateReminder(updatedReminder);
    if (result) {
      setReminders(prev => prev.map(r => r.id === id ? result : r));
    }
  };

  const handleSaveEmailConfig = (config: EmailConfigType) => {
    setEmailConfig(config);
    localStorage.setItem('emailConfig', JSON.stringify(config));
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    const selectedDateObj = createLocalDate(date);
    setCurrentDate(selectedDateObj);
  };

  const handleAddReminder = () => {
    setEditingReminder(null);
    setIsModalOpen(true);
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const enabled = await requestNotificationPermission();
      setNotificationsEnabled(enabled);
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const daysWithReminders = getDaysWithReminders(
    reminders,
    currentDate.getFullYear(),
    currentDate.getMonth()
  );

  const totalReminders = reminders.length;
  const completedReminders = reminders.filter(r => r.completed).length;
  const pendingReminders = totalReminders - completedReminders;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Lembrete Pro
              </h1>
              <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-600">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  {totalReminders} total
                </span>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  {completedReminders} concluídos
                </span>
                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
                  {pendingReminders} pendentes
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* User info */}
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600 mr-4">
                <span>Olá, {user.email}</span>
              </div>

              <button
                onClick={toggleNotifications}
                className={`p-2 rounded-lg transition-colors ${
                  notificationsEnabled
                    ? 'text-green-600 bg-green-50 hover:bg-green-100'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title={notificationsEnabled ? 'Notificações ativadas' : 'Ativar notificações'}
              >
                {notificationsEnabled ? (
                  <Bell className="h-5 w-5" />
                ) : (
                  <BellOff className="h-5 w-5" />
                )}
              </button>
              
              <button
                onClick={() => setIsEmailConfigOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Configurações de e-mail"
              >
                <Settings className="h-5 w-5" />
              </button>

              <button
                onClick={handleSignOut}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
              
              <button
                onClick={handleAddReminder}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Lembrete</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingReminders ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Carregando lembretes...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calendar */}
            <div>
              <Calendar
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                daysWithReminders={daysWithReminders}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>

            {/* Reminder List */}
            <div>
              <ReminderList
                reminders={reminders}
                selectedDate={selectedDate}
                onEdit={handleEditReminder}
                onDelete={handleDeleteReminder}
                onToggleComplete={handleToggleComplete}
                currentUserId={user.id}
              />
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ReminderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveReminder}
        selectedDate={selectedDate}
        editingReminder={editingReminder}
        profiles={profiles}
        currentUserId={user.id}
      />

      <EmailConfig
        isOpen={isEmailConfigOpen}
        onClose={() => setIsEmailConfigOpen(false)}
        config={emailConfig}
        onSave={handleSaveEmailConfig}
      />
    </div>
  );
}

export default App;