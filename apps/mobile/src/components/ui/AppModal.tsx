import { Modal, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, radius, spacing } from '@/constants/theme';

interface AppModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  backdropStyle?: StyleProp<ViewStyle>;
  backdropPressToClose?: boolean;
  backdropOpacity?: number;
}

export const AppModal = ({
  visible,
  onRequestClose,
  children,
  style,
  containerStyle,
  backdropStyle,
  backdropPressToClose = true,
  backdropOpacity = 0.5,
}: AppModalProps) => {
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onRequestClose}
    >
      <View style={[styles.backdrop, { opacity: backdropOpacity }, backdropStyle]}
        {...(backdropPressToClose ? { onPress: onRequestClose } : {})}
      >
        <View style={[styles.container, containerStyle]}>
          {children}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    width: '80%',
    maxHeight: '80%',
  },
});