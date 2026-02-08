import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SocialFeed } from '@/components/social/SocialFeed';
import { useSocialFeedStore } from '@/stores/socialFeedStore';
import { ModelsSidebar } from '@/sections/ModelsPage/components/ModelsSidebar';

export const SocialFeedPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { setPosts } = useSocialFeedStore();

  useEffect(() => {
    loadUserAndFeed();
  }, []);

  const loadUserAndFeed = async () => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('Not authenticated:', authError);
        // window.location.href = '/auth'; // Commented out to prevent redirect loop during dev
        // return;
      }

      // Check if user has a social profile
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('social_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error loading profile:', profileError);
        }

        // Create profile if it doesn't exist
        if (!profile) {
          const { data: newProfile, error: createError } = await supabase
            .from('social_profiles')
            .insert({
              id: user.id,
              username: user.email?.split('@')[0] || 'user',
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
          } else {
            setUserProfile(newProfile);
          }
        } else {
          setUserProfile(profile);
        }
      }

      // Load tweets
      await loadTweets();

    } catch (error) {
      console.error('Error loading user and feed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTweets = async () => {
    try {
      const { data: tweets, error } = await supabase
        .from('tweets')
        .select(`
          *,
          author:social_profiles!tweets_author_id_fkey(
            id,
            username,
            name,
            photo_url,
            is_premium
          ),
          likes:tweet_likes(count),
          retweets:tweet_retweets(count)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading tweets:', error);
        return;
      }

      // Transform to SocialPost format
      const posts = (tweets || []).map(tweet => ({
        id: tweet.id,
        author: {
          name: tweet.author.name,
          handle: `@${tweet.author.username}`,
          avatar: tweet.author.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tweet.author.username}`,
          verified: tweet.author.is_premium
        },
        content: tweet.text,
        timestamp: formatTimestamp(new Date(tweet.created_at)),
        media: tweet.photo_url || undefined,
        stats: {
          likes: tweet.likes?.[0]?.count || 0,
          reposts: tweet.retweets?.[0]?.count || 0,
          comments: 0,
          views: Math.floor(Math.random() * 10000) + 100
        }
      }));

      setPosts(posts);

    } catch (error) {
      console.error('Error transforming tweets:', error);
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (days > 0) {
      return `${days}d`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/40 text-xs tracking-widest uppercase">Loading feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden font-sans bg-black">
      {/* Standard Sidebar */}
      <ModelsSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/50 backdrop-blur-xl z-20">
          <div>
            <h1 className="text-lg font-semibold text-white tracking-wide">Social Feed</h1>
            <p className="text-[10px] text-zinc-500 tracking-wider uppercase">Community Creations</p>
          </div>
          <div className="flex items-center gap-4">
             {userProfile && (
                <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                    {userProfile.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-white font-medium">@{userProfile.username}</span>
                </div>
             )}
          </div>
        </header>

        {/* Scrollable Feed */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="grid grid-cols-12 gap-8">
              
              {/* Main Feed Column */}
              <div className="col-span-8">
                <SocialFeed />
              </div>

              {/* Right Sidebar Column (Trending/Suggested) */}
              <div className="col-span-4 space-y-6">
                
                {/* Trending */}
                <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-6">
                  <h3 className="text-white text-sm font-semibold mb-4 tracking-wide">Trending</h3>
                  <div className="space-y-1">
                    {['#AIArt', '#DigitalCreation', '#AIGenerated', '#KiaraVision'].map((tag, i) => (
                      <div key={i} className="cursor-pointer hover:bg-white/5 rounded-lg p-3 transition-all group">
                        <div className="text-zinc-400 group-hover:text-white font-medium text-sm transition-colors">{tag}</div>
                        <div className="text-zinc-600 text-[10px] mt-0.5">{Math.floor(Math.random() * 1000) + 100} posts</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Users */}
                <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-6">
                  <h3 className="text-white text-sm font-semibold mb-4 tracking-wide">Suggested Artists</h3>
                  <div className="space-y-4">
                    {['Artist1', 'Creator2', 'Designer3'].map((name, i) => (
                      <div key={i} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5" />
                          <div>
                            <div className="text-zinc-200 text-xs font-medium group-hover:text-white transition-colors">{name}</div>
                            <div className="text-zinc-600 text-[10px]">@{name.toLowerCase()}</div>
                          </div>
                        </div>
                        <button className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white text-[10px] font-medium transition-all">
                          Follow
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Links */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-zinc-600 px-2">
                  <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
                  <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
                  <a href="#" className="hover:text-zinc-400 transition-colors">Guidelines</a>
                  <span>© 2025 Kiara</span>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

