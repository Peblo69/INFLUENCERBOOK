// KiaraX Social Media Platform - Supabase Service Layer
import { supabase } from '@/lib/supabase';
import type {
  SocialProfile,
  Tweet,
  CreateTweetInput,
  UpdateProfileInput,
  SendMessageInput,
  SocialMessage,
  SocialNotification
} from '@/types/social';

// =============================================================================
// PROFILE OPERATIONS
// =============================================================================

export const socialService = {
  // Get or create social profile for current user
  async getOrCreateProfile(userId: string) {
    const { data, error } = await supabase
      .from('social_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    return { data: (data as SocialProfile) || null, error };
  },

  async createProfile(profile: Partial<SocialProfile>) {
    const { data, error } = await supabase
      .from('social_profiles')
      .insert(profile)
      .select()
      .maybeSingle();

    return { data: (data as SocialProfile) || null, error };
  },

  // Get profile by username
  async getProfileByUsername(username: string) {
    const { data, error } = await supabase
      .from('social_profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    return { data: data as SocialProfile | null, error };
  },

  // Update profile
  async updateProfile(userId: string, updates: UpdateProfileInput) {
    const { data, error } = await supabase
      .from('social_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    return { data: data as SocialProfile | null, error };
  },

  // Get user's followers
  async getFollowers(userId: string) {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id, social_profiles!follows_follower_id_fkey(*)')
      .eq('following_id', userId);

    return { data, error };
  },

  // Get who user is following
  async getFollowing(userId: string) {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id, social_profiles!follows_following_id_fkey(*)')
      .eq('follower_id', userId);

    return { data, error };
  },

  // Check if user1 follows user2
  async isFollowing(followerId: string, followingId: string) {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    return { isFollowing: !!data, error };
  },

  // Follow user
  async followUser(followerId: string, followingId: string) {
    const { data, error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId })
      .select()
      .single();

    return { data, error };
  },

  // Unfollow user
  async unfollowUser(followerId: string, followingId: string) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    return { error };
  },

  // =============================================================================
  // TWEET OPERATIONS
  // =============================================================================

  // Get feed tweets (all public tweets)
  async getFeedTweets(limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('tweets')
      .select(`
        *,
        author:social_profiles(*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return { data: data as Tweet[] | null, error };
  },

  // Get user's tweets
  async getUserTweets(userId: string, limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('tweets')
      .select(`
        *,
        author:social_profiles!tweets_author_id_fkey(*),
        retweet_of:tweets!tweets_retweet_of_id_fkey(
          *,
          author:social_profiles!tweets_author_id_fkey(*)
        )
      `)
      .eq('author_id', userId)
      .eq('is_reply', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return { data: data as Tweet[] | null, error };
  },

  // Get single tweet with details
  async getTweet(tweetId: string) {
    const { data, error } = await supabase
      .from('tweets')
      .select(`
        *,
        author:social_profiles!tweets_author_id_fkey(*),
        retweet_of:tweets!tweets_retweet_of_id_fkey(
          *,
          author:social_profiles!tweets_author_id_fkey(*)
        ),
        replied_to:tweets!tweets_replied_to_id_fkey(
          *,
          author:social_profiles!tweets_author_id_fkey(*)
        )
      `)
      .eq('id', tweetId)
      .maybeSingle();

    return { data: data as Tweet | null, error };
  },

  // Create tweet
  async createTweet(userId: string, input: CreateTweetInput) {
    const { data, error } = await supabase
      .from('tweets')
      .insert({
        author_id: userId,
        text: input.text,
        photo_url: input.photo_url || null,
        is_reply: input.is_reply || false,
        replied_to_id: input.replied_to_id || null
      })
      .select(`
        *,
        author:social_profiles!tweets_author_id_fkey(*)
      `)
      .single();

    return { data: data as Tweet | null, error };
  },

  // Delete tweet
  async deleteTweet(tweetId: string) {
    const { error } = await supabase
      .from('tweets')
      .delete()
      .eq('id', tweetId);

    return { error };
  },

  // Get tweet replies
  async getTweetReplies(tweetId: string) {
    const { data, error } = await supabase
      .from('tweets')
      .select(`
        *,
        author:social_profiles!tweets_author_id_fkey(*)
      `)
      .eq('replied_to_id', tweetId)
      .order('created_at', { ascending: true });

    return { data: data as Tweet[] | null, error };
  },

  // =============================================================================
  // LIKE OPERATIONS
  // =============================================================================

  // Like tweet
  async likeTweet(userId: string, tweetId: string) {
    const { data, error } = await supabase
      .from('tweet_likes')
      .insert({ user_id: userId, tweet_id: tweetId })
      .select()
      .single();

    return { data, error };
  },

  // Unlike tweet
  async unlikeTweet(userId: string, tweetId: string) {
    const { error } = await supabase
      .from('tweet_likes')
      .delete()
      .eq('user_id', userId)
      .eq('tweet_id', tweetId);

    return { error };
  },

  // Check if user liked tweet
  async hasLikedTweet(userId: string, tweetId: string) {
    const { data, error } = await supabase
      .from('tweet_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('tweet_id', tweetId)
      .maybeSingle();

    return { hasLiked: !!data, error };
  },

  // Get tweet likes count
  async getTweetLikesCount(tweetId: string) {
    const { count, error } = await supabase
      .from('tweet_likes')
      .select('*', { count: 'exact', head: true })
      .eq('tweet_id', tweetId);

    return { count: count || 0, error };
  },

  // =============================================================================
  // RETWEET OPERATIONS
  // =============================================================================

  // Retweet
  async retweetTweet(userId: string, tweetId: string) {
    const { data, error } = await supabase
      .from('tweet_retweets')
      .insert({ user_id: userId, tweet_id: tweetId })
      .select()
      .single();

    return { data, error };
  },

  // Unretweet
  async unretweetTweet(userId: string, tweetId: string) {
    const { error } = await supabase
      .from('tweet_retweets')
      .delete()
      .eq('user_id', userId)
      .eq('tweet_id', tweetId);

    return { error };
  },

  // Check if user retweeted tweet
  async hasRetweetedTweet(userId: string, tweetId: string) {
    const { data, error } = await supabase
      .from('tweet_retweets')
      .select('id')
      .eq('user_id', userId)
      .eq('tweet_id', tweetId)
      .maybeSingle();

    return { hasRetweeted: !!data, error };
  },

  // Get tweet retweets count
  async getTweetRetweetsCount(tweetId: string) {
    const { count, error } = await supabase
      .from('tweet_retweets')
      .select('*', { count: 'exact', head: true })
      .eq('tweet_id', tweetId);

    return { count: count || 0, error };
  },

  // =============================================================================
  // MESSAGE OPERATIONS
  // =============================================================================

  // Get conversations (unique users you've messaged with)
  async getConversations(userId: string) {
    const { data, error } = await supabase
      .from('social_messages')
      .select(`
        *,
        sender:social_profiles!social_messages_sender_id_fkey(*),
        recipient:social_profiles!social_messages_recipient_id_fkey(*)
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    return { data: data as SocialMessage[] | null, error };
  },

  // Get messages with specific user
  async getMessagesWith(userId: string, otherUserId: string) {
    const { data, error } = await supabase
      .from('social_messages')
      .select(`
        *,
        sender:social_profiles!social_messages_sender_id_fkey(*),
        recipient:social_profiles!social_messages_recipient_id_fkey(*)
      `)
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    return { data: data as SocialMessage[] | null, error };
  },

  // Send message
  async sendMessage(senderId: string, input: SendMessageInput) {
    const { data, error } = await supabase
      .from('social_messages')
      .insert({
        sender_id: senderId,
        recipient_id: input.recipient_id,
        text: input.text,
        photo_url: input.photo_url || null
      })
      .select(`
        *,
        sender:social_profiles!social_messages_sender_id_fkey(*),
        recipient:social_profiles!social_messages_recipient_id_fkey(*)
      `)
      .single();

    return { data: data as SocialMessage | null, error };
  },

  // Delete message
  async deleteMessage(messageId: string) {
    const { error } = await supabase
      .from('social_messages')
      .delete()
      .eq('id', messageId);

    return { error };
  },

  // =============================================================================
  // NOTIFICATION OPERATIONS
  // =============================================================================

  // Get user notifications
  async getNotifications(userId: string, limit = 20) {
    // Return empty if userId is placeholder
    if (!userId || userId === 'current-user-id') {
      return { data: [], error: null };
    }
    
    const { data, error } = await supabase
      .from('social_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data: data as SocialNotification[] | null, error };
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId: string) {
    const { error } = await supabase
      .from('social_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    return { error };
  },

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId: string) {
    const { error } = await supabase
      .from('social_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return { error };
  },

  // Get unread notifications count
  async getUnreadNotificationsCount(userId: string) {
    const { count, error } = await supabase
      .from('social_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return { count: count || 0, error };
  },

  // =============================================================================
  // STORAGE OPERATIONS
  // =============================================================================

  // Upload avatar
  async uploadAvatar(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('social-avatars')
      .upload(fileName, file, { upsert: true });

    if (error) return { data: null, error };

    const { data: { publicUrl } } = supabase.storage
      .from('social-avatars')
      .getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  },

  // Upload header
  async uploadHeader(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/header.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('social-headers')
      .upload(fileName, file, { upsert: true });

    if (error) return { data: null, error };

    const { data: { publicUrl } } = supabase.storage
      .from('social-headers')
      .getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  },

  // Upload tweet image
  async uploadTweetImage(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('social-tweets')
      .upload(fileName, file);

    if (error) return { data: null, error };

    const { data: { publicUrl } } = supabase.storage
      .from('social-tweets')
      .getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  },

  // Upload message image
  async uploadMessageImage(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('social-messages')
      .upload(fileName, file);

    if (error) return { data: null, error };

    const { data: { publicUrl } } = supabase.storage
      .from('social-messages')
      .getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  },

  // Search users
  async searchUsers(query: string, limit = 10) {
    const { data, error } = await supabase
      .from('social_profiles')
      .select('*')
      .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(limit);

    return { data: data as SocialProfile[] | null, error };
  },
};
