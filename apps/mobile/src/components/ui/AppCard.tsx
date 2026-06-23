import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, radius, spacing } from '@/constants/theme';

interface AppCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const AppCard = ({ children, style }: AppCardProps) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});