import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, spacing, typography } from '@/constants/theme';

interface AppEmptyStateProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const AppEmptyState = ({
  children,
  style,
  textStyle,
}: AppEmptyStateProps) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, textStyle]}>{children}</Text>
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
    color: colors.muted,
  },
});