/**
 * Comprehensive Supabase Database Helpers
 * All database operations for WAN 2.1, Seedream, LoRA training, credits, etc.
 */

import { supabase } from "@/lib/supabase";

// ============================================
// TYPES
// ============================================

export interface UserProfile {
  id: string;
  email: string | null;
  billing_email: string | null;
  full_name: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  credits: number;
  plan: string;
  plan_status: string | null;
  is_pro: boolean;
  pro_expires_at: string | null;
  total_images_generated: number;
  total_loras_trained: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  payment_provider: string | null;
  default_payment_method: string | null;
  plan_started_at: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  billing_metadata: any;
  preferences: any;
  created_at: string;
  updated_at: string;
}

export interface LoRAModel {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  trigger_word: string;
  model_type: string;
  lora_url: string;
  lora_url_secondary: string | null;
  training_steps: number | null;
  learning_rate: number | null;
  lora_rank: number | null;
  training_images_count: number | null;
  thumbnail_url: string | null;
  zip_url: string | null;
  training_job_id: string | null;
  is_public: boolean;
  is_deleted: boolean;
  downloads_count: number;
  uses_count: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingJob {
  id: string;
  user_id: string;
  external_job_id: string | null;
  model_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  trigger_word: string;
  steps: number;
  learning_rate: number;
  lora_rank: number;
  training_images_zip_url: string;
  training_images_count: number | null;
  lora_model_id: string | null;
  output_urls: any;
  progress_percentage: number;
  estimated_time_minutes: number | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  error_details: any;
  credits_cost: number;
  credits_refunded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  model_type: 'wan-2.1' | 'wan-2.2' | 'seedream-v4' | 'seedream-v4.5' | 'qwen' | 'other';
  model_variant: string | null;
  prompt: string;
  negative_prompt: string | null;
  seed: number | null;
  loras: any; // JSONB array
  strength: number | null;
  output_format: string | null;
  input_images: any; // JSONB array
  edit_mode: string | null;
  image_size: string;
  output_images: any; // JSONB array
  task_id: string | null;
  has_nsfw_contents: any; // JSONB array
  inference_time: number | null;
  generation_time: number | null;
  credits_cost: number;
  is_favorite: boolean;
  is_deleted: boolean;
  is_public: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'purchase' | 'generation' | 'training' | 'refund' | 'bonus' | 'subscription' | 'admin';
  generation_id: string | null;
  training_job_id: string | null;
  payment_provider: string | null;
  payment_id: string | null;
  payment_amount: number | null;
  payment_currency: string | null;
  description: string | null;
  metadata: any;
  balance_after: number;
  created_at: string;
}

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

/**
 * Get current user's profile
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Silently return null if not authenticated
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        const { error: ensureError } = await supabase.rpc("ensure_profile");
        if (!ensureError) {
          const retry = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          if (!retry.error) {
            return retry.data;
          }
        }
      }

      console.error("Error fetching user profile:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  updates: Partial<UserProfile>
): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ ...updates })
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return null;
  }
};

/**
 * Get user's credit balance
 */
export const getUserCredits = async (): Promise<number> => {
  try {
    const profile = await getUserProfile();
    return profile?.credits || 0;
  } catch (error) {
    console.error("Failed to get user credits:", error);
    return 0;
  }
};

// ============================================
// LORA MODEL FUNCTIONS
// ============================================

/**
 * Get all LoRA models for current user
 */
export const getUserLoRAs = async (
  includeDeleted: boolean = false
): Promise<LoRAModel[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Silently return empty array if not authenticated
      return [];
    }

    let query = supabase
      .from("lora_models")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!includeDeleted) {
      query = query.eq("is_deleted", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching LoRAs:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch LoRAs:", error);
    return [];
  }
};

/**
 * Get ALL LoRA models (from all users) - useful for admin/testing
 */
