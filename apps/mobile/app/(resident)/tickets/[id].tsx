import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { TicketStatusBadge } from '@/components/ui/TicketStatusBadge';
import { TimelineStep } from '@/components/ui/TimelineStep';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { AppButton } from '@/components/ui/AppButton';
import { Skeleton } from '@/components/ui/AppSkeleton';
import { useToast } from '@/components/ui/Toast';
import { feedbackApi } from '@/services/api/feedbackApi';
import { messageApi, Message } from '@/services/api/messageApi';
import { colors } from '@/constants/theme';
import { TICKET_STATUS } from '@/constants/status';

// Maps API status history entries to TimelineStep states
const getStepStatus = (
  stepKey: string,
  currentStatus: string,
  histories: any[]
): 'done' | 'active' | 'pending' => {
  const ORDER = [
    'PENDING', 'PROCESSING', 'AWAITING_REVIEW', 'VERIFIED', 'RESOLVED', 'CLOSED',
  ];
  const currentIdx = ORDER.indexOf(currentStatus?.toUpperCase());
  const stepIdx = ORDER.indexOf(stepKey);
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
};

const TIMELINE_STEPS = [
  { key: 'PENDING', label: 'Đã gửi phản ánh', desc: 'Phản ánh của bạn đã được gửi đến UrbanMind.' },
  { key: 'PROCESSING', label: 'Đang xử lý', desc: 'Nhân viên đã tiếp nhận và đang xử lý.' },
  { key: 'AWAITING_REVIEW', label: 'Đang xem xét kết quả', desc: 'Kết quả xử lý đang được kiểm tra.' },
  { key: 'RESOLVED', label: 'Đã xử lý xong', desc: 'Vấn đề đã được giải quyết.' },
  { key: 'CLOSED', label: 'Đã đóng', desc: 'Phản ánh đã được đóng lại.' },
];

