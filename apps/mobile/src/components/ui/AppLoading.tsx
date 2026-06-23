import { ActivityIndicator, StyleSheet, StyleProp, Text, View, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, spacing, typography } from '@/constants/theme';

interface AppLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  style?: StyleProp<ViewStyle>;
  visible?: boolean;
  message?: string;
}

export const AppLoading = ({
  size = 'md',
  color,
  style,
  visible = true,
  message,
}: AppLoadingProps) => {
  if (!visible) return null;

  const getSize = () => {
    switch (size) {
      case 'sm':
        return 20;
      case 'md':
        return 30;
      case 'lg':
        return 40;
      default:
        return 30;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={getSize()} color={color ?? colors.primary} />
      {message && (
        <Text style={{ marginTop: spacing.sm, fontSize: typography.md, color: colors.text }}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    margin: spacing.md,
  },
});