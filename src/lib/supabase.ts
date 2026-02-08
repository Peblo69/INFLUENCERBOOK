import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Robust storage adapter that falls back to memory if localStorage is blocked
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // Access denied or not available
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      // Access denied or not available
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      // Access denied or not available
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database Types
export type ProfilePreferences = {
  theme: string;
  notifications: boolean;
  memory_enabled: boolean;
  auto_save: boolean;
  language: string;
};

export type UserProfile = {
  id: string;
  email: string | null;
  billing_email: string | null;
  full_name: string | null;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
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
  billing_metadata: Record<string, any> | null;
  preferences: ProfilePreferences | null;
  created_at: string;
  updated_at: string;
};

export type Generation = {
  id: string;
  user_id: string;
  prompt: string;
  negative_prompt: string | null;
  style: string;
  quality: string;
  image_size: string;
  pose: string | null;
  filter: string | null;
  emotion: string | null;
  age_slider: number | null;
  weight_slider: number | null;
  breast_slider: number | null;
  ass_slider: number | null;
  detail: number | null;
  creativity: number | null;
  restore_faces: boolean;
  seed: number | null;
  image_url: string | null;
  thumbnail_url: string | null;
  gems_cost: number;
  generation_time: number | null;
  is_favorite: boolean;
  is_deleted: boolean;
  created_at: string;
};

export type CharacterPreset = {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  negative_prompt: string | null;
  style: string;
  quality: string | null;
  image_size: string | null;
  age_slider: number | null;
  weight_slider: number | null;
  breast_slider: number | null;
  ass_slider: number | null;
  detail: number | null;
  creativity: number | null;
  filter: string | null;
  emotion: string | null;
  restore_faces: boolean;
  seed: number | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Collection = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type GemTransaction = {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'generation' | 'purchase' | 'refund' | 'bonus';
  generation_id: string | null;
  description: string | null;
  created_at: string;
};
