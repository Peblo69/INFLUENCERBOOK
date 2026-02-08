import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Heart,
  MessageCircle,
  Share2,
  Repeat2,
  Bookmark,
} from 'lucide-react';
import type { SocialPost as PostType } from '../../../stores/socialFeedStore';

interface FeedPostModalProps {
  post: PostType;
  isLiked: boolean;
  isBookmarked: boolean;
  isReposted: boolean;
  likes: number;
  comments: number;
  shares: number;
  onClose: () => void;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onBookmark: () => void;
  onRepost: () => void;
}

const overlayRoot = typeof document !== 'undefined' ? document.body : null;

const sampleReplies = [
  {
    id: 'reply-1',
    name: 'Nia Caldwell',
    handle: '@niacreates',
    avatar:
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=64&h=64&fit=crop&crop=face',
    text: 'Mood board saved. The color tempo on this series feels premium.',
    timestamp: '6m ago',
    verified: true,
  },
  {
    id: 'reply-2',
    name: 'Noah Singh',
    handle: '@noah.codes',
    avatar:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=64&h=64&fit=crop&crop=face',
    text: 'Perfect reference for the night theme drop. Appreciate the polish.',
    timestamp: '12m ago',
  },
];

const iconButtonClass =
  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors border border-white/10';

export default function FeedPostModal({
  post,
  isLiked,
  isBookmarked,
  isReposted,
  likes,
  comments,
  shares,
  onClose,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onRepost,
}: FeedPostModalProps) {
  const [draftComment, setDraftComment] = useState('');

  useEffect(() => {
    if (!overlayRoot) return;
    const previous = overlayRoot.style.overflow;
    overlayRoot.style.overflow = 'hidden';
    return () => {
      overlayRoot.style.overflow = previous;
    };
  }, []);

  if (!overlayRoot) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{
        background:
          'radial-gradient(circle at top, rgba(4,6,16,0.94), rgba(1,1,6,0.98))',
        backdropFilter: 'blur(18px)',
      }}
      onClick={handleBackdropClick}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_65%),radial-gradient(circle_at_80%_35%,rgba(180,200,255,0.08),transparent_70%),radial-gradient(circle_at_30%_80%,rgba(160,120,255,0.06),transparent_55%)] opacity-55" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradient.vercel.app/noise.svg')] bg-repeat opacity-35 mix-blend-screen" />
      </div>

      <article
        className="relative z-10 flex w-full max-w-[1400px] flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[#07080f] shadow-[0_52px_160px_rgba(0,0,0,0.7)] md:flex-row"
        onClick={(event) => event.stopPropagation()}
      >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/80 text-white shadow-lg transition-transform hover:scale-105 hover:bg-black"
            aria-label="Close post"
          >
            <X className="h-5 w-5" />
          </button>

        <section className="relative flex min-h-[520px] w-full items-center justify-center bg-[#030308] px-8 py-10 md:w-2/3">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.08),transparent_65%)]" />
          <div className="relative z-10 flex max-h-[82vh] w-full items-center justify-center">
            {post.media ? (
              <img
                src={post.media}
                alt={post.author.name}
                className="max-h-[82vh] w-auto max-w-full rounded-[22px] border border-white/12 object-contain bg-black"
              />
            ) : (
              <div className="flex h-[60vh] w-full items-center justify-center rounded-[22px] border border-white/12 bg-[#0b0c17] text-xs uppercase tracking-[0.32em] text-white/40">
                No preview available
              </div>
            )}
          </div>
        </section>

        <aside className="flex min-h-[520px] w-full flex-col gap-6 border-t border-white/8 bg-[#090a14] px-9 py-10 text-white md:w-1/3 md:border-l md:border-t-0">
          <header className="flex items-start gap-3">
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="h-12 w-12 rounded-2xl border border-white/12 object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{post.author.name}</span>
                {post.author.verified && (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500">
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-white">
                      <path d="M9 16.17 4.83 12 3.41 13.41 9 19l12-12-1.41-1.41z" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="text-xs text-white/35">{post.author.handle}</div>
            </div>
            <button
              type="button"
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-white/80 transition-colors hover:bg-white/20"
            >
              Follow
            </button>
          </header>

          <div className="space-y-4 text-sm leading-relaxed text-white/85">
            <p>{post.content}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-white/35">
              <span>#{post.author.handle.replace('@', '')}</span>
              <span>#Momentum</span>
              <span>#{new Date().getFullYear()}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/75">
              <button
                type="button"
                onClick={onComment}
                className="inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="font-semibold text-white">{comments.toLocaleString()}</span>
              </button>
              <button
                type="button"
                onClick={onLike}
                className="inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'text-red-400' : 'text-white/60'}`} />
                <span className="font-semibold text-white">{likes.toLocaleString()}</span>
              </button>
              <button
                type="button"
                onClick={onShare}
                className="inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"
              >
                <Share2 className="h-4 w-4 text-white/60" />
                <span className="font-semibold text-white">{shares.toLocaleString()}</span>
              </button>
              <button
                type="button"
                onClick={onRepost}
                className="inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"
              >
                <Repeat2 className="h-4 w-4 text-white/60" />
                <span className="font-semibold text-white">
                  {post.stats.reposts.toLocaleString()}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-6 text-sm text-white/80">
            {sampleReplies.map((reply) => (
              <div
                key={reply.id}
                className="flex gap-3 border-b border-white/10 pb-4 last:border-0"
              >
                <img
                  src={reply.avatar}
                  alt={reply.name}
                  className="h-9 w-9 flex-shrink-0 rounded-full border border-white/12"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
                    <span className="font-semibold text-white/85">{reply.name}</span>
                    {reply.verified && (
                      <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-blue-500">
                        <svg viewBox="0 0 24 24" className="h-2 w-2 fill-white">
                          <path d="M9 16.17 4.83 12 3.41 13.41 9 19l12-12-1.41-1.41z" />
                        </svg>
                      </span>
                    )}
                    <span>{reply.handle}</span>
                    <span>•</span>
                    <span>{reply.timestamp}</span>
                  </div>
                  <p className="mt-2 leading-relaxed text-white/85">{reply.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-center gap-3 rounded-[18px] border border-white/12 bg-white/5 px-4 py-3">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=44&h=44&fit=crop&crop=face"
              alt="You"
              className="h-9 w-9 rounded-full border border-white/12"
            />
            <input
              value={draftComment}
              onChange={(event) => setDraftComment(event.target.value)}
              placeholder="Add a reply..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/45 focus:outline-none"
            />
            <button
              type="button"
              disabled
              className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-white/40"
            >
              Post
            </button>
          </div>
        </aside>
      </article>
    </div>,
    overlayRoot,
);
}
