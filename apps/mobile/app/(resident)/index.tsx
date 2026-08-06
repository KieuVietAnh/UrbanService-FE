import React, { useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { TicketStatusBadge } from '@/components/ui/TicketStatusBadge';
import { SkeletonCard } from '@/components/ui/AppSkeleton';
import { useAuthStore } from '@/features/auth/auth.store';
import { feedbackApi } from '@/services/api/feedbackApi';
import { colors } from '@/constants/theme';

const { width: W } = Dimensions.get('window');
const ACTION_SIZE = (W - 48 - 12) / 2;

// ─── Quick Action config ───────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    id: 'create',
    icon: 'plus-circle',
    label: 'Tạo phản ánh',
    sub: 'Gửi vấn đề mới',
    href: '/(resident)/create-feedback',
    bg: '#0052CC',
    iconBg: 'rgba(255,255,255,0.18)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255,255,255,0.72)',
  },
  {
    id: 'tickets',
    icon: 'list',
    label: 'Phản ánh của tôi',
    sub: 'Theo dõi tiến độ',
    href: '/(resident)/tickets',
    bg: '#F0FDF4',
    iconBg: '#DCFCE7',
    textColor: '#14532D',
    subColor: '#4ADE80',
    iconColor: '#16A34A',
  },
  {
    id: 'community',
    icon: 'users',
    label: 'Cộng đồng',
    sub: 'Gần đây',
    href: '/(resident)/community',
    bg: '#FAF5FF',
    iconBg: '#EDE9FE',
    textColor: '#3B0764',
    subColor: '#A78BFA',
    iconColor: '#7C3AED',
  },
  {
    id: 'notifications',
    icon: 'bell',
    label: 'Thông báo',
    sub: 'Cập nhật mới',
    href: '/(resident)/notifications',
    bg: '#FFFBEB',
    iconBg: '#FEF3C7',
    textColor: '#451A03',
    subColor: '#FBBF24',
    iconColor: '#D97706',
  },
] as const;

// ─── Animated Press Card ───────────────────────────────────────────
function ActionCard({
  action,
  delay = 0,
}: {
  action: typeof QUICK_ACTIONS[number];
  delay?: number;
}) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.94, { damping: 14, stiffness: 380 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 380 });
  };

  const iconColor = (action as any).iconColor ?? '#FFFFFF';

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(16)}
      style={animStyle}
    >
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(action.href as any);
        }}
        style={[styles.actionCard, { backgroundColor: action.bg, width: ACTION_SIZE }]}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: action.iconBg }]}>
          <Icon name={action.icon as any} size={22} color={iconColor} />
        </View>
        <Text style={[styles.actionLabel, { color: action.textColor }]}>
          {action.label}
        </Text>
        <Text style={[styles.actionSub, { color: action.subColor }]}>
          {action.sub}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Incident Card ─────────────────────────────────────────────────
