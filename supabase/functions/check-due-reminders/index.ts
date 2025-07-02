import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    // Find due reminders that haven't been notified yet
    const { data: dueReminders, error: remindersError } = await supabaseClient
      .from('reminders')
      .select('*')
      .eq('completed', false)
      .eq('notified', false)
      .eq('notification_enabled', true)
      .lte('date', currentDate)
      .lte('time', currentTime);

    if (remindersError) {
      throw new Error('Failed to fetch due reminders');
    }

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No due reminders found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each due reminder
    const processedReminders = [];

    for (const reminder of dueReminders) {
      try {
        // Add to notification queue for the owner
        const { error: queueError } = await supabaseClient
          .from('notification_queue')
          .insert({
            reminder_id: reminder.id,
            user_id: reminder.owner_id,
            status: 'pending'
          });

        if (queueError) {
          console.error('Failed to add to notification queue:', queueError);
          continue;
        }

        // If reminder is assigned to someone else, also notify them
        if (reminder.assigned_to_user_id && reminder.assigned_to_user_id !== reminder.owner_id) {
          await supabaseClient
            .from('notification_queue')
            .insert({
              reminder_id: reminder.id,
              user_id: reminder.assigned_to_user_id,
              status: 'pending'
            });
        }

        // Call the send-push-notification function for the owner
        const pushResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reminderId: reminder.id,
            userId: reminder.owner_id
          })
        });

        // If assigned, also send to assigned user
        if (reminder.assigned_to_user_id && reminder.assigned_to_user_id !== reminder.owner_id) {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              reminderId: reminder.id,
              userId: reminder.assigned_to_user_id
            })
          });
        }

        processedReminders.push({
          id: reminder.id,
          title: reminder.title,
          success: pushResponse.ok
        });

      } catch (error) {
        console.error('Error processing reminder:', reminder.id, error);
        processedReminders.push({
          id: reminder.id,
          title: reminder.title,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedReminders.length} due reminders`,
        count: processedReminders.length,
        reminders: processedReminders
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-due-reminders function:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});