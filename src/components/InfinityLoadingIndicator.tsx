import React, { memo } from 'react';
import Lottie from 'lottie-react';
import infinityLoopAnim from '@/assets/animations/infinity-loop.json';

interface InfinityLoadingIndicatorProps {
  size?: number;
  color?: string; // 'black' or 'white' - default is white
}

export const InfinityLoadingIndicator = memo(function InfinityLoadingIndicator({
  size = 48,
  color = 'white'
}: InfinityLoadingIndicatorProps) {
  // CSS filter to convert white animation to black
  const getFilterStyle = () => {
    if (color === '#000' || color === 'black') {
      // Invert colors: white -> black
      return {
        filter: 'brightness(0) saturate(100%)',
      };
    }
    return {};
  };

  return (
    <div
      className="inline-block"
      role="status"
      aria-live="polite"
      aria-label="AI is thinking"
    >
      <div className="flex-shrink-0" style={{ width: size, height: size }}>
        <Lottie
          animationData={infinityLoopAnim as any}
          loop
          autoplay
          style={{
            width: '100%',
            height: '100%',
            ...getFilterStyle()
          }}
        />
      </div>
    </div>
  );
});
