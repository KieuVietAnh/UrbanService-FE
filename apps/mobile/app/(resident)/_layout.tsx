import React from 'react';
import { Stack, Tabs, usePathname, useRouter, type Href } from 'expo-router';
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
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';

type NavItem = {
  label: string;
  icon: keyof typeof Icon.glyphMap;
  href?: Href;
  match?: string[];
  isFab?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Trang chủ',
    icon: 'home',
    href: '/(resident)',
    match: ['/', '/(resident)', '/index'],
  },
  {
    label: 'Phản ánh',
    icon: 'list',
    href: '/(resident)/tickets',
    match: ['/tickets'],
  },
  {
    label: 'Gửi phản ánh',
    icon: 'plus',
    href: '/(resident)/create-feedback',
    match: ['/create-feedback'],
    isFab: true,
  },
  {
    label: 'Gần đây',
    icon: 'map-pin',
    href: '/(resident)/community',
    match: ['/community'],
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
  const insets = useSafeAreaInsets();

  const isActive = (item: NavItem) => {
    const matches = item.match ?? [];
    return matches.some((m) => {
      if (m === '/' || m === '/(resident)' || m === '/index') {
        return pathname === '/' || pathname === '/(resident)';
      }
      return pathname === m || pathname.startsWith(`${m}/`);
    });
  };

  const handleTabPress = (item: NavItem) => {
    if (!item.href) return;
    router.replace(item.href);
  };

  const tabBarHeight = 64 + insets.bottom;

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </View>

      {/* Custom tab bar */}
      <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFillObject} />
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
    borderTopColor: 'rgba(226,232,240,0.8)',
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    paddingHorizontal: 4,
    height: 64,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 6,
  },
});