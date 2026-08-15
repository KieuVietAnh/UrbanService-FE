import { ActivityIndicator, StyleSheet, StyleProp, View, ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';

interface AppLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  style?: StyleProp<ViewStyle>;
  visible?: boolean;
  message?: string;
}

const SIZE_MAP = { sm: 20, md: 30, lg: 40 };

export const AppLoading = ({
  size = 'md',
  color,
  style,
  visible = true,
  message,
}: AppLoadingProps) => {
  if (!visible) return null;

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={SIZE_MAP[size]} color={color ?? colors.primary} />
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    margin: 16,
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    color: '#334155',
    fontFamily: 'Geist-Regular',
  },
});
