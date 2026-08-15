import React from 'react';
import { View, FlatList, Text } from 'react-native';
import ConversationItem from './conversation-item';
import { Conversation } from '../types/messaging.types';

interface Props {
  conversations?: Conversation[];
  loading?: boolean;
  onOpen?: (id: string) => void;
}

export const ConversationList: React.FC<Props> = ({ conversations = [], loading, onOpen }) => {
  if (loading) return <Text style={{ padding: 12 }}>Loading...</Text>;
  if (!conversations.length) return <Text style={{ padding: 12 }}>No conversations</Text>;

  return (
    <FlatList
      data={conversations}
      keyExtractor={(i, idx) => String(i?.id ?? idx)}
      renderItem={({ item }) => <ConversationItem conversation={item} onPress={onOpen} />}
    />
  );
};

export default ConversationList;
