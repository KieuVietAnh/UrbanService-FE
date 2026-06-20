import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface StaffStatCardProps {
  value: string | number;
  label: string;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const StaffStatCard = ({
  value,
  label,
  icon,
  style,
}: StaffStatCardProps) => {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.md,
    width: 24,
    height: 24,
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold as any,
    color: colors.text,
  },
  label: {
    fontSize: typography.md,
    color: colors.muted,
  },
});