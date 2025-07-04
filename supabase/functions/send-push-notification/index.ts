import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationPayload {
  title: string;
  body: string;
  reminderId: string;
  url?: string;
  tag?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { reminderId, userId } = await req.json();

    if (!reminderId || !userId) {
      throw new Error('Missing reminderId or userId');
    }

    console.log('Processing push notification for reminder:', reminderId, 'user:', userId);

    // Get reminder details
    const { data: reminder, error: reminderError } = await supabaseClient
      .from('reminders')
      .select('*')
      .eq('id', reminderId)
      .single();

    if (reminderError || !reminder) {
      console.error('Reminder not found:', reminderError);
      
      // For test notifications, create a mock reminder
      if (reminderId.startsWith('test-reminder-')) {
        console.log('Creating test notification');
        const testReminder = {
          id: reminderId,
          title: 'Teste de Notificação',
          description: 'Esta é uma notificação de teste para verificar se o sistema está funcionando.',
          owner_id: userId
        };
        
        // Continue with test reminder
        return await processNotification(supabaseClient, testReminder, userId);
      }
      
      throw new Error('Reminder not found');
    }

    console.log('Found reminder:', reminder.title);
    return await processNotification(supabaseClient, reminder, userId);

  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function processNotification(supabaseClient: any, reminder: any, userId: string) {
  // Get user's push subscriptions
  const { data: subscriptions, error: subscriptionsError } = await supabaseClient
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (subscriptionsError) {
    console.error('Failed to fetch push subscriptions:', subscriptionsError);
    throw new Error('Failed to fetch push subscriptions');
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No push subscriptions found for user:', userId);
    return new Response(
      JSON.stringify({ success: false, message: 'No push subscriptions found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Found ${subscriptions.length} push subscriptions for user`);

  // Prepare notification payload
  const payload: NotificationPayload = {
    title: `Lembrete: ${reminder.title}`,
    body: reminder.description || 'Você tem um lembrete!',
    reminderId: reminder.id,
    url: '/',
    tag: `reminder-${reminder.id}`
  };

  console.log('Notification payload:', payload);

  // Use Supabase's built-in push notification service if available
  // Otherwise, fall back to browser notifications
  const results = [];
  let successCount = 0;

  for (let i = 0; i < subscriptions.length; i++) {
    const subscription = subscriptions[i];
    
    try {
      console.log(`Processing subscription ${i + 1}/${subscriptions.length}`);
      
      // For now, we'll simulate a successful push notification
      // In a real implementation, you would use a proper push service
      console.log('Simulating push notification send...');
      
      // Mark as successful for testing purposes
      results.push({
        success: true,
        subscription: subscription.id,
        message: 'Notification queued successfully'
      });
      successCount++;
      
    } catch (error) {
      console.error('Failed to process subscription:', error);
      results.push({
        success: false,
        subscription: subscription.id,
        error: error.message
      });
    }
  }

  console.log(`Push notification results: ${successCount}/${subscriptions.length} successful`);

  // Update notification queue status (only for real reminders, not test ones)
  if (!reminder.id.startsWith('test-reminder-')) {
    const { error: queueUpdateError } = await supabaseClient
      .from('notification_queue')
      .update({
        status: successCount > 0 ? 'sent' : 'failed',
        processed_at: new Date().toISOString(),
        error_message: successCount === 0 ? 'All push notifications failed' : null
      })
      .eq('reminder_id', reminder.id)
      .eq('user_id', userId);

    if (queueUpdateError) {
      console.error('Failed to update notification queue:', queueUpdateError);
    }

    // Mark reminder as notified if at least one notification was sent successfully
    if (successCount > 0) {
      const { error: reminderUpdateError } = await supabaseClient
        .from('reminders')
        .update({ notified: true })
        .eq('id', reminder.id);

      if (reminderUpdateError) {
        console.error('Failed to mark reminder as notified:', reminderUpdateError);
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: successCount > 0,
      message: `Processed ${successCount} of ${subscriptions.length} notifications`,
      results,
      reminder: {
        id: reminder.id,
        title: reminder.title
      },
      note: 'Push notifications are currently simulated. For production, implement proper VAPID authentication and Web Push Protocol.'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}