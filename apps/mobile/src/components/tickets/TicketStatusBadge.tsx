import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface TicketStatusBadgeProps {
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  style?: StyleProp<ViewStyle>;
}

export const TicketStatusBadge = ({
  status,
  style,
}: TicketStatusBadgeProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return colors.amber;
      case 'in-progress':
        return colors.primary;
      case 'completed':
        return colors.emerald;
      case 'cancelled':
        return colors.red;
      default:
        return colors.muted;
    }
  };

  const getStatusText = () => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
  };

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: getStatusColor() },
        style,
      ]}
    >
      <Text style={[
        styles.text,
        { color: '#FFFFFF' },
      ]}>
        {getStatusText()}
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
    fontSize: typography.sm,
    fontWeight: typography.medium as any,
  },
});