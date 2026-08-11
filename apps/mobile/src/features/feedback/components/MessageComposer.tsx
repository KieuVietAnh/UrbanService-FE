import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import Icon from '@expo/vector-icons/Feather';
import { semantics } from '@/theme/semantics';

export default function MessageComposer({
  onSend,
  sending,
  onFocus,
  onHeightChange,
}: {
  onSend: (text: string) => Promise<void> | void;
  sending?: boolean;
  onFocus?: () => void;
  onHeightChange?: (h: number) => void;
}) {
  const [text, setText] = useState('');

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await onSend(trimmed);
    // keep text if send failed; caller should clear on success
    setText('');
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height || 0;
    onHeightChange && onHeightChange(h);
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <TextInput
        style={styles.input}
        placeholder="Viết tin nhắn..."
        placeholderTextColor={semantics.text.lightMuted}
        value={text}
        onChangeText={setText}
        onFocus={() => onFocus && onFocus()}
        multiline
      />
      <Pressable
        onPress={handleSend}
        disabled={!text.trim() || sending}
        style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
      >
        <Icon name="send" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: semantics.border.default, backgroundColor: semantics.bg.surface },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: semantics.bg.surfaceSubtle, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'Geist-Regular', color: semantics.text.primary },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: semantics.bg.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: semantics.text.lightMuted },
});
