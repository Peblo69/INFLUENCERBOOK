export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface FeatureCard {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  badge?: string;
  badgeColor?: string; // Tailwind color class snippet
  size: 'large' | 'medium';
}

export interface ToolItem {
  id: string;
  title: string;
  image: string;
  isNew?: boolean;
  isPro?: boolean;
  actionLabel?: string;
}

export interface CommunityProject {
  id: string;
  title: string;
  author: string;
  image: string;
  avatar: string;
}

export interface VisualEffect {
  id: string;
  title: string;
  category: string;
  image: string; // Using images as placeholders for videos
  aspectRatio: 'square' | 'portrait' | 'landscape';
}