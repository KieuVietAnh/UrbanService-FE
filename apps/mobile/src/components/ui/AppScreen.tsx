import { SafeAreaView, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors } from '@/constants/theme';

interface AppScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  safeAreaProps?: object;
}

export const AppScreen = ({
  children,
  style,
  safeAreaProps,
}: AppScreenProps) => {
  return (
    <SafeAreaView style={[styles.container, style]} {...safeAreaProps}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});