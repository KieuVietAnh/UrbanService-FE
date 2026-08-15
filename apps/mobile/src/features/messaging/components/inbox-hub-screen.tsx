/**
 * Inbox Screen — UrbanMind Mobile
 * Design: gpt-taste + high-end-visual-design skill applied.
 * Vibe: Light Premium SaaS + Z-Axis Cascade layout.
 *
 * PRESERVED (DO NOT MODIFY):
 *  - toolsApi.getAiConversations()       → AI tab
 *  - feedbackApi.list()                  → Support tab (fetch all)
 *  - axiosClient GET /api/feedbacks/{id}/messages → filter has-conversation
 *  - /(resident)/ai/[id]                 navigation
 *  - /(resident)/tickets/[id]/chat       navigation
 *  - /(resident)/ai                      new AI
 *  - /(resident)/support/select-feedback new staff
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Image,
  RefreshControl,
  Animated,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { axiosClient, toolsApi } from '@urbanmind/shared-api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Icon from '@expo/vector-icons/Feather';
import { feedbackApi } from '@/features/reporting/api';
import { Text } from '@/components/ui';
import { Skeleton } from '@/components/shared';
import { AppBadge } from '@/components/ui';
import { semantics } from '@/theme/semantics';
import { useAuthStore } from '@/features/auth';
import type { AiConversationItem, SupportThread } from '../types/messaging.types';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  heroBg: '#FFFFFF',
  heroCard: '#EEF4FF',           // soft blue tint surface
  heroBorder: 'rgba(11,86,217,0.13)',
  heroGlow: 'rgba(11,86,217,0.09)',
  aiPrimary: '#0B56D9',
  aiGlow: 'rgba(11,86,217,0.28)',
  appBg: semantics.bg.app,
  segBg: '#F1F5F9',
  segIndicator: '#FFFFFF',
  white: '#FFFFFF',
  heroTitle: '#0F172A',
  heroSub: '#64748B',
  heroEyebrow: '#0B56D9',
  springDamping: 18,
  springStiffness: 240,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Image URL Resolver ───────────────────────────────────────────────────────
// Mirrors web/src/hooks/useTicketDetail.js getAttachmentUrl — the source of truth.
// Critical: list API returns attachments with only id/attachmentId (no URL field).
// Fallback: /api/attachments/{id}  ← this is how web renders images from list.

const resolveMediaUrl = (value: any): string | null => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  const baseUrl = String((axiosClient as any).defaults?.baseURL ?? 'https://api.urbanservice.me').replace(/\/$/, '');
  return trimmed.startsWith('/') ? `${baseUrl}${trimmed}` : `${baseUrl}/${trimmed}`;
};

/**
 * Resolve a single attachment object/string to an absolute URL.
 * Priority order (same as web useTicketDetail.js):
 *  1. string → resolve directly
 *  2. object.url
 *  3. object.path
 *  4. object.fileUrl
 *  5. object.link
 *  6. object.attributes.url | object.attributes.path
 *  7. object.displayUrl | object.mediaUrl | object.publicUrl | object.downloadUrl
 *     | object.imageUrl | object.thumbnailUrl | object.coverImageUrl | object.src
 *  8. /api/attachments/{id}  ← KEY: list API only returns ID, no URL
 */
const getAttachmentUrl = (attachment: any): string | null => {
  try {
    if (!attachment) return null;
    if (typeof attachment === 'string') return resolveMediaUrl(attachment);
    if (Array.isArray(attachment)) return getAttachmentUrl(attachment[0]);
    if (typeof attachment === 'object') {
      // Check direct URL fields first (same order as web useTicketDetail.js)
      if (attachment.url)      return resolveMediaUrl(attachment.url);
      if (attachment.path)     return resolveMediaUrl(attachment.path);
      if (attachment.fileUrl)  return resolveMediaUrl(attachment.fileUrl);
      if (attachment.link)     return resolveMediaUrl(attachment.link);
      // attributes sub-object (Strapi-style)
      if (attachment.attributes?.url)  return resolveMediaUrl(attachment.attributes.url);
      if (attachment.attributes?.path) return resolveMediaUrl(attachment.attributes.path);
      // More URL fields
      const extra = [
        attachment.displayUrl, attachment.mediaUrl, attachment.publicUrl,
        attachment.downloadUrl, attachment.imageUrl, attachment.thumbnailUrl,
        attachment.coverImageUrl, attachment.attachmentUrl, attachment.src,
      ].find((v) => typeof v === 'string' && v.trim());
      if (extra) return resolveMediaUrl(extra);
      // *** KEY FALLBACK: list API only returns id, no URL ***
      // Web builds: /api/attachments/{id}  (see useTicketDetail.js line 231-232)
      const id = attachment.attachmentId ?? attachment.id ?? attachment.fileId ??
                 attachment.feedbackAttachmentId ?? attachment.uuid ?? null;
      if (id) return resolveMediaUrl(`/api/attachments/${id}`);
    }
  } catch {
    // ignore
  }
  return null;
};

