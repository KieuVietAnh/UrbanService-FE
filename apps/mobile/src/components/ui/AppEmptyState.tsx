import { View, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Text } from './Text';
import { colors } from '@/constants/theme';

interface AppEmptyStateProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const AppEmptyState = ({ children, style, textStyle, icon }: AppEmptyStateProps) => {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={[styles.text, textStyle]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    marginBottom: 16,
  },
  text: {
    textAlign: 'center',
    fontSize: 15,
    color: colors.muted,
    fontFamily: 'Geist-Regular',
    lineHeight: 22,
  },
});