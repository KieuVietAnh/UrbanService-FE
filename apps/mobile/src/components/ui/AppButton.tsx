import { Pressable, PressableProps, Text, StyleSheet, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface AppButtonProps extends PressableProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export const AppButton = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  textStyle,
  containerStyle,
  ...props
}: AppButtonProps) => {
  // Variant styles
  const variantStyles: { container: ViewStyle; text: TextStyle } = variant === 'primary'
    ? {
        container: { backgroundColor: colors.primary },
        text: { color: colors.surface },
      }
    : variant === 'secondary'
    ? {
        container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
        text: { color: colors.primary },
      }
    : variant === 'outline'
    ? {
        container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
        text: { color: colors.primary },
      }
    : variant === 'text'
    ? {
        container: { backgroundColor: 'transparent' },
        text: { color: colors.primary },
      }
    : {
        container: { backgroundColor: colors.primary },
        text: { color: colors.surface },
      };

  // Size styles
  const sizeStyles: { padding: number; borderRadius: number; text: { fontSize: number; fontWeight: any } } =
    size === 'sm'
      ? {
          padding: spacing.sm,
          borderRadius: radius.sm,
          text: { fontSize: typography.md, fontWeight: typography.semibold as any },
        }
      : size === 'md'
      ? {
          padding: spacing.md,
          borderRadius: radius.md,
          text: { fontSize: typography.lg, fontWeight: typography.semibold as any },
        }
      : size === 'lg'
      ? {
          padding: spacing.lg,
          borderRadius: radius.lg,
          text: { fontSize: typography.xl, fontWeight: typography.bold as any },
        }
      : {
          padding: spacing.md,
          borderRadius: radius.md,
          text: { fontSize: typography.lg, fontWeight: typography.semibold as any },
        };

  const computedContainerStyle: StyleProp<ViewStyle> = [
    variantStyles.container,
    { padding: sizeStyles.padding, borderRadius: sizeStyles.borderRadius },
    disabled ? { opacity: 0.5 } : {},
    containerStyle,
  ];

  const computedTextStyle: StyleProp<TextStyle> = [
    variantStyles.text,
    { fontSize: sizeStyles.text.fontSize, fontWeight: sizeStyles.text.fontWeight },
    textStyle,
  ];

  return (
    <Pressable
      disabled={disabled || loading}
      style={computedContainerStyle}
      {...props}
    >
      {loading ? (
        <Text style={[computedTextStyle, { letterSpacing: -0.5 }]}>
          Loading...
        </Text>
      ) : (
        <Text style={computedTextStyle}>{children}</Text>
      )}
    </Pressable>
  );
};