import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface AppBadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  style?: StyleProp<ViewStyle>;
}

export const AppBadge = ({
  children,
  variant = 'primary',
  style,
}: AppBadgeProps) => {
  const getVariantColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primary, text: '#FFFFFF' };
      case 'secondary':
        return { bg: colors.muted, text: '#FFFFFF' };
      case 'success':
        return { bg: colors.emerald, text: '#FFFFFF' };
      case 'danger':
        return { bg: colors.red, text: '#FFFFFF' };
      case 'warning':
        return { bg: colors.amber, text: '#FFFFFF' };
      case 'info':
        return { bg: colors.purple, text: '#FFFFFF' };
      default:
        return { bg: colors.primary, text: '#FFFFFF' };
    }
  };

  const { bg, text } = getVariantColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg },
        style,
      ]}
    >
      <Text style={[
        styles.text,
        { color: text },
      ]}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  text: {
    fontSize: typography.xs,
    fontWeight: typography.semibold as any,
  },
});