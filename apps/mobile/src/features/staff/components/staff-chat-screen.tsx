import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, Switch, TextInput, View, useWindowDimensions } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { KeyboardAwareComposerLayout } from '@/components/layouts';
import { staffApi, staffError, staffKeys } from '../staff-api';
import { getStaffLineHeight } from '../staff-layout';
import { formatDate, type StaffMessage } from '../staff-models';
import { colors, contentStyle, Label, QueryState, StaffIcon } from './staff-ui';
import { useStaffContentInsets } from './staff-scroll-view';

const MESSAGE_POLL_INTERVAL_MS = 2000;

function dedupeMessages(items: StaffMessage[]) {
  const persisted = new Set<string>();

  return items.filter((item) => {
    if (!item.id || item.id.startsWith('temp-')) return true;
    if (persisted.has(item.id)) return false;
    persisted.add(item.id);
    return true;
  });
}

export function StaffChatScreen() {
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const id = typeof routeId === 'string' ? routeId : '';
  const currentUser = useAuthStore((state) => state.user);
  const userId = currentUser?.id || '';
  const cache = useQueryClient();
  const list = useRef<FlatList<StaffMessage>>(null);
  const { fontScale } = useWindowDimensions();
  const layout = useStaffContentInsets({ bottomSafeArea: 'never' });
  // Keep drafts separate by Report and audience: an internal note must never
  // become a public reply merely because the audience switch was toggled.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [internal, setInternal] = useState(false);
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [sent, setSent] = useState(false);
  const draftKey = `${userId}:${id}:${internal ? 'internal' : 'public'}`;
  const message = drafts[draftKey] || '';
  const queryKey = useMemo(() => staffKeys.messages(userId, id), [id, userId]);
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const remoteMessages = await staffApi.messages(id, signal);
      const cachedMessages = cache.getQueryData<StaffMessage[]>(queryKey) || [];
      const optimisticMessages = cachedMessages.filter((item) => item.id.startsWith('temp-'));
      return dedupeMessages([...remoteMessages, ...optimisticMessages]);
    },
    enabled: Boolean(id && userId && focused && appActive),
    retry: 1,
    refetchInterval: focused && appActive ? MESSAGE_POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    staleTime: 1000,
  });

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppActive(nextState === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!id || !userId || !focused || !appActive) return;
    void cache.refetchQueries({ queryKey, type: 'active' });
  }, [appActive, cache, focused, id, queryKey, userId]);

  useEffect(() => {
    if (!query.data?.length) return undefined;
    const timer = setTimeout(() => list.current?.scrollToEnd({ animated: true }), 150);
    return () => clearTimeout(timer);
  }, [query.data?.length]);

  const mutation = useMutation({
    mutationFn: (payload: { text: string; internal: boolean }) => staffApi.sendMessage(id, payload.text, payload.internal),
    onMutate: async (payload) => {
      await cache.cancelQueries({ queryKey });
      const previous = cache.getQueryData<StaffMessage[]>(queryKey) || [];
      const tempId = `temp-${Date.now()}`;
      const optimistic: StaffMessage = {
        id: tempId,
        text: payload.text.trim(),
        sender: currentUser?.fullName || 'Bạn',
        senderId: userId,
        internal: payload.internal,
        createdAt: new Date().toISOString(),
      };
      cache.setQueryData<StaffMessage[]>(queryKey, dedupeMessages([...previous, optimistic]));
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80);
      return { previous, tempId };
    },
    onSuccess: async (serverMessage, payload, context) => {
      const sentKey = `${userId}:${id}:${payload.internal ? 'internal' : 'public'}`;
      setDrafts((current) => ({ ...current, [sentKey]: '' }));
      setSent(true);
      cache.setQueryData<StaffMessage[]>(queryKey, (current = []) => {
        const withoutTemporary = current.filter((item) => item.id !== context?.tempId);
        return serverMessage.id
          ? dedupeMessages([...withoutTemporary, serverMessage])
          : withoutTemporary;
      });
      await cache.invalidateQueries({ queryKey });
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) cache.setQueryData(queryKey, context.previous);
    },
  });

  const refreshManually = async () => {
    setManualRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  return <>
    <Stack.Screen options={{ title: 'Trao đổi phản ánh' }} />
    <KeyboardAwareComposerLayout
      avoidContentOverlap
      style={{ backgroundColor: colors.background }}
      composer={<View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: layout.contentContainerStyle.paddingLeft, paddingTop: 9, paddingBottom: 9, gap: 8 }}>
        <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Label bold size={13}>{internal ? 'Ghi chú nội bộ' : 'Gửi cho người dân'}</Label>
            <Label muted size={11}>{internal ? 'Chỉ nhân sự nội bộ được xem.' : 'Người dân sẽ đọc được tin nhắn này.'}</Label>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: focused && appActive ? colors.emeraldDark : colors.muted }} />
              <Label muted size={10}>{focused && appActive ? 'Tự động cập nhật' : 'Tạm dừng khi chạy nền'}</Label>
            </View>
          </View>
          <Switch accessibilityLabel="Ghi chú nội bộ" value={internal} onValueChange={(value) => { setInternal(value); setSent(false); mutation.reset(); }} disabled={mutation.isPending} trackColor={{ true: colors.primary, false: colors.border }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <TextInput
            accessibilityLabel={internal ? 'Nội dung ghi chú' : 'Nội dung phản hồi'}
            multiline
            placeholder={internal ? 'Ghi chú cho nội bộ…' : 'Viết phản hồi cho người dân…'}
            placeholderTextColor={colors.muted}
            selectionColor={colors.primary}
            value={message}
            onFocus={() => { setInputFocused(true); setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80); }}
            onBlur={() => setInputFocused(false)}
            onChangeText={(text) => { setDrafts((current) => ({ ...current, [draftKey]: text })); setSent(false); }}
            editable={!mutation.isPending}
            maxLength={4000}
            style={{ flex: 1, minWidth: 0, minHeight: 48, maxHeight: 120, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderCurve: 'continuous', borderWidth: 1, borderColor: inputFocused ? colors.primary : colors.borderStrong, backgroundColor: colors.borderLight, color: colors.text, fontFamily: 'Geist-Regular', fontSize: 15, lineHeight: getStaffLineHeight({ fontSize: 15, fontScale }), textAlignVertical: 'center' }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={internal ? 'Lưu ghi chú nội bộ' : 'Gửi phản hồi'}
            accessibilityState={{ disabled: !message.trim() || query.isError || query.isPending || mutation.isPending, busy: mutation.isPending }}
            disabled={!message.trim() || query.isError || query.isPending || mutation.isPending}
            onPress={() => mutation.mutate({ text: message, internal })}
            android_ripple={{ color: 'rgba(255,255,255,0.24)', borderless: true }}
            style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: !message.trim() || query.isError || query.isPending ? 0.45 : 1 }}
          >
            {mutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <StaffIcon name="send" size={20} color="#FFFFFF" />}
          </Pressable>
        </View>
        {mutation.error && <Label accessibilityRole="alert" size={12} style={{ color: colors.redDark }}>{staffError(mutation.error)} Nội dung vẫn được giữ để bạn gửi lại.</Label>}
        {sent && <Label muted size={12}>Đã gửi thành công.</Label>}
      </View>}
    >
      <FlatList ref={list} style={{ flex: 1, minHeight: 48 }} data={query.data || []} keyExtractor={(item, index) => item.id || `${item.createdAt}-${index}`} {...layout} contentContainerStyle={[contentStyle, layout.contentContainerStyle, { gap: 12, paddingBottom: 20 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        refreshing={manualRefreshing} onRefresh={() => { void refreshManually(); }}
        ListHeaderComponent={<QueryState pending={query.isPending} error={query.error} empty={!query.isPending && !query.error && !query.data?.length && 'Chưa có trao đổi. Bạn có thể gửi phản hồi đầu tiên.'} retry={() => { void query.refetch(); }} />}
        renderItem={({ item }) => <View style={{ alignSelf: item.senderId === userId ? 'flex-end' : 'flex-start', maxWidth: '94%', minWidth: 0, padding: 16, gap: 6, borderRadius: 16, borderBottomRightRadius: item.senderId === userId ? 4 : 16, borderBottomLeftRadius: item.senderId === userId ? 16 : 4, backgroundColor: item.internal ? colors.amberLight : item.senderId === userId ? colors.primarySoft : colors.surface, borderWidth: 1, borderColor: item.internal ? colors.amber : colors.border }}>
          <Label bold size={12}>{item.sender}{item.internal ? ' · Nội bộ' : ''}</Label><Label>{item.text}</Label><Label muted size={12}>{formatDate(item.createdAt)}</Label>
        </View>}
      />
    </KeyboardAwareComposerLayout>
  </>;
}
