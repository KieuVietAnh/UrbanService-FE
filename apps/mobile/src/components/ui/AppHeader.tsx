import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, spacing, typography } from '@/constants/theme';

interface AppHeaderProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export const AppHeader = ({
  left,
  center,
  right,
  style,
  contentStyle,
}: AppHeaderProps) => {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.content, contentStyle]}>
        {left && <View style={styles.left}>{left}</View>}
        {center && <View style={styles.center}>{center}</View>}
        {right && <View style={styles.right}>{right}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
    alignItems: 'flex-start',
  },
  center: {
    flex: 2,
    alignItems: 'center',
  },
  right: {
    flex: 1,
    alignItems: 'flex-end',
  },
});