function MessageBubble({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  return (
    <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
      {!isOwn && (
        <Text style={styles.bubbleSender}>{msg.senderName}</Text>
      )}
      <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
        {msg.content}
      </Text>
      <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const [showMessages, setShowMessages] = useState(false);
  const [msgInput, setMsgInput] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['feedback', id],
    queryFn: () => feedbackApi.getById(id!),
    enabled: Boolean(id),
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['feedback-messages', id],
    queryFn: () => messageApi.getMessages(id!),
    enabled: Boolean(id) && showMessages,
    refetchInterval: showMessages ? 8000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => messageApi.sendMessage(id!, content),
    onSuccess: () => {
      setMsgInput('');
      qc.invalidateQueries({ queryKey: ['feedback-messages', id] });
    },
    onError: () => toast.error('Không thể gửi tin nhắn'),
  });

  const status = ticket?.status ?? 'PENDING';
  const createdAt = ticket?.createdAt
    ? new Date(ticket.createdAt).toLocaleString('vi-VN')
    : '';
  const attachments: any[] = ticket?.attachments ?? [];
  const histories: any[] = ticket?.statusHistories ?? [];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader showBack title="Chi tiết phản ánh" />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <Skeleton height={24} width="60%" />
          <Skeleton height={16} width="40%" />
          <Skeleton height={120} radius={16} />
          <Skeleton height={200} radius={16} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        showBack
        title="Chi tiết phản ánh"
        rightAction={
          <Pressable hitSlop={10} onPress={() => router.push('/(resident)/notifications' as any)}>
            <Icon name="bell" size={20} color={colors.text} />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* ─── Hero info ─── */}
        <View className="px-5 pt-4 pb-3">
          <View className="flex-row items-center gap-2 mb-2 flex-wrap">
            <Text className="text-xs font-sans-medium text-text-muted">
              #{ticket?.code ?? ticket?.feedbackCode ?? id}
            </Text>
            <TicketStatusBadge status={status} />
          </View>
          <Text className="text-xl font-sans-bold text-text mb-2" style={{ letterSpacing: -0.3 }}>
            {ticket?.title ?? '—'}
          </Text>
          <View className="flex-row items-center gap-1.5 mb-1">
            <Icon name="map-pin" size={13} color={colors.muted} />
            <Text className="text-sm text-text-muted flex-1">{ticket?.locationText ?? '—'}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Icon name="calendar" size={13} color={colors.muted} />
            <Text className="text-sm text-text-muted">{createdAt}</Text>
          </View>
        </View>

        {/* ─── Description ─── */}
        <AppCard className="mx-5 mb-4 p-4" shadow="sm">
          <Text className="text-xs font-sans-semibold text-text-muted uppercase tracking-wider mb-2">
            Mô tả
          </Text>
          <Text className="text-sm text-text leading-relaxed">
            {ticket?.description ?? 'Không có mô tả.'}
          </Text>
        </AppCard>

        {/* ─── Evidence gallery ─── */}
        {attachments.length > 0 && (
          <View className="mb-4">
            <Text className="px-5 text-xs font-sans-semibold text-text-muted uppercase tracking-wider mb-2">
              Hình ảnh đính kèm
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
              {attachments.map((a: any, i: number) => (
                <Image
                  key={i}
                  source={{ uri: a.fileUrl ?? a.url }}
                  style={styles.galleryImage}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── Timeline ─── */}
        <View className="mx-5 mb-4">
          <Text className="text-xs font-sans-semibold text-text-muted uppercase tracking-wider mb-4">
            Tiến trình xử lý
          </Text>
          {TIMELINE_STEPS.map((step, i) => {
            const stepStatus = getStepStatus(step.key, status, histories);
            const histEntry = histories.find(
              (h: any) => h.status?.toUpperCase() === step.key
            );
            const ts = histEntry?.createdAt
              ? new Date(histEntry.createdAt).toLocaleString('vi-VN')
              : undefined;

            return (
              <TimelineStep
                key={step.key}
                title={step.label}
                description={stepStatus !== 'pending' ? (histEntry?.note ?? step.desc) : step.desc}
                timestamp={ts}
                status={stepStatus}
                isLast={i === TIMELINE_STEPS.length - 1}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* ─── Bottom action bar ─── */}
      <View style={styles.bottomBar}>
        <AppButton
          variant="outline"
          size="md"
          leftIcon={<Icon name="message-circle" size={16} color={colors.primary} style={{ marginRight: 4 }} />}
          onPress={() => setShowMessages(true)}
          className="flex-1"
        >
          Nhắn tin
        </AppButton>
        {status === TICKET_STATUS.RESOLVED && (
          <AppButton
            variant="primary"
            size="md"
            className="flex-1"
            onPress={() => {
              // Navigate to review (rework from web)
              router.push(`/(resident)/tickets/${id}/review` as any);
            }}
          >
            Đánh giá
          </AppButton>
        )}
      </View>

      {/* ─── Messages bottom sheet ─── */}
      <BottomSheet
        visible={showMessages}
        onClose={() => setShowMessages(false)}
        snapPoint={560}
      >
        <View style={styles.msgHeader}>
          <Text className="text-base font-sans-bold text-text">Nhắn tin với nhân viên</Text>
          <Pressable onPress={() => setShowMessages(false)} hitSlop={10}>
            <Icon name="x" size={18} color={colors.muted} />
          </Pressable>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Icon name="message-circle" size={36} color="#CBD5E1" />
              <Text className="text-sm text-text-muted mt-3 text-center">
                Chưa có tin nhắn nào.{'\n'}Gửi câu hỏi cho nhân viên phụ trách.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <MessageBubble msg={item} isOwn={item.senderRole === 'SERVICE_USER'} />
          )}
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.msgInputRow}>
            <TextInput
              style={styles.msgInput}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={colors.lightMuted}
              value={msgInput}
              onChangeText={setMsgInput}
              multiline
            />
            <Pressable
              onPress={() => msgInput.trim() && sendMutation.mutate(msgInput.trim())}
              disabled={!msgInput.trim() || sendMutation.isPending}
              style={[styles.sendBtn, (!msgInput.trim()) && styles.sendBtnDisabled]}
            >
              <Icon name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  gallery: { paddingHorizontal: 20, gap: 10 },
  galleryImage: {
    width: 160,
    height: 120,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  msgInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  msgInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: '#0F172A',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleSender: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 11,
    color: colors.muted,
    marginBottom: 3,
  },
  bubbleText: {
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  bubbleTextOwn: { color: '#FFFFFF' },
  bubbleTime: {
    fontFamily: 'Geist-Regular',
    fontSize: 10,
    color: colors.lightMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeOwn: { color: 'rgba(255,255,255,0.65)' },
});
