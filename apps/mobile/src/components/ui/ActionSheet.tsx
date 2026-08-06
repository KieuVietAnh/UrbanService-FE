import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Text } from './Text';
import Icon from '@expo/vector-icons/Feather';
import { colors } from '@/constants/theme';

interface ActionItem {
  label: string;
  icon?: keyof typeof Icon.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: ActionItem[];
}

export function ActionSheet({ visible, onClose, title, actions }: ActionSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} showHandle>
      <View className="px-5 pb-2">
        {title && (
          <Text className="text-base font-sans-semibold text-text text-center mb-4">
            {title}
          </Text>
        )}

        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <React.Fragment key={action.label}>
              <Pressable
                onPress={() => { action.onPress(); onClose(); }}
                disabled={action.disabled}
                style={({ pressed }) => [
                  styles.actionItem,
                  pressed && styles.actionItemPressed,
                  action.disabled && styles.actionItemDisabled,
                ]}
              >
                {action.icon && (
                  <Icon
                    name={action.icon}
                    size={20}
                    color={action.destructive ? colors.red : action.disabled ? colors.lightMuted : colors.text}
                    style={styles.actionIcon}
                  />
                )}
                <Text
                  style={[
                    styles.actionLabel,
                    action.destructive && { color: colors.red },
                    action.disabled && { color: colors.lightMuted },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
              {index < actions.length - 1 && <View style={styles.separator} />}
            </React.Fragment>
          ))}
        </View>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelPressed]}
        >
          <Text style={styles.cancelLabel}>Huỷ</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  actionItemPressed: {
    backgroundColor: '#E2E8F0',
  },
  actionItemDisabled: {
    opacity: 0.4,
  },
  actionIcon: {
    marginRight: 14,
  },
  actionLabel: {
    fontFamily: 'Geist-Regular',
    fontSize: 16,
    color: '#0F172A',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 50,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelPressed: {
    backgroundColor: '#E2E8F0',
  },
  cancelLabel: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 16,
    color: '#334155',
  },
});

export default ActionSheet;
