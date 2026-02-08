-- ============================================
-- CREDITS AND TRANSACTIONS (SECURE DEFAULTS)
-- ============================================

-- Ensure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Credit transactions ledger
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'generation', 'training', 'refund', 'bonus', 'subscription', 'admin')),
  generation_id UUID,
  training_job_id UUID,
  payment_provider TEXT,
  payment_id TEXT,
  payment_amount NUMERIC,
  payment_currency TEXT DEFAULT 'USD',
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);

-- RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Service role can manage credit transactions" ON credit_transactions;

CREATE POLICY "Users can view their own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage credit transactions"
  ON credit_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function: check and deduct credits (safe for client use)
CREATE OR REPLACE FUNCTION public.check_and_deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF auth.uid() IS NULL OR p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT credits INTO v_current_credits
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_current_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits. You have % credits but need %', v_current_credits, p_amount;
  END IF;

  UPDATE profiles
  SET credits = credits - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits INTO v_new_balance;

  INSERT INTO credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    balance_after
  )
  VALUES (
    p_user_id,
    -p_amount,
    p_transaction_type,
    p_description,
    v_new_balance
  );

  RETURN TRUE;
END;
$$;

-- Function: add credits (service role only)
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_payment_id TEXT DEFAULT NULL,
  p_payment_amount NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  UPDATE profiles
  SET credits = credits + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  INSERT INTO credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    payment_id,
    payment_amount,
    balance_after
  )
  VALUES (
    p_user_id,
    p_amount,
    p_transaction_type,
    p_description,
    p_payment_id,
    p_payment_amount,
    v_new_balance
  );

  RETURN TRUE;
END;
$$;

-- Function: refund credits (service role only)
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_generation_id UUID DEFAULT NULL,
  p_training_job_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT 'Credit refund'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  UPDATE profiles
  SET credits = credits + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  INSERT INTO credit_transactions (
    user_id,
    amount,
    transaction_type,
    generation_id,
    training_job_id,
    description,
    balance_after
  )
  VALUES (
    p_user_id,
    p_amount,
    'refund',
    p_generation_id,
    p_training_job_id,
    p_description,
    v_new_balance
  );

  RETURN TRUE;
END;
$$;

-- Function: increment user stats (service role only)
CREATE OR REPLACE FUNCTION public.increment_user_stat(
  p_user_id UUID,
  p_stat_name TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_stat_name = 'images_generated' THEN
    UPDATE profiles
    SET total_images_generated = total_images_generated + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSIF p_stat_name = 'loras_trained' THEN
    UPDATE profiles
    SET total_loras_trained = total_loras_trained + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid stat name: %', p_stat_name;
  END IF;

  RETURN TRUE;
END;
$$;

-- Grants: only allow safe deduction from client
GRANT EXECUTE ON FUNCTION public.check_and_deduct_credits(UUID, INTEGER, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER, TEXT, TEXT, TEXT, NUMERIC) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_credits(UUID, INTEGER, UUID, UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_user_stat(UUID, TEXT, INTEGER) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER, TEXT, TEXT, TEXT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(UUID, INTEGER, UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_user_stat(UUID, TEXT, INTEGER) TO service_role;
