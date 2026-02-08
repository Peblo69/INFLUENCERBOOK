import { useState } from 'react';
import { TrendingUp, Users } from 'lucide-react';
import { PostComposer } from './PostComposer';
import { SocialPost } from './SocialPost';
import { useSocialFeedStore } from '../../stores/socialFeedStore';

export function SocialFeed() {
  const [activeTab, setActiveTab] = useState<'trending' | 'following'>('trending');
  const { posts } = useSocialFeedStore();

  return (
    <div className="max-w-2xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Social Feed
          </h2>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('trending')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'trending'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Trending
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'following'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              Following
            </button>
          </div>
        </div>
      </div>

      {/* Post Composer */}
      <PostComposer />

      {/* Posts Feed */}
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {posts.map((post) => (
          <SocialPost key={post.id} post={post} />
        ))}
      </div>

      {/* Load More */}
      <div className="p-4 text-center">
        <button className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium text-sm transition-colors">
          Load more posts
        </button>
      </div>
    </div>
  );
}