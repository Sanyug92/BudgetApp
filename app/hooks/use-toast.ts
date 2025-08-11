import React, { useRef, useCallback } from 'react';
import Toast from 'react-native-root-toast';

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'default';

type ToastOptions = {
  type?: ToastType;
  duration?: number;
  position?: number;
  animation?: boolean;
  shadow?: boolean;
  backgroundColor?: string;
  shadowColor?: string;
  textColor?: string;
  delay?: number;
  hideOnPress?: boolean;
  onShow?: () => void;
  onShown?: () => void;
  onHide?: () => void;
  onHidden?: () => void;
};

type ToastData = {
  id: string;
  message: string;
  options?: ToastOptions;
  hide: () => void;
};

const DEFAULT_OPTIONS: ToastOptions = {
  duration: Toast.durations.SHORT,
  position: Toast.positions.BOTTOM,
  animation: true,
  hideOnPress: true,
  shadow: true,
  delay: 0,
};

const useToast = () => {
  const toastRef = useRef<Toast | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    // Clear any pending hide timeout
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }

    // Hide current toast if exists
    if (toastRef.current) {
      Toast.hide(toastRef.current);
      toastRef.current = null;
    }

    // Merge default options with provided options
    const toastOptions: ToastOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    // Create and show new toast
    toastRef.current = Toast.show(message, {
      ...toastOptions,
      onHidden: () => {
        toastRef.current = null;
        options.onHidden?.();
      },
    });

    // Set timeout to automatically hide the toast
    if (toastOptions.duration && toastOptions.duration > 0) {
      hideTimeout.current = setTimeout(() => {
        hide();
      }, toastOptions.duration);
    }

    return {
      hide: () => hide(),
    };
  }, []);

  const hide = useCallback(() => {
    if (toastRef.current) {
      Toast.hide(toastRef.current);
      toastRef.current = null;
    }
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
  }, []);

  // Helper methods for different toast types
  const success = useCallback((message: string, options: ToastOptions = {}) => {
    return show(message, {
      ...options,
      backgroundColor: '#4CAF50',
      textColor: '#FFFFFF',
    });
  }, [show]);

  const error = useCallback((message: string, options: ToastOptions = {}) => {
    return show(message, {
      ...options,
      backgroundColor: '#F44336',
      textColor: '#FFFFFF',
    });
  }, [show]);

  const info = useCallback((message: string, options: ToastOptions = {}) => {
    return show(message, {
      ...options,
      backgroundColor: '#2196F3',
      textColor: '#FFFFFF',
    });
  }, [show]);

  const warning = useCallback((message: string, options: ToastOptions = {}) => {
    return show(message, {
      ...options,
      backgroundColor: '#FF9800',
      textColor: '#000000',
    });
  }, [show]);

  return {
    show,
    hide,
    success,
    error,
    info,
    warning,
  };
};

export default useToast;
