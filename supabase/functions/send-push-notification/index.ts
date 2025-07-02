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
}

// VAPID keys - In production, these should be environment variables
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

    // Get reminder details
    const { data: reminder, error: reminderError } = await supabaseClient
      .from('reminders')
      .select('*')
      .eq('id', reminderId)
      .single();

    if (reminderError || !reminder) {
      throw new Error('Reminder not found');
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subscriptionsError) {
      throw new Error('Failed to fetch push subscriptions');
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', userId);
      return new Response(
        JSON.stringify({ success: false, message: 'No push subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification payload
    const payload: NotificationPayload = {
      title: `Lembrete: ${reminder.title}`,
      body: reminder.description || 'Você tem um lembrete!',
      reminderId: reminder.id,
      url: '/'
    };

    // Send push notifications to all user's subscriptions
    const pushPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        };

        // Use web-push library equivalent for Deno
        const response = await sendWebPush(pushSubscription, JSON.stringify(payload));
        
        console.log('Push notification sent successfully:', response.status);
        return { success: true, subscription: subscription.id };
      } catch (error) {
        console.error('Failed to send push notification:', error);
        
        // If subscription is invalid, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabaseClient
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id);
        }
        
        return { success: false, subscription: subscription.id, error: error.message };
      }
    });

    const results = await Promise.all(pushPromises);
    const successCount = results.filter(r => r.success).length;

    // Update notification queue status
    await supabaseClient
      .from('notification_queue')
      .update({
        status: successCount > 0 ? 'sent' : 'failed',
        processed_at: new Date().toISOString(),
        error_message: successCount === 0 ? 'All push notifications failed' : null
      })
      .eq('reminder_id', reminderId)
      .eq('user_id', userId);

    // Mark reminder as notified
    await supabaseClient
      .from('reminders')
      .update({ notified: true })
      .eq('id', reminderId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} of ${subscriptions.length} notifications`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Web Push implementation for Deno
async function sendWebPush(subscription: any, payload: string) {
  const vapidKeys = {
    publicKey: VAPID_PUBLIC_KEY,
    privateKey: VAPID_PRIVATE_KEY
  };

  // Create JWT token for VAPID
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const jwtPayload = {
    aud: new URL(subscription.endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: 'mailto:your-email@example.com'
  };

  // For simplicity, we'll use a basic fetch request
  // In production, you'd want to use a proper web-push library
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Authorization': `vapid t=${await createJWT(header, jwtPayload, vapidKeys.privateKey)}, k=${vapidKeys.publicKey}`,
      'TTL': '86400'
    },
    body: payload
  });

  return response;
}

// Simple JWT creation (in production, use a proper JWT library)
async function createJWT(header: any, payload: any, privateKey: string): Promise<string> {
  const encoder = new TextEncoder();
  
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = `${headerB64}.${payloadB64}`;
  
  // For demo purposes, return a simple token
  // In production, properly sign with the private key
  return btoa(data).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}