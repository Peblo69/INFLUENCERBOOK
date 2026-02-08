import { useState, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'like' | 'comment' | 'share' | 'bookmark';
  title: string;
  description?: string;
  duration?: number;
}

let toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration || 2000,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, description?: string) => {
    return addToast({ type: 'success', title, description });
  }, [addToast]);

  const showError = useCallback((title: string, description?: string) => {
    return addToast({ type: 'error', title, description });
  }, [addToast]);

  const showInfo = useCallback((title: string, description?: string) => {
    return addToast({ type: 'info', title, description });
  }, [addToast]);

  const showLike = useCallback((title: string = 'Liked!', description?: string) => {
    return addToast({ type: 'like', title, description });
  }, [addToast]);

  const showComment = useCallback((title: string = 'Comment added!', description?: string) => {
    return addToast({ type: 'comment', title, description });
  }, [addToast]);

  const showShare = useCallback((title: string = 'Shared!', description?: string) => {
    return addToast({ type: 'share', title, description });
  }, [addToast]);

  const showBookmark = useCallback((title: string = 'Bookmarked!', description?: string) => {
    return addToast({ type: 'bookmark', title, description });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showInfo,
    showLike,
    showComment,
    showShare,
    showBookmark,
  };
}

// Global toast instance for easy access
let globalToast: ReturnType<typeof useToast> | null = null;

export const setGlobalToast = (toast: ReturnType<typeof useToast>) => {
  globalToast = toast;
};

export const toast = {
  success: (title: string, description?: string) => globalToast?.showSuccess(title, description),
  error: (title: string, description?: string) => globalToast?.showError(title, description),
  info: (title: string, description?: string) => globalToast?.showInfo(title, description),
  like: (title?: string, description?: string) => globalToast?.showLike(title, description),
  comment: (title?: string, description?: string) => globalToast?.showComment(title, description),
  share: (title?: string, description?: string) => globalToast?.showShare(title, description),
  bookmark: (title?: string, description?: string) => globalToast?.showBookmark(title, description),
};