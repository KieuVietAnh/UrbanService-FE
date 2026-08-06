import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  Pressable,
  Image,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { AppButton } from '@/components/ui/AppButton';
import { colors } from '@/constants/theme';

const { width: W } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '📍',
    title: 'Phản ánh đô thị\ndễ dàng hơn',
    subtitle:
      'Gửi phản ánh, theo dõi tiến độ và nhận kết quả xử lý ngay trên điện thoại.',
    accent: '#EFF6FF',
  },
  {
    id: '2',
    emoji: '⚡',
    title: 'Theo dõi tiến độ\ntheo thời gian thực',
    subtitle:
      'Biết chính xác phản ánh của bạn đang ở bước nào trong quy trình xử lý.',
    accent: '#F0FDF4',
  },
  {
    id: '3',
    emoji: '🏙️',
    title: 'Cùng nhau xây dựng\nthành phố tốt hơn',
    subtitle:
      'Hơn 5.000 phản ánh đã được xử lý nhờ sự đóng góp của cư dân như bạn.',
    accent: '#FFF7ED',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * W, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setCurrentIndex(idx);
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Skip */}
      <View className="flex-row justify-end px-5 pt-2 pb-1">
        <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={12}>
          <Text className="text-sm font-sans-medium text-text-muted">Bỏ qua</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={{ width: W }} className="items-center justify-center px-8">
            {/* Illustration placeholder */}
            <View
              style={[styles.illustrationWrap, { backgroundColor: slide.accent }]}
            >
              <Text style={styles.emoji}>{slide.emoji}</Text>

              {/* Mock card overlay */}
              <View style={styles.mockCard}>
                <View style={styles.mockDot} />
                <Text style={styles.mockCardText}>Đã xử lý • Chiếu sáng công cộng</Text>
              </View>
            </View>

            <View className="mt-10 items-center">
              <Text className="text-3xl font-sans-bold text-text text-center leading-tight" style={{ letterSpacing: -0.5 }}>
                {slide.title}
              </Text>
              <Text className="text-base text-text-muted text-center mt-3 leading-relaxed">
                {slide.subtitle}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View className="flex-row justify-center gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Actions */}
      <View className="px-5 pb-6 gap-3">
        <AppButton onPress={goNext} fullWidth size="lg">
          {isLast ? 'Bắt đầu' : 'Tiếp theo'}
        </AppButton>

        {!isLast && (
          <AppButton
            variant="ghost"
            fullWidth
            size="md"
            onPress={() => router.replace('/(auth)/login')}
          >
            Tôi đã có tài khoản
          </AppButton>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  illustrationWrap: {
    width: W - 48,
    height: 280,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  emoji: {
    fontSize: 72,
  },
  mockCard: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  mockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  mockCardText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 12,
    color: '#0F172A',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },
});
