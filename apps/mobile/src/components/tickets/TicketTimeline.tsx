import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface TicketTimelineProps {
  events: Array<{
    id: string;
    title: string;
    description?: string;
    date: string; // ISO date string
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  }>;
  style?: StyleProp<ViewStyle>;
}

export const TicketTimeline = ({
  events,
  style,
}: TicketTimelineProps) => {
  // Sort events by date descending (newest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <View style={[styles.container, style]}>
      {sortedEvents.map((event) => (
        <View key={event.id} style={styles.eventItem}>
          <View style={styles.eventDot}>
            <View style={[
              styles.eventDotInner,
              { backgroundColor: getStatusColor(event.status) },
            ]} />
          </View>
          <View style={styles.eventContent}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            {event.description && (
              <Text style={styles.eventDescription}>{event.description}</Text>
            )}
            <Text style={styles.eventDate}>
              {new Date(event.date).toLocaleString()}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const getStatusColor = (status: string) => {
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

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
    marginTop: 4,
  },
  eventDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: typography.md,
    fontWeight: typography.semibold as any,
    color: colors.text,
  },
  eventDescription: {
    fontSize: typography.sm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  eventDate: {
    fontSize: typography.xs,
    color: colors.lightMuted,
    marginTop: spacing.xs,
  },
});