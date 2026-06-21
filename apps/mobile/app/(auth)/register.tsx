import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth.store';
import { useState } from 'react';
import { colors } from '@/constants/theme';
import Icon from '@expo/vector-icons/Feather';

const getRegisterErrorMessage = (message?: string | null) => {
  if (!message) return null;

  const normalized = message.toLowerCase();

  if (
    normalized.includes('invalid credentials') ||
    normalized.includes('unauthorized') ||
    normalized.includes('401')
  ) {
    return 'Thông tin đăng ký chưa hợp lệ. Vui lòng thử lại.';
  }

  if (normalized.includes('network') || normalized.includes('failed to fetch')) {
    return 'Không thể kết nối máy chủ. Vui lòng thử lại sau.';
  }

  return message;
};

export default function RegisterScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    setError(null);

    if (!trimmedName || !trimmedEmail || !password.trim()) {
      setError('Vui lòng nhập đầy đủ họ tên, email và mật khẩu.');
      return;
    }

    try {
      // Mock registration: currently reuse login flow.
      await login(trimmedEmail, password);
      const currentUser = useAuthStore.getState().user;
      const currentError = useAuthStore.getState().error;

      if (!currentUser) {
        setError(
          getRegisterErrorMessage(currentError) ||
            'Thông tin đăng ký chưa hợp lệ. Vui lòng thử lại.'
        );
        return;
      }

      router.replace('/');
    } catch (err: any) {
      setError(
        getRegisterErrorMessage(err?.message) ||
          'Đăng ký thất bại. Vui lòng thử lại.'
      );
    }
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

          <Text style={styles.title}>Đăng ký</Text>
          <Text style={styles.subtitle}>
            Tạo tài khoản để gửi phản ánh và theo dõi cập nhật khu vực của bạn
          </Text>

          <View style={styles.card}>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrapper}>
                  <Icon name="user" size={18} color={colors.muted} />
                </View>
                <TextInput
                  placeholder="Nhập họ và tên"
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    if (error) setError(null);
                  }}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Địa chỉ email</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrapper}>
                  <Icon name="mail" size={18} color={colors.muted} />
                </View>
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
                  onPress={() => setPasswordVisible((prev) => !prev)}
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

            {error && (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={16} color={colors.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={handleRegister}
            >
              <View style={styles.primaryButtonContent}>
                <Text style={styles.primaryButtonText}>Đăng ký</Text>
                <Icon
                  name="arrow-right"
                  size={18}
                  color={colors.surface}
                  style={styles.primaryButtonIcon}
                />
              </View>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.secondaryButtonText}>Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>Bằng cách đăng ký, bạn đồng ý với</Text>
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
  inputRow: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
  },
  inputContainer: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
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
    marginBottom: 18,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
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
  termsContainer: {
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 16,
  },
  termsText: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
  },
  termsLine: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  termsHighlight: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.primary,
    fontWeight: '700',
  },
});