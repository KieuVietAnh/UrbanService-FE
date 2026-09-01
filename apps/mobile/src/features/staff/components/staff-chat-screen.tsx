import React, { useCallback, useRef, useState } from 'react';
import { FlatList, ScrollView, Switch, View, useWindowDimensions } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { staffApi, staffError, staffKeys } from '../staff-api';
import { formatDate, type StaffMessage } from '../staff-models';
import { Button, colors, contentStyle, Field, Label, Notice, QueryState } from './staff-ui';
import { useStaffContentInsets } from './staff-scroll-view';

export function StaffChatScreen() {
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const id = typeof routeId === 'string' ? routeId : '';
  const userId = useAuthStore((state) => state.user?.id || '');
  const cache = useQueryClient();
  const list = useRef<FlatList<StaffMessage>>(null);
  const composer = useRef<ScrollView>(null);
  const inputTop = useRef(0);
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  // FlatList has a large intrinsic content size. Give the composer a guarded
  // share of the viewport so Yoga shrinks the scrollable message area first,
  // while still allowing the fields themselves to scroll on short/IME layouts.
  const composerMinHeight = Math.max(120, Math.min(keyboardVisible ? 240 : 320, viewportHeight * (keyboardVisible ? 0.42 : 0.44)));
  const composerActionHeight = 72 + (keyboardVisible ? 0 : insets.bottom);
  const layout = useStaffContentInsets({ bottomSafeArea: 'never' });
  // Keep drafts separate by Report and audience: an internal note must never
  // become a public reply merely because the audience switch was toggled.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [internal, setInternal] = useState(false);
  const [focused, setFocused] = useState(false);
  const [sent, setSent] = useState(false);
  const draftKey = `${userId}:${id}:${internal ? 'internal' : 'public'}`;
  const message = drafts[draftKey] || '';
  const query = useQuery({ queryKey: staffKeys.messages(userId, id), queryFn: ({ signal }) => staffApi.messages(id, signal), retry: 1, refetchInterval: focused ? 15000 : false });
  useFocusEffect(useCallback(() => { setFocused(true); void query.refetch(); return () => setFocused(false); }, [query.refetch]));
  const mutation = useMutation({
    mutationFn: (payload: { text: string; internal: boolean }) => staffApi.sendMessage(id, payload.text, payload.internal),
    onSuccess: async (_, payload) => {
      const sentKey = `${userId}:${id}:${payload.internal ? 'internal' : 'public'}`;
      setDrafts((current) => ({ ...current, [sentKey]: '' })); setSent(true);
      await cache.invalidateQueries({ queryKey: staffKeys.messages(userId, id) });
      list.current?.scrollToEnd({ animated: true });
    },
  });
  return <>
    <Stack.Screen options={{ title: 'Trao đổi phản ánh' }} />
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} style={{ flex: 1, minHeight: 0, backgroundColor: colors.background }}>
      <FlatList ref={list} style={{ flex: 1, minHeight: 48 }} data={query.data || []} keyExtractor={(item, index) => item.id || `${item.createdAt}-${index}`} {...layout} contentContainerStyle={[contentStyle, layout.contentContainerStyle, { gap: 12, paddingBottom: 20 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }}
        ListHeaderComponent={<QueryState pending={query.isPending} error={query.error} empty={!query.isPending && !query.error && !query.data?.length && 'Chưa có trao đổi. Bạn có thể gửi phản hồi đầu tiên.'} retry={() => { void query.refetch(); }} />}
        renderItem={({ item }) => <View style={{ alignSelf: item.senderId === userId ? 'flex-end' : 'flex-start', maxWidth: '94%', minWidth: 0, padding: 16, gap: 6, borderRadius: 16, borderBottomRightRadius: item.senderId === userId ? 4 : 16, borderBottomLeftRadius: item.senderId === userId ? 16 : 4, backgroundColor: item.internal ? colors.amberLight : item.senderId === userId ? colors.primarySoft : colors.surface, borderWidth: 1, borderColor: item.internal ? colors.amber : colors.border }}>
          <Label bold size={12}>{item.sender}{item.internal ? ' · Nội bộ' : ''}</Label><Label>{item.text}</Label><Label muted size={12}>{formatDate(item.createdAt)}</Label>
        </View>}
      />
      {/* The action remains sticky and reachable; only the composer fields
          scroll when a small window, large text or IME reduces available room. */}
      <View style={{ flexGrow: 0, flexShrink: 1, minHeight: composerMinHeight, maxHeight: '82%', backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border }}>
      <ScrollView ref={composer} style={{ flex: 1, minHeight: 0 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} automaticallyAdjustKeyboardInsets={false} contentContainerStyle={{ paddingLeft: layout.contentContainerStyle.paddingLeft, paddingRight: layout.contentContainerStyle.paddingRight, paddingTop: 14, paddingBottom: 12 + composerActionHeight, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1 }}><Label bold size={14}>{internal ? 'Ghi chú nội bộ' : 'Gửi cho người dân'}</Label><Label muted size={12}>{internal ? 'Chỉ nhân sự nội bộ được xem.' : 'Người dân sẽ đọc được tin nhắn này.'}</Label></View><Switch accessibilityLabel="Ghi chú nội bộ" value={internal} onValueChange={(value) => { setInternal(value); setSent(false); mutation.reset(); }} disabled={mutation.isPending} trackColor={{ true: colors.primary, false: colors.border }} /></View>
        <View onLayout={(event) => { inputTop.current = event.nativeEvent.layout.y; }}><Field label={internal ? 'Nội dung ghi chú' : 'Nội dung phản hồi'} multiline value={message} onFocus={() => composer.current?.scrollTo({ y: inputTop.current, animated: false })} onChangeText={(text) => { setDrafts((current) => ({ ...current, [draftKey]: text })); setSent(false); }} editable={!mutation.isPending} maxLength={4000} style={{ minHeight: 72, maxHeight: 160 }} /></View>
        {mutation.error && <Notice error>{staffError(mutation.error)} Nội dung vẫn được giữ để bạn gửi lại.</Notice>}
        {sent && <Label muted size={12}>Đã gửi thành công.</Label>}
      </ScrollView>
      <View style={{ position: 'absolute', zIndex: 2, elevation: 2, left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, paddingLeft: layout.contentContainerStyle.paddingLeft, paddingRight: layout.contentContainerStyle.paddingRight, paddingTop: 10, paddingBottom: 10 + (keyboardVisible ? 0 : insets.bottom) }}><Button label={internal ? 'Lưu ghi chú nội bộ' : 'Gửi phản hồi'} disabled={!message.trim() || query.isError || query.isPending} busy={mutation.isPending} onPress={() => mutation.mutate({ text: message, internal })} /></View>
      </View>
    </KeyboardAvoidingView>
  </>;
}
