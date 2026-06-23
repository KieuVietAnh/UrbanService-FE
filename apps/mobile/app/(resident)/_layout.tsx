import { Stack, usePathname, useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '@expo/vector-icons/Feather';
import { colors } from '@/constants/theme';

type NavItem = {
  label: string;
  icon: keyof typeof Icon.glyphMap;
  href?: Href;
  match?: string[];
};

export default function ResidentLayout() {
  const router = useRouter();
  const pathname = usePathname() ?? '/';

  const navItems: NavItem[] = [
    {
      label: 'Trang chủ',
      icon: 'home',
      href: '/(resident)',
      match: ['/', '/(resident)'],
    },
    {
      label: 'Gửi phản ánh',
      icon: 'plus-circle',
      href: '/(resident)/create-feedback',
      match: ['/create-feedback'],
    },
    {
      label: 'Phản ánh',
      icon: 'list',
      href: '/(resident)/tickets',
      match: ['/tickets'],
    },
    {
      label: 'Gần đây',
      icon: 'clock',
      match: [],
    },
    {
      label: 'Tài khoản',
      icon: 'user',
      href: '/(resident)/profile',
      match: ['/profile'],
    },
  ];

  const isActiveTab = (item: NavItem) => {
    const matches = item.match ?? [];

    return matches.some((match) => {
      if (match === '/') {
        return pathname === '/';
      }

      return pathname === match || pathname.startsWith(`${match}/`);
    });
  };

  const handleTabPress = (item: NavItem) => {
    if (!item.href) return;

    router.replace(item.href);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: {
              backgroundColor: colors.background,
            },
          }}
        />
      </View>

      <View style={styles.bottomNav}>
        {navItems.map((item) => {
          const active = isActiveTab(item);
          const disabled = !item.href;

          return (
            <TouchableOpacity
              key={item.label}
              activeOpacity={disabled ? 1 : 0.78}
              onPress={() => handleTabPress(item)}
              style={styles.navItem}
            >
              <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
                <Icon
                  name={item.icon}
                  size={20}
                  color={active ? colors.surface : '#4B5563'}
                />
              </View>

              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 78,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrap: {
    width: 46,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    overflow: 'hidden',
  },
  navIconWrapActive: {
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  navLabel: {
    fontSize: 10.5,
    lineHeight: 13,
    color: '#4B5563',
    textAlign: 'center',
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});