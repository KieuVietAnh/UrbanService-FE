import { View, Text, StyleSheet } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { colors } from '@/constants/theme';
import { useCreateFeedbackStore } from '@/features/feedback/createFeedback.store';
import { useRouter } from 'expo-router';

export default function SuccessScreen() {
  const router = useRouter();
  const { reset } = useCreateFeedbackStore();

  const handleFinish = () => {
    // Reset the store
    reset();
    // Navigate back to home
    router.replace('/(resident)');
  };

  return (
    <AppScreen>
      <View style={styles.content}>
        {/* Success icon */}
        <View style={styles.successIcon}>
          <Text style={styles.successCheck}>✓</Text>
        </View>

        {/* Success message */}
        <Text style={styles.title}>Feedback đã được gửi thành công!</Text>
        <Text style={styles.message}>
          Cảm giá bạn đã góp phần cải thiện cộng đồng.
        </Text>

        {/* Finish button */}
        <View style={styles.buttonContainer}>
          <AppButton
            variant="primary"
            onPress={handleFinish}
            style={styles.finishButton}
          >
            Hoàn tất
          </AppButton>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  successCheck: {
    fontSize: 32,
    color: colors.primary,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 280,
  },
  buttonContainer: {
    width: '100%',
  },
  finishButton: {
    paddingVertical: 16,
  },
});