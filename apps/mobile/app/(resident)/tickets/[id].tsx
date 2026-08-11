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
  Modal,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppBadge } from '@/components/ui/AppBadge';
import { TimelineStep } from '@/components/ui/TimelineStep';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { AppButton } from '@/components/ui/AppButton';
import { SkeletonCard, Skeleton } from '@/components/ui/AppSkeleton';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { useToast } from '@/components/ui/Toast';
import { feedbackApi } from '@/services/api/feedbackApi';
// Feedback chat moved to its own screen: /tickets/[id]/chat
import { semantics } from '@/theme/semantics';
import { managementTypes } from '@urbanmind/shared-types';
import { FloatingChatMenu } from '@/components/ui/FloatingChatMenu';
import { axiosClient } from '@urbanmind/shared-api';

const TICKET_STATUS = managementTypes.feedbackStatus;

const resolveMediaUrl = (value: any) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  const baseUrl = String(axiosClient.defaults.baseURL || 'https://api.urbanservice.me').replace(/\/$/, '');
  if (trimmed.startsWith('/')) {
    return `${baseUrl}${trimmed}`;
  }
  return `${baseUrl}/${trimmed}`;
};

const getAttachmentUrl = (attachment: any): string | null => {
  if (!attachment) return null;
  if (typeof attachment === 'string') return resolveMediaUrl(attachment);
  if (Array.isArray(attachment)) return getAttachmentUrl(attachment[0]);

  const raw = [
    attachment.fileUrl,
    attachment.url,
    attachment.path,
    attachment.attachmentUrl,
    attachment.displayUrl,
    attachment.mediaUrl,
    attachment.publicUrl,
    attachment.downloadUrl,
    attachment.imageUrl,
    attachment.thumbnailUrl,
    attachment.coverImageUrl,
    attachment.src,
    attachment.link,
    attachment.href,
  ].find((value) => typeof value === 'string' && value.trim());

  return resolveMediaUrl(raw);
};

const getTicketAttachmentCandidates = (ticket: any) => {
  if (!ticket) return [];
  const attachments = Array.isArray(ticket.attachments) ? ticket.attachments : [];
  const attachmentList = Array.isArray(ticket.attachmentList) ? ticket.attachmentList : [];
  const images = Array.isArray(ticket.images) ? ticket.images : [];
  const imageUrls = Array.isArray(ticket.imageUrls) ? ticket.imageUrls : [];
  const mediaUrls = Array.isArray(ticket.mediaUrls) ? ticket.mediaUrls : [];
  const media = Array.isArray(ticket.media) ? ticket.media : [];
  
  return [
    ...attachments,
    ...attachmentList,
    ...images,
    ...imageUrls,
    ...mediaUrls,
    ...media,
  ].filter(Boolean);
};

const normalizeStatusKey = (status: string | undefined | null) =>
  String(status ?? '').trim().replace(/[_\s]+/g, '').toUpperCase();

const getStepStatus = (
  stepKey: string,
  currentStatus: string
): 'done' | 'active' | 'pending' => {
  const ORDER = [
    'SUBMITTED',
    'AI_REVIEWED',
    'VERIFIED',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'SUBMITTED_FOR_APPROVAL',
    'APPROVED',
    'CLOSED',
  ];
  const normalizedCurrent = normalizeStatusKey(currentStatus);
  const normalizedStep = normalizeStatusKey(stepKey);
  const currentIdx = ORDER.indexOf(normalizedCurrent);
  const stepIdx = ORDER.indexOf(normalizedStep);
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
};

