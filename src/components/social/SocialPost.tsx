import { useState } from 'react';
import { MessageCircle, Repeat2, Heart, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import type { SocialPost as PostType } from '../../stores/socialFeedStore';
import { useToast } from '../../hooks/useToast';
import { toast } from './ToastNotification';
import FeedPostModal from './modals/FeedPostModal';

interface PostProps {
  post: PostType;
}

export function SocialPost({ post }: PostProps) {
  const parseMetricValue = (value: string | number) => {
    if (typeof value === 'number') return value;
    const trimmed = value.trim().toUpperCase();
    const match = trimmed.match(/^([\d.,]+)([KMB])?$/);
    if (!match) return Number.parseInt(trimmed.replace(/\D/g, ''), 10) || 0;
    const numeric = Number.parseFloat(match[1].replace(/,/g, ''));
    const suffix = match[2];
    if (suffix === 'K') return Math.round(numeric * 1_000);
    if (suffix === 'M') return Math.round(numeric * 1_000_000);
    if (suffix === 'B') return Math.round(numeric * 1_000_000_000);
    return Math.round(numeric);
  };

  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [likes, setLikes] = useState(post.stats.likes);
  const [reposts, setReposts] = useState(post.stats.reposts);
  const [comments, setComments] = useState(post.stats.comments);
  const [shares, setShares] = useState<number>(() => {
    const base = parseMetricValue(post.stats.views);
    return Math.max(Math.floor(base * 0.04), 1);
  });
  const [isModalOpen, setModalOpen] = useState(false);
  const { showLike, showComment, showShare, showBookmark, showInfo } = useToast();

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes(prev => isLiked ? prev - 1 : prev + 1);
    if (!isLiked) {
      toast.success(`You liked ${post.author.name}'s post`, 'Post Liked');
    }
  };

  const handleComment = () => {
    setComments(prev => prev + 1);
    toast.info('Your comment has been posted', 'Comment Added');
  };

  const handleRepost = () => {
    setIsReposted(!isReposted);
    setReposts(prev => isReposted ? prev - 1 : prev + 1);
    if (!isReposted) {
      toast.success(`You shared ${post.author.name}'s post`, 'Post Shared');
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    if (isBookmarked) {
      toast.warning('Post removed from your bookmarks', 'Bookmark Removed');
    } else {
      toast.success('Post saved to your bookmarks', 'Bookmarked');
    }
  };

  const handleShare = () => {
    setShares(prev => prev + 1);
    toast.success('Post link copied to clipboard', 'Link Copied');
  };

  const handleMoreOptions = () => {
    toast.info('Additional options coming soon', 'More Options');
  };

  const openModal = () => {
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleArticleClick = () => {
    openModal();
  };

  const stopPropagation = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <>
      <article
        className="p-4 transition-all duration-200 cursor-pointer border-l-2 border-transparent hover:border-purple-400/20"
             style={{
               background: 'rgba(255, 255, 255, 0.05)',
               backdropFilter: 'blur(10px)',
               WebkitBackdropFilter: 'blur(10px)',
               borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
             }}
             onClick={handleArticleClick}
             onMouseEnter={(e) => {
               e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
             }}>
        <div className="flex gap-3">
          <div className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden shadow-md">
            <img src={post.author.avatar} alt={post.author.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-[14px] text-white hover:underline">
              {post.author.name}
            </span>
            {post.author.verified && (
              <div className="w-[18px] h-[18px] rounded-full bg-blue-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-3 h-3 text-white fill-current">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
            )}
            <span className="text-gray-400 text-[12px] font-medium">
              {post.author.handle}
            </span>
            <span className="text-gray-400 text-[12px]">•</span>
            <span className="text-gray-400 text-[12px]">
              {post.timestamp}
            </span>
            <button
              onClick={(event) => {
                stopPropagation(event);
                handleMoreOptions();
              }}
              className="ml-auto p-2 rounded-xl transition-colors text-gray-400"
              style={{
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgb(156, 163, 175)';
              }}
            >
              <MoreHorizontal className="w-[18px] h-[18px]" />
            </button>
          </div>
          <p className="text-[13px] text-white mb-3 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>
          {post.media && (
            <div className="rounded-2xl overflow-hidden mb-3 shadow-md hover:shadow-lg transition-shadow"
                 style={{
                   border: '1px solid rgba(255, 255, 255, 0.2)'
                 }}>
              <img src={post.media} alt="Post media" className="w-full" />
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3"
               style={{
                 borderTop: '1px solid rgba(255, 255, 255, 0.1)'
               }}>
            <button
              onClick={(event) => {
                stopPropagation(event);
                handleComment();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-gray-400"
              style={{
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(147, 51, 234, 0.1)';
                e.currentTarget.style.color = 'rgb(147, 51, 234)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgb(156, 163, 175)';
              }}
            >
              <MessageCircle className="w-[18px] h-[18px]" />
              <span className="text-[12px] font-medium">{comments}</span>
            </button>
            <button
              onClick={(event) => {
                stopPropagation(event);
                handleRepost();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
              style={{
                background: isReposted ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                color: isReposted ? 'rgb(34, 197, 94)' : 'rgb(156, 163, 175)'
              }}
              onMouseEnter={(e) => {
                if (!isReposted) {
                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                  e.currentTarget.style.color = 'rgb(34, 197, 94)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isReposted) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgb(156, 163, 175)';
                }
              }}
            >
              <Repeat2 className="w-[18px] h-[18px]" />
              <span className="text-[12px] font-medium">{reposts}</span>
            </button>
            <button
              onClick={(event) => {
                stopPropagation(event);
                handleLike();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
              style={{
                background: isLiked ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                color: isLiked ? 'rgb(239, 68, 68)' : 'rgb(156, 163, 175)'
              }}
              onMouseEnter={(e) => {
                if (!isLiked) {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.color = 'rgb(239, 68, 68)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLiked) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgb(156, 163, 175)';
                }
              }}
            >
              <Heart className={`w-[18px] h-[18px] ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-[12px] font-medium">{likes}</span>
            </button>
            <button
              onClick={(event) => {
                stopPropagation(event);
                handleShare();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-gray-400"
              style={{
                background: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.color = 'rgb(59, 130, 246)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgb(156, 163, 175)';
              }}
            >
              <Share2 className="w-[18px] h-[18px]" />
              <span className="text-[12px] font-medium">{shares}</span>
            </button>
            <button
              onClick={(event) => {
                stopPropagation(event);
                handleBookmark();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
              style={{
                background: isBookmarked ? 'rgba(234, 179, 8, 0.1)' : 'transparent',
                color: isBookmarked ? 'rgb(234, 179, 8)' : 'rgb(156, 163, 175)'
              }}
              onMouseEnter={(e) => {
                if (!isBookmarked) {
                  e.currentTarget.style.background = 'rgba(234, 179, 8, 0.1)';
                  e.currentTarget.style.color = 'rgb(234, 179, 8)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isBookmarked) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgb(156, 163, 175)';
                }
              }}
            >
              <Bookmark className={`w-[18px] h-[18px] ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
      </article>

      {isModalOpen && (
        <FeedPostModal
          post={post}
          isLiked={isLiked}
          likes={likes}
          comments={comments}
          shares={shares}
          isBookmarked={isBookmarked}
          isReposted={isReposted}
          onClose={closeModal}
          onLike={() => handleLike()}
          onComment={() => handleComment()}
          onShare={() => handleShare()}
          onBookmark={() => handleBookmark()}
          onRepost={() => handleRepost()}
        />
      )}
    </>
  );
}