export const getAllLoRAs = async (
  includeDeleted: boolean = false
): Promise<LoRAModel[]> => {
  try {
    let query = supabase
      .from("lora_models")
      .select("*")
      .order("created_at", { ascending: false });

    if (!includeDeleted) {
      query = query.eq("is_deleted", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching all LoRAs:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch all LoRAs:", error);
    return [];
  }
};

/**
 * Create a new LoRA model record
 */
export const createLoRAModel = async (
  loraData: {
    name: string;
    trigger_word: string;
    lora_url: string;
    model_type?: string;
    lora_url_secondary?: string;
    training_steps?: number;
    learning_rate?: number;
    lora_rank?: number;
    training_images_count?: number;
    thumbnail_url?: string;
    zip_url?: string;
    training_job_id?: string;
    description?: string;
  }
): Promise<LoRAModel | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("lora_models")
      .insert({
        user_id: user.id,
        ...loraData
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating LoRA model:", error);
      throw error;
    }

    // Increment user stats
    const { error: statError } = await supabase.rpc('increment_user_stat', {
      p_user_id: user.id,
      p_stat_name: 'loras_trained',
      p_amount: 1
    });
    if (statError) {
      console.warn("increment_user_stat failed (expected if restricted):", statError.message);
    }

    return data;
  } catch (error) {
    console.error("Failed to create LoRA model:", error);
    return null;
  }
};

/**
 * Update LoRA model
 */
export const updateLoRAModel = async (
  id: string,
  updates: Partial<LoRAModel>
): Promise<LoRAModel | null> => {
  try {
    const { data, error } = await supabase
      .from("lora_models")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating LoRA model:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to update LoRA model:", error);
    return null;
  }
};

/**
 * Delete LoRA model (soft delete)
 */
export const deleteLoRAModel = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("lora_models")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error deleting LoRA model:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Failed to delete LoRA model:", error);
    return false;
  }
};

/**
 * Increment LoRA uses count
 */
export const incrementLoRAUses = async (loraUrl: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("lora_models")
      .update({
        uses_count: supabase.raw('uses_count + 1'),
        updated_at: new Date().toISOString()
      })
      .eq("lora_url", loraUrl);

    if (error) {
      console.error("Error incrementing LoRA uses:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to increment LoRA uses:", error);
    return false;
  }
};

// ============================================
// TRAINING JOB FUNCTIONS
// ============================================

/**
 * Create a new training job
 */
export const createTrainingJob = async (
  jobData: {
    model_type: string;
    trigger_word: string;
    steps: number;
    learning_rate: number;
    lora_rank: number;
    training_images_zip_url: string;
    training_images_count?: number;
    credits_cost: number;
    estimated_time_minutes?: number;
  }
): Promise<TrainingJob | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check and deduct credits
    const { error: creditError } = await supabase.rpc('check_and_deduct_credits', {
      p_user_id: user.id,
      p_amount: jobData.credits_cost,
      p_transaction_type: 'training',
      p_description: 'LoRA training job'
    });

    if (creditError) {
      throw creditError;
    }

    // Create training job
    const { data, error } = await supabase
      .from("training_jobs")
      .insert({
        user_id: user.id,
        ...jobData,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating training job:", error);
      // Refunds should be handled server-side to prevent abuse.
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to create training job:", error);
    return null;
  }
};

/**
 * Update training job status and progress
 */
export const updateTrainingJob = async (
  id: string,
  updates: Partial<TrainingJob>
): Promise<TrainingJob | null> => {
  try {
    const { data, error } = await supabase
      .from("training_jobs")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating training job:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to update training job:", error);
    return null;
  }
};

/**
 * Get training job by ID
 */
export const getTrainingJob = async (id: string): Promise<TrainingJob | null> => {
  try {
    const { data, error } = await supabase
      .from("training_jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching training job:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch training job:", error);
    return null;
  }
};

/**
 * Get all training jobs for current user
 */
