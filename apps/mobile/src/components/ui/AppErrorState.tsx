import { View, StyleSheet, StyleProp, ViewStyle, TextStyle, Pressable } from 'react-native';
import { Text } from './Text';
import { colors } from '@/constants/theme';

interface AppErrorStateProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onRetry?: () => void;
}

export const AppErrorState = ({ children, style, textStyle, onRetry }: AppErrorStateProps) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, textStyle]}>{children}</Text>
      {onRetry && (
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      )}
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
  text: {
    textAlign: 'center',
    fontSize: 15,
    color: colors.red,
    fontFamily: 'Geist-Regular',
    marginBottom: 16,
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryText: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: 'Geist-SemiBold',
  },
});