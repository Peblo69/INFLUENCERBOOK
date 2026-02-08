import { PostComposer } from './PostComposer';
import { SocialPost } from './SocialPost';
import DiscoverGrid from './DiscoverGrid';
import { ChatInterface } from './ChatInterface';
import { NotificationsPage } from './NotificationsPage';
import { useSocialFeedStore } from '../../stores/socialFeedStore';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { TrendingUp, Users, Users2, Activity, Bell, MessageSquare, Layers, Star, UserCircle, Settings, Compass } from 'lucide-react';

// Content components for different sections
function FeedContent() {
  const { posts } = useSocialFeedStore();
  
  return (
    <>
      <PostComposer />
      <div className="divide-y dark:divide-mono-dark-border divide-mono-light-border">
        {posts.map((post) => (
          <SocialPost key={post.id} post={post} />
        ))}
      </div>
    </>
  );
}



function CommunitiesContent() {
  return (
    <div className="p-8 text-center">
      <Users2 className="w-16 h-16 mx-auto mb-4 text-purple-400" />
      <h2 className="text-2xl font-bold mb-2 text-white">Communities</h2>
      <p className="text-gray-300">Join and discover communities</p>
    </div>
  );
}

function RealtimeContent() {
  return (
    <div className="p-8 text-center">
      <Activity className="w-16 h-16 mx-auto mb-4 text-red-400" />
      <h2 className="text-2xl font-bold mb-2 text-white">Realtime</h2>
      <p className="text-gray-300">Live updates and real-time analytics</p>
    </div>
  );
}

function GenericContent({ icon: Icon, title, description, color }: { icon: any, title: string, description: string, color: string }) {
  return (
    <div className="p-8 text-center">
      <Icon className={`w-16 h-16 mx-auto mb-4 ${color}`} />
      <h2 className="text-2xl font-bold mb-2 text-white">{title}</h2>
      <p className="text-gray-300">{description}</p>
    </div>
  );
}

export function Feed() {
  const { currentSection } = useAnalyticsStore();

  const getSectionHeader = () => {
    switch (currentSection) {
      case 'feed': return { title: 'Feed', icon: TrendingUp };
      case 'discover': return { title: 'Discover', icon: Compass };
      case 'alerts': return { title: 'Alerts', icon: Bell };
      case 'chats': return { title: 'Chats', icon: MessageSquare };
      case 'communities': return { title: 'Communities', icon: Users2 };
      case 'realtime': return { title: 'Realtime', icon: Activity };
      case 'collections': return { title: 'Collections', icon: Layers };
      case 'favorites': return { title: 'Favorites', icon: Star };
      case 'groups': return { title: 'Groups', icon: Users };
      case 'account': return { title: 'Account', icon: UserCircle };
      case 'settings': return { title: 'Settings', icon: Settings };
      default: return { title: 'Feed', icon: TrendingUp };
    }
  };

  const renderContent = () => {
    switch (currentSection) {
      case 'feed':
        return <FeedContent />;
      case 'communities':
        return <CommunitiesContent />;
      case 'realtime':
        return <RealtimeContent />;
      case 'discover':
        return <DiscoverGrid />;
      case 'alerts':
        return <NotificationsPage />;
      case 'chats':
        return <ChatInterface />;
      case 'collections':
        return <GenericContent icon={Layers} title="Collections" description="Organize your content in collections" color="text-indigo-400" />;
      case 'favorites':
        return <GenericContent icon={Star} title="Favorites" description="Your favorite posts and content" color="text-yellow-400" />;
      case 'groups':
        return <GenericContent icon={Users} title="Groups" description="Join and manage your groups" color="text-green-400" />;
      case 'account':
        return <GenericContent icon={UserCircle} title="Account" description="Manage your account settings" color="text-blue-400" />;
      case 'settings':
        return <GenericContent icon={Settings} title="Settings" description="Configure your preferences" color="text-gray-400" />;
      default:
        return <FeedContent />;
    }
  };

  const { title, icon: HeaderIcon } = getSectionHeader();

  return (
    <main
      className="flex-1 max-w-[860px] h-screen flex flex-col rounded-[28px] border border-white/10 bg-[#05060d]/85 shadow-[0_36px_120px_rgba(0,0,0,0.55)]"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#060710]/90 backdrop-blur-xl">
        <div className="flex items-center px-6 py-5">
          <HeaderIcon className="mr-3 h-6 w-6 text-white/80" />
          <h1 className="text-xl font-semibold text-white">{title}</h1>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-10 pt-6 scrollbar-hide">
        {renderContent()}
      </div>
    </main>
  );
}