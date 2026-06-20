import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, spacing, typography } from '@/constants/theme';

interface AppErrorStateProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onRetry?: () => void;
}

export const AppErrorState = ({
  children,
  style,
  textStyle,
  onRetry,
}: AppErrorStateProps) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, textStyle]}>{children}</Text>
      {onRetry && (
        <View style={styles.buttonContainer}>
          {/* We'll use a button here, but for simplicity, we'll just add a placeholder */}
          {/* In practice, you'd use AppButton */}
          <Text style={styles.buttonText} onPress={onRetry}>
            Try Again
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  text: {
    textAlign: 'center',
    fontSize: typography.lg,
    color: colors.red,
    marginBottom: spacing.md,
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
  buttonText: {
    color: colors.primary,
    fontSize: typography.md,
    fontWeight: typography.semibold as any,
  },
});