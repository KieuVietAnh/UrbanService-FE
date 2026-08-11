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
        {/* Illustration */}
        <View style={styles.illustrationWrap}>
          <Icon name="check-circle" size={56} color="#10B981" />
        </View>

        <Text className="text-xl font-sans-bold text-text text-center mb-2" style={{ letterSpacing: -0.3 }}>
          Vấn đề đã được xử lý!
        </Text>
        <Text className="text-sm text-text-muted text-center mb-8 leading-relaxed">
          Đánh giá của bạn giúp chúng tôi nâng cao chất lượng dịch vụ.
        </Text>

        {/* Stars */}
        <Text className="text-sm font-sans-semibold text-text text-center mb-3">
          Bạn đánh giá chất lượng xử lý như thế nào?
        </Text>
        <View style={styles.starsRow}>
          {STARS.map((s) => (
            <Pressable key={s} onPress={() => setRating(s)} hitSlop={8}>
              <Icon
                name="star"
                size={36}
                color={s <= rating ? '#F59E0B' : '#E2E8F0'}
              />
            </Pressable>
          ))}
        </View>

        {/* Satisfaction */}
        <Text className="text-sm font-sans-semibold text-text text-center mt-6 mb-3">
          Bạn có hài lòng với kết quả không?
        </Text>
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

        {/* Comment */}
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

        <Pressable onPress={() => router.back()} className="self-center mt-4" hitSlop={12}>
          <Text className="text-sm text-text-muted">Bỏ qua</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  illustrationWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  satisfactionRow: {
    flexDirection: 'row',
    gap: 12,
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
  commentWrap: {
    marginTop: 20,
    marginBottom: 8,
  },
});
