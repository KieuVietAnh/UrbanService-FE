import { TextInput, View, Text, StyleSheet, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface AppTextAreaProps {
  label?: string;
  placeholder?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  [key: string]: any; // Allow other TextInput props
}

export const AppTextArea = ({
  label,
  placeholder = '',
  error,
  containerStyle,
  inputStyle,
  ...props
}: AppTextAreaProps) => {
  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[
          styles.label,
          { color: hasError ? colors.red : colors.muted },
        ]}>
          {label}
        </Text>
      )}
      <TextInput
        {...props}
        placeholder={placeholder}
        multiline
        numberOfLines={4}
        style={[
          styles.input,
          { borderColor: hasError ? colors.red : colors.border },
          inputStyle,
        ]}
      />
      {error && (
        <Text style={[{ ...styles.error, color: colors.red }]}>
          {error}
        </Text>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: typography.medium as any,
    marginBottom: spacing.xs,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    fontSize: typography.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  error: {
    fontSize: typography.xs,
    marginTop: spacing.xs,
  },
});