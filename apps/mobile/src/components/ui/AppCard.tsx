import React, { useRef } from 'react';
import { Pressable, PressableProps, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Shadow = 'none' | 'sm' | 'md' | 'lg';

interface AppCardProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  shadow?: Shadow;
  className?: string;
  pressable?: boolean;
}

export function AppCard({
  children,
  shadow = 'md',
  className = '',
  pressable = false,
  onPress,
  ...props
}: AppCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!pressable && !onPress) return;
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const isInteractive = pressable || Boolean(onPress);

  return (
    <AnimatedPressable
      style={[animatedStyle, shadowStyles[shadow]]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={!isInteractive}
      className={[
        'bg-surface rounded-2xl overflow-hidden',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

const shadowStyles = StyleSheet.create({
  none: {},
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 6,
  },
});

export default AppCard;