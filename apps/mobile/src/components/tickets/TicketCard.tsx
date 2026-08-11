import React from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle, Pressable } from 'react-native';
import { Text } from '../ui/Text';
import { AppBadge } from '../ui/AppBadge';
import { semantics } from '@/theme/semantics';

interface TicketCardProps {
  title: string;
  subtitle?: string;
  status: string;
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
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.container, style]}
    >
      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      )}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <AppBadge status={status} size="sm" />
        </View>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: semantics.bg.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: semantics.border.default,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: semantics.bg.surfaceSubtle,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Geist-SemiBold',
    color: semantics.text.primary,
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Geist-Regular',
    color: semantics.text.muted,
    marginTop: 4,
  },
});

export default TicketCard;
