import { TextInput, View, Text, StyleSheet, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface AppInputProps {
  label?: string;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  [key: string]: any; // Allow other TextInput props
}

export const AppInput = ({
  label,
  placeholder = '',
  error,
  secureTextEntry = false,
  containerStyle,
  inputStyle,
  ...props
}: AppInputProps) => {
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
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          { borderColor: hasError ? colors.red : colors.border },
          inputStyle,
        ]}
        {...props}
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
    height: spacing.lg,
    paddingHorizontal: spacing.md,
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