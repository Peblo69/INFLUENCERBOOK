import { useState, useEffect } from "react";

export type NotificationType = "success" | "error" | "info" | "warning";

interface NotificationProps {
  message: string;
  type: NotificationType;
  title?: string;
  duration?: number;
  onClose: () => void;
}

export const Notification = ({ message, type, title, duration = 5000, onClose }: NotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 10);

    // Progress bar
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);

    // Auto close
    const timeout = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [duration, onClose]);

  const icons = {
    success: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const colors = {
    success: "from-green-500/90 to-emerald-500/90 text-white border-green-400/30",
    error: "from-red-500/90 to-rose-500/90 text-white border-red-400/30",
    warning: "from-yellow-500/90 to-orange-500/90 text-white border-yellow-400/30",
    info: "from-blue-500/90 to-cyan-500/90 text-white border-blue-400/30",
  };

  const progressColors = {
    success: "bg-green-300",
    error: "bg-red-300",
    warning: "bg-yellow-300",
    info: "bg-blue-300",
  };

  return (
    <div
      className={`fixed top-6 right-6 z-[300] w-96 transform transition-all duration-300 ease-out ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div
        className={`relative bg-gradient-to-r ${colors[type]} backdrop-blur-xl rounded-xl border shadow-2xl overflow-hidden`}
      >
        {/* Progress bar */}
        <div
          className={`absolute bottom-0 left-0 h-1 ${progressColors[type]} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />

        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>

            <div className="flex-1 min-w-0">
              {title && <h3 className="text-sm font-bold mb-1">{title}</h3>}
              <p className="text-sm leading-relaxed opacity-95">{message}</p>
            </div>

            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
              className="flex-shrink-0 ml-2 hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Notification Manager Hook
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<
    Array<{ id: string; message: string; type: NotificationType; title?: string; duration?: number }>
  >([]);

  const showNotification = (message: string, type: NotificationType, title?: string, duration?: number) => {
    const id = Date.now().toString() + Math.random();
    setNotifications((prev) => [...prev, { id, message, type, title, duration }]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const NotificationContainer = () => (
    <div className="fixed top-0 right-0 z-[300] p-6 space-y-4">
      {notifications.map((notification, index) => (
        <div key={notification.id} style={{ transform: `translateY(${index * 8}px)` }}>
          <Notification
            message={notification.message}
            type={notification.type}
            title={notification.title}
            duration={notification.duration}
            onClose={() => removeNotification(notification.id)}
          />
        </div>
      ))}
    </div>
  );

  return { showNotification, NotificationContainer };
};
