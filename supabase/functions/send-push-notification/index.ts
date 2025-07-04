import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  reminderId: string;
  url?: string;
  tag?: string;
}

// VAPID keys - These should be set as environment variables in Supabase
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 'BEl62iUYgUivxIkv69yViEuiBIa40HI8YlOu_7VrZbOONiNjnMaADDfFkbCrRJuigKR7_7Nqc0CQuhsRvbzHI4s';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'VCzVBkXb2nEFnoOlKDHhzqJBbdgGBFcjwvplaY4WcL0';

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
      throw new Error('Reminder not found');
    }

    console.log('Found reminder:', reminder.title);

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

    // Send push notifications to all user's subscriptions
    const pushPromises = subscriptions.map(async (subscription, index) => {
      try {
        console.log(`Sending push notification ${index + 1}/${subscriptions.length}`);
        
        // Simplified approach without encryption
        // NOTA: Esta é uma abordagem simplificada para resolver o erro imediato.
        // Para produção, você precisaria implementar:
        // 1. Autenticação VAPID adequada
        // 2. Criptografia do payload (AES128GCM)
        // 3. Headers apropriados para Web Push Protocol
        
        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400', // 24 hours
            // Para produção, adicione headers VAPID e criptografia aqui
          },
          body: JSON.stringify(payload)
        });

        console.log(`Push notification ${index + 1} response:`, response.status, response.statusText);

        if (response.ok) {
          console.log('Push notification sent successfully');
          return { success: true, subscription: subscription.id, status: response.status };
        } else {
          const errorText = await response.text();
          console.error('Push notification failed:', response.status, errorText);
          
          // If subscription is invalid (410 Gone or 404 Not Found), remove it
          if (response.status === 410 || response.status === 404) {
            console.log('Removing invalid subscription:', subscription.id);
            await supabaseClient
              .from('push_subscriptions')
              .delete()
              .eq('id', subscription.id);
          }
          
          return { 
            success: false, 
            subscription: subscription.id, 
            error: `HTTP ${response.status}: ${errorText}`,
            status: response.status
          };
        }
      } catch (error) {
        console.error('Failed to send push notification:', error);
        return { 
          success: false, 
          subscription: subscription.id, 
          error: error.message 
        };
      }
    });

    const results = await Promise.all(pushPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Push notification results: ${successCount}/${subscriptions.length} successful`);

    // Update notification queue status
    const { error: queueUpdateError } = await supabaseClient
      .from('notification_queue')
      .update({
        status: successCount > 0 ? 'sent' : 'failed',
        processed_at: new Date().toISOString(),
        error_message: successCount === 0 ? 'All push notifications failed' : null
      })
      .eq('reminder_id', reminderId)
      .eq('user_id', userId);

    if (queueUpdateError) {
      console.error('Failed to update notification queue:', queueUpdateError);
    }

    // Mark reminder as notified if at least one notification was sent successfully
    if (successCount > 0) {
      const { error: reminderUpdateError } = await supabaseClient
        .from('reminders')
        .update({ notified: true })
        .eq('id', reminderId);

      if (reminderUpdateError) {
        console.error('Failed to mark reminder as notified:', reminderUpdateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Sent ${successCount} of ${subscriptions.length} notifications`,
        results,
        reminder: {
          id: reminder.id,
          title: reminder.title
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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