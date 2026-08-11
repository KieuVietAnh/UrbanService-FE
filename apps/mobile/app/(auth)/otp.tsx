import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { AppButton } from '@/components/ui/AppButton';
import { OTPInput } from '@/components/ui/OTPInput';
import { useAuthStore } from '@/features/auth/auth.store';
import { useToast } from '@/components/ui/Toast';
import { colors } from '@/constants/theme';

const RESEND_SECONDS = 60;

export default function OTPScreen() {
  const router = useRouter();
  const toast = useToast();
  const { phone } = useLocalSearchParams<{ phone?: string }>();

  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [otp, setOtp] = useState('');
  const [hasError, setHasError] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  // countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length < 6) {
      setHasError(true);
      return;
    }
    setHasError(false);
    try {
      await verifyOtp(phone ?? '', otp);
      router.replace('/(resident)');
    } catch {
      setHasError(true);
      toast.error('Mã OTP không chính xác. Vui lòng thử lại.');
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await sendOtp(phone ?? '');
      setCountdown(RESEND_SECONDS);
      setOtp('');
      setHasError(false);
      toast.success('Đã gửi lại mã OTP');
    } catch {
      toast.error('Không thể gửi lại OTP. Thử lại sau.');
    }
  };

  const maskedPhone = phone
    ? phone.slice(0, 3) + ' *** ' + phone.slice(-3)
    : '***';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Back */}
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
        <Icon name="arrow-left" size={20} color={colors.primary} />
      </Pressable>

      <View style={styles.container}>
        {/* Shield illustration */}
        <View style={styles.illustrationWrap}>
          <View style={styles.shieldBig}>
            <Icon name="shield" size={48} color={colors.primary} />
          </View>
          <View style={styles.shieldFloat1}>
            <Icon name="lock" size={18} color={colors.primary} />
          </View>
          <View style={styles.shieldFloat2}>
            <Icon name="check" size={14} color="#10B981" />
          </View>
        </View>

        {/* Title */}
        <Text className="text-2xl font-sans-bold text-text text-center mb-2" style={{ letterSpacing: -0.4 }}>
          Xác thực số điện thoại
        </Text>
        <Text className="text-sm text-text-muted text-center mb-8 leading-relaxed">
          Nhập mã OTP đã được gửi đến số{'\n'}
          <Text className="font-sans-semibold text-text">{maskedPhone}</Text>
        </Text>

        {/* OTP Input */}
        <View style={styles.otpWrap}>
          <OTPInput length={6} value={otp} onChange={setOtp} error={hasError} />
        </View>

        {/* Resend */}
        <Pressable onPress={handleResend} disabled={countdown > 0} style={styles.resendBtn}>
          <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
            {countdown > 0 ? `Gửi lại mã sau ${countdown}s` : 'Gửi lại mã OTP'}
          </Text>
        </Pressable>

        {/* Verify */}
        <AppButton
          onPress={handleVerify}
          loading={isLoading}
          fullWidth
          size="lg"
          disabled={otp.length < 6}
        >
          Xác thực
        </AppButton>

        {/* Help */}
        <Pressable className="mt-6 self-center" hitSlop={10}>
          <Text className="text-sm text-text-muted text-center">
            Bạn cần hỗ trợ?{' '}
            <Text className="text-primary font-sans-semibold">Liên hệ tổng đài</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  backBtn: {
    margin: 16,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    alignItems: 'stretch',
  },
  illustrationWrap: {
    alignSelf: 'center',
    width: 160,
    height: 160,
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 80,
    position: 'relative',
  },
  shieldBig: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#DBEAFE',
    alignItems: 'center', justifyContent: 'center',
  },
  shieldFloat1: {
    position: 'absolute', top: 16, right: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0052CC', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  shieldFloat2: {
    position: 'absolute', bottom: 18, left: 20,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center', justifyContent: 'center',
  },
  otpWrap: {
    marginBottom: 20,
  },
  resendBtn: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 14,
    color: colors.primary,
  },
  resendDisabled: {
    color: '#94A3B8',
  },
});