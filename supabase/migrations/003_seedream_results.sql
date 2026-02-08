-- Create seedream_results table
CREATE TABLE IF NOT EXISTS seedream_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  input_images TEXT[] NOT NULL, -- Array of input image URLs
  output_images TEXT[] NOT NULL, -- Array of generated image URLs
  size TEXT NOT NULL DEFAULT '2048*2048',
  has_nsfw_contents BOOLEAN[] DEFAULT ARRAY[]::BOOLEAN[],
  inference_time INTEGER, -- in milliseconds
  status TEXT DEFAULT 'completed',
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_seedream_user_id ON seedream_results(user_id);
CREATE INDEX IF NOT EXISTS idx_seedream_created_at ON seedream_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seedream_task_id ON seedream_results(task_id);

-- Enable Row Level Security
ALTER TABLE seedream_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own results
CREATE POLICY "Users can view own seedream results"
  ON seedream_results
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own results
CREATE POLICY "Users can insert own seedream results"
  ON seedream_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own results
CREATE POLICY "Users can update own seedream results"
  ON seedream_results
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own results
CREATE POLICY "Users can delete own seedream results"
  ON seedream_results
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_seedream_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seedream_updated_at_trigger
  BEFORE UPDATE ON seedream_results
  FOR EACH ROW
  EXECUTE FUNCTION update_seedream_updated_at();
