import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/Feather';
import { Text } from './Text';
import { colors } from '@/constants/theme';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  className?: string;
}

export function AppHeader({
  title,
  showBack = false,
  onBack,
  rightAction,
  transparent = false,
  className = '',
}: AppHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      className={[
        'flex-row items-center px-5 h-14',
        transparent ? 'bg-transparent' : 'bg-surface border-b border-border-light',
        className,
      ].join(' ')}
    >
      {showBack ? (
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={8}
        >
          <Icon name="arrow-left" size={20} color={colors.primary} />
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}

      {title ? (
        <Text className="flex-1 text-lg font-sans-semibold text-text text-center">
          {title}
        </Text>
      ) : (
        <View className="flex-1" />
      )}

      {rightAction ? (
        <View style={styles.rightSlot}>{rightAction}</View>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 36,
  },
  rightSlot: {
    width: 36,
    alignItems: 'flex-end',
  },
});

export default AppHeader;