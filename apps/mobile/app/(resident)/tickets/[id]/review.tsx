import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextArea } from '@/components/ui/AppTextArea';
import { useToast } from '@/components/ui/Toast';
import { feedbackApi } from '@/services/api/feedbackApi';
import { colors } from '@/constants/theme';

const STARS = [1, 2, 3, 4, 5];

const SATISFACTION_OPTIONS = [
  { value: true, icon: 'thumbs-up', label: 'Hài lòng', bg: '#D1FAE5', color: '#047857' },
  { value: false, icon: 'thumbs-down', label: 'Chưa hài lòng', bg: '#FEE2E2', color: '#991B1B' },
];

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const [rating, setRating] = useState(0);
  const [isSatisfied, setIsSatisfied] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');

  const submitMutation = useMutation({
    mutationFn: () =>
      feedbackApi.submitReview(id!, rating, isSatisfied ?? true, comment.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback', id] });
      toast.success('Cảm ơn bạn đã đánh giá!');
      router.back();
    },
    onError: () => toast.error('Gửi đánh giá thất bại'),
  });

  const canSubmit = rating > 0 && isSatisfied !== null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader showBack title="Đánh giá kết quả xử lý" />

      <View style={styles.body}>
        <View style={styles.successCard}>
          <View style={styles.illustrationWrap}>
            <Icon name="check-circle" size={60} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Vấn đề đã được xử lý!</Text>
          <Text style={styles.successSubtitle}>Đánh giá của bạn giúp chúng tôi nâng cao chất lượng dịch vụ.</Text>
          <View style={styles.successMetaRow}>
            <View style={styles.successMetaPill}>
              <Icon name="activity" size={12} color={colors.primary} />
              <Text style={styles.successMetaText}>Xử lý hoàn tất</Text>
            </View>
            <View style={styles.successMetaPill}>
              <Icon name="clock" size={12} color={colors.primary} />
              <Text style={styles.successMetaText}>Cập nhật mới</Text>
            </View>
          </View>
        </View>

        <View style={styles.ratingCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Đánh giá chất lượng xử lý</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Feedback</Text>
            </View>
          </View>

          <Text style={styles.subtleQuestion}>Bạn đánh giá chất lượng xử lý như thế nào?</Text>
          <View style={styles.starsRow}>
            {STARS.map((s) => (
              <Pressable key={s} onPress={() => setRating(s)} hitSlop={8} style={s <= rating ? styles.starButtonActive : styles.starButton}>
                <Icon
                  name="star"
                  size={34}
                  color={s <= rating ? '#F59E0B' : '#CBD5E1'}
                  fill={s <= rating ? '#F59E0B' : 'transparent'}
                />
              </Pressable>
            ))}
          </View>
          <Text style={styles.ratingHint}>{rating ? `${rating}/5 sao` : 'Chưa có đánh giá'}</Text>
        </View>

        <View style={styles.satisfactionCard}>
          <Text style={styles.sectionTitle}>Kết quả xử lý</Text>
          <Text style={styles.subtleQuestion}>Bạn có hài lòng với kết quả không?</Text>
          <View style={styles.satisfactionRow}>
            {SATISFACTION_OPTIONS.map((opt) => {
              const active = isSatisfied === opt.value;
              return (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => setIsSatisfied(opt.value)}
                  style={[
                    styles.satisfactionBtn,
                    { backgroundColor: active ? opt.bg : '#F8FAFC' },
                    active && { borderColor: opt.color },
                  ]}
                >
                  <Icon
                    name={opt.icon as any}
                    size={22}
                    color={active ? opt.color : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.satisfactionLabel,
                      active && { color: opt.color, fontFamily: 'Geist-SemiBold' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.feedbackCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Phản hồi của bạn</Text>
            <View style={styles.emptyChip}>
              <Text style={styles.emptyChipText}>{comment.trim() ? 'Đã nhập' : 'Trống'}</Text>
            </View>
          </View>
          <View style={styles.commentWrap}>
            <AppTextArea
              label="Góp ý thêm (tùy chọn)"
              value={comment}
              onChangeText={setComment}
              placeholder="Chia sẻ thêm về trải nghiệm của bạn..."
              rows={4}
              maxLength={500}
            />
          </View>
          <Text style={styles.helperText}>Bạn có thể để trống nếu không muốn bổ sung thêm.</Text>
        </View>

        <View style={styles.ctaArea}>
          <AppButton
            onPress={() => submitMutation.mutate()}
            loading={submitMutation.isPending}
            disabled={!canSubmit}
            fullWidth
            size="lg"
            rightIcon={<Icon name="send" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />}
          >
            Gửi đánh giá
          </AppButton>

          <Pressable onPress={() => router.back()} style={styles.skipButton} hitSlop={12}>
            <Text style={styles.skipText}>Bỏ qua</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  illustrationWrap: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  successTitle: {
    fontFamily: 'Geist-Bold',
    fontSize: 24,
    color: '#0F172A',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  successSubtitle: {
    fontFamily: 'Geist-Regular',
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  successMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  successMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successMetaText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 10,
    color: '#047857',
  },
  ratingCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'Geist-Bold',
    fontSize: 13,
    color: '#334155',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#3B82F6',
  },
  liveText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 10,
    color: '#1D4ED8',
  },
  subtleQuestion: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 14,
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  starButton: {
    padding: 8,
    borderRadius: 999,
  },
  starButtonActive: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
  },
  ratingHint: {
    marginTop: 12,
    fontFamily: 'Geist-Medium',
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  satisfactionCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  satisfactionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  satisfactionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  satisfactionLabel: {
    fontFamily: 'Geist-Medium',
    fontSize: 14,
    color: '#64748B',
  },
  feedbackCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  emptyChipText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 10,
    color: '#64748B',
  },
  commentWrap: {
    marginTop: 10,
    marginBottom: 8,
  },
  helperText: {
    fontFamily: 'Geist-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  ctaArea: {
    marginTop: 20,
    paddingBottom: 14,
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: 14,
  },
  skipText: {
    fontFamily: 'Geist-Medium',
    fontSize: 13,
    color: '#64748B',
  },
});
