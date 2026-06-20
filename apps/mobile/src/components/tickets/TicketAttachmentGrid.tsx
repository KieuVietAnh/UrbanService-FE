import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, radius, spacing } from '@/constants/theme';

interface TicketAttachmentGridProps {
  attachments: Array<{
    id: string;
    url: string;
    type: 'image' | 'video' | 'document';
    name?: string;
  }>;
  style?: StyleProp<ViewStyle>;
}

export const TicketAttachmentGrid = ({
  attachments,
  style,
}: TicketAttachmentGridProps) => {
  return (
    <View style={[styles.container, style]}>
      {attachments.length === 0 ? (
        <Text style={styles.emptyText}>No attachments</Text>
      ) : (
        <View style={styles.attachmentsContainer}>
          {attachments.map((attachment) => (
            <View key={attachment.id} style={styles.attachmentItem}>
              {attachment.type === 'image' ? (
                <Image
                  source={{ uri: attachment.url }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.fallbackIcon}>
                  {/* We'll show an icon based on type, but for now, just a placeholder */}
                  <Text style={styles.fallbackText}>
                    {attachment.type === 'video' ? '▶' : '📎'}
                  </Text>
                </View>
              )}
              {attachment.name && (
                <Text style={styles.attachmentName}>
                  {attachment.name}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
  },
  attachmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  attachmentItem: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackIcon: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  fallbackText: {
    fontSize: 24,
  },
  attachmentName: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white',
    textAlign: 'center',
    paddingVertical: 2,
    fontSize: 10,
  },
});