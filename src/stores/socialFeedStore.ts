import { create } from 'zustand';

export interface SocialPost {
  id: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
    verified?: boolean;
  };
  content: string;
  timestamp: string;
  media?: string;
  stats: {
    comments: number;
    reposts: number;
    likes: number;
    views: string;
  };
}

interface SocialFeedState {
  posts: SocialPost[];
  addPost: (post: Omit<SocialPost, 'id' | 'timestamp' | 'stats'>) => void;
  setPosts: (posts: SocialPost[]) => void;
}

const initialPosts: SocialPost[] = [
  {
    id: '1',
    author: {
      name: 'KiaraX Analytics',
      handle: '@kiarax_analytics',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kiarax',
      verified: true,
    },
    content: 'Welcome to the new Analytics Dashboard! 🎨 Built with modern design principles and real-time data visualization. Experience the future of analytics!',
    timestamp: '2h ago',
    media: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    stats: {
      comments: 342,
      reposts: 89,
      likes: 1547,
      views: '45.2K',
    },
  },
  {
    id: '2',
    author: {
      name: 'Data Insights',
      handle: '@datainsights',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=data',
      verified: true,
    },
    content: 'Real-time analytics are game-changing! 🚀 The ability to see live user interactions and performance metrics instantly transforms how we make decisions.',
    timestamp: '5h ago',
    media: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
    stats: {
      comments: 156,
      reposts: 234,
      likes: 2891,
      views: '78.5K',
    },
  },
  {
    id: '3',
    author: {
      name: 'Analytics Pro',
      handle: '@analyticspro',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=analytics',
      verified: false,
    },
    content: 'Pro tip: Always monitor your key metrics in real-time. Data-driven decisions lead to better outcomes! 📊✨',
    timestamp: '1d ago',
    stats: {
      comments: 89,
      reposts: 145,
      likes: 892,
      views: '23.1K',
    },
  },
  {
    id: '4',
    author: {
      name: 'Tech Trends',
      handle: '@techtrends',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
      verified: true,
    },
    content: 'The integration of social feeds with analytics dashboards is brilliant! It creates a more engaging and interactive user experience. 🎯',
    timestamp: '2d ago',
    stats: {
      comments: 67,
      reposts: 98,
      likes: 543,
      views: '18.7K',
    },
  },
];

export const useSocialFeedStore = create<SocialFeedState>((set) => ({
  posts: initialPosts,
  addPost: (newPost) => set((state) => ({
    posts: [{
      ...newPost,
      id: Date.now().toString(),
      timestamp: 'now',
      stats: { comments: 0, reposts: 0, likes: 0, views: '0' }
    }, ...state.posts]
  })),
  setPosts: (posts) => set({ posts }),
}));