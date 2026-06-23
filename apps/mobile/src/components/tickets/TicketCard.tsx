import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface TicketCardProps {
  title: string;
  subtitle?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  imageUrl?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const TicketCard = ({
  title,
  subtitle,
  status,
  imageUrl,
  onPress,
  style,
}: TicketCardProps) => {
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

  return (
    <View
      style={[
        styles.container,
        style,
      ]}
    >
      {imageUrl && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot,
            { backgroundColor: getStatusColor() },
          ]} />
          <Text style={styles.statusText}>
            {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: typography.semibold as any,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.md,
    color: colors.muted,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: typography.sm,
    fontWeight: typography.medium as any,
    textTransform: 'capitalize',
  },
});