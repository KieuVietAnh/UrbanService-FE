import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { colors } from '@/constants/theme';
import Icon from '@expo/vector-icons/Feather';

export default function OTPScreen() {
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const otpInputRef = useRef<TextInput>(null);

  const handleOtpChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, '').slice(0, 6);
    setOtp(onlyNumbers);

    if (error) {
      setError(null);
    }
  };

  const handleVerify = () => {
    setError(null);

    if (otp.length !== 6) {
      setError('Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.');
      return;
    }

    // Mock OTP verification successful.
    router.replace('/');
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.blobTopLeft} />
        <View style={styles.blobBottomRight} />

        <View style={styles.content}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Icon name="grid" size={18} color={colors.surface} />
            </View>
            <Text style={styles.brandText}>UrbanMind</Text>
          </View>

          <Text style={styles.title}>Xác thực OTP</Text>
          <Text style={styles.subtitle}>
            Nhập mã 6 chữ số đã được gửi đến email của bạn để hoàn tất xác thực.
          </Text>

          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Icon name="shield" size={28} color={colors.primary} />
            </View>

            <Text style={styles.cardTitle}>Nhập mã xác thực</Text>
            <Text style={styles.cardSubtitle}>
              Mã OTP gồm 6 chữ số. Vui lòng kiểm tra hộp thư email của bạn.
            </Text>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Mã OTP</Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.otpBoxContainer}
                onPress={() => otpInputRef.current?.focus()}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = otp[index];
                  const isActive = otp.length === index;

                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        isActive ? styles.otpBoxActive : undefined,
                        digit ? styles.otpBoxFilled : undefined,
                      ]}
                    >
                      <Text style={styles.otpDigit}>{digit || ''}</Text>
                    </View>
                  );
                })}
              </TouchableOpacity>

              <TextInput
                ref={otpInputRef}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                style={styles.hiddenOtpInput}
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={16} color={colors.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={handleVerify}
            >
              <View style={styles.primaryButtonContent}>
                <Text style={styles.primaryButtonText}>Xác thực</Text>
                <Icon
                  name="arrow-right"
                  size={18}
                  color={colors.surface}
                  style={styles.primaryButtonIcon}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginButton}
              activeOpacity={0.75}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.backToLoginText}>Quay lại đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  blobTopLeft: {
    position: 'absolute',
    top: -90,
    left: -90,
    width: 220,
    height: 220,
    backgroundColor: colors.primarySoft,
    borderRadius: 110,
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 170,
    height: 170,
    backgroundColor: '#D1FAE5',
    borderRadius: 100,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandIcon: {
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputRow: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.red,
    fontWeight: '500',
  },
  primaryButton: {
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
  primaryButtonIcon: {
    marginLeft: 8,
  },
  backToLoginButton: {
    alignItems: 'center',
    marginTop: 18,
  },
  backToLoginText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  otpBoxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  otpDigit: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  hiddenOtpInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});