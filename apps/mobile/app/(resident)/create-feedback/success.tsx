import { View, Text, StyleSheet } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { colors, radius } from '@/constants/theme';
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
        <AppCard style={styles.successCard}>
          {/* Success icon */}
          <View style={styles.successIcon}>
            <Text style={styles.successCheck}>✓</Text>
          </View>

          {/* Success message */}
          <Text style={styles.title}>Feedback đã được gửi thành công!</Text>
          <Text style={styles.message}>
            Cảm ơn bạn đã góp phần cải thiện cộng đồng.
          </Text>
        </AppCard>

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
    paddingTop: 24,
  },
  successCard: {
    padding: 24,
    borderRadius: radius.lg,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successCheck: {
    fontSize: 30,
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
    marginBottom: 24,
    maxWidth: 280,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 24,
  },
  finishButton: {
    paddingVertical: 16,
  },
});