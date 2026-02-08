// Edge Function: train-lora
// Securely starts WAN 2.1 LoRA training
// Handles credit checking and deduction

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRAINING_BUCKET = 'training-images';
const DEFAULT_SIGNED_URL_EXPIRES = 60 * 60;

const extractPath = (rawPath: string): string => {
  if (!rawPath) return '';
  if (rawPath.startsWith('http')) {
    try {
      const url = new URL(rawPath);
      const parts = url.pathname.split('/').filter(Boolean);
      const bucketIndex = parts.indexOf(TRAINING_BUCKET);
      if (bucketIndex >= 0) {
        return parts.slice(bucketIndex + 1).join('/');
      }
    } catch {
      return '';
    }
  }
  if (rawPath.startsWith(`${TRAINING_BUCKET}/`)) {
    return rawPath.slice(`${TRAINING_BUCKET}/`.length);
  }
  return rawPath;
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Auth header received:', authHeader?.substring(0, 50) + '...');

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          details: 'No Authorization header provided',
          hint: 'Make sure you are logged in'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract the JWT token from the header
    const jwt = authHeader.replace('Bearer ', '');

    // Use admin client to verify the JWT and get user
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jwt);

    console.log('Auth result:', { user: user?.id, error: userError?.message });

    if (userError || !user) {
      console.error('❌ Auth error:', userError);
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          details: userError?.message || 'Invalid or expired token',
          hint: 'Make sure you are logged in and your session is valid'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id, user.email);

    // Parse request body
    const body = await req.json();
    const {
      training_images_zip_url,
      trigger_word,
      steps,
      learning_rate,
      lora_rank,
      training_images_count,
      lora_name,
      lora_description,
    } = body;

    // Validate required fields
    if (!training_images_zip_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: training_images_zip_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trainingImagesPath = extractPath(String(training_images_zip_url));
    if (!trainingImagesPath || !trainingImagesPath.startsWith(`${user.id}/`)) {
      return new Response(
        JSON.stringify({ error: 'Invalid training images path' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: signedData, error: signedError } = await supabaseAdmin
      .storage
      .from(TRAINING_BUCKET)
      .createSignedUrl(trainingImagesPath, DEFAULT_SIGNED_URL_EXPIRES);

    if (signedError || !signedData?.signedUrl) {
      return new Response(
        JSON.stringify({ error: signedError?.message || 'Failed to create signed URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trainingImagesSignedUrl = signedData.signedUrl;

    const creditsCost = 150; // LoRA training cost

    // Calculate estimated time (0.25s per step)
    const estimatedMinutes = Math.ceil((steps || 2000) * 0.25 / 60);

    // Create training job in database FIRST (before deducting credits)
    const { data: trainingJob, error: jobError } = await supabaseAdmin
      .from('training_jobs')
      .insert({
        user_id: user.id,
        model_type: 'wan-2.1',
        status: 'pending',
        trigger_word: trigger_word || 'p3r5on',
        steps: steps || 2000,
        learning_rate: learning_rate || 0.0001,
        lora_rank: lora_rank || 32,
        training_images_zip_url: trainingImagesPath,
        training_images_count,
        credits_cost: creditsCost,
        estimated_time_minutes: estimatedMinutes,
      })
      .select()
      .single();

    if (jobError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create training job: ' + jobError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check and deduct credits
    console.log('?? Checking credits for user:', user.id);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    console.log('Profile:', profile, 'Error:', profileError);

    if (profileError || !profile) {
      console.error('Profile not found');
      await supabaseAdmin
        .from('training_jobs')
        .delete()
        .eq('id', trainingJob.id);

      return new Response(
        JSON.stringify({ error: 'User profile not found. Please contact support.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentCredits = profile.credits || 0;
    console.log(`Current credits: ${currentCredits}, Required: ${creditsCost}`);

    if (currentCredits < creditsCost) {
      console.error('Insufficient credits');
      await supabaseAdmin
        .from('training_jobs')
        .delete()
        .eq('id', trainingJob.id);

      return new Response(
        JSON.stringify({ error: `Insufficient credits. You have ${currentCredits} credits but need ${creditsCost}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refundCredits = async (reason: string) => {
      const { data: currentProfile } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (!currentProfile) return;

      const refundedCredits = (currentProfile.credits || 0) + creditsCost;
      await supabaseAdmin
        .from('profiles')
        .update({ credits: refundedCredits })
        .eq('id', user.id);

      await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: creditsCost,
          transaction_type: 'refund',
          training_job_id: trainingJob.id,
          description: reason,
          balance_after: refundedCredits,
        });

      await supabaseAdmin
        .from('training_jobs')
        .update({ credits_refunded: true })
        .eq('id', trainingJob.id);
    };

    // Deduct credits
    const newCredits = currentCredits - creditsCost;
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to deduct credits:', updateError);
      await supabaseAdmin
        .from('training_jobs')
        .delete()
        .eq('id', trainingJob.id);

      return new Response(
        JSON.stringify({ error: 'Failed to deduct credits. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: creditTxError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: -creditsCost,
        transaction_type: 'training',
        training_job_id: trainingJob.id,
        description: 'LoRA training job',
        balance_after: newCredits,
      });

    if (creditTxError) {
      console.error('Failed to record credit transaction:', creditTxError);
      await supabaseAdmin
        .from('profiles')
        .update({ credits: currentCredits })
        .eq('id', user.id);
      await supabaseAdmin
        .from('training_jobs')
        .delete()
        .eq('id', trainingJob.id);

      return new Response(
        JSON.stringify({ error: 'Failed to record credit transaction. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`? Credits deducted: ${currentCredits} -> ${newCredits}`);

    await supabaseAdmin
      .from('training_jobs')
      .update({ started_at: new Date().toISOString(), status: 'processing' })
      .eq('id', trainingJob.id);

    // Call WAN 2.1 LoRA Trainer API
    const wavespeedApiKey = Deno.env.get('WAVESPEED_API_KEY');

    const response = await fetch(
      'https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.1-14b-lora-trainer',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wavespeedApiKey}`,
        },
        body: JSON.stringify({
          data: trainingImagesSignedUrl,
          trigger_word: trigger_word || 'p3r5on',
          steps: steps || 2000,
          learning_rate: learning_rate || 0.0001,
          lora_rank: lora_rank || 32,
        }),
      }
    );

    if (!response.ok) {
      // Update job status to failed
      await supabaseAdmin
        .from('training_jobs')
        .update({
          status: 'failed',
          error_message: `API call failed: ${response.statusText}`,
        })
        .eq('id', trainingJob.id);

      await refundCredits('Training failed');

      return new Response(
        JSON.stringify({ error: 'WAN 2.1 Training API call failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (data.code !== 200) {
      // Update job status to failed
      await supabaseAdmin
        .from('training_jobs')
        .update({
          status: 'failed',
          error_message: data.message || 'Training job failed',
        })
        .eq('id', trainingJob.id);

      await refundCredits('Training failed');

      return new Response(
        JSON.stringify({ error: data.message || 'Training failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update training job with external job ID
    await supabaseAdmin
      .from('training_jobs')
      .update({
        external_job_id: data.data.id,
        status: 'processing',
      })
      .eq('id', trainingJob.id);

    // Return success response with job details
    return new Response(
      JSON.stringify({
        success: true,
        training_job_id: trainingJob.id,
        external_job_id: data.data.id,
        status: 'processing',
        estimated_time_minutes: estimatedMinutes,
        credits_used: creditsCost,
        message: 'Training job started successfully. Use check-training-status to monitor progress.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Training error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


