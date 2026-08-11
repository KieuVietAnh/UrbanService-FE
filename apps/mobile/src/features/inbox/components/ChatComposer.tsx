import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native';

interface Props {
  onSend: (text: string) => void;
}

export const ChatComposer: React.FC<Props> = ({ onSend }) => {
  const [text, setText] = useState('');
  return (
    <View style={styles.container}>
      <TextInput value={text} onChangeText={setText} placeholder="Write a message" style={styles.input} />
      <Pressable style={styles.send} onPress={() => { if (text.trim()) { onSend(text.trim()); setText(''); } }}>
        <Text style={{ color: '#fff' }}>Send</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
  input: { flex: 1, padding: 10, backgroundColor: '#fff', borderRadius: 6, marginRight: 8, borderWidth: 1, borderColor: '#ddd' },
  send: { backgroundColor: '#007aff', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 6 },
});

export default ChatComposer;
