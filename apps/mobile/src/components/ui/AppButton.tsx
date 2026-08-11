import React from 'react';
import {
  Pressable,
  PressableProps,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface AppButtonProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-primary active:bg-primary-dark',
  secondary: 'bg-primary-soft border border-primary',
  outline: 'bg-transparent border border-border-strong',
  ghost: 'bg-transparent',
  danger: 'bg-red',
};

const TEXT_CLASSES: Record<Variant, string> = {
  primary: 'text-text-inverse',
  secondary: 'text-primary',
  outline: 'text-text',
  ghost: 'text-primary',
  danger: 'text-text-inverse',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-9 px-4 rounded-lg gap-1.5',
  md: 'h-12 px-5 rounded-xl gap-2',
  lg: 'h-14 px-6 rounded-2xl gap-2',
};

const TEXT_SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function AppButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  onPress,
  className = '',
  ...props
}: AppButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = (event: any) => {
    if (loading || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(event);
  };

  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      style={animatedStyle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={isDisabled}
      className={[
        'flex-row items-center justify-center',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : 'self-start',
        isDisabled ? 'opacity-50' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#0052CC'}
        />
      ) : (
        <>
          {leftIcon}
          <Text
            className={[
              'font-sans-semibold text-center',
              TEXT_CLASSES[variant],
              TEXT_SIZE_CLASSES[size],
            ].join(' ')}
          >
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </AnimatedPressable>
  );
}

// Keep legacy API compat export
export default AppButton;