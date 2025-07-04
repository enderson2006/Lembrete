import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Configure VAPID details
const vapidKeys = {
  publicKey: Deno.env.get('VAPID_PUBLIC_KEY') || '',
  privateKey: Deno.env.get('VAPID_PRIVATE_KEY') || '',
  subject: 'mailto:seu-email@exemplo.com' // ⚠️ SUBSTITUA pelo seu email
};

// Validate VAPID configuration
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  console.error('❌ VAPID keys not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.');
}

// Set VAPID details for web-push
webpush.setVapidDetails(
  vapidKeys.subject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
  }>;
  requireInteraction?: boolean;
  vibrate?: number[];
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

    console.log('🔔 Processing push notification for reminder:', reminderId, 'user:', userId);

    // Get reminder details and user subscriptions in parallel
    const [reminderResult, subscriptionsResult] = await Promise.all([
      supabaseClient
        .from('reminders')
        .select('*')
        .eq('id', reminderId)
        .single(),
      supabaseClient
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
    ]);

    const reminder = reminderResult.data;
    const subscriptions = subscriptionsResult.data;

    if (reminderResult.error || !reminder) {
      console.error('❌ Reminder not found:', reminderResult.error);
      throw new Error('Reminder not found');
    }

    if (subscriptionsResult.error) {
      console.error('❌ Failed to fetch subscriptions:', subscriptionsResult.error);
      throw new Error('Failed to fetch push subscriptions');
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️ No push subscriptions found for user:', userId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No push subscriptions found',
          reminder: { id: reminder.id, title: reminder.title }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 Found ${subscriptions.length} push subscription(s) for user`);

    // Prepare notification payload
    const payload: NotificationPayload = {
      title: `Lembrete: ${reminder.title}`,
      body: reminder.description || 'Você tem um lembrete!',
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: `reminder-${reminder.id}`,
      data: {
        reminderId: reminder.id,
        url: '/',
        timestamp: new Date().toISOString()
      },
      actions: [
        {
          action: 'mark-complete',
          title: 'Marcar como concluído'
        },
        {
          action: 'view',
          title: 'Ver detalhes'
        }
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200]
    };

    console.log('📋 Notification payload prepared:', {
      title: payload.title,
      subscriptionCount: subscriptions.length
    });

    // Send push notifications to all user subscriptions
    const pushPromises = subscriptions.map(async (subscription, index) => {
      try {
        console.log(`📤 Sending notification ${index + 1}/${subscriptions.length}`);
        
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        };

        // Send the push notification using web-push
        const result = await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload),
          {
            TTL: 86400, // 24 hours
            urgency: 'normal',
            topic: `reminder-${reminder.id}`
          }
        );

        console.log(`✅ Notification ${index + 1} sent successfully:`, result.statusCode);
        
        return {
          success: true,
          subscription: subscription.id,
          statusCode: result.statusCode,
          message: 'Notification sent successfully'
        };

      } catch (error) {
        console.error(`❌ Failed to send notification ${index + 1}:`, error);
        
        // Handle invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`🗑️ Removing invalid subscription: ${subscription.id}`);
          
          // Remove invalid subscription from database
          await supabaseClient
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id);
        }
        
        return {
          success: false,
          subscription: subscription.id,
          statusCode: error.statusCode,
          error: error.message
        };
      }
    });

    // Wait for all push notifications to complete
    const results = await Promise.all(pushPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`📊 Push notification results: ${successCount} success, ${failureCount} failed`);

    // Update notification queue status
    const queueUpdatePromise = supabaseClient
      .from('notification_queue')
      .update({
        status: successCount > 0 ? 'sent' : 'failed',
        processed_at: new Date().toISOString(),
        error_message: successCount === 0 ? 'All push notifications failed' : null
      })
      .eq('reminder_id', reminder.id)
      .eq('user_id', userId);

    // Mark reminder as notified if at least one notification was sent successfully
    const reminderUpdatePromise = successCount > 0 
      ? supabaseClient
          .from('reminders')
          .update({ notified: true })
          .eq('id', reminder.id)
      : Promise.resolve();

    // Execute database updates in parallel
    await Promise.all([queueUpdatePromise, reminderUpdatePromise]);

    const response = {
      success: successCount > 0,
      message: `Sent ${successCount} of ${subscriptions.length} notifications`,
      stats: {
        total: subscriptions.length,
        successful: successCount,
        failed: failureCount
      },
      reminder: {
        id: reminder.id,
        title: reminder.title
      },
      results: results
    };

    console.log('🎉 Push notification processing completed:', response.message);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Error in send-push-notification function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});