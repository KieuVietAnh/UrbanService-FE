import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/Feather';
import { Text } from './Text';
import { View } from 'react-native';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  show: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

const TOAST_CONFIG: Record<ToastType, { icon: any; bg: string; iconColor: string; textColor: string }> = {
  success: { icon: 'check-circle', bg: '#D1FAE5', iconColor: '#047857', textColor: '#047857' },
  error: { icon: 'x-circle', bg: '#FEE2E2', iconColor: '#DC2626', textColor: '#991B1B' },
  info: { icon: 'info', bg: '#EFF6FF', iconColor: '#0052CC', textColor: '#1D4ED8' },
  warning: { icon: 'alert-triangle', bg: '#FEF3C7', iconColor: '#D97706', textColor: '#92400E' },
};

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const config = TOAST_CONFIG[item.type];

  React.useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 200 });

    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 250 });
      translateY.value = withSpring(-80, { damping: 18, stiffness: 300 }, () => {
        runOnJS(onDismiss)(item.id);
      });
    }, item.duration ?? 3000);

    return () => clearTimeout(timer);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: config.bg, top: insets.top + 12 },
        style,
      ]}
    >
      <Icon name={config.icon} size={18} color={config.iconColor} />
      <Text style={[styles.toastText, { color: config.textColor }]}>
        {item.message}
      </Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = String(++counter.current);
    setToasts((prev) => [...prev.slice(-2), { id, type, message, duration }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    show,
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  toastText: {
    flex: 1,
    fontFamily: 'Geist-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ToastProvider;