/** Collect ALL resolvable image URLs from a feedback list item. */
const getAllFeedbackImages = (item: any): string[] => {
  if (!item) return [];
  const candidates: any[] = [
    ...(Array.isArray(item.attachments)     ? item.attachments     : []),
    ...(Array.isArray(item.attachmentList)  ? item.attachmentList  : []),
    ...(Array.isArray(item.images)          ? item.images          : []),
    ...(Array.isArray(item.imageUrls)       ? item.imageUrls       : []),
    ...(Array.isArray(item.mediaUrls)       ? item.mediaUrls       : []),
    ...(Array.isArray(item.media)           ? item.media           : []),
  ].filter(Boolean);

  const urls: string[] = [];
  for (const a of candidates) {
    const url = getAttachmentUrl(a);
    if (url && !urls.includes(url)) urls.push(url);
  }
  // Scalar top-level fallbacks
  const scalar = getAttachmentUrl(
    item.attachmentUrl ?? item.imageUrl ?? item.thumbnail ??
    item.coverImageUrl ?? item.thumbnailUrl ?? item.photoUrl ?? null
  );
  if (scalar && !urls.includes(scalar)) urls.push(scalar);
  return urls;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatRelativeTime = (value: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  const isCurrentYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: isCurrentYear ? undefined : 'numeric',
  });
};

const getMessageTimestamp = (message: any): number => {
  const candidates = [
    message?.createdAt,
    message?.sentAt,
    message?.created_at,
    message?.sent_at,
    message?.createdDate,
    message?.createdOn,
    message?.createdAtUtc,
    message?.sentAtUtc,
    message?.timestamp,
    message?.updatedAt,
    message?.updated_at,
    message?.updatedAtUtc,
    message?.data?.createdAt,
    message?.data?.sentAt,
    message?.data?.created_at,
    message?.data?.sent_at,
    message?.data?.createdDate,
    message?.data?.createdOn,
    message?.data?.createdAtUtc,
    message?.data?.sentAtUtc,
    message?.data?.timestamp,
    message?.data?.updatedAt,
    message?.data?.updated_at,
    message?.data?.updatedAtUtc,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) return time;
  }

  return 0;
};

const normalizeAiConversation = (raw: any): AiConversationItem | null => {
  if (!raw) return null;
  const id = String(raw.conversationId ?? raw.id ?? raw.uuid ?? raw.key ?? '');
  if (!id) return null;
  return {
    id,
    title: String(raw.title ?? raw.name ?? 'Cuộc trò chuyện AI'),
    preview: String(
      raw.lastMessage ?? raw.preview ?? raw.snippet ??
      raw.summary ?? raw.description ?? 'Bắt đầu hội thoại với trợ lý AI.'
    ),
    updatedAt: String(
      raw.lastMessageAt ?? raw.lastMessageAtUtc ?? raw.lastUpdatedAt ?? raw.updatedAt ??
      raw.lastUpdated ?? raw.createdAt ?? new Date().toISOString()
    ),
  };
};

// ─── Pulse Orb Hook (GPU-safe: only transform + opacity) ─────────────────────

function usePulseOrb() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return anim;
}

// ─── FadeUp entrance (translate-y + opacity, GPU-safe) ───────────────────────

function useFadeUp(delay = 0) {
  const translateY = useRef(new Animated.Value(12)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 480, delay, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 1, duration: 480, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return { translateY, opacity };
}

// ─── Skeleton Components ───────────────────────────────────────────────────────

function AiRowSkeleton({ index = 0 }: { index?: number }) {
  return (
    <View style={[skStyles.aiRow, { opacity: 1 - index * 0.18 }]}>
      <Skeleton width={44} height={44} radius={16} />
      <View style={skStyles.aiBody}>
        <Skeleton width="56%" height={12} radius={6} />
        <View style={{ height: 7 }} />
        <Skeleton width="82%" height={10} radius={5} />
      </View>
      <Skeleton width={30} height={10} radius={5} />
    </View>
  );
}

function SupportRowSkeleton({ index = 0 }: { index?: number }) {
  return (
    <View style={[skStyles.supportRow, { opacity: 1 - index * 0.22 }]}>
      <Skeleton width={72} height={72} radius={18} />
      <View style={skStyles.supportBody}>
        <Skeleton width="66%" height={13} radius={6} />
        <View style={{ height: 6 }} />
        <Skeleton width="38%" height={10} radius={5} />
        <View style={{ height: 9 }} />
        <Skeleton width="50%" height={10} radius={5} />
      </View>
    </View>
  );
}

// ─── AI Hero Card — display + embedded CTA button ────────────────────────────

function AIHeroCard({ onPress }: { onPress: () => void }) {
  const pulseOrb = usePulseOrb();
  const { translateY, opacity } = useFadeUp(0);

  const pulseScale   = pulseOrb.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const pulseOpacity = pulseOrb.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.16, 0.05, 0.16] });

  const pressScale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.972, useNativeDriver: true, damping: 16, stiffness: 280 }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 280 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ translateY }], opacity }}>
      {/* Outer shell — Double-Bezel */}
      <View style={heroStyles.outerShell}>
        {/* Inner core */}
        <View style={heroStyles.innerCore}>
          {/* Ambient glow orb */}
          <Animated.View
            style={[heroStyles.glowOrb, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]}
            pointerEvents="none"
          />

          {/* Top row: bot icon + title + Online badge */}
          <View style={heroStyles.topRow}>
            <View style={heroStyles.botShell}>
              <View style={heroStyles.botCore}>
                <Icon name="cpu" size={20} color={D.white} />
              </View>
            </View>

            <View style={heroStyles.textBlock}>
              <View style={heroStyles.eyebrow}>
                <View style={heroStyles.eyebrowDot} />
                <Text style={heroStyles.eyebrowText}>UrbanMind AI</Text>
              </View>
              <Text style={heroStyles.heroTitle}>AI Assistant</Text>
            </View>

            <View style={heroStyles.onlineBadge}>
              <View style={heroStyles.onlineDot} />
              <Text style={heroStyles.onlineText}>Online</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={heroStyles.heroSub}>
            Hỏi về quy trình phản ánh, trạng thái xử lý, hoặc hướng dẫn nhanh về dịch vụ đô thị.
          </Text>

          {/* CTA button — embedded inside card, spring-animated */}
          <Animated.View style={{ transform: [{ scale: pressScale }] }}>
            <Pressable
              onPress={onPress}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={heroStyles.ctaBtn}
              accessibilityRole="button"
              accessibilityLabel="Bắt đầu cuộc trò chuyện mới với AI"
            >
              <View style={heroStyles.ctaIconWrap}>
                <Icon name="message-circle" size={16} color={D.white} />
              </View>
              <Text style={heroStyles.ctaText}>Bắt đầu cuộc trò chuyện mới</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Feedback Thumbnail — 1 image full, multiple = 2×2 collage ───────────────

