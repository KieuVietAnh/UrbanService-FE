import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { AppButton } from '@/components/ui/AppButton';
import { useAuthStore } from '@/features/auth/auth.store';
import { useToast } from '@/components/ui/Toast';
import { colors } from '@/constants/theme';

interface SettingRow {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text style={styles.sectionHeader}>{label}</Text>
  );
}

function SettingItem({ item }: { item: SettingRow }) {
  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [styles.settingItem, pressed && styles.settingItemPressed]}
    >
      <View style={[styles.settingIcon, item.destructive && styles.settingIconDestructive]}>
        <Icon
          name={item.icon as any}
          size={18}
          color={item.destructive ? '#EF4444' : colors.primary}
        />
      </View>
      <Text style={[styles.settingLabel, item.destructive && styles.settingLabelDestructive]}>
        {item.label}
      </Text>
      {!item.destructive && (
        <Icon name="chevron-right" size={16} color="#CBD5E1" />
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const fullName = (user as any)?.fullName ?? 'Người dùng';
  const phone = (user as any)?.phone ?? '';
  const email = user?.email ?? '';
  const initials = fullName
    .split(' ')
    .slice(-2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất khỏi UrbanMind?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const ACCOUNT_ROWS: SettingRow[] = [
    { icon: 'user', label: 'Thông tin cá nhân', onPress: () => toast.info('Coming soon') },
    { icon: 'map-pin', label: 'Địa chỉ thường dùng', onPress: () => toast.info('Coming soon') },
    { icon: 'bell', label: 'Cài đặt thông báo', onPress: () => toast.info('Coming soon') },
  ];

  const SUPPORT_ROWS: SettingRow[] = [
    { icon: 'help-circle', label: 'Hỗ trợ', onPress: () => toast.info('Coming soon') },
    { icon: 'shield', label: 'Điều khoản sử dụng', onPress: () => toast.info('Coming soon') },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-3 bg-surface border-b border-border-light">
        <Text className="text-xl font-sans-bold text-text">Tài khoản</Text>
        <Pressable
          onPress={() => router.push('/(resident)/notifications' as any)}
          style={styles.bellBtn}
          hitSlop={10}
        >
          <Icon name="bell" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ─── Avatar + Info ─── */}
        <View className="items-center py-8 bg-surface">
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarInitials}>{initials}</Text>
            <View style={styles.avatarEditBtn}>
              <Icon name="edit-2" size={12} color="#FFFFFF" />
            </View>
          </View>
          <Text className="text-xl font-sans-bold text-text mt-4">{fullName}</Text>
          {phone ? (
            <View className="flex-row items-center gap-1.5 mt-1">
              <Icon name="phone" size={13} color={colors.muted} />
              <Text className="text-sm text-text-muted">{phone}</Text>
            </View>
          ) : null}
          {email ? (
            <View className="flex-row items-center gap-1.5 mt-1">
              <Icon name="mail" size={13} color={colors.muted} />
              <Text className="text-sm text-text-muted">{email}</Text>
            </View>
          ) : null}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Đã gửi', value: '—' },
            { label: 'Đang xử lý', value: '—' },
            { label: 'Hoàn thành', value: '—' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={styles.statsDivider} />}
              <View className="flex-1 items-center">
                <Text className="text-xl font-sans-bold text-primary">{s.value}</Text>
                <Text className="text-xs text-text-muted mt-0.5 font-sans-medium">{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ─── Settings ─── */}
        <SectionHeader label="CÀI ĐẶT TÀI KHOẢN" />
        <View style={styles.settingsGroup}>
          {ACCOUNT_ROWS.map((row) => (
            <SettingItem key={row.label} item={row} />
          ))}
        </View>

        <SectionHeader label="HỖ TRỢ & PHÁP LÝ" />
        <View style={styles.settingsGroup}>
          {SUPPORT_ROWS.map((row) => (
            <SettingItem key={row.label} item={row} />
          ))}
        </View>

        {/* Logout */}
        <View className="px-5 mt-4">
          <AppButton
            variant="danger"
            size="lg"
            fullWidth
            leftIcon={<Icon name="log-out" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />}
            onPress={handleLogout}
          >
            Đăng xuất
          </AppButton>
        </View>

        {/* Version */}
        <View className="items-center mt-8">
          <Text className="text-xs text-text-light font-sans-semibold">
            UrbanMind v2.5.0
          </Text>
          <Text className="text-2xs text-text-light mt-0.5">
            Phát triển bởi Trung tâm Chuyển đổi số
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarInitials: {
    fontFamily: 'Geist-Bold',
    fontSize: 28,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 8,
  },
  statsDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
  },
  sectionHeader: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 11,
    color: '#94A3B8',
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  settingItemPressed: {
    backgroundColor: '#F8FAFC',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDestructive: {
    backgroundColor: '#FEE2E2',
  },
  settingLabel: {
    flex: 1,
    fontFamily: 'Geist-Medium',
    fontSize: 15,
    color: '#0F172A',
  },
  settingLabelDestructive: {
    color: '#EF4444',
  },
});