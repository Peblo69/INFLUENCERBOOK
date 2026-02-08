import { useState, useEffect } from "react";

export const AsciiDivider = () => (
  <div className="w-full text-gray-600 text-xs md:text-sm my-8 opacity-50 select-none overflow-hidden whitespace-nowrap">
    {"+-".repeat(100)}
  </div>
);

export const LoadingSpinner = () => {
  const [frame, setFrame] = useState(0);
  const frames = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return <span className="text-white inline-block w-4">{frames[frame]}</span>;
};
