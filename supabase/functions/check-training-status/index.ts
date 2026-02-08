// Edge Function: check-training-status
// Checks WAN 2.1 LoRA training status and updates database
// Saves completed LoRA to lora_models table

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'No Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract JWT and verify user
    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    const body = await req.json();
    const { training_job_id, external_job_id } = body;

    // Validate required fields
    if (!training_job_id && !external_job_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: training_job_id or external_job_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get training job from database
    let trainingJobQuery = supabaseAdmin
      .from('training_jobs')
      .select('*')
      .eq('id', user.id);

    if (training_job_id) {
      trainingJobQuery = trainingJobQuery.eq('id', training_job_id);
    } else {
      trainingJobQuery = trainingJobQuery.eq('external_job_id', external_job_id);
    }

    const { data: trainingJob, error: jobError } = await trainingJobQuery.single();

    if (jobError || !trainingJob) {
      return new Response(
        JSON.stringify({ error: 'Training job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If job is already completed or failed, return cached status
    if (trainingJob.status === 'completed' || trainingJob.status === 'failed') {
      return new Response(
        JSON.stringify({
          training_job_id: trainingJob.id,
          status: trainingJob.status,
          lora_model_id: trainingJob.lora_model_id,
          output_urls: trainingJob.output_urls,
          error_message: trainingJob.error_message,
          completed_at: trainingJob.completed_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call WavespeedAI API to check status
    const wavespeedApiKey = Deno.env.get('WAVESPEED_API_KEY');

    const response = await fetch(
      `https://api.wavespeed.ai/api/v3/predictions/${trainingJob.external_job_id}/result`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${wavespeedApiKey}`,
        },
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to check training status' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (data.code !== 200) {
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to get status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiStatus = data.data.status; // 'created', 'processing', 'completed', 'failed'

    // Map API status to our status
    let dbStatus = apiStatus;
    if (apiStatus === 'created') dbStatus = 'processing';

    // Update training job status
    await supabaseAdmin
      .from('training_jobs')
      .update({
        status: dbStatus,
        output_urls: data.data.outputs || null,
        error_message: data.data.error || null,
      })
      .eq('id', trainingJob.id);

    // If completed, save LoRA model
    if (dbStatus === 'completed' && data.data.outputs && data.data.outputs.length > 0) {
      const loraUrl = data.data.outputs[0]; // First output is the LoRA file

      // Create LoRA model record
      const { data: loraModel, error: loraError } = await supabaseAdmin
        .from('lora_models')
        .insert({
          user_id: user.id,
          name: `LoRA ${new Date().toLocaleDateString()}`,
          trigger_word: trainingJob.trigger_word,
          model_type: 'wan-2.1',
          lora_url: loraUrl,
          training_steps: trainingJob.steps,
          learning_rate: trainingJob.learning_rate,
          lora_rank: trainingJob.lora_rank,
          training_images_count: trainingJob.training_images_count,
          zip_url: trainingJob.training_images_zip_url,
          training_job_id: trainingJob.id,
        })
        .select()
        .single();

      if (!loraError && loraModel) {
        // Link LoRA model to training job
        await supabaseAdmin
          .from('training_jobs')
          .update({
            lora_model_id: loraModel.id,
            completed_at: new Date().toISOString(),
          })
          .eq('id', trainingJob.id);

        // Increment user stats
        await supabaseAdmin.rpc('increment_user_stat', {
          p_user_id: user.id,
          p_stat_name: 'loras_trained',
          p_amount: 1,
        });

        return new Response(
          JSON.stringify({
            training_job_id: trainingJob.id,
            status: 'completed',
            lora_model_id: loraModel.id,
            lora_url: loraUrl,
            trigger_word: trainingJob.trigger_word,
            message: 'LoRA training completed successfully!',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // If failed, refund credits if not already refunded
    if (dbStatus === 'failed' && !trainingJob.credits_refunded) {
      // Refund credits directly
      const { data: currentProfile } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (currentProfile) {
        const refundAmount = trainingJob.credits_cost || 0;
        const refundedCredits = (currentProfile.credits || 0) + refundAmount;
        await supabaseAdmin
          .from('profiles')
          .update({ credits: refundedCredits })
          .eq('id', user.id);

        await supabaseAdmin
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            amount: refundAmount,
            transaction_type: 'refund',
            training_job_id: trainingJob.id,
            description: 'Training failed refund',
            balance_after: refundedCredits,
          });
      }

      await supabaseAdmin
        .from('training_jobs')
        .update({ credits_refunded: true })
        .eq('id', trainingJob.id);
    }

    // Return current status
    return new Response(
      JSON.stringify({
        training_job_id: trainingJob.id,
        status: dbStatus,
        output_urls: data.data.outputs || null,
        error_message: data.data.error || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Check status error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

