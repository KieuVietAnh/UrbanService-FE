import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { radius } from '@/theme/radius';
import { semantics } from '@/theme/semantics';
import { ReactNode } from 'react';

interface AppModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  backdropPressToClose?: boolean;
}

export const AppModal = ({
  visible,
  onRequestClose,
  children,
  backdropPressToClose = true,
}: AppModalProps) => {
  return (
    <Modal transparent visible={visible} onRequestClose={onRequestClose} animationType="fade">
      <Pressable
        style={styles.backdrop}
        onPress={backdropPressToClose ? onRequestClose : undefined}
      >
        <Pressable style={styles.container} onPress={() => {}}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: semantics.bg.surface,
    borderRadius: radius['2xl'],
    padding: 24,
    width: '85%',
    maxHeight: '80%',
  },
});