function IncidentCard({ ticket, delay = 0 }: { ticket: any; delay?: number }) {
  const router = useRouter();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      style={[animStyle, styles.incidentCard]}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 14, stiffness: 380 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 380 }); }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/(resident)/tickets/${ticket.feedbackId ?? ticket.id}` as any);
        }}
      >
        {/* Category chip */}
        <View className="flex-row items-center justify-between mb-2">
          <View style={styles.categoryChip}>
            <Icon name="tag" size={11} color={colors.primary} />
            <Text style={styles.categoryChipText} numberOfLines={1}>
              {ticket.categoryName ?? 'Hạ tầng'}
            </Text>
          </View>
          <TicketStatusBadge status={ticket.status ?? 'PENDING'} size="sm" />
        </View>

        {/* Title */}
        <Text style={styles.incidentTitle} numberOfLines={2}>
          {ticket.title ?? 'Chưa có tiêu đề'}
        </Text>

        {/* Location */}
        <View className="flex-row items-center gap-1.5 mt-1.5">
          <Icon name="map-pin" size={11} color={colors.lightMuted} />
          <Text style={styles.incidentLocation} numberOfLines={1}>
            {ticket.locationText ?? 'Không rõ địa chỉ'}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.incidentFooter}>
          <Text style={styles.incidentCode}>
            #{ticket.code ?? ticket.feedbackCode ?? '—'}
          </Text>
          <View className="flex-row items-center gap-1">
            <Text style={styles.incidentDate}>
              {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('vi-VN') : ''}
            </Text>
            <Icon name="chevron-right" size={12} color={colors.primary} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Stat Chip ─────────────────────────────────────────────────────
function StatChip({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.statChip}>
      <Icon name={icon as any} size={13} color="rgba(255,255,255,0.75)" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const firstName = (user as any)?.fullName?.split(' ').pop() ?? 'bạn';
  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const { data: page, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['feedbacks', 'home'],
    queryFn: () => feedbackApi.list({ pageSize: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
  });

  const { data: nearbyPage, isLoading: nearbyLoading } = useQuery({
    queryKey: ['feedbacks', 'nearby'],
    queryFn: () => feedbackApi.list({ pageSize: 3, sortBy: 'createdAt', sortOrder: 'desc' }),
  });

  const tickets = page?.items ?? [];
  const nearby = nearbyPage?.items ?? [];
  const total = page?.totalItems ?? 0;

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >

        {/* ══════════════════════════════════════════════════
            SECTION 1 — WELCOME HERO
            Asymmetric: greeting left-pinned, stats right
        ══════════════════════════════════════════════════ */}
        <Animated.View entering={FadeIn.duration(350)} style={styles.heroSection}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.dateLabel}>{today}</Text>
              <Text style={styles.greeting}>
                Xin chào,{'\n'}{firstName}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/(resident)/notifications' as any)}
              style={styles.bellBtn}
            >
              <Icon name="bell" size={20} color={colors.text} />
              {/* Unread dot */}
              <View style={styles.bellDot} />
            </Pressable>
          </View>

          {/* Hero card — gradient + stats */}
          <View style={styles.heroCard}>
            {/* Ambient grid pattern overlay */}
            <View style={styles.heroOverlay} />

            <View style={styles.heroContent}>
              {/* Left: CTA */}
              <View style={{ flex: 1 }}>
                <View style={styles.aiBadge}>
                  <Icon name="zap" size={11} color="#60A5FA" />
                  <Text style={styles.aiBadgeText}>AI phân loại tự động</Text>
                </View>
                <Text style={styles.heroHeadline}>
                  Góp ý để{'\n'}thành phố{'\n'}tốt hơn
                </Text>
                <Pressable
                  style={styles.heroCtaBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/(resident)/create-feedback' as any);
                  }}
                >
                  <Icon name="plus" size={14} color={colors.primary} />
                  <Text style={styles.heroCtaText}>Tạo phản ánh</Text>
                </Pressable>
              </View>

              {/* Right: Vertical stats */}
              <View style={styles.heroStats}>
                {[
                  { icon: 'file-text', value: String(total), label: 'Của bạn' },
                  { icon: 'clock', value: '48h', label: 'Xử lý TB' },
                  { icon: 'users', value: '5.2K', label: 'Cộng đồng' },
                ].map((s) => (
                  <StatChip key={s.label} {...s} />
                ))}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════
            SECTION 2 — QUICK ACTIONS (2×2 Bento)
            grid-cols-2, gap-3, 4 cells — ZERO empty cells
        ══════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.bento}>
            {QUICK_ACTIONS.map((action, i) => (
              <ActionCard key={action.id} action={action} delay={i * 60} />
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════
            SECTION 3 — NEARBY INCIDENTS
            Stagger-reveal cards, horizontal accordion feel
        ══════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Khu vực của bạn</Text>
              <Text style={styles.sectionSub}>Phản ánh gần đây trong khu vực</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(resident)/community' as any)}
              style={styles.seeAllBtn}
            >
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <Icon name="arrow-right" size={13} color={colors.primary} />
            </Pressable>
          </View>

          {nearbyLoading ? (
            <SkeletonCard />
          ) : nearby.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="map-pin" size={28} color="#CBD5E1" />
              <Text style={styles.emptyText}>Không có phản ánh nào gần đây</Text>
            </View>
          ) : (
            nearby.map((ticket: any, i: number) => (
              <IncidentCard
                key={ticket.feedbackId ?? ticket.id ?? i}
                ticket={ticket}
                delay={i * 80}
              />
            ))
          )}
        </View>

        {/* ══════════════════════════════════════════════════
            SECTION 4 — RECENT FEEDBACK ACTIVITY
            Timeline-style compact list
        ══════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
              <Text style={styles.sectionSub}>Cập nhật mới nhất của bạn</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(resident)/tickets' as any)}
              style={styles.seeAllBtn}
            >
              <Text style={styles.seeAllText}>Tất cả</Text>
              <Icon name="arrow-right" size={13} color={colors.primary} />
            </Pressable>
          </View>

          <Animated.View
            entering={FadeInDown.delay(200).springify().damping(18)}
            style={styles.activityCard}
          >
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : tickets.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="inbox" size={28} color="#CBD5E1" />
                <Text style={styles.emptyText}>Bạn chưa gửi phản ánh nào</Text>
                <Pressable
                  style={styles.emptyCtaBtn}
                  onPress={() => router.push('/(resident)/create-feedback' as any)}
                >
                  <Text style={styles.emptyCtaText}>Tạo phản ánh đầu tiên</Text>
                </Pressable>
              </View>
            ) : (
              tickets.map((ticket: any, i: number) => {
                const isLast = i === tickets.length - 1;
                return (
                  <Pressable
                    key={ticket.feedbackId ?? ticket.id ?? i}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/(resident)/tickets/${ticket.feedbackId ?? ticket.id}` as any);
                    }}
                    style={[styles.activityRow, !isLast && styles.activityRowBorder]}
                  >
                    {/* Timeline dot */}
                    <View style={styles.timelineDotWrap}>
                      <View
                        style={[
                          styles.timelineDot,
                          {
                            backgroundColor:
                              ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                                ? '#10B981'
                                : ticket.status === 'PROCESSING'
                                ? colors.primary
                                : '#F59E0B',
                          },
                        ]}
                      />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>

                    {/* Content */}
                    <View style={styles.activityContent}>
                      <View className="flex-row items-center justify-between gap-2 mb-1">
                        <Text style={styles.activityTitle} numberOfLines={1}>
                          {ticket.title ?? 'Chưa có tiêu đề'}
                        </Text>
                        <TicketStatusBadge status={ticket.status ?? 'PENDING'} size="sm" />
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Icon name="map-pin" size={11} color={colors.lightMuted} />
                        <Text style={styles.activityMeta} numberOfLines={1}>
                          {ticket.locationText ?? '—'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Animated.View>
        </View>

        {/* ══════════════════════════════════════════════════
            SECTION 5 — COMMUNITY HIGHLIGHTS
            Horizontal scroll marquee strip + CTA card
        ══════════════════════════════════════════════════ */}
        <View style={[styles.section, { paddingBottom: 8 }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Cộng đồng nổi bật</Text>
              <Text style={styles.sectionSub}>Tác động trong tháng này</Text>
            </View>
          </View>

          {/* Impact stats strip — horizontal scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.highlightStrip}
          >
            {[
              { icon: 'check-circle', value: '5.2K', label: 'Phản ánh\nđã xử lý', color: '#10B981', bg: '#D1FAE5' },
              { icon: 'clock', value: '48h', label: 'Thời gian\nxử lý TB', color: '#0052CC', bg: '#DBEAFE' },
              { icon: 'users', value: '12K', label: 'Cư dân\ntham gia', color: '#7C3AED', bg: '#EDE9FE' },
              { icon: 'trending-up', value: '+18%', label: 'So với\ntháng trước', color: '#D97706', bg: '#FEF3C7' },
              { icon: 'shield', value: '98%', label: 'Hài lòng\nkết quả', color: '#0F172A', bg: '#F1F5F9' },
            ].map((stat) => (
              <Animated.View
                key={stat.label}
                entering={FadeInDown.delay(150).springify()}
                style={[styles.highlightChip, { backgroundColor: stat.bg }]}
              >
                <View style={[styles.highlightIconWrap, { backgroundColor: stat.color + '22' }]}>
                  <Icon name={stat.icon as any} size={18} color={stat.color} />
                </View>
                <Text style={[styles.highlightValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.highlightLabel}>{stat.label}</Text>
              </Animated.View>
            ))}
          </ScrollView>

          {/* Community CTA card */}
          <Animated.View
            entering={FadeInDown.delay(300).springify().damping(16)}
          >
            <Pressable
              style={styles.communityCta}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(resident)/community' as any);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.communityCtaTitle}>
                  Bạn đang giúp thành phố tốt hơn
                </Text>
                <Text style={styles.communityCtaSub}>
                  Xem tất cả phản ánh từ cộng đồng trong khu vực →
                </Text>
              </View>
              <View style={styles.communityCtaIcon}>
                <Icon name="arrow-right" size={20} color={colors.primary} />
              </View>
            </Pressable>
          </Animated.View>
        </View>

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingBottom: 16 },

  // ── Hero ──
  heroSection: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateLabel: {
    fontFamily: 'Geist-Medium',
    fontSize: 12,
    color: '#94A3B8',
    textTransform: 'capitalize',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  greeting: {
    fontFamily: 'Geist-Black',
    fontSize: 34,
    color: '#0F172A',
    lineHeight: 40,
    letterSpacing: -1,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: '#0B1E4E',
    overflow: 'hidden',
    minHeight: 172,
    padding: 22,
    shadowColor: '#0052CC',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Simulated grid pattern via border
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.08)',
    borderRadius: 24,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(96,165,250,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.22)',
  },
  aiBadgeText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 11,
    color: '#93C5FD',
    letterSpacing: 0.2,
  },
  heroHeadline: {
    fontFamily: 'Geist-Bold',
    fontSize: 22,
    color: '#FFFFFF',
    lineHeight: 30,
    letterSpacing: -0.5,
    marginBottom: 18,
  },
  heroCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  heroCtaText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  heroStats: {
    gap: 8,
    alignItems: 'flex-end',
  },
  statChip: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 70,
  },
  statValue: {
    fontFamily: 'Geist-Bold',
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: 'Geist-Medium',
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },

  // ── Section wrapper ──
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Geist-Bold',
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontFamily: 'Geist-Regular',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  seeAllText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 13,
    color: colors.primary,
  },

  // ── Bento (Quick Actions) ──
  bento: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    borderRadius: 20,
    padding: 18,
    height: ACTION_SIZE,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: 'Geist-Bold',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  actionSub: {
    fontFamily: 'Geist-Regular',
    fontSize: 11,
  },

  // ── Incident Cards ──
  incidentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  categoryChipText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 11,
    color: colors.primary,
  },
  incidentTitle: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  incidentLocation: {
    fontFamily: 'Geist-Regular',
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
  },
  incidentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  incidentCode: {
    fontFamily: 'Geist-Medium',
    fontSize: 11,
    color: '#CBD5E1',
    letterSpacing: 0.3,
  },
  incidentDate: {
    fontFamily: 'Geist-Regular',
    fontSize: 11,
    color: '#94A3B8',
  },

  // ── Activity (Recent) ──
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  timelineDotWrap: {
    alignItems: 'center',
    width: 18,
    marginRight: 14,
    marginTop: 3,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
    minHeight: 24,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 14,
    color: '#0F172A',
    flex: 1,
  },
  activityMeta: {
    fontFamily: 'Geist-Regular',
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  emptyCtaBtn: {
    marginTop: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyCtaText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 13,
    color: colors.primary,
  },

  // ── Community Highlights ──
  highlightStrip: {
    gap: 10,
    paddingBottom: 4,
    paddingRight: 4,
  },
  highlightChip: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 100,
    gap: 6,
  },
  highlightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightValue: {
    fontFamily: 'Geist-Black',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  highlightLabel: {
    fontFamily: 'Geist-Regular',
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
  },
  communityCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
    gap: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  communityCtaTitle: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 3,
  },
  communityCtaSub: {
    fontFamily: 'Geist-Regular',
    fontSize: 12,
    color: colors.primary,
    lineHeight: 17,
  },
  communityCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
});