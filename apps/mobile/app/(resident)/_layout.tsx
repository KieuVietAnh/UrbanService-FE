import React from 'react';
import { Stack, usePathname, useRouter, type Href } from 'expo-router';
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui';
import { FloatingChatMenu } from '@/components/ui';
import { colors } from '@/constants/theme';

type NavItem = {
  label: string;
  icon: keyof typeof Icon.glyphMap;
  href?: Href;
  match?: string[];
  isFab?: boolean;
};

const RESIDENT_TAB_BAR_HEIGHT = 68;

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Trang chủ',
    icon: 'home',
    href: '/(resident)',
    match: ['/', '/(resident)', '/index'],
  },
  {
    label: 'Cộng đồng',
    icon: 'users',
    href: '/(resident)/community',
    match: ['/community'],
  },
  {
    label: 'Tạo phản ánh',
    icon: 'plus',
    href: '/(resident)/create-feedback',
    match: ['/create-feedback'],
    isFab: true,
  },
  {
    label: 'Hộp thư',
    icon: 'inbox',
    href: '/(resident)/inbox',
    match: ['/inbox'],
  },
  {
    label: 'Tài khoản',
    icon: 'user',
    href: '/(resident)/profile',
    match: ['/profile'],
  },
];

function TabItem({
  item,
  active,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 12, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 400 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  if (item.isFab) {
    return (
      <Pressable onPress={handlePress} style={styles.fabWrap}>
        <Animated.View style={[styles.fab, animStyle]}>
          <Icon name="plus" size={26} color="#FFFFFF" />
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress} style={styles.tabItem}>
      <Animated.View style={animStyle}>
        <View style={[styles.tabIconWrap, active && styles.tabIconActive]}>
          <Icon
            name={item.icon}
            size={20}
            color={active ? colors.primary : '#94A3B8'}
            strokeWidth={active ? 2.5 : 1.8}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            active ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function ResidentLayout() {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const normalizedPath = pathname.startsWith('/(resident)') ? pathname.replace('/(resident)', '') : pathname;
  const insets = useSafeAreaInsets();

  const isActive = (item: NavItem) => {
    const matches = item.match ?? [];
    return matches.some((m) => {
      const normalizedMatch = m.startsWith('/(resident)') ? m.replace('/(resident)', '') : m;
      if (normalizedMatch === '/' || normalizedMatch === '' || normalizedMatch === '/index') {
        return normalizedPath === '/' || normalizedPath === '' || normalizedPath === '/index';
      }
      return normalizedPath === normalizedMatch || normalizedPath.startsWith(`${normalizedMatch}/`);
    });
  };

  const handleTabPress = (item: NavItem) => {
    if (!item.href) return;
    router.replace(item.href);
  };

  const isHomePath = normalizedPath === '/' || normalizedPath === '' || normalizedPath === '/index';
  const hideBottomNav = normalizedPath === '/create-feedback' || normalizedPath === '/create-feedback-wizard' || normalizedPath.startsWith('/create-feedback');
  const tabBarHeight = RESIDENT_TAB_BAR_HEIGHT + insets.bottom;

  const handleFloatingSelect = async (id: 'ai' | 'staff' | 'inbox') => {
    if (id === 'ai') {
      router.push('/(resident)/ai/ai-assistant');
      return;
    }
    if (id === 'inbox') {
      router.replace('/(resident)/inbox');
      return;
    }
    // staff: choose feedback before opening staff chat
    router.push('/(resident)/support/select-feedback');
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.content, !hideBottomNav && { marginBottom: tabBarHeight }]}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </View>

      {isHomePath && !hideBottomNav ? <FloatingChatMenu bottomOffset={Math.max(86, insets.bottom + 72)} onSelectOption={handleFloatingSelect} /> : null}

      {/* Custom tab bar */}
      {!hideBottomNav ? (
        <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={86} tint="light" style={StyleSheet.absoluteFillObject} />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#FFFFFF' }]} />
          )}

          <View style={styles.tabBar}>
            {NAV_ITEMS.map((item) => (
              <TabItem
                key={item.label}
                item={item}
                active={isActive(item)}
                onPress={() => handleTabPress(item)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  tabBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226,232,240,0.82)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    paddingHorizontal: 4,
    height: RESIDENT_TAB_BAR_HEIGHT,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabIconWrap: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabIconActive: {
    backgroundColor: colors.primarySoft,
  },
  tabLabel: {
    fontSize: 10,
    textAlign: 'center',
    fontFamily: 'Geist-Medium',
  },
  tabLabelActive: {
    color: colors.primary,
    fontFamily: 'Geist-SemiBold',
  },
  tabLabelInactive: {
    color: '#94A3B8',
  },
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 6,
  },
});
