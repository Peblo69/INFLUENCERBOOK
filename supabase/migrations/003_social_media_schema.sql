-- KiaraX Social Media Platform Schema Migration
-- Converted from Prisma schema to Supabase PostgreSQL
-- Date: 2025-10-22

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- SOCIAL USERS TABLE (extends auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.social_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(50),
    description VARCHAR(160),
    location VARCHAR(30),
    website VARCHAR(30),
    photo_url TEXT,
    header_url TEXT,
    username VARCHAR(20) UNIQUE NOT NULL,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TWEETS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tweets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text VARCHAR(280) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    author_id UUID NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
    photo_url TEXT,
    is_retweet BOOLEAN DEFAULT FALSE,
    retweet_of_id UUID REFERENCES public.tweets(id) ON DELETE CASCADE,
    is_reply BOOLEAN DEFAULT FALSE,
    replied_to_id UUID REFERENCES public.tweets(id) ON DELETE CASCADE
);

-- =============================================================================
-- TWEET INTERACTIONS (LIKES, RETWEETS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tweet_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
    tweet_id UUID NOT NULL REFERENCES public.tweets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tweet_id)
);

CREATE TABLE IF NOT EXISTS public.tweet_retweets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
    tweet_id UUID NOT NULL REFERENCES public.tweets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tweet_id)
);

-- =============================================================================
-- FOLLOWS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- =============================================================================
-- MESSAGES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.social_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text VARCHAR(280) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sender_id UUID NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
    photo_url TEXT
);

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.social_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_tweets_author_id ON public.tweets(author_id);
CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON public.tweets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tweets_retweet_of_id ON public.tweets(retweet_of_id) WHERE retweet_of_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tweets_replied_to_id ON public.tweets(replied_to_id) WHERE replied_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tweet_likes_user_id ON public.tweet_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_tweet_likes_tweet_id ON public.tweet_likes(tweet_id);

CREATE INDEX IF NOT EXISTS idx_tweet_retweets_user_id ON public.tweet_retweets(user_id);
CREATE INDEX IF NOT EXISTS idx_tweet_retweets_tweet_id ON public.tweet_retweets(tweet_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

CREATE INDEX IF NOT EXISTS idx_social_messages_sender_id ON public.social_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_social_messages_recipient_id ON public.social_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_social_messages_created_at ON public.social_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_notifications_user_id ON public.social_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_social_notifications_is_read ON public.social_notifications(is_read) WHERE is_read = FALSE;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tweet_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tweet_retweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_notifications ENABLE ROW LEVEL SECURITY;

-- Social Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.social_profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert their own profile" 
    ON public.social_profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.social_profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Tweets Policies
CREATE POLICY "Tweets are viewable by everyone" 
    ON public.tweets FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can create tweets" 
    ON public.tweets FOR INSERT 
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own tweets" 
    ON public.tweets FOR DELETE 
    USING (auth.uid() = author_id);

-- Tweet Likes Policies
CREATE POLICY "Likes are viewable by everyone" 
    ON public.tweet_likes FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can like tweets" 
    ON public.tweet_likes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" 
    ON public.tweet_likes FOR DELETE 
    USING (auth.uid() = user_id);

-- Tweet Retweets Policies
CREATE POLICY "Retweets are viewable by everyone" 
    ON public.tweet_retweets FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can retweet" 
    ON public.tweet_retweets FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can undo their retweets" 
    ON public.tweet_retweets FOR DELETE 
    USING (auth.uid() = user_id);

-- Follows Policies
CREATE POLICY "Follows are viewable by everyone" 
    ON public.follows FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can follow others" 
    ON public.follows FOR INSERT 
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
    ON public.follows FOR DELETE 
    USING (auth.uid() = follower_id);

-- Messages Policies
CREATE POLICY "Users can view their own messages" 
    ON public.social_messages FOR SELECT 
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Authenticated users can send messages" 
    ON public.social_messages FOR INSERT 
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete sent messages" 
    ON public.social_messages FOR DELETE 
    USING (auth.uid() = sender_id);

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" 
    ON public.social_notifications FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
    ON public.social_notifications FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Users can mark notifications as read" 
    ON public.social_notifications FOR UPDATE 
    USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for social_profiles
CREATE TRIGGER update_social_profiles_updated_at 
    BEFORE UPDATE ON public.social_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create social profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_social()
RETURNS TRIGGER AS $$
BEGIN
    -- Create social profile
    INSERT INTO public.social_profiles (id, username, name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create social profile
DROP TRIGGER IF EXISTS on_auth_user_created_social ON auth.users;
CREATE TRIGGER on_auth_user_created_social
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_social();

-- =============================================================================
-- STORAGE BUCKETS (Run these commands in Supabase Dashboard or via CLI)
-- =============================================================================
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('social-avatars', 'social-avatars', true);

-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('social-headers', 'social-headers', true);

-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('social-tweets', 'social-tweets', true);

-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('social-messages', 'social-messages', true);

COMMENT ON TABLE public.social_profiles IS 'User profiles for KiaraX Social platform';
COMMENT ON TABLE public.tweets IS 'Social media posts (tweets)';
COMMENT ON TABLE public.tweet_likes IS 'Tweet likes relationship';
COMMENT ON TABLE public.tweet_retweets IS 'Tweet retweets relationship';
COMMENT ON TABLE public.follows IS 'User follow relationships';
COMMENT ON TABLE public.social_messages IS 'Direct messages between users';
COMMENT ON TABLE public.social_notifications IS 'User notifications';