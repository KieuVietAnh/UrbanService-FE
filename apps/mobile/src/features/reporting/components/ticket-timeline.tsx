import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { getStatusIntent } from '@urbanmind/shared-types';
import { Text } from '@/components/ui';
import { semantics } from '@/theme/semantics';

export interface TicketTimelineProps {
  events: Array<{
    id: string;
    title: string;
    description?: string;
    date: string;
    status: string;
  }>;
  style?: StyleProp<ViewStyle>;
}

export const TicketTimeline = ({ events, style }: TicketTimelineProps) => {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <View style={[styles.container, style]}>
      {sortedEvents.map((event, index) => {
        const intent = getStatusIntent(event.status) as keyof typeof semantics.intent;
        const token = semantics.intent[intent] ?? semantics.intent.neutral;
        const isLast = index === sortedEvents.length - 1;

        return (
          <View key={event.id} style={styles.eventItem}>
            <View style={styles.leftCol}>
              <View style={[styles.dot, { backgroundColor: token.dot }]} />
              {!isLast && <View style={styles.line} />}
            </View>
            <View style={styles.contentCol}>
              <Text style={styles.title}>{event.title}</Text>
              {event.description ? (
                <Text style={styles.description}>{event.description}</Text>
              ) : null}
              <Text style={styles.date}>{event.date}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  leftCol: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
    marginTop: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: semantics.border.light,
    marginTop: 4,
    minHeight: 28,
  },
  contentCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Geist-SemiBold',
    color: semantics.text.primary,
  },
  description: {
    fontSize: 13,
    fontFamily: 'Geist-Regular',
    color: semantics.text.secondary,
    marginTop: 2,
  },
  date: {
    fontSize: 11,
    fontFamily: 'Geist-Regular',
    color: semantics.text.lightMuted,
    marginTop: 4,
  },
});

export default TicketTimeline;
