import React, { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/Feather';
import { Conversation } from '../types/messaging.types';

interface Props {
  conversation: Conversation;
  onPress?: (id: string) => void;
}

export const ConversationItem: React.FC<Props> = ({ conversation, onPress }) => {
  const [muted, setMuted] = useState(false);
  const [pinned, setPinned] = useState(false);
  return (
    <Pressable style={styles.row} onPress={() => onPress?.(conversation.id)}>
      <Image source={{ uri: conversation.avatarUrl || undefined }} style={styles.avatar} />
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>{conversation.title}</Text>
        <Text numberOfLines={1} style={styles.subtitle}>{conversation.lastMessage || ''}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={() => setPinned((v) => !v)} style={{ marginRight: 8 }}>
          <Icon name="thumbtack" size={16} color={pinned ? '#2563EB' : '#666'} />
        </Pressable>
        <Pressable onPress={() => setMuted((v) => !v)} style={{ marginRight: 8 }}>
          <Icon name={muted ? 'bell-off' : 'bell'} size={16} color={muted ? '#666' : '#2563EB'} />
        </Pressable>
        {conversation.unreadCount ? <View style={styles.badge}><Text style={styles.badgeText}>{conversation.unreadCount}</Text></View> : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ddd' },
  content: { flex: 1, marginLeft: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  badge: { backgroundColor: '#e53935', minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
});

export default ConversationItem;