export const getUserTrainingJobs = async (
  limit: number = 50
): Promise<TrainingJob[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("training_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching training jobs:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch training jobs:", error);
    return [];
  }
};

// ============================================
// GENERATION FUNCTIONS
// ============================================

/**
 * Create a new generation record
 */
export const createGeneration = async (
  generationData: {
    model_type: 'wan-2.1' | 'wan-2.2' | 'seedream-v4' | 'seedream-v4.5' | 'qwen' | 'other';
    model_variant?: string;
    prompt: string;
    negative_prompt?: string;
    seed?: number;
    loras?: any[];
    strength?: number;
    output_format?: string;
    input_images?: string[];
    edit_mode?: string;
    image_size: string;
    output_images: string[];
    task_id?: string;
    has_nsfw_contents?: boolean[];
    inference_time?: number;
    credits_cost: number;
    metadata?: any;
  }
): Promise<Generation | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check and deduct credits
    const { error: creditError } = await supabase.rpc('check_and_deduct_credits', {
      p_user_id: user.id,
      p_amount: generationData.credits_cost,
      p_transaction_type: 'generation',
      p_description: `${generationData.model_type} generation`
    });

    if (creditError) {
      throw creditError;
    }

    // Create generation
    const { data, error } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        ...generationData
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating generation:", error);
      // Refunds should be handled server-side to prevent abuse.
      throw error;
    }

    // Increment user stats
    const { error: statError } = await supabase.rpc('increment_user_stat', {
      p_user_id: user.id,
      p_stat_name: 'images_generated',
      p_amount: generationData.output_images.length
    });
    if (statError) {
      console.warn("increment_user_stat failed (expected if restricted):", statError.message);
    }

    return data;
  } catch (error) {
    console.error("Failed to create generation:", error);
    return null;
  }
};

/**
 * Get all generations for current user
 */
export const getUserGenerations = async (
  options: {
    limit?: number;
    offset?: number;
    modelType?: string;
    favoritesOnly?: boolean;
    includeDeleted?: boolean;
  } = {}
): Promise<Generation[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    let query = supabase
      .from("generations")
      .select("*")
      .eq("user_id", user.id);

    if (options.modelType) {
      query = query.eq("model_type", options.modelType);
    }

    if (options.favoritesOnly) {
      query = query.eq("is_favorite", true);
    }

    if (!options.includeDeleted) {
      query = query.eq("is_deleted", false);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching generations:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch generations:", error);
    return [];
  }
};

/**
 * Update generation (e.g., toggle favorite)
 */
export const updateGeneration = async (
  id: string,
  updates: Partial<Generation>
): Promise<Generation | null> => {
  try {
    const { data, error } = await supabase
      .from("generations")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating generation:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to update generation:", error);
    return null;
  }
};

/**
 * Delete generation (soft delete)
 */
export const deleteGeneration = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("generations")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error deleting generation:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Failed to delete generation:", error);
    return false;
  }
};

/**
 * Toggle generation favorite status
 */
export const toggleGenerationFavorite = async (id: string): Promise<boolean> => {
  try {
    // Get current generation
    const { data: generation } = await supabase
      .from("generations")
      .select("is_favorite")
      .eq("id", id)
      .single();

    if (!generation) {
      throw new Error("Generation not found");
    }

    // Toggle favorite
    const { error } = await supabase
      .from("generations")
      .update({
        is_favorite: !generation.is_favorite,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      console.error("Error toggling favorite:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    return false;
  }
};

// ============================================
// CREDIT FUNCTIONS
// ============================================

/**
 * Get user's credit transaction history
 */
export const getCreditTransactions = async (
  limit: number = 50
): Promise<CreditTransaction[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching transactions:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return [];
  }
};

// ============================================
// AUTHENTICATION HELPERS
// ============================================

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
};

/**
 * Sign out user
 */
export const signOut = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error signing out:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Failed to sign out:", error);
    return false;
  }
};
