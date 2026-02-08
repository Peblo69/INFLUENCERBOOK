
export enum MediaType {
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE'
}

export interface MediaAsset {
  id: string;
  file: File;
  src: string; // Blob URL
  name: string;
  type: MediaType;
  duration: number; // In seconds
  thumbnail?: string;
}

export interface Clip {
  id: string;
  trackId: string;
  name: string;
  type: MediaType;
  start: number; // Start time on timeline (seconds)
  duration: number; // Duration of the clip (seconds)
  offset: number; // Start time within the source media (seconds)
  src?: string; // URL for media (Blob URL)
  assetId?: string; // Reference to the MediaAsset
  color: string; // Tailwind color class for UI
  path?: string; // File path simulation
  resolution?: string; // e.g., "1080p"
  properties: {
    opacity: number;
    volume: number;
    scale: number;
    rotation: number;
    x: number;
    y: number;
    
    // Text Specific
    text?: string;
    fontSize?: number;
    textColor?: string;
    fontFamily?: string;

    // Filters
    brightness: number; // 1.0 is default
    contrast: number;   // 1.0 is default
    saturation: number; // 1.0 is default
    hue: number;        // 0 is default (degrees)
    blur: number;       // 0 is default (pixels)
    
    // Animation/Time
    speed?: number;
    blendMode?: string;
    fadeIn?: number;
    fadeOut?: number;
    transitionType?: 'fade' | 'slide' | 'wipe' | 'zoom';
  };
}

export interface Track {
  id: string;
  type: MediaType;
  name: string;
  isMuted: boolean;
  isLocked: boolean;
  isHidden?: boolean;
}

export interface EditorState {
  currentTime: number; // Current playhead position in seconds
  duration: number; // Total timeline duration
  isPlaying: boolean;
  isExporting?: boolean;
  zoomLevel: number; // Pixels per second
  selectedClipId: string | null;
}

export interface GeneratedClipData {
  name: string;
  type: MediaType;
  duration: number;
  description: string;
}

