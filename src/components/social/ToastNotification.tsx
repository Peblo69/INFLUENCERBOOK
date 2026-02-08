import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

interface ToastData {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

interface ToastNotificationProps {
  toast: ToastData;
  index: number;
  onRemove: (id: string) => void;
  position: ToastPosition;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-black/40',
    borderColor: 'border-white/20',
    iconColor: 'text-white',
    titleColor: 'text-white',
    messageColor: 'text-white/80',
    progressColor: 'bg-white/60'
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-black/40',
    borderColor: 'border-white/20',
    iconColor: 'text-white',
    titleColor: 'text-white',
    messageColor: 'text-white/80',
    progressColor: 'bg-white/60'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-black/40',
    borderColor: 'border-white/20',
    iconColor: 'text-white',
    titleColor: 'text-white',
    messageColor: 'text-white/80',
    progressColor: 'bg-white/60'
  },
  info: {
    icon: Info,
    bgColor: 'bg-black/40',
    borderColor: 'border-white/20',
    iconColor: 'text-white',
    titleColor: 'text-white',
    messageColor: 'text-white/80',
    progressColor: 'bg-white/60'
  },
  loading: {
    icon: Loader,
    bgColor: 'bg-black/40',
    borderColor: 'border-white/20',
    iconColor: 'text-white',
    titleColor: 'text-white',
    messageColor: 'text-white/80',
    progressColor: 'bg-white/60'
  }
};

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
};

export function ToastNotification({ toast, index, onRemove, position }: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState(100);
  
  const config = toastConfig[toast.type];
  const IconComponent = config.icon;
  const duration = toast.duration || 4000;

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto dismiss (unless persistent or loading)
    if (!toast.persistent && toast.type !== 'loading') {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 50));
          if (newProgress <= 0) {
            clearInterval(progressInterval);
            handleRemove();
            return 0;
          }
          return newProgress;
        });
      }, 50);

      return () => {
        clearTimeout(showTimer);
        clearInterval(progressInterval);
      };
    }

    return () => clearTimeout(showTimer);
  }, [duration, toast.persistent, toast.type]);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(toast.id);
      toast.onClose?.();
    }, 300);
  }, [toast.id, toast.onClose, onRemove]);

  const handleAction = () => {
    toast.action?.onClick();
    handleRemove();
  };

  const getTransformStyle = () => {
    const baseTransform = position.includes('center') ? 'translateX(-50%)' : '';
    const stackOffset = index * 10;
    const scaleOffset = Math.max(0.95, 1 - index * 0.05);
    
    if (!isVisible) {
      const slideDirection = position.includes('right') ? 'translateX(100%)' : 
                           position.includes('left') ? 'translateX(-100%)' : 
                           position.includes('top') ? 'translateY(-100%)' : 'translateY(100%)';
      return `${baseTransform} ${slideDirection} scale(0.95)`;
    }
    
    if (isRemoving) {
      const slideDirection = position.includes('right') ? 'translateX(100%)' : 'translateX(-100%)';
      return `${baseTransform} ${slideDirection} scale(0.8)`;
    }
    
    const yOffset = position.includes('top') ? stackOffset : -stackOffset;
    return `${baseTransform} translateY(${yOffset}px) scale(${scaleOffset})`;
  };

  return (
    <div
      className={`
        fixed z-50 max-w-sm w-full mx-4 sm:mx-0
        transition-all duration-300 ease-out
        ${position.includes('center') ? '' : positionClasses[position]}
      `}
      style={{
        transform: getTransformStyle(),
        opacity: isVisible && !isRemoving ? Math.max(0.7, 1 - index * 0.1) : 0,
        zIndex: 50 - index
      }}
    >
      <div
        className={`
          relative ${config.bgColor} ${config.borderColor}
          border backdrop-blur-md rounded-lg shadow-2xl overflow-hidden
          transform hover:scale-105 transition-transform duration-200
        `}
      >
        {/* Progress bar */}
        {!toast.persistent && toast.type !== 'loading' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
            <div
              className={`h-full ${config.progressColor} transition-all duration-50 ease-linear`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              <IconComponent 
                className={`w-5 h-5 ${config.iconColor} ${toast.type === 'loading' ? 'animate-spin' : ''}`} 
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className={`font-semibold text-sm ${config.titleColor} mb-1`}>
                  {toast.title}
                </h4>
              )}
              <p className={`text-sm ${config.messageColor} leading-relaxed`}>
                {toast.message}
              </p>

              {/* Action button */}
              {toast.action && (
                <button
                  onClick={handleAction}
                  className={`
                    mt-3 px-3 py-1 rounded-md text-xs font-medium
                    transition-colors hover:opacity-80
                    ${config.iconColor.replace('text-', 'bg-').replace('400', '600')} text-white
                  `}
                >
                  {toast.action.label}
                </button>
              )}
            </div>

            {/* Close button */}
            {(toast.persistent || toast.type === 'loading') && (
              <button
                onClick={handleRemove}
                className={`
                  flex-shrink-0 p-1 rounded-full transition-colors
                  ${config.iconColor} hover:bg-white/10
                `}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Glow effect */}
        <div className={`absolute inset-0 ${config.progressColor} opacity-10 blur-xl -z-10`} />
      </div>
    </div>
  );
}

