// Edge Function: generate-image
// Securely generates images using WAN 2.1 or Seedream v4.5
// Handles credit checking and deduction

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
    const {
      model_type, // 'wan-2.1' or 'seedream-v4.5'
      prompt,
      negative_prompt,
      seed,
      loras,
      strength,
      output_format,
      image_size,
      input_images, // For Seedream
      edit_mode, // For Seedream
    } = body;

    // Validate required fields
    if (!model_type || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: model_type, prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate credits cost
    let creditsCost = 10; // Default for WAN 2.1
    if (model_type === 'seedream-v4.5') {
      // Seedream v4.5 costs $0.04 per image
      if (image_size === '2048*2048') creditsCost = 25;
      else if (image_size === '4096*4096') creditsCost = 40;
      else creditsCost = 15; // 1024*1024
    }

    // Check and deduct credits
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentCredits = profile.credits || 0;
    if (currentCredits < creditsCost) {
      return new Response(
        JSON.stringify({ error: `Insufficient credits. You have ${currentCredits} but need ${creditsCost}` }),
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
          description: reason,
          balance_after: refundedCredits,
        });
    };

    const newCredits = currentCredits - creditsCost;
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to deduct credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: creditTx, error: creditTxError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: -creditsCost,
        transaction_type: 'generation',
        description: 'Image generation',
        balance_after: newCredits,
      })
      .select()
      .single();

    if (creditTxError) {
      await supabaseAdmin
        .from('profiles')
        .update({ credits: currentCredits })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({ error: 'Failed to record credit transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let creditTransactionId = creditTx?.id ?? null;

    let generationResult;
    let taskId;
    let outputImages;
    let inferenceTime;

    // Call appropriate API based on model type
    if (model_type === 'wan-2.1') {
      // WAN 2.1 Generation
      const wavespeedApiKey = Deno.env.get('WAVESPEED_API_KEY');

      const requestBody: any = {
        prompt,
        strength: strength ?? 0.6,
        loras: loras ?? [],
        size: image_size ?? '1024*1024',
        seed: seed ?? -1,
        output_format: output_format ?? 'jpeg',
        enable_sync_mode: true,
      };

      const response = await fetch(
        'https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.1/text-to-image-lora',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${wavespeedApiKey}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        await refundCredits('Generation failed');

        return new Response(
          JSON.stringify({ error: 'WAN 2.1 API call failed' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();

      if (data.code !== 200) {
        await refundCredits('Generation failed');

        return new Response(
          JSON.stringify({ error: data.message || 'Generation failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      taskId = data.data.id;
      outputImages = data.data.outputs;
      inferenceTime = data.data.timings?.inference || 0;
      generationResult = data.data;

    } else if (model_type === 'seedream-v4.5') {
      // Seedream v4.5 Edit Generation
      const wavespeedApiKey = Deno.env.get('WAVESPEED_API_KEY');

      // Build request body - Seedream v4.5 uses JSON with URL/data URL images
      // API requires "images" parameter with URL strings (including data:image/... format)
      const requestBody: any = {
        prompt,
        size: image_size || '2048*2048',
        enable_sync_mode: true,
        enable_base64_output: false,
      };

      // Add images array if provided (required for edit mode)
      // Images should be URLs or data URLs (data:image/jpeg;base64,...)
      if (input_images && input_images.length > 0) {
        requestBody.images = input_images;
      } else if (edit_mode === 'edit' || edit_mode === 'edit-sequential') {
        // Edit modes require images - return error early
        return new Response(
          JSON.stringify({ error: 'Edit mode requires at least one image. Please provide input_images array.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine endpoint based on edit_mode
      const endpoint = edit_mode === 'text-to-image'
        ? 'https://api.wavespeed.ai/api/v3/bytedance/seedream-v4.5'
        : `https://api.wavespeed.ai/api/v3/bytedance/seedream-v4.5/${edit_mode || 'edit'}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wavespeedApiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await refundCredits('Generation failed');

        return new Response(
          JSON.stringify({ error: 'Seedream v4.5 API call failed', details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();

      if (data.code !== 200) {
        await refundCredits('Generation failed');

        return new Response(
          JSON.stringify({ error: data.message || 'Generation failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      taskId = data.data.id;
      outputImages = data.data.outputs;
      inferenceTime = data.data.timings?.inference || 0;
      generationResult = data.data;
    }

    // Save generation to database
    const { data: generation, error: dbError } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: user.id,
        model_type,
        prompt,
        negative_prompt,
        seed,
        loras,
        strength,
        output_format,
        input_images,
        edit_mode,
        image_size,
        output_images: outputImages,
        task_id: taskId,
        has_nsfw_contents: generationResult.has_nsfw_contents || [],
        inference_time: inferenceTime,
        credits_cost: creditsCost,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to save generation:', dbError);
    }

    if (creditTransactionId && generation?.id) {
      await supabaseAdmin
        .from('credit_transactions')
        .update({ generation_id: generation.id })
        .eq('id', creditTransactionId);
    }

    // Increment user stats
    await supabaseAdmin.rpc('increment_user_stat', {
      p_user_id: user.id,
      p_stat_name: 'images_generated',
      p_amount: outputImages.length,
    });

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        generation_id: generation?.id,
        task_id: taskId,
        output_images: outputImages,
        inference_time: inferenceTime,
        credits_used: creditsCost,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