const TIMELINE_STEPS = [
  { key: 'SUBMITTED', label: 'Đã gửi phản ánh', desc: 'Phản ánh của bạn đã được tiếp nhận.' },
  { key: 'VERIFIED', label: 'Đã xác minh', desc: 'Phản ánh đã được kiểm tra tính hợp lệ.' },
  { key: 'ASSIGNED', label: 'Đã phân công', desc: 'Đơn vị chuyên trách đã nhận nhiệm vụ.' },
  { key: 'IN_PROGRESS', label: 'Đang xử lý', desc: 'Lực lượng chức năng đang tiến hành xử lý.' },
  { key: 'RESOLVED', label: 'Đã xử lý xong', desc: 'Vấn đề đã được khắc phục hoàn tất.' },
  { key: 'CLOSED', label: 'Hoàn thành & Đóng', desc: 'Phản ánh được xác nhận hoàn thành.' },
];

interface CommentItem {
  id: string;
  senderName: string;
  senderRole?: string;
  content: string;
  createdAt: string;
}

function CommentBubble({ msg, isOwn }: { msg: CommentItem; isOwn: boolean }) {
  const time = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
      {!isOwn && (
        <Text style={styles.bubbleSender}>{msg.senderName || 'Cán bộ xử lý'}</Text>
      )}
      <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
        {msg.content}
      </Text>
      <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
        {time}
      </Text>
    </View>
  );
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const feedbackId = id || '';

  // Fetch Ticket Details
  const {
    data: ticket,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['feedback', feedbackId],
    queryFn: () => feedbackApi.getById(feedbackId),
    enabled: Boolean(feedbackId),
  });

  // Fetch Comments
  const { data: comments = [] } = useQuery<CommentItem[]>({
    queryKey: ['feedback-comments', feedbackId],
    queryFn: async () => {
      const res = await feedbackApi.getComments(feedbackId);
      const items = Array.isArray(res) ? res : res?.items || [];
      return items.map((c: any) => ({
        id: String(c.commentId ?? c.id ?? Math.random()),
        senderName: c.authorName ?? c.userName ?? c.userFullName ?? 'Hệ thống',
        senderRole: c.authorRole ?? c.userRole ?? 'SERVICE_USER',
        content: c.content ?? c.text ?? '',
        createdAt: c.createdAt ?? new Date().toISOString(),
      }));
    },
    enabled: Boolean(feedbackId) && showComments,
    refetchInterval: showComments ? 6000 : false,
  });

  // Post Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: (content: string) => feedbackApi.addComment(feedbackId, content),
    onSuccess: () => {
      setCommentInput('');
      queryClient.invalidateQueries({ queryKey: ['feedback-comments', feedbackId] });
      toast.success('Đã gửi trao đổi');
    },
    onError: (err: any) => toast.error(err.message || 'Không thể gửi bình luận'),
  });

  // Message count for discussion card
  const { data: _messagesForCount = [] } = useQuery({
    queryKey: ['feedback-messages-count', feedbackId],
    queryFn: async () => {
      const res = await axiosClient.get(`/api/feedbacks/${feedbackId}/messages`, { params: { includeInternal: false } });
      const data = res?.data ?? res;
      return Array.isArray(data) ? data : (data?.items ?? []);
    },
    enabled: Boolean(feedbackId),
    staleTime: 1000 * 30,
  });

  const messageCount = Array.isArray(_messagesForCount) ? _messagesForCount.length : 0;

  const status = ticket?.status ?? 'SUBMITTED';
  const normalizedStatus = normalizeStatusKey(status);
  const createdAt = ticket?.createdAt
    ? new Date(ticket.createdAt).toLocaleString('vi-VN')
    : '';
  const attachmentUrls = getTicketAttachmentCandidates(ticket)
    .map(getAttachmentUrl)
    .filter((uri): uri is string => Boolean(uri));
  const histories: any[] = ticket?.statusHistories ?? [];

  const isResolvedOrApproval =
    normalizedStatus === normalizeStatusKey(TICKET_STATUS.RESOLVED) ||
    normalizedStatus === normalizeStatusKey(TICKET_STATUS.SUBMITTED_FOR_APPROVAL) ||
    normalizedStatus === normalizeStatusKey(TICKET_STATUS.APPROVED);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader showBack title="Chi tiết phản ánh" />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <Skeleton height={28} width="70%" />
          <Skeleton height={18} width="40%" />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isError && !isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader showBack title="Chi tiết phản ánh" />
        <AppErrorState onRetry={refetch}>
          {(error as any)?.message || 'Không thể tải thông tin phản ánh'}
        </AppErrorState>
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
            <Icon name="bell" size={20} color={semantics.text.primary} />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={semantics.text.brand}
          />
        }
      >
        <View style={styles.heroSection}>
          <View style={styles.statusHeaderRow}>
            <View style={styles.statusHeaderLeft}>
              <Text style={styles.codeText}>
                #{ticket?.code ?? ticket?.feedbackCode ?? feedbackId}
              </Text>
              <Text style={styles.titleText}>
                {ticket?.title ?? '—'}
              </Text>
            </View>
            <View style={styles.statusHeaderRight}>
              <AppBadge status={status} size="md" />
              {ticket?.priority && (
                <View style={styles.priorityBadgeWrap}>
                  <AppBadge priority={ticket.priority} variant="outline" size="sm" />
                </View>
              )}
            </View>
          </View>

          <View style={styles.metaRow}>
            <Icon name="map-pin" size={13} color={semantics.text.muted} />
            <Text style={styles.metaText}>{ticket?.locationText ?? 'Không rõ vị trí'}</Text>
          </View>

          <View style={styles.metaRow}>
            <Icon name="calendar" size={13} color={semantics.text.muted} />
            <Text style={styles.metaText}>{createdAt}</Text>
          </View>
        </View>

        <View style={styles.cardWrap}>
          <AppCard shadow="sm">
            <View style={styles.cardContent}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>Ticket Summary</Text>
                <View style={styles.liveChip}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveChipText}>Live</Text>
                </View>
              </View>
              <Text style={styles.descriptionText}>
                {ticket?.description ?? 'Không có mô tả chi tiết.'}
              </Text>
            </View>
          </AppCard>
        </View>

        <View style={styles.metricsGrid}>
          <AppCard shadow="sm">
            <View style={styles.metricCardContent}>
              <View style={styles.metricHeader}>
                <Icon name="clock" size={14} color={semantics.text.brand} />
                <Text style={styles.metricTitle}>SLA Countdown</Text>
              </View>
              <Text style={styles.slaValue}>{ticket?.slaRemaining ?? '24h'}</Text>
              <Text style={styles.metricSub}>Còn lại cho xử lý</Text>
            </View>
          </AppCard>
          <AppCard shadow="sm">
            <View style={styles.metricCardContent}>
              <View style={styles.metricHeader}>
                <Icon name="flag" size={14} color={semantics.text.brand} />
                <Text style={styles.metricTitle}>Priority</Text>
              </View>
              <Text style={styles.priorityValue}>{ticket?.priority ?? 'Medium'}</Text>
              <Text style={styles.metricSub}>Độ ưu tiên phản ánh</Text>
            </View>
          </AppCard>
        </View>

        <View style={styles.cardWrap}>
          <AppCard shadow="sm">
            <View style={styles.cardContent}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>Assigned Unit</Text>
                <View style={styles.unitBadge}>
                  <Icon name="briefcase" size={12} color={semantics.text.brand} />
                  <Text style={styles.unitBadgeText}>Đơn vị phụ trách</Text>
                </View>
              </View>
              <View style={styles.unitBody}>
                <View style={styles.unitIconWrap}>
                  <Icon name="building" size={22} color={semantics.text.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.unitTitle}>{ticket?.assignedUnit ?? ticket?.unitName ?? 'Đơn vị chưa phân công'}</Text>
                  <Text style={styles.unitSubtitle}>{ticket?.assigneeName ?? 'Chưa có cán bộ xử lý'}</Text>
                </View>
                <View style={styles.unitStatus}>
                  <Icon name="check-circle" size={14} color="#10B981" />
                  <Text style={styles.unitStatusText}>Online</Text>
                </View>
              </View>
            </View>
          </AppCard>
        </View>

        {attachmentUrls.length > 0 && (
          <View style={styles.attachmentSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Attachments</Text>
              <Text style={styles.sectionCounter}>({attachmentUrls.length})</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gallery}
            >
              {attachmentUrls.map((imgUri, i) => (
                <Pressable key={i} onPress={() => setSelectedImage(imgUri)}>
                  <Image source={{ uri: imgUri }} style={styles.galleryImage} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <Pressable onPress={() => setShowComments(true)} style={styles.discussionPill}>
          <Icon name="message-circle" size={12} color={semantics.text.brand} />
          <Text style={styles.discussionPillText}>Discussion</Text>
        </Pressable>

        {TIMELINE_STEPS.map((step, i) => {
          const stepStatus = getStepStatus(step.key, status);
          const histEntry = histories.find(
            (h: any) => normalizeStatusKey(h.status) === normalizeStatusKey(step.key)
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
        {/* Discussion Card (opens dedicated chat screen) */}
        <View style={styles.cardWrap}>
          <AppCard shadow="sm">
            <View style={styles.cardContent}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>💬 Thảo luận ({messageCount})</Text>
              </View>

              <Text style={styles.descriptionText}>Trao đổi với nhân viên phụ trách phản ánh</Text>

              <View style={{ marginTop: 12 }}>
                <AppButton
                  variant="primary"
                  onPress={() => router.push(`/(resident)/tickets/${feedbackId}/chat` as any)}
                >
                  Mở cuộc trò chuyện
                </AppButton>
              </View>
            </View>
          </AppCard>
        </View>
    </ScrollView>

      {/* Resolution Review Card / Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <AppButton
            variant="outline"
            size="md"
            fullWidth
            leftIcon={<Icon name="message-circle" size={16} color={semantics.text.brand} style={{ marginRight: 6 }} />}
            onPress={() => setShowComments(true)}
          >
            Trao đổi
          </AppButton>
        </View>

        {isResolvedOrApproval && (
          <View style={{ flex: 1 }}>
            <AppButton
              variant="primary"
              size="md"
              fullWidth
              onPress={() => router.push(`/(resident)/tickets/${feedbackId}/review` as any)}
              leftIcon={<Icon name="star" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />}
            >
              Đánh giá kết quả
            </AppButton>
          </View>
        )}
      </View>

      {/* Discussion Bottom Sheet */}
      <BottomSheet
        visible={showComments}
        onClose={() => setShowComments(false)}
        snapPoint={560}
      >
        <View style={styles.msgHeader}>
          <Text style={styles.msgHeaderTitle}>Trao đổi với cán bộ xử lý</Text>
          <Pressable onPress={() => setShowComments(false)} hitSlop={10}>
            <Icon name="x" size={20} color={semantics.text.primary} />
          </Pressable>
        </View>

        <FlatList
          data={comments}
          keyExtractor={(m) => m.id}
          style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingVertical: 12, gap: 10 }}
          ListEmptyComponent={
            <AppEmptyState
              icon={<Icon name="message-circle" size={40} color={semantics.text.lightMuted} />}
            >
              Chưa có bình luận trao đổi nào.{'\n'}Gửi câu hỏi hoặc phản hồi cho cán bộ phụ trách.
            </AppEmptyState>
          }
          renderItem={({ item }) => (
            <CommentBubble
              msg={item}
              isOwn={item.senderRole === 'SERVICE_USER' || item.senderRole === 'service-user'}
            />
          )}
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.msgInputRow}>
            <TextInput
              style={styles.msgInput}
              placeholder="Nhập nội dung trao đổi..."
              placeholderTextColor={semantics.text.lightMuted}
              value={commentInput}
              onChangeText={setCommentInput}
              multiline
            />
            <Pressable
              onPress={() => commentInput.trim() && addCommentMutation.mutate(commentInput.trim())}
              disabled={!commentInput.trim() || addCommentMutation.isPending}
              style={[
                styles.sendBtn,
                !commentInput.trim() && styles.sendBtnDisabled,
              ]}
            >
              <Icon name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>

      {/* Image Zoom Modal */}
      <Modal visible={Boolean(selectedImage)} transparent animationType="fade">
        <View style={styles.imageModalBackdrop}>
          <Pressable onPress={() => setSelectedImage(null)} style={styles.imageModalClose} hitSlop={12}>
            <Icon name="x" size={24} color="#FFFFFF" />
          </Pressable>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: semantics.bg.app },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: semantics.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: semantics.border.default,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  statusHeaderLeft: {
    flex: 1,
  },
  statusHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  priorityBadgeWrap: {
    marginTop: 4,
  },
  codeText: {
    fontSize: 12,
    fontFamily: 'Geist-Medium',
    color: semantics.text.muted,
    marginBottom: 8,
  },
  titleText: {
    fontSize: 22,
    fontFamily: 'Geist-Bold',
    color: semantics.text.primary,
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Geist-Regular',
    color: semantics.text.muted,
    flex: 1,
  },
  cardWrap: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  cardContent: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontFamily: 'Geist-SemiBold',
    color: semantics.text.lightMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#DCFCE7',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#10B981',
  },
  liveChipText: {
    fontSize: 10,
    fontFamily: 'Geist-SemiBold',
    color: '#047857',
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    color: semantics.text.primary,
    lineHeight: 22,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  metricCardContent: {
    padding: 14,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metricTitle: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 11,
    color: semantics.text.lightMuted,
    textTransform: 'uppercase',
  },
  slaValue: {
    fontFamily: 'Geist-Bold',
    fontSize: 24,
    color: semantics.text.primary,
    letterSpacing: -0.3,
  },
  priorityValue: {
    fontFamily: 'Geist-Bold',
    fontSize: 20,
    color: semantics.text.primary,
  },
  metricSub: {
    fontFamily: 'Geist-Regular',
    fontSize: 11,
    color: semantics.text.muted,
    marginTop: 4,
  },
  attachmentSection: {
    marginTop: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Geist-SemiBold',
    color: semantics.text.lightMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionCounter: {
    fontSize: 11,
    fontFamily: 'Geist-SemiBold',
    color: semantics.text.muted,
  },
  gallery: {
    paddingHorizontal: 20,
    gap: 10,
  },
  galleryImage: {
    width: 160,
    height: 120,
    borderRadius: 14,
    backgroundColor: semantics.bg.surfaceSubtle,
  },
  timelineSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  discussionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  discussionPillText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 11,
    color: semantics.text.brand,
  },
  unitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  unitBadgeText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 10,
    color: semantics.text.brand,
  },
  unitBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unitIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: semantics.bg.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitTitle: {
    fontFamily: 'Geist-Bold',
    fontSize: 14,
    color: semantics.text.primary,
  },
  unitSubtitle: {
    fontFamily: 'Geist-Regular',
    fontSize: 11,
    color: semantics.text.muted,
    marginTop: 3,
  },
  unitStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },
  unitStatusText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 10,
    color: '#047857',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: semantics.bg.surface,
    borderTopWidth: 1,
    borderTopColor: semantics.border.default,
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: semantics.border.default,
  },
  msgHeaderTitle: {
    fontSize: 16,
    fontFamily: 'Geist-Bold',
    color: semantics.text.primary,
  },
  msgInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: semantics.border.default,
  },
  msgInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: semantics.bg.surfaceSubtle,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: semantics.text.primary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: semantics.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: semantics.text.lightMuted,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: {
    backgroundColor: semantics.bg.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: semantics.bg.surfaceSubtle,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleSender: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 11,
    color: semantics.text.muted,
    marginBottom: 3,
  },
  bubbleText: {
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: semantics.text.primary,
    lineHeight: 20,
  },
  bubbleTextOwn: {
    color: semantics.text.inverse,
  },
  bubbleTime: {
    fontFamily: 'Geist-Regular',
    fontSize: 10,
    color: semantics.text.lightMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
});
