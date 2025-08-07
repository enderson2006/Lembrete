import React, { useState, useEffect } from 'react';
import { Plus, Settings, Bell, BellOff, LogOut, Moon, Sun, MessageCircle, Trash2, Archive } from 'lucide-react';
import Calendar from './components/Calendar';
import ReminderModal from './components/ReminderModal';
import ReminderList from './components/ReminderList';
import EmailConfig from './components/EmailConfig';
import CleanupConfig from './components/CleanupConfig';
import ChatBot from './components/ChatBot';
import Auth from './components/Auth';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { Reminder, EmailConfig as EmailConfigType, ViewMode, Profile, CleanupConfig as CleanupConfigType } from './types/reminder';
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
  cleanupOldReminders,
} from './utils/reminderUtils';
import {
  requestNotificationPermission,
  showNotification,
  checkForDueReminders,
  sendEmailNotification,
} from './utils/notificationUtils';

function App() {
  const { user, loading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmailConfigOpen, setIsEmailConfigOpen] = useState(false);
  const [isCleanupConfigOpen, setIsCleanupConfigOpen] = useState(false);
  const [isChatBotOpen, setIsChatBotOpen] = useState(false);
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
  const [cleanupConfig, setCleanupConfig] = useState<CleanupConfigType>({
    autoCleanupEnabled: false,
    cleanupCompletedAfterDays: 7,
    cleanupOverdueAfterDays: 30,
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
        
        setLoadingReminders(false);
      };

      loadData();

      // Load email config from localStorage
      const savedEmailConfig = localStorage.getItem('emailConfig');
      if (savedEmailConfig) {
        setEmailConfig(JSON.parse(savedEmailConfig));
      }

      // Load cleanup config from localStorage
      const savedCleanupConfig = localStorage.getItem('cleanupConfig');
      if (savedCleanupConfig) {
        setCleanupConfig(JSON.parse(savedCleanupConfig));
      }

      // Request notification permission
      requestNotificationPermission().then(setNotificationsEnabled);
    }
  }, [user]);

  // Listen for service worker messages
  useEffect(() => {
    const handleServiceWorkerMessage = (event: CustomEvent) => {
      const { reminderId } = event.detail;
      handleToggleComplete(reminderId);
    };

    const handleBackgroundCheck = (event: MessageEvent) => {
      if (event.data && event.data.type === 'CHECK_REMINDERS_BACKGROUND') {
        console.log('🔄 Background reminder check requested');
        // Force a reminder check
        const dueReminders = checkForDueReminders(reminders);
        for (const reminder of dueReminders) {
          showNotification(reminder);
          // Mark as notified
          const updatedReminder = { ...reminder, notified: true };
          updateReminder(updatedReminder).then(result => {
            if (result) {
              setReminders(prev => 
                prev.map(r => r.id === reminder.id ? result : r)
              );
            }
          });
        }
      }
    };

    window.addEventListener('markReminderComplete', handleServiceWorkerMessage as EventListener);
    navigator.serviceWorker?.addEventListener('message', handleBackgroundCheck);

    return () => {
      window.removeEventListener('markReminderComplete', handleServiceWorkerMessage as EventListener);
      navigator.serviceWorker?.removeEventListener('message', handleBackgroundCheck);
    };
  }, [reminders]);

  // Keep service worker alive for background operation
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const keepServiceWorkerAlive = () => {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          const channel = new MessageChannel();
          registration.active.postMessage(
            { type: 'KEEP_ALIVE' },
            [channel.port2]
          );
        }
      }).catch(console.error);
    };

    // Send keep-alive message every 20 seconds
    const keepAliveInterval = setInterval(keepServiceWorkerAlive, 20000);

    return () => clearInterval(keepAliveInterval);
  }, []);

  // Check for due reminders every minute
  useEffect(() => {
    if (!user || !notificationsEnabled) return;

    const interval = setInterval(async () => {
      const dueReminders = checkForDueReminders(reminders);

      for (const reminder of dueReminders) {
        showNotification(reminder);
        
        // Send email notification if enabled
        if (emailConfig.enabled) {
          console.log('📧 Sending email notification for:', reminder.title);
          const emailSent = await sendEmailNotification(reminder, emailConfig);
          if (emailSent) {
            console.log('✅ Email notification sent successfully');
          } else {
            console.log('❌ Failed to send email notification');
          }
        }
        
        // Mark as notified
        const updatedReminder = { ...reminder, notified: true };
        const result = await updateReminder(updatedReminder);
        if (result) {
          setReminders(prev => 
            prev.map(r => r.id === reminder.id ? result : r)
          );
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [reminders, notificationsEnabled, user, emailConfig]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show auth screen if user is not logged in
  if (!user) {
    return <Auth />;
  }

  const handleSaveReminder = async (
    reminderData: Omit<Reminder, 'id' | 'created_at' | 'owner_id'>, 
    assignedUserIds: string[] = []
  ) => {
    if (!user) return;

    if (editingReminder) {
      // Update existing reminder
      const updatedReminder = {
        ...editingReminder,
        ...reminderData,
      };
      
      const result = await updateReminder(updatedReminder, assignedUserIds);
      if (result) {
        setReminders(prev => prev.map(r => r.id === result.id ? result : r));
      }
    } else {
      // Add new reminder
      const newReminderData = {
        ...reminderData,
        owner_id: user.id,
      };
      
      const result = await addReminder(newReminderData, assignedUserIds);
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

  const handleSaveCleanupConfig = (config: CleanupConfigType) => {
    setCleanupConfig(config);
    localStorage.setItem('cleanupConfig', JSON.stringify(config));
  };

  const handleManualCleanup = async () => {
    if (confirm('Tem certeza que deseja executar a limpeza agora? Esta ação não pode ser desfeita.')) {
      const cleanedCount = await cleanupOldReminders(reminders, cleanupConfig, user!.id);
      if (cleanedCount > 0) {
        // Reload reminders after cleanup
        const updatedReminders = await fetchReminders(user!.id);
        setReminders(updatedReminders);
        alert(`${cleanedCount} lembretes foram limpos com sucesso!`);
      } else {
        alert('Nenhum lembrete precisava ser limpo.');
      }
    }
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
    <div className="min-h-screen transition-colors animate-fade-in-up" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="glass border-b border-glass transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold neon-glow transition-colors" style={{ color: 'var(--text-primary)' }}>
                Lembretes
                <span className="text-sm font-normal ml-2" style={{ color: 'var(--neon-cyan)' }}></span>
              </h1>
              <div className="hidden sm:flex items-center space-x-4 text-sm">
                <span className="glass px-3 py-1 rounded-full transition-colors text-neon-blue">
                  {totalReminders} total
                </span>
                <span className="glass px-3 py-1 rounded-full transition-colors text-neon-cyan">
                  {completedReminders} concluídos
                </span>
                <span className="glass px-3 py-1 rounded-full transition-colors text-neon-orange">
                  {pendingReminders} pendentes
                </span>
                {/* PWA Status Indicator */}
                {window.matchMedia && window.matchMedia('(display-mode: standalone)').matches && (
                  <span className="glass px-3 py-1 rounded-full transition-colors flex items-center space-x-1 text-neon-purple">
                    <span>📱</span>
                    <span>App Mode</span>
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* User info */}
              <div className="hidden sm:flex items-center space-x-2 text-sm mr-4" style={{ color: 'var(--text-secondary)' }}>
                <span>Olá, {user.email}</span>
              </div>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 glass-hover rounded-lg transition-colors neon-glow"
                style={{ color: 'var(--text-secondary)' }}
                title={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={toggleNotifications}
                className={`p-2 rounded-lg transition-colors glass-hover neon-glow ${
                  notificationsEnabled
                    ? 'text-neon-green'
                    : ''
                }`}
                style={{ color: notificationsEnabled ? 'var(--neon-green)' : 'var(--text-secondary)' }}
                title={
                  notificationsEnabled 
                    ? 'Notificações ativas'
                    : 'Ativar notificações'
                }
              >
                {notificationsEnabled ? (
                  <Bell className="h-5 w-5" />
                ) : (
                  <BellOff className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={() => setIsEmailConfigOpen(true)}
                className="p-2 glass-hover rounded-lg transition-colors neon-glow"
                style={{ color: 'var(--text-secondary)' }}
                title="Configurações de e-mail"
              >
                <Settings className="h-5 w-5" />
              </button>

              <button
                onClick={() => setIsCleanupConfigOpen(true)}
                className="p-2 glass-hover rounded-lg transition-colors neon-glow"
                style={{ color: 'var(--text-secondary)' }}
                title="Configurações de limpeza"
              >
                <Archive className="h-5 w-5" />
              </button>

              <button
                onClick={handleManualCleanup}
                className="p-2 glass-hover rounded-lg transition-colors neon-glow"
                style={{ color: 'var(--neon-orange)' }}
                title="Limpeza manual"
              >
                <Trash2 className="h-5 w-5" />
              </button>

              <button
                onClick={handleSignOut}
                className="p-2 glass-hover rounded-lg transition-colors neon-glow"
                style={{ color: 'var(--text-secondary)' }}
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
              
              <button
                onClick={handleAddReminder}
                className="btn-primary px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
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
          <div className="flex items-center justify-center py-12 animate-fade-in-up">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--neon-cyan)' }}></div>
            <span className="ml-3" style={{ color: 'var(--text-secondary)' }}>Carregando lembretes...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
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

      <CleanupConfig
        isOpen={isCleanupConfigOpen}
        onClose={() => setIsCleanupConfigOpen(false)}
        config={cleanupConfig}
        onSave={handleSaveCleanupConfig}
      />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* ChatBot */}
      <ChatBot
        isOpen={isChatBotOpen}
        onClose={() => setIsChatBotOpen(false)}
        onCreateReminder={handleSaveReminder}
        selectedDate={selectedDate}
      />

      {/* ChatBot Toggle Button */}
      <button
        onClick={() => setIsChatBotOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 btn-primary rounded-full flex items-center justify-center shadow-lg animate-pulse-neon z-40"
        title="Assistente de Lembretes"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}

export default App;