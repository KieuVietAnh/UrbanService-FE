import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Message } from '../types/messaging.types';

interface Props {
  message: Message;
  isMine?: boolean;
}

export const MessageBubble: React.FC<Props> = ({ message, isMine }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [opacity]);

  return (
    <Animated.View style={[{ opacity }, styles.container, isMine ? styles.mine : styles.theirs]}>
      {message.content ? <Text style={styles.text}>{message.content}</Text> : null}
      {message.attachments?.length ? <Text style={styles.text}>[Attachment]</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.time}>{new Date(message.createdAt).toLocaleTimeString()}</Text>
        {message.status ? <Text style={styles.status}>{message.status}</Text> : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 6, maxWidth: '80%', padding: 10, borderRadius: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#0b93f6' },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#eee' },
  text: { color: '#000' },
  time: { fontSize: 10, color: '#666', marginTop: 6 },
  status: { fontSize: 10, color: '#666', marginLeft: 8, marginTop: 2 },
});

export default MessageBubble;
