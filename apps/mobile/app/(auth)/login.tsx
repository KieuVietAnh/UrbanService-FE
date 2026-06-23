import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth.store';
import { useCallback, useState } from 'react';
import { colors } from '@/constants/theme';
import Icon from '@expo/vector-icons/Feather';

const getLoginErrorMessage = (message?: string | null) => {
  if (!message) return null;

  const normalized = message.toLowerCase();

  if (
    normalized.includes('invalid credentials') ||
    normalized.includes('unauthorized') ||
    normalized.includes('401')
  ) {
    return 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.';
  }

  if (
    normalized.includes('network') ||
    normalized.includes('failed to fetch')
  ) {
    return 'Không thể kết nối máy chủ. Vui lòng thử lại sau.';
  }

  return message;
};

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      setError(null);
    }, [])
  );
  const visibleError = getLoginErrorMessage(error);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleLogin = async () => {
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    try {
      await login(trimmedEmail, trimmedPassword);

      const { user, error: storeError } = useAuthStore.getState();
      if (storeError) {
        setError(getLoginErrorMessage(storeError) || 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
        return;
      }
      if (user) {
        // Redirect based on role
        if (user.role === 'service-user') {
          router.replace('/(resident)');
        } else if (user.role === 'system-staff') {
          router.replace('/(staff)');
        } else {
          // Fallback to home
          router.replace('/');
        }
      } else {
        setError('Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setError(getLoginErrorMessage(err?.message) || 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
    }
  };

  const handleTogglePassword = () => {
    setPasswordVisible(!passwordVisible);
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        {/* Background blobs */}
        <View style={styles.blobTopLeft} />
        <View style={styles.blobBottomRight} />

        {/* Main content */}
        <View style={styles.content}>
          {/* Brand row */}
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Icon name="grid" size={20} color={colors.surface} />
            </View>
            <Text style={styles.brandText}>UrbanMind</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Đăng nhập</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Tiếp tục theo dõi phản ánh và cập nhật khu vực của bạn
          </Text>

          {/* White login card */}
          <View style={styles.card}>
            {/* Email input */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Email hoặc số điện thoại</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrapper}>
                  <Icon name="mail" size={18} color={colors.muted} />
                </View>
                <View style={styles.inputField}>
                  <TextInput
                    placeholder="username@email.com"
                    placeholderTextColor={colors.muted}
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (error) setError(null);
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                </View>
              </View>
            </View>

            {/* Password input */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>

              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrapper}>
                  <Icon name="lock" size={18} color={colors.muted} />
                </View>

                <TextInput
                  placeholder="••••••"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (error) setError(null);
                  }}
                  secureTextEntry={!passwordVisible}
                  style={styles.passwordInput}
                />

                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={handleTogglePassword}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={passwordVisible ? 'eye-off' : 'eye'}
                    size={18}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error message */}
            {visibleError && (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={16} color={colors.red} />
                <Text style={styles.errorText}>{visibleError}</Text>
              </View>
            )}

            {/* Forgot password link */}
            <TouchableOpacity style={styles.forgotPassword} activeOpacity={0.7}>
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {/* Primary button */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabledButton]}
              disabled={isLoading}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <View style={styles.primaryButtonContent}>
                <Text style={styles.primaryButtonText}>Đăng nhập</Text>
                <Icon name="arrow-right" size={18} color={colors.surface} style={styles.primaryButtonIcon} />
              </View>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Secondary button */}
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.secondaryButtonText}>Đăng ký tài khoản mới</Text>
            </TouchableOpacity>
          </View>

          {/* City illustration */}
          <View style={styles.cityIllustration}>
            <View style={[styles.cityBuilding, styles.cityBuildingSmall]} />
            <View style={[styles.cityBuilding, styles.cityBuildingMedium]} />
            <View style={[styles.cityBuilding, styles.cityBuildingTall]} />
            <View style={[styles.cityBuilding, styles.cityBuildingWide]} />
            <View style={[styles.cityBuilding, styles.cityBuildingMedium]} />
            <View style={[styles.cityBuilding, styles.cityBuildingSmall]} />
          </View>

          {/* Bottom legal text */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>Bằng cách đăng nhập, bạn đồng ý với</Text>
            <Text style={styles.termsLine}>
              <Text style={styles.termsHighlight}>Điều khoản sử dụng</Text>
              <Text style={styles.termsText}> và </Text>
              <Text style={styles.termsHighlight}>Chính sách bảo mật</Text>
            </Text>
            <Text style={styles.termsText}>của UrbanMind.</Text>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // #F8FAFC
    position: 'relative',
  },
  blobTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 200,
    height: 200,
    backgroundColor: colors.primarySoft, // #EFF6FF
    borderRadius: 100,
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 160,
    height: 160,
    backgroundColor: '#D1FAE5', // emerald-100 (light green)
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
    marginBottom: 12,
  },
  brandIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary, // #0052CC
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  brandIconText: {
    // We are now using Icon, so we can remove this or keep for fallback.
    // We'll keep it but set to zero size? Better to remove if not used.
    // We'll keep the Icon component only.
    fontSize: 0, // Not used
  },
  brandText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary, // #0052CC
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text, // #0F172A
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted, // #64748B
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.surface, // #FFFFFF
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border, // #E2E8F0
    borderRadius: 8,
    overflow: 'hidden',
  },
  inputIconWrapper: {
    width: 44,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  inputField: {
    flex: 1,
  },
  input: {
    flex: 1,
    height: 54,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.text,
  },
  passwordInput: {
    flex: 1,
    height: 54,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.text,
  },
  passwordToggle: {
    width: 44,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 2,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.red,
    fontWeight: '500',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 18,
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  primaryButton: {
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.5,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    paddingHorizontal: 14,
    letterSpacing: 0.6,
  },
  secondaryButton: {
    height: 54,
    borderWidth: 1.4,
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  cityIllustration: {
    height: 88,
    marginTop: 24,
    marginHorizontal: 2,
    borderRadius: 16,
    backgroundColor: '#EEF2F7',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 14,
    opacity: 0.9,
  },
  cityBuilding: {
    backgroundColor: '#CBD5E1',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  cityBuildingSmall: {
    width: 18,
    height: 26,
  },
  cityBuildingMedium: {
    width: 24,
    height: 42,
  },
  cityBuildingTall: {
    width: 28,
    height: 60,
  },
  cityBuildingWide: {
    width: 42,
    height: 48,
  },
  termsContainer: {
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 16,
  },
  termsText: {
    fontSize: 11,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center',
  },
  termsLine: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
  },
  termsHighlight: {
    fontSize: 11,
    lineHeight: 18,
    color: colors.primary,
    fontWeight: '700',
  },
});