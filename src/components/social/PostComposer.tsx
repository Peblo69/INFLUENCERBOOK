import { useState } from 'react';
import { useToast } from '../../hooks/useToast';

// Custom SVG Icons for premium look
const CustomImageIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);

const CustomEmojiIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10"/>
    <path d="m9 9 1.5 1.5L15 6"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
  </svg>
);

const CustomPollIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M3 3v18h18"/>
    <path d="m19 9-5 5-4-4-3 3"/>
  </svg>
);

const CustomScheduleIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <circle cx="12" cy="16" r="2"/>
  </svg>
);

const CustomLocationIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const CustomSendIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="m22 2-7 20-4-9-9-4Z"/>
    <path d="M22 2 11 13"/>
  </svg>
);

export function PostComposer() {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { showSuccess, showInfo } = useToast();

  const handleImageUpload = () => {
    showInfo('Image Upload', 'Image upload feature coming soon!');
  };

  const handleEmojiPicker = () => {
    showInfo('Emoji Picker', 'Emoji picker feature coming soon!');
  };

  const handlePollCreation = () => {
    showInfo('Create Poll', 'Poll creation feature coming soon!');
  };

  const handleSchedulePost = () => {
    showInfo('Schedule Post', 'Post scheduling feature coming soon!');
  };

  const handleLocationTag = () => {
    showInfo('Add Location', 'Location tagging feature coming soon!');
  };

  const handleSharePost = () => {
    if (text.trim()) {
      showSuccess('Post Shared!', 'Your post has been shared successfully');
      setText(''); // Clear the text after posting
    }
  };

  return (
    <div className="relative p-6"
         style={{
           background: 'rgba(0, 0, 0, 0.8)',
           backdropFilter: 'blur(20px)',
           WebkitBackdropFilter: 'blur(20px)',
           borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
         }}>
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -left-4 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative flex gap-4">
        {/* Premium Avatar */}
        <div className="relative group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/20 via-gray-300/20 to-white/20 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-2xl transition-all duration-500 group-hover:scale-105"
               style={{
                 border: '1px solid rgba(255, 255, 255, 0.2)'
               }}>
            <span className="text-sm font-extrabold tracking-wider">KX</span>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md"></div>
        </div>

        <div className="flex-1 space-y-4">
          {/* Premium Textarea */}
           <textarea
             placeholder="Share your thoughts with the world..."
             value={text}
             onChange={(e) => setText(e.target.value)}
             onFocus={() => setIsFocused(true)}
             onBlur={() => setIsFocused(false)}
             className="w-full bg-transparent border-0 outline-none text-[16px] placeholder:text-gray-400 resize-none text-white font-medium transition-all duration-300"
             rows={3}
           />

          {/* Premium Action Bar */}
          <div className="flex items-center justify-between">
            {/* Custom Icon Buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleImageUpload}
                  className="group p-2 transition-all duration-500 hover:scale-110 text-gray-400 hover:text-blue-400"
                >
                  <div className="w-4 h-4">
                    <CustomImageIcon />
                  </div>
                </button>
                
                <button 
                  onClick={handleEmojiPicker}
                  className="group p-2 transition-all duration-500 hover:scale-110 text-gray-400 hover:text-emerald-400 delay-75"
                >
                  <div className="w-4 h-4">
                    <CustomEmojiIcon />
                  </div>
                </button>
                
                <button 
                  onClick={handlePollCreation}
                  className="group p-2 transition-all duration-500 hover:scale-110 text-gray-400 hover:text-purple-400 delay-150"
                >
                  <div className="w-4 h-4">
                    <CustomPollIcon />
                  </div>
                </button>
                
                <button 
                  onClick={handleSchedulePost}
                  className="group p-2 transition-all duration-500 hover:scale-110 text-gray-400 hover:text-orange-400 delay-225"
                >
                  <div className="w-4 h-4">
                    <CustomScheduleIcon />
                  </div>
                </button>
                
                <button 
                  onClick={handleLocationTag}
                  className="group p-2 transition-all duration-500 hover:scale-110 text-gray-400 hover:text-gray-300 delay-300"
                >
                  <div className="w-4 h-4">
                    <CustomLocationIcon />
                  </div>
                </button>
              </div>

            {/* Premium Post Button */}
             <button 
               onClick={handleSharePost}
               disabled={!text.trim()}
               className="group relative overflow-hidden rounded-xl px-5 py-2 font-semibold text-[13px] transition-all duration-500 transform hover:scale-105"
               style={{
                 background: text.trim() ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.2)',
                 color: text.trim() ? 'black' : 'rgb(156, 163, 175)',
                 border: text.trim() ? '1px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(255, 255, 255, 0.2)',
                 cursor: text.trim() ? 'pointer' : 'not-allowed',
                 backdropFilter: 'blur(10px)',
                 WebkitBackdropFilter: 'blur(10px)'
               }}
             >
               <div className="relative flex items-center gap-1.5 z-10">
                 <CustomSendIcon />
                 <span className="tracking-wide">Share</span>
               </div>
               {text.trim() && (
                 <>
                   <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                 </>
               )}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}