const THUMB_SIZE = 76;
const HALF = (THUMB_SIZE - 2) / 2; // gap = 2px between cells

function FeedbackThumbnail({ uris, unreadCount }: { uris: string[]; unreadCount: number }) {
  const hasUnread = unreadCount > 0;

  const renderCollage = () => {
    const shown = uris.slice(0, 4); // max 4 cells
    const extra = uris.length - 4;

    if (shown.length === 1) {
      // Single image — full frame
      return (
        <Image
          source={{ uri: shown[0] }}
          style={thumbStyles.full}
          resizeMode="cover"
          onError={() => {}}
        />
      );
    }

    // 2, 3, or 4 images — 2×2 grid
    const cells = shown.length === 2
      ? [shown[0], shown[1], null, null]
      : shown.length === 3
      ? [shown[0], shown[1], shown[2], null]
      : shown; // 4

    return (
      <View style={thumbStyles.grid}>
        {cells.map((uri, i) => (
          <View key={i} style={thumbStyles.cell}>
            {uri ? (
              <Image
                source={{ uri }}
                style={thumbStyles.cellImg}
                resizeMode="cover"
                onError={() => {}}
              />
            ) : (
              // empty filler cell — keep grid balanced
              <View style={thumbStyles.cellEmpty} />
            )}
            {/* +N overlay on last visible cell */}
            {i === shown.length - 1 && extra > 0 && (
              <View style={thumbStyles.extraOverlay}>
                <Text style={thumbStyles.extraText}>+{extra}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={thumbStyles.shell}>
      <View style={thumbStyles.core}>
        {uris.length > 0 ? renderCollage() : (
          <View style={thumbStyles.placeholder}>
            <Icon name="file-text" size={20} color={semantics.text.lightMuted} />
          </View>
        )}
      </View>
      {hasUnread && (
        <View style={thumbStyles.unreadOrb}>
          <Text style={thumbStyles.unreadOrbText}>{unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

// ─── AI Conversation Row ───────────────────────────────────────────────────────

function AiConversationRow({
  item,
  onPress,
  index = 0,
}: {
  item: AiConversationItem;
  onPress: () => void;
  index?: number;
}) {
  const { translateY, opacity } = useFadeUp(100 + index * 36);
  const pressScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, damping: 15, stiffness: 300 }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 300 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ translateY }, { scale: pressScale }], opacity }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={aiRowStyles.row}
        accessibilityRole="button"
      >
        {/* Double-Bezel icon */}
        <View style={aiRowStyles.badgeShell}>
          <View style={aiRowStyles.badgeCore}>
            <Icon name="message-square" size={15} color={D.aiPrimary} />
          </View>
        </View>

        <View style={aiRowStyles.body}>
          <Text style={aiRowStyles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={aiRowStyles.preview} numberOfLines={1}>{item.preview}</Text>
        </View>

        <View style={aiRowStyles.trail}>
          <Text style={aiRowStyles.time}>{formatRelativeTime(item.updatedAt)}</Text>
          <Icon name="chevron-right" size={13} color={semantics.text.lightMuted} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Support Feedback Card ────────────────────────────────────────────────────

function SupportFeedbackCard({
  item,
  onPress,
  index = 0,
}: {
  item: SupportThread;
  onPress: () => void;
  index?: number;
}) {
  const { translateY, opacity } = useFadeUp(60 + index * 46);
  const pressScale = useRef(new Animated.Value(1)).current;
  const hasUnread  = item.unreadCount > 0;

  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.975, useNativeDriver: true, damping: 16, stiffness: 280 }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 280 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ translateY }, { scale: pressScale }], opacity }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={supportStyles.card}
        accessibilityRole="button"
      >
        {/* Thumbnail — 1 image full / multiple = collage */}
        <FeedbackThumbnail uris={item.imageUris} unreadCount={item.unreadCount} />

        {/* Content */}
        <View style={supportStyles.content}>
          <Text
            style={[supportStyles.feedbackTitle, hasUnread && supportStyles.feedbackTitleUnread]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <View style={supportStyles.metaRow}>
            <AppBadge status={item.status} size="sm" />
            {hasUnread ? (
              <View style={supportStyles.unreadPill}>
                <Text style={supportStyles.unreadPillText}>{item.unreadCount} mới</Text>
              </View>
            ) : (
              <Text style={supportStyles.timeText}>{formatRelativeTime(item.updatedAt)}</Text>
            )}
          </View>
          {item.lastMessage ? (
            <Text style={supportStyles.lastMsg} numberOfLines={1}>{item.lastMessage}</Text>
          ) : null}
        </View>

        <Icon name="chevron-right" size={15} color={semantics.text.lightMuted} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Empty States ─────────────────────────────────────────────────────────────

function SupportEmptyState({ onPress }: { onPress: () => void }) {
  const { translateY, opacity } = useFadeUp(120);
  return (
    <Animated.View style={[emptyStyles.wrap, { transform: [{ translateY }], opacity }]}>
      <View style={emptyStyles.illustShell}>
        <View style={emptyStyles.illustCore}>
          <Icon name="inbox" size={28} color={semantics.text.lightMuted} />
        </View>
      </View>
      <Text style={emptyStyles.title}>Chưa có cuộc trao đổi</Text>
      <Text style={emptyStyles.description}>
        Chọn một phản ánh để bắt đầu trao đổi trực tiếp với nhân viên hỗ trợ.
      </Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [emptyStyles.ctaBtn, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
      >
        <Text style={emptyStyles.ctaText}>Chọn phản ánh</Text>
        <View style={emptyStyles.ctaIcon}>
          <Icon name="arrow-right" size={13} color={D.aiPrimary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function AiEmptyHint({ onPress }: { onPress: () => void }) {
  const { translateY, opacity } = useFadeUp(160);
  return (
    <Animated.View style={[aiEmptyStyles.wrap, { transform: [{ translateY }], opacity }]}>
      <Text style={aiEmptyStyles.hint}>Chưa có lịch sử. Bắt đầu cuộc hội thoại đầu tiên.</Text>
      <Pressable onPress={onPress} style={aiEmptyStyles.link}>
        <Text style={aiEmptyStyles.linkText}>Mở AI Assistant</Text>
        <Icon name="arrow-right" size={12} color={D.aiPrimary} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type TabKey = 'ai' | 'support';

export default function InboxScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('ai');
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const aiListRef = useRef<any>(null);
  const supportListRef = useRef<any>(null);
  const { width: screenWidth } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.hasHydrated);

  // focus handled after queries are declared so we can trigger refetches

  // ── API: AI Conversations (DO NOT MODIFY) ──────────────────────────────────
  const {
    data: aiData,
    isLoading: aiLoading,
    isFetching: aiFetching,
    isFetched: aiFetched,
    refetch: refetchAi,
    isRefetching: aiRefetching,
  } = useQuery<AiConversationItem[]>({
    queryKey: ['ai-conversations'],
    queryFn: async () => {
      const raw = await toolsApi.getAiConversations();
      if (!Array.isArray(raw)) return [];
      return raw.map(normalizeAiConversation).filter((c): c is AiConversationItem => Boolean(c));
    },
    retry: false,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
    initialData: [],
    enabled: authReady && !!user,
  });


  // ── API: Support threads — fetch feedbacks then filter those with messages ──
  //    (DO NOT MODIFY the feedbackApi.list() call or the messages endpoint)
  const {
    data: supportThreads,
    isLoading: supportLoading,
    isFetching: supportFetching,
    isFetched: supportFetched,
    refetch: refetchSupport,
    isRefetching: supportRefetching,
  } = useQuery<SupportThread[]>({
    queryKey: ['support-threads-with-messages'],
    queryFn: async (): Promise<SupportThread[]> => {
      // Step 1: fetch all citizen feedbacks (list API — NO attachment data)
      // Capped at 15 items for inbox preview to minimize concurrent checking load
      const raw = await feedbackApi.list({ pageSize: 15, sortBy: 'updatedAt', sortOrder: 'desc' });
      const items: any[] = Array.isArray(raw) ? raw : (raw?.items ?? []);

      // Step 2: check messages for each feedback in parallel
      const checked = await Promise.all(
        items.map(async (item) => {
          const feedbackId = String(item?.feedbackId ?? item?.id ?? '');
          if (!feedbackId) return null;
          try {
            const res = await (axiosClient as any).get(
              `/api/feedbacks/${feedbackId}/messages`,
              { params: { includeInternal: false } }
            );
            const msgs: any[] = Array.isArray(res?.data)
              ? res.data
              : Array.isArray(res?.data?.items)
              ? res.data.items
              : Array.isArray(res)
              ? res
              : [];
            if (msgs.length === 0) return null; // skip feedbacks with no conversation
            return { item, feedbackId, msgs };
          } catch {
            return null;
          }
        })
      );

      const withMsgs = checked.filter(Boolean) as Array<{ item: any; feedbackId: string; msgs: any[] }>;

      // Step 3: fetch DETAIL for each matched feedback to get attachment data.
      // List API never returns attachments — only GET /feedbacks/{id} does.
      const threads = await Promise.all(
        withMsgs.map(async ({ item, feedbackId, msgs }) => {
          const orderedMsgs = [...msgs].sort((left, right) => getMessageTimestamp(left) - getMessageTimestamp(right));
          const lastMsg = orderedMsgs[orderedMsgs.length - 1];
          const lastMessageAt = lastMsg
            ? String(
                lastMsg.createdAt ?? lastMsg.sentAt ?? lastMsg.created_at ?? lastMsg.sent_at ??
                lastMsg.createdDate ?? lastMsg.createdOn ?? lastMsg.createdAtUtc ?? lastMsg.sentAtUtc ??
                lastMsg.updatedAt ?? lastMsg.updated_at ?? lastMsg.updatedAtUtc ??
                lastMsg.data?.createdAt ?? lastMsg.data?.sentAt ?? lastMsg.data?.created_at ?? lastMsg.data?.sent_at ??
                lastMsg.data?.createdDate ?? lastMsg.data?.createdOn ?? lastMsg.data?.createdAtUtc ?? lastMsg.data?.sentAtUtc ??
                lastMsg.data?.updatedAt ?? lastMsg.data?.updated_at ?? lastMsg.data?.updatedAtUtc ??
                ''
              )
            : '';

          const fallbackThreadTime = String(item?.updatedAt ?? item?.createdAt ?? '');

          const resolvedUpdatedAt = lastMessageAt || fallbackThreadTime;

          const finalLastMsg = orderedMsgs.reduce((latest, current) => {
            return getMessageTimestamp(current) >= getMessageTimestamp(latest) ? current : latest;
          }, msgs[0]);
          const unreadCount = msgs.filter(
            (m: any) => m?.senderType === 'Staff' || m?.senderRole === 'Staff'
          ).length;

          let imageUris: string[] = [];
          try {
            const detail = await feedbackApi.getById(feedbackId);
            imageUris = getAllFeedbackImages(detail);
          } catch {
            imageUris = [];
          }

          return {
            feedbackId,
            title: String(item?.title ?? 'Phản ánh chưa có tiêu đề'),
            code: String(item?.code ?? item?.feedbackCode ?? `FB-${feedbackId}`),
            status: String(item?.status ?? 'SUBMITTED'),
            imageUris,
            unreadCount,
            lastMessage: String(finalLastMsg?.messageText ?? finalLastMsg?.content ?? finalLastMsg?.message ?? ''),
            updatedAt: resolvedUpdatedAt,
          } as SupportThread;
        })
      );

      return threads;
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes to avoid redundant fetches
    gcTime: 1000 * 60 * 30,
    initialData: [],
    enabled: authReady && !!user,
  });

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          console.log('[Inbox] focus refetch start', { authReady, user: !!user, time: Date.now() });
          await Promise.all([refetchAi?.(), refetchSupport?.()]);
          console.log('[Inbox] focus refetch done', {
            aiFetched: !!(refetchAi as any)?._result || aiFetched,
            supportFetched: !!(refetchSupport as any)?._result || supportFetched,
            aiLen: Array.isArray(aiData) ? aiData.length : 0,
            supportLen: Array.isArray(supportThreads) ? supportThreads.length : 0,
            aiFetching,
            supportFetching,
            time: Date.now(),
          });
        } catch (err) {
          console.log('[Inbox] focus refetch error', err);
        }
        if (!mounted) return;
      })();
      return () => { mounted = false; };
    }, [refetchAi, refetchSupport])
  );

  const aiConversations = useMemo(() => (Array.isArray(aiData) ? aiData : []), [aiData]);
  console.log('[Inbox] useMemo aiConversations recalculated', { len: Array.isArray(aiConversations) ? aiConversations.length : 0, time: Date.now() });
  const supportFeedbacks = useMemo(() => (Array.isArray(supportThreads) ? supportThreads : []), [supportThreads]);
  console.log('[Inbox] useMemo supportFeedbacks recalculated', { len: Array.isArray(supportFeedbacks) ? supportFeedbacks.length : 0, time: Date.now() });

  const isAuthBooting = !authReady || !user;
  const isAiInitiallyLoading = isAuthBooting || (!aiFetched && (aiFetching || aiLoading));
  const isSupportInitiallyLoading = isAuthBooting || (!supportFetched && (supportFetching || supportLoading));

  const isInboxReady = Boolean(authReady && user && aiFetched && supportFetched);
  const isInboxLoading = !isInboxReady;
  const isInitialLoad = Boolean(isAuthBooting || !aiFetched || !supportFetched);
  const hasHistoricData = aiConversations.length > 0 || supportFeedbacks.length > 0;
  const isInitialInboxLoad = isInboxLoading && !hasHistoricData;
  const isRefetchingWithData = !isInitialLoad && (aiFetching || supportFetching) && hasHistoricData;

  console.log('[Inbox] render', {
    activeTab,
    isInboxReady,
    isInboxLoading,
    isInitialLoad,
    isInitialInboxLoad,
    isRefetchingWithData,
    authReady,
    user: !!user,
    aiLoading,
    aiFetching,
    aiFetched,
    aiLen: Array.isArray(aiConversations) ? aiConversations.length : 0,
    supportLoading,
    supportFetching,
    supportFetched,
    supportLen: Array.isArray(supportFeedbacks) ? supportFeedbacks.length : 0,
    time: Date.now(),
  });

  // ── Skeleton data ──────────────────────────────────────────────────────────
  const aiSkeletonData = useMemo(
    () => aiLoading
      ? Array.from({ length: 4 }, (_, i) => ({ id: `sk-${i}`, _skeleton: true, _index: i }))
      : aiConversations,
    [aiLoading, aiConversations]
  );
  console.log('[Inbox] useMemo aiSkeletonData recalculated', { len: Array.isArray(aiSkeletonData) ? aiSkeletonData.length : 0, aiLoading, time: Date.now() });

  const supportSkeletonData = useMemo(
    () => isSupportInitiallyLoading
      ? Array.from({ length: 3 }, (_, i) => ({ feedbackId: `sk-${i}`, _skeleton: true, _index: i }))
      : supportFeedbacks,
    [isSupportInitiallyLoading, supportFeedbacks]
  );

  const handleTabPress = useCallback(
    (tab: TabKey) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveTab(tab);
      Animated.spring(tabIndicatorAnim, {
        toValue: tab === 'ai' ? 0 : 1,
        useNativeDriver: true,
        damping: D.springDamping,
        stiffness: D.springStiffness,
      }).start();
    },
    [tabIndicatorAnim]
  );

  // ── Tab switch — spring physics ────────────────────────────────────────────

  const tabW = (screenWidth - 40) / 2;
  const indicatorX = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabW],
  });

  // ── Navigation (DO NOT MODIFY) ─────────────────────────────────────────────
  const handleAiItemPress   = useCallback((item: AiConversationItem) => router.push(`/(resident)/ai/${item.id}`), [router]);
  const handleNewAi         = useCallback(() => router.push('/(resident)/ai/ai-assistant'), [router]);
  const handleSupportPress  = useCallback((item: SupportThread) => router.push(`/(resident)/tickets/${item.feedbackId}/chat`), [router]);
  const handleSelectFeedback = useCallback(() => router.push('/(resident)/support/select-feedback'), [router]);

  // AI header is now a stable screen-level component rendered above the FlatList.

  const SupportEmpty = useCallback(
    () => <SupportEmptyState onPress={handleSelectFeedback} />,
    [handleSelectFeedback]
  );

  if (isInitialInboxLoad) {
    return (
      <SafeAreaView style={rootStyles.safe} edges={['top']}>
        <View style={rootStyles.initialLoadingRoot}>
          <ActivityIndicator size="large" color={D.aiPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={rootStyles.safe} edges={['top']}>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <View style={rootStyles.header}>
        <View>
          <View style={rootStyles.eyebrowRow}>
            <View style={rootStyles.eyebrowDot} />
            <Text style={rootStyles.eyebrowText}>UrbanMind</Text>
          </View>
          <Text style={rootStyles.pageTitle}>Hộp thư</Text>
          <Text style={rootStyles.pageSubtitle}>Trao đổi với AI hoặc phản ánh của bạn</Text>
        </View>
        <View style={rootStyles.headerActions}>
          <Pressable
            hitSlop={12}
            style={({ pressed }) => [rootStyles.searchBtn, pressed && { opacity: 0.7 }]}
            accessibilityLabel="Tìm kiếm"
          >
            <Icon name="search" size={18} color={semantics.text.secondary} />
          </Pressable>
        </View>
      </View>

      {/* ── Segmented Control ───────────────────────────────────────────────── */}
      <View style={tabStyles.wrap}>
        <Animated.View
          style={[tabStyles.indicator, { width: tabW - 4, transform: [{ translateX: indicatorX }] }]}
        />
        <Pressable
          style={tabStyles.tab}
          onPress={() => handleTabPress('ai')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'ai' }}
        >
          <View style={tabStyles.tabContent}>
            <Icon name="cpu" size={13} color={activeTab === 'ai' ? D.aiPrimary : semantics.text.lightMuted} />
            <Text style={[tabStyles.tabLabel, activeTab === 'ai' && tabStyles.tabLabelActive]}>AI Assistant</Text>
          </View>
        </Pressable>
        <Pressable
          style={tabStyles.tab}
          onPress={() => handleTabPress('support')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'support' }}
        >
          <View style={tabStyles.tabContent}>
            <Icon name="message-square" size={13} color={activeTab === 'support' ? D.aiPrimary : semantics.text.lightMuted} />
            <Text style={[tabStyles.tabLabel, activeTab === 'support' && tabStyles.tabLabelActive]}>Hỗ trợ phản ánh</Text>
          </View>
        </Pressable>
      </View>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <View style={{ flex: 1, position: 'relative' }}>
        <View style={[tabContentStyles.tabPane, activeTab === 'ai' ? tabContentStyles.tabVisible : tabContentStyles.tabHidden]}>
          {isAiInitiallyLoading ? (
            <View style={tabContentStyles.loadingRoot}>
              <ActivityIndicator size={"large"} color={D.aiPrimary} />
              <Text style={tabContentStyles.loadingText}>Đang tải hộp thư AI…</Text>
            </View>
          ) : (
            <>
              <View style={tabContentStyles.aiHeaderWrap}>
                <AIHeroCard onPress={handleNewAi} />
                {aiConversations.length > 0 && !aiLoading && (
                  <View style={tabContentStyles.sectionLabelRow}>
                    <View style={tabContentStyles.sectionLine} />
                    <Text style={tabContentStyles.sectionLabel}>Lịch sử</Text>
                    <View style={tabContentStyles.sectionLine} />
                  </View>
                )}
              </View>

              <FlatList
                key="ai"
                style={{ flex: 1 }}
                ref={aiListRef}
                extraData={[isInboxLoading, isAuthBooting, aiConversations.length]}
                data={aiSkeletonData as any[]}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                  tabContentStyles.listContent,
                  aiConversations.length === 0 && !aiLoading && tabContentStyles.flexGrow,
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={aiRefetching} onRefresh={refetchAi} tintColor={D.aiPrimary} />
                }
                ListEmptyComponent={!aiLoading ? <AiEmptyHint onPress={handleNewAi} /> : null}
                renderItem={({ item, index }: { item: any; index: number }) => {
                  if (item._skeleton) return <AiRowSkeleton index={item._index ?? index} />;
                  return <AiConversationRow item={item} index={index} onPress={() => handleAiItemPress(item)} />;
                }}
                ItemSeparatorComponent={() => <View style={tabContentStyles.separator} />}
              />
            </>
          )}
        </View>

        <View style={[tabContentStyles.tabPane, activeTab === 'support' ? tabContentStyles.tabVisible : tabContentStyles.tabHidden]}>
          {isSupportInitiallyLoading ? (
            <View style={tabContentStyles.loadingRoot}>
              <ActivityIndicator size="large" color={D.aiPrimary} />
              <Text style={tabContentStyles.loadingText}>Đang tải hộp thư hỗ trợ…</Text>
            </View>
          ) : (
            <FlatList
              key="support"
              style={{ flex: 1 }}
              ref={supportListRef}
              extraData={[isInboxLoading, isAuthBooting, supportFeedbacks.length]}
              data={supportSkeletonData as any[]}
              keyExtractor={(item, i) => String(item?.feedbackId ?? i)}
              contentContainerStyle={[
                tabContentStyles.listContent,
                supportFeedbacks.length === 0 && tabContentStyles.flexGrow,
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={supportRefetching} onRefresh={refetchSupport} tintColor={D.aiPrimary} />
              }
              ListEmptyComponent={!isSupportInitiallyLoading ? <SupportEmpty /> : null}
              renderItem={({ item, index }: { item: any; index: number }) => {
                if (item._skeleton) return <SupportRowSkeleton index={item._index ?? index} />;
                return <SupportFeedbackCard item={item} index={index} onPress={() => handleSupportPress(item)} />;
              }}
              ItemSeparatorComponent={() => <View style={tabContentStyles.separator} />}
            />
          )}
        </View>
      </View>

      {isRefetchingWithData && (
        <View style={tabContentStyles.refetchOverlay} pointerEvents="none">
          <View style={tabContentStyles.refetchOverlayCard}>
            <ActivityIndicator size="large" color={D.aiPrimary} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const rootStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: D.appBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  initialLoadingRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: D.appBg,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: D.aiPrimary,
  },
  eyebrowText: {
    fontFamily: 'Geist-Medium',
    fontSize: 10,
    color: D.aiPrimary,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontFamily: 'Geist-Bold',
    fontSize: 30,
    color: semantics.text.primary,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  pageSubtitle: {
    fontFamily: 'Geist-Regular',
    fontSize: 13,
    color: semantics.text.muted,
    marginTop: 2,
  },
  searchBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: semantics.bg.surfaceSubtle,
    borderWidth: 1,
    borderColor: semantics.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
});

const tabStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: D.segBg,
    borderRadius: 16,
    padding: 4,
    position: 'relative',
    height: 46,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 13,
    backgroundColor: D.segIndicator,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tabLabel: {
    fontFamily: 'Geist-Medium',
    fontSize: 13,
    color: semantics.text.lightMuted,
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    fontFamily: 'Geist-SemiBold',
    color: semantics.text.primary,
  },
});

const tabContentStyles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 124,
    paddingTop: 4,
  },
  flexGrow: { flexGrow: 1 },
  tabPane: {
    flex: 1,
  },
  tabVisible: {
    opacity: 1,
    position: 'relative',
    pointerEvents: 'auto',
  },
  tabHidden: {
    opacity: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  loadingRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  initialOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  refetchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  refetchOverlayCard: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.98)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 8,
  },
  loadingText: {
    marginTop: 18,
    fontFamily: 'Geist-Medium',
    fontSize: 15,
    color: semantics.text.muted,
  },
  aiHeaderWrap: { marginBottom: 4 },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: 2,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: semantics.border.light,
  },
  sectionLabel: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 11,
    color: semantics.text.lightMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  separator: {
    height: 1,
    backgroundColor: semantics.border.light,
    marginLeft: 60,
  },
});

// ─── Hero Card Styles ─────────────────────────────────────────────────────────

const heroStyles = StyleSheet.create({
  outerShell: {
    borderRadius: 26,
    backgroundColor: D.heroBg,
    borderWidth: 1,
    borderColor: D.heroBorder,
    padding: 3,
    marginBottom: 0,
    marginTop: 4,
    shadowColor: D.aiPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 5,
  },
  innerCore: {
    backgroundColor: D.heroCard,
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(11,86,217,0.05)',
  },
  glowOrb: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: D.heroGlow,
    top: -48,
    right: -28,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  botShell: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(11,86,217,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(11,86,217,0.16)',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botCore: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: D.aiPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: D.aiPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.34,
    shadowRadius: 8,
    elevation: 4,
  },
  textBlock: { flex: 1 },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  eyebrowDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: D.aiPrimary,
  },
  eyebrowText: {
    fontFamily: 'Geist-Medium',
    fontSize: 10,
    color: D.heroEyebrow,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: 'Geist-Bold',
    fontSize: 18,
    color: D.heroTitle,
    letterSpacing: -0.3,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  onlineText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 10,
    color: '#059669',
  },
  heroSub: {
    fontFamily: 'Geist-Regular',
    fontSize: 13,
    color: D.heroSub,
    lineHeight: 19,
    marginBottom: 16,
  },
  // CTA button embedded inside hero card
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.aiPrimary,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 18,
    gap: 10,
    shadowColor: D.aiPrimary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 14,
    color: D.white,
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
});

// ─── Feedback Thumbnail Styles (shell + collage grid) ───────────────────────────

const thumbStyles = StyleSheet.create({
  shell: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 18,
    backgroundColor: semantics.bg.surfaceSubtle,
    borderWidth: 1,
    borderColor: semantics.border.light,
    padding: 3,
    flexShrink: 0,
    position: 'relative',
  },
  core: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: semantics.bg.surfaceSubtle,
  },
  // Single image fills the whole core
  full: {
    width: '100%',
    height: '100%',
  },
  // 2×2 grid
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  cell: {
    width: HALF,
    height: HALF,
    position: 'relative',
    overflow: 'hidden',
  },
  cellImg: {
    width: '100%',
    height: '100%',
  },
  cellEmpty: {
    width: '100%',
    height: '100%',
    backgroundColor: semantics.bg.surfaceSubtle,
  },
  // "+N more" dark overlay on last cell
  extraOverlay: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraText: {
    fontFamily: 'Geist-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: semantics.bg.surfaceSubtle,
  },
  unreadOrb: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: D.aiPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: D.appBg,
  },
  unreadOrbText: {
    fontFamily: 'Geist-Bold',
    fontSize: 10,
    color: D.white,
  },
});

// ─── AI Row Styles ────────────────────────────────────────────────────────────

const aiRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  badgeShell: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(11,86,217,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(11,86,217,0.11)',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCore: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: semantics.bg.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 3 },
  title: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 14,
    color: semantics.text.primary,
    letterSpacing: -0.1,
  },
  preview: {
    fontFamily: 'Geist-Regular',
    fontSize: 12,
    color: semantics.text.muted,
    lineHeight: 16,
  },
  trail: { alignItems: 'flex-end', gap: 4 },
  time: {
    fontFamily: 'Geist-Medium',
    fontSize: 11,
    color: semantics.text.lightMuted,
  },
});

// ─── Support Card Styles ──────────────────────────────────────────────────────

const supportStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
  },
  content: { flex: 1, gap: 3 },
  feedbackTitle: {
    fontFamily: 'Geist-Medium',
    fontSize: 14,
    color: semantics.text.primary,
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  feedbackTitleUnread: { fontFamily: 'Geist-SemiBold' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  unreadPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: semantics.bg.primarySoft,
  },
  unreadPillText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 10,
    color: D.aiPrimary,
  },
  timeText: {
    fontFamily: 'Geist-Regular',
    fontSize: 11,
    color: semantics.text.lightMuted,
  },
  lastMsg: {
    fontFamily: 'Geist-Regular',
    fontSize: 12,
    color: semantics.text.muted,
    marginTop: 2,
    lineHeight: 16,
  },
});

// ─── Empty State Styles ───────────────────────────────────────────────────────

const emptyStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 56,
  },
  illustShell: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(11,86,217,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(11,86,217,0.10)',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  illustCore: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
    backgroundColor: semantics.bg.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Geist-Bold',
    fontSize: 18,
    color: semantics.text.primary,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: semantics.text.muted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: semantics.bg.surface,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: semantics.border.default,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  ctaText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 14,
    color: semantics.text.primary,
  },
  ctaIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: semantics.bg.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── AI Empty Hint Styles ─────────────────────────────────────────────────────

const aiEmptyStyles = StyleSheet.create({
  wrap: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: 'flex-start',
    gap: 8,
  },
  hint: {
    fontFamily: 'Geist-Regular',
    fontSize: 13,
    color: semantics.text.muted,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  linkText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 13,
    color: D.aiPrimary,
  },
});

// ─── Skeleton Styles ──────────────────────────────────────────────────────────

const skStyles = StyleSheet.create({
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  aiBody: { flex: 1, gap: 7 },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
  },
  supportBody: { flex: 1, gap: 4 },
});