// Hook for managing toast notifications
export function useToastNotifications(position: ToastPosition = 'top-right', maxToasts: number = 5) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastData = { ...toast, id };
    
    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts); // Limit number of toasts
    });
    
    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<ToastData>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message: string, title?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'success', message, title, ...options });
  }, [addToast]);

  const showError = useCallback((message: string, title?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'error', message, title, ...options });
  }, [addToast]);

  const showWarning = useCallback((message: string, title?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'warning', message, title, ...options });
  }, [addToast]);

  const showInfo = useCallback((message: string, title?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'info', message, title, ...options });
  }, [addToast]);

  const showLoading = useCallback((message: string, title?: string) => {
    return addToast({ type: 'loading', message, title, persistent: true });
  }, [addToast]);

  const dismissLoading = useCallback((id: string) => {
    removeToast(id);
  }, [removeToast]);

  return {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    dismissLoading,
    position
  };
}

// Container component for displaying toast notifications
export function ToastContainer({ position = 'top-right', maxToasts = 5 }: { 
  position?: ToastPosition; 
  maxToasts?: number; 
}) {
  const { toasts, removeToast } = useToastNotifications(position, maxToasts);

  return (
    <>
      {toasts.map((toast, index) => (
        <ToastNotification
          key={toast.id}
          toast={toast}
          index={index}
          onRemove={removeToast}
          position={position}
        />
      ))}
    </>
  );
}

// Global toast provider hook
let globalToastMethods: ReturnType<typeof useToastNotifications> | null = null;

export function ToastProvider({ children, position = 'top-right', maxToasts = 5 }: {
  children: React.ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
}) {
  const toastMethods = useToastNotifications(position, maxToasts);
  globalToastMethods = toastMethods;

  return (
    <>
      {children}
      <ToastContainer position={position} maxToasts={maxToasts} />
    </>
  );
}

// Global toast methods
export const toast = {
  success: (message: string, title?: string, options?: Partial<ToastData>) => 
    globalToastMethods?.showSuccess(message, title, options),
  error: (message: string, title?: string, options?: Partial<ToastData>) => 
    globalToastMethods?.showError(message, title, options),
  warning: (message: string, title?: string, options?: Partial<ToastData>) => 
    globalToastMethods?.showWarning(message, title, options),
  info: (message: string, title?: string, options?: Partial<ToastData>) => 
    globalToastMethods?.showInfo(message, title, options),
  loading: (message: string, title?: string) => 
    globalToastMethods?.showLoading(message, title),
  dismiss: (id: string) => 
    globalToastMethods?.removeToast(id),
  clear: () => 
    globalToastMethods?.clearAllToasts()
};