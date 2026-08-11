import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Image, StyleSheet, TextInput, KeyboardAvoidingView, Platform, RefreshControl, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { SkeletonCard } from '@/components/ui/AppSkeleton';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { useToast } from '@/components/ui/Toast';
import { communityApi } from '@/services/api/communityApi';
import { feedbackApi } from '@/services/api/feedbackApi';
import { semantics } from '@/theme/semantics';

interface CommentItem {
  id: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const feedbackId = id || '';

  const [commentInput, setCommentInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const {
    data: item,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['community-detail', feedbackId],
    queryFn: () => communityApi.getFeedDetail(feedbackId),
    enabled: Boolean(feedbackId),
  });

  const comments = useMemo<CommentItem[]>(() => {
    if (!item) return [];
    const rawComments = Array.isArray(item?.comments)
      ? item.comments
      : Array.isArray(item?.commentList)
        ? item.commentList
        : [];

    return rawComments.map((c: any) => ({
      id: String(c.commentId ?? c.id ?? Math.random()),
      senderName: c.authorName ?? c.userName ?? c.userFullName ?? 'Cộng đồng',
      content: c.content ?? c.text ?? '',
      createdAt: c.createdAt ?? new Date().toISOString(),
    }));
  }, [item]);

  const supportMutation = useMutation({
    mutationFn: async () => {
      if (item?.isSupported) {
        await feedbackApi.unsupport(feedbackId);
        return { supported: false };
      }
      await feedbackApi.support(feedbackId);
      return { supported: true };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['community-detail', feedbackId], (prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          isSupported: result.supported,
          supportCount: Math.max(0, Number(prev.supportCount ?? 0) + (result.supported ? 1 : -1)),
        };
      });
      toast.success(result.supported ? 'Đã ủng hộ phản ánh' : 'Đã bỏ ủng hộ');
    },
    onError: (err: any) => toast.error(err.message || 'Không thể cập nhật hỗ trợ'),
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => feedbackApi.addComment(feedbackId, content),
    onSuccess: async () => {
      setCommentInput('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community-detail', feedbackId] }),
        queryClient.refetchQueries({ queryKey: ['community-detail', feedbackId] }),
      ]);
      toast.success('Đã gửi bình luận');
    },
    onError: (err: any) => toast.error(err.message || 'Không thể gửi bình luận'),
  });

  const attachments: any[] = item?.attachments ?? [];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader showBack title="Chi tiết cộng đồng" />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isError && !isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader showBack title="Chi tiết cộng đồng" />
        <AppErrorState onRetry={refetch}>Không thể tải thông tin phản ánh</AppErrorState>
      </SafeAreaView>
    );
  }

  const authorName = item?.authorName || item?.userName || 'Cộng đồng UrbanService';
  const createdAt = item?.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '';
  const evidenceImages = attachments.filter((attachment) => attachment?.fileUrl).map((attachment) => attachment.fileUrl);
  const statusLabel = item?.status ? String(item.status).replace(/([A-Z])/g, ' $1').trim() : 'Đang chờ xử lý';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader showBack title="Chi tiết cộng đồng" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={semantics.text.brand} />}
      >
        <AppCard shadow="sm" className="mt-4 mx-4">
          <View style={styles.heroTop}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.avatarBadge}>
                <Text className="text-sm font-sans-semibold text-white">{authorName.charAt(0).toUpperCase()}</Text>
              </View>

              <View style={styles.heroInfo}>
                <Text className="text-sm font-sans-semibold text-text">{authorName}</Text>
                <Text className="text-2xs text-text-muted mt-1">{createdAt}</Text>
              </View>

              <View style={styles.statusPill}>
                <Text className="text-2xs font-sans-semibold text-primary">{statusLabel}</Text>
              </View>
            </View>

            <View style={styles.heroTitleRow}>
              <Text className="text-xl font-sans-bold text-text">{item?.title ?? 'Không có tiêu đề'}</Text>
            </View>

            <Text className="text-sm text-text-muted mt-3">{item?.description ?? 'Không có mô tả.'}</Text>

            {evidenceImages[0] ? (
              <Image source={{ uri: evidenceImages[0] }} style={styles.heroImage} resizeMode="cover" />
            ) : null}

            <View style={styles.tagRow}>
              {item?.categoryName ? (
                <View style={styles.tagPill}>
                  <Text className="text-2xs font-sans-semibold text-primary">{item.categoryName}</Text>
                </View>
              ) : null}
              <View style={styles.tagPillAlt}>
                <Icon name="map-pin" size={12} color={semantics.text.muted} />
                <Text className="text-2xs text-text-muted" numberOfLines={1} style={styles.tagText}>
                  {item?.locationText ?? 'Vị trí chưa xác định'}
                </Text>
              </View>
            </View>
          </View>
        </AppCard>

        <AppCard shadow="sm" className="mx-4 mt-4">
          <View style={styles.supportSection}>
            <View>
              <Text className="text-2xs font-sans-semibold text-text-muted">Ủng hộ</Text>
              <Text className="text-xl font-sans-bold text-text mt-2">{item?.supportCount ?? 0}</Text>
            </View>
            <View>
              <Text className="text-2xs font-sans-semibold text-text-muted">Bình luận</Text>
              <Text className="text-xl font-sans-bold text-text mt-2">{item?.commentCount ?? 0}</Text>
            </View>
            <AppButton
              variant={item?.isSupported ? 'primary' : 'outline'}
              size="sm"
              onPress={() => supportMutation.mutate()}
              loading={supportMutation.isPending}
              leftIcon={<Icon name="thumbs-up" size={14} color={item?.isSupported ? '#FFFFFF' : semantics.text.brand} />}
            >
              {item?.isSupported ? 'Đã ủng hộ' : 'Ủng hộ'}
            </AppButton>
          </View>
        </AppCard>

        {evidenceImages.length > 0 && (
          <View style={styles.section}>
            <Text className="text-xs font-sans-semibold text-text-muted uppercase tracking-[0.3px] mb-3">Bằng chứng</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
              {evidenceImages.map((uri, index) => (
                <Pressable key={index} onPress={() => setSelectedImage(uri)} style={styles.galleryCard}>
                  <Image source={{ uri }} style={styles.galleryImage} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.commentSection}>
          <View style={styles.commentFilterRow}>
            <Text style={styles.filterTitle}>Tất cả bình luận</Text>
            

          </View>

          {comments.length === 0 ? (
            <AppEmptyState icon={<Icon name="message-circle" size={36} color={semantics.text.lightMuted} />}>
              Chưa có bình luận nào cho phản ánh này.
            </AppEmptyState>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentFeedCard}>
                <View style={styles.commentRow}>
                  <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>{String(comment.senderName || 'C').charAt(0).toUpperCase()}</Text>
                  </View>

                  <View style={styles.commentBody}>
                    <View style={styles.commentMetaRow}>
                      <Text style={styles.commentAuthorName}>{comment.senderName || 'Cộng đồng'}</Text>
                      <Text style={styles.commentTimeText}>
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                    </View>

                    <Text style={styles.commentText}>{comment.content}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 0}
        style={styles.composerHost}
      >
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Viết bình luận..."
            value={commentInput}
            onChangeText={setCommentInput}
            multiline
            placeholderTextColor={semantics.text.lightMuted}
          />
          <Pressable
            onPress={() => commentInput.trim() && addCommentMutation.mutate(commentInput.trim())}
            disabled={!commentInput.trim() || addCommentMutation.isPending}
            style={[styles.sendButton, (!commentInput.trim() || addCommentMutation.isPending) && styles.sendButtonDisabled]}
          >
            <Icon name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={Boolean(selectedImage)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable onPress={() => setSelectedImage(null)} style={styles.modalClose} hitSlop={12}>
            <Icon name="x" size={24} color="#FFFFFF" />
          </Pressable>
          {selectedImage ? <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: semantics.bg.app },
  hero: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: semantics.bg.surface,
  },
  title: {
    fontFamily: 'Geist-Bold',
    fontSize: 22,
    color: semantics.text.primary,
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: semantics.text.primary,
    lineHeight: 22,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontFamily: 'Geist-Regular',
    fontSize: 13,
    color: semantics.text.muted,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  scrollContent: {
    paddingBottom: 160,
  },
  heroTop: {
    padding: 20,
    backgroundColor: semantics.bg.surface,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: semantics.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    marginLeft: 6,
  },
  heroTitleRow: {
    marginTop: 16,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: semantics.bg.primarySoft,
  },
  supportCount: {
    fontFamily: 'Geist-Medium',
    fontSize: 13,
    color: semantics.text.muted,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  sectionTitle: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 12,
    color: semantics.text.lightMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    flexWrap: 'wrap',
  },
  tagPill: {
    borderRadius: 999,
    backgroundColor: semantics.bg.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagPillAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: semantics.bg.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    maxWidth: 180,
  },
  supportSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 20,
    backgroundColor: semantics.bg.surface,
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginTop: 14,
    backgroundColor: semantics.bg.surfaceSubtle,
  },
  gallery: {
    gap: 10,
    paddingVertical: 2,
  },
  galleryCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  galleryImage: {
    width: 180,
    height: 120,
    backgroundColor: semantics.bg.surfaceSubtle,
  },
  commentSection: {
    paddingHorizontal: 20,
    marginTop: 18,
    paddingBottom: 8,
  },
  commentFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  filterTitle: {
    fontFamily: 'Geist-Bold',
    fontSize: 16,
    color: semantics.text.primary,
  },
  commentFeedCard: {
    backgroundColor: semantics.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: semantics.border.default,
    paddingVertical: 12,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: semantics.bg.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: semantics.border.light,
  },
  avatarText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 13,
    color: semantics.text.primary,
  },
  commentBody: {
    flex: 1,
    paddingRight: 8,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentAuthorName: {
    fontFamily: 'Geist-Bold',
    fontSize: 13,
    color: semantics.text.primary,
  },
  commentTimeText: {
    fontFamily: 'Geist-Regular',
    fontSize: 11,
    color: semantics.text.muted,
  },
  commentText: {
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: semantics.text.primary,
  },
  composerHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100,
    zIndex: 2,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: semantics.border.default,
    backgroundColor: semantics.bg.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: semantics.bg.surfaceSubtle,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: semantics.text.primary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: semantics.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: semantics.text.lightMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  fullImage: {
    width: '100%',
    height: '70%',
  },
});
