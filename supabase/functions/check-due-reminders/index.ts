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

    console.log('Checking for due reminders at:', currentDate, currentTime);

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
      console.error('Failed to fetch due reminders:', remindersError);
      throw new Error('Failed to fetch due reminders');
    }

    if (!dueReminders || dueReminders.length === 0) {
      console.log('No due reminders found');
      return new Response(
        JSON.stringify({ success: true, message: 'No due reminders found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${dueReminders.length} due reminders`);

    // Process each due reminder
    const processedReminders = [];

    for (const reminder of dueReminders) {
      try {
        console.log(`Processing reminder: ${reminder.title} (${reminder.id})`);

        // Add to notification queue for the owner
        const { error: queueError } = await supabaseClient
          .from('notification_queue')
          .insert({
            reminder_id: reminder.id,
            user_id: reminder.owner_id,
            status: 'pending'
          });

        if (queueError) {
          console.error('Failed to add to notification queue for owner:', queueError);
          continue;
        }

        // If reminder is assigned to someone else, also notify them
        if (reminder.assigned_to_user_id && reminder.assigned_to_user_id !== reminder.owner_id) {
          console.log(`Adding assigned user to notification queue: ${reminder.assigned_to_user_id}`);
          await supabaseClient
            .from('notification_queue')
            .insert({
              reminder_id: reminder.id,
              user_id: reminder.assigned_to_user_id,
              status: 'pending'
            });
        }

        // Call the send-push-notification function for the owner
        console.log(`Sending push notification to owner: ${reminder.owner_id}`);
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

        const pushResult = await pushResponse.json();
        console.log('Push notification result for owner:', pushResult);

        // If assigned, also send to assigned user
        if (reminder.assigned_to_user_id && reminder.assigned_to_user_id !== reminder.owner_id) {
          console.log(`Sending push notification to assigned user: ${reminder.assigned_to_user_id}`);
          const assignedPushResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
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

          const assignedPushResult = await assignedPushResponse.json();
          console.log('Push notification result for assigned user:', assignedPushResult);
        }

        processedReminders.push({
          id: reminder.id,
          title: reminder.title,
          success: pushResponse.ok,
          ownerNotified: pushResponse.ok,
          assignedNotified: reminder.assigned_to_user_id ? true : null
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

    console.log(`Processed ${processedReminders.length} reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedReminders.length} due reminders`,
        count: processedReminders.length,
        reminders: processedReminders,
        timestamp: now.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-due-reminders function:', error);
    
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