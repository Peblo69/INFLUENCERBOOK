// Supabase Database Service
// Handles user credits, generation history, and settings

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Create client only if credentials exist
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// In-memory fallback for testing without Supabase
const memoryStore = {
  users: new Map(),
  generations: [],
};

/**
 * Get user by Telegram ID
 */
export async function getUser(telegramId) {
  if (!supabase) {
    // Memory fallback
    return memoryStore.users.get(telegramId) || null;
  }

  const { data, error } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('DB Error getting user:', error);
  }

  return data;
}

/**
 * Create new user with free starting credits
 */
export async function createUser(telegramId, username) {
  const newUser = {
    telegram_id: telegramId,
    username: username,
    credits: 5, // Free starter credits
    total_generations: 0,
    settings: {
      size: '1024x1024',
      model: 'seedream',
    },
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    // Memory fallback
    memoryStore.users.set(telegramId, newUser);
    console.log(`✅ Created user (memory): ${username} [${telegramId}]`);
    return newUser;
  }

  const { data, error } = await supabase
    .from('telegram_users')
    .insert([newUser])
    .select()
    .single();

  if (error) {
    console.error('DB Error creating user:', error);
    // Fallback to memory
    memoryStore.users.set(telegramId, newUser);
    return newUser;
  }

  console.log(`✅ Created user: ${username} [${telegramId}]`);
  return data;
}

/**
 * Update user credits (positive to add, negative to subtract)
 */
export async function updateCredits(telegramId, amount) {
  if (!supabase) {
    // Memory fallback
    const user = memoryStore.users.get(telegramId);
    if (user) {
      user.credits += amount;
      if (amount < 0) user.total_generations += Math.abs(amount);
    }
    return user;
  }

  // Get current credits first
  const { data: user } = await supabase
    .from('telegram_users')
    .select('credits, total_generations')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return null;

  const newCredits = Math.max(0, user.credits + amount);
  const newTotal = amount < 0
    ? user.total_generations + Math.abs(amount)
    : user.total_generations;

  const { data, error } = await supabase
    .from('telegram_users')
    .update({
      credits: newCredits,
      total_generations: newTotal,
    })
    .eq('telegram_id', telegramId)
    .select()
    .single();

  if (error) {
    console.error('DB Error updating credits:', error);
  }

  return data;
}

/**
 * Add credits after payment
 */
export async function addCredits(telegramId, amount) {
  return updateCredits(telegramId, Math.abs(amount));
}

/**
 * Log a generation
 */
export async function logGeneration(telegramId, prompt, imageUrl, credits) {
  const generation = {
    telegram_id: telegramId,
    prompt: prompt,
    image_url: imageUrl,
    credits_used: credits,
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    // Memory fallback
    memoryStore.generations.push(generation);
    return generation;
  }

  const { data, error } = await supabase
    .from('generations')
    .insert([generation])
    .select()
    .single();

  if (error) {
    console.error('DB Error logging generation:', error);
    memoryStore.generations.push(generation);
  }

  return data || generation;
}

/**
 * Get user's generation history
 */
export async function getHistory(telegramId, limit = 10) {
  if (!supabase) {
    // Memory fallback
    return memoryStore.generations
      .filter(g => g.telegram_id === telegramId)
      .slice(-limit)
      .reverse();
  }

  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('telegram_id', telegramId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('DB Error getting history:', error);
    return [];
  }

  return data;
}

/**
 * Update user settings
 */
export async function updateSettings(telegramId, settings) {
  if (!supabase) {
    // Memory fallback
    const user = memoryStore.users.get(telegramId);
    if (user) {
      user.settings = { ...user.settings, ...settings };
    }
    return user;
  }

  const { data: user } = await supabase
    .from('telegram_users')
    .select('settings')
    .eq('telegram_id', telegramId)
    .single();

  const newSettings = { ...user?.settings, ...settings };

  const { data, error } = await supabase
    .from('telegram_users')
    .update({ settings: newSettings })
    .eq('telegram_id', telegramId)
    .select()
    .single();

  if (error) {
    console.error('DB Error updating settings:', error);
  }

  return data;
}

/**
 * Record a payment
 */
export async function recordPayment(telegramId, amount, credits, paymentMethod, transactionId) {
  const payment = {
    telegram_id: telegramId,
    amount_usd: amount,
    credits_purchased: credits,
    payment_method: paymentMethod,
    transaction_id: transactionId,
    status: 'completed',
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    console.log('💰 Payment recorded (memory):', payment);
    return payment;
  }

  const { data, error } = await supabase
    .from('payments')
    .insert([payment])
    .select()
    .single();

  if (error) {
    console.error('DB Error recording payment:', error);
  }

  return data || payment;
}
