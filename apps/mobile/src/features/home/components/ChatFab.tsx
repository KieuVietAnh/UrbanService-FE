import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { styles } from '../homeStyles';
import { FloatingChatMenu } from '@/components/ui';

type Props = {
  isOpen: boolean;
  onToggle: () => void;
  router?: any;
};

export function ChatFab({ isOpen, onToggle }: Props) {
  const router = useRouter();

  const handleSelect = (id: 'ai' | 'staff' | 'inbox') => {
    if (id === 'ai') {
      router.push('/(resident)/ai/ai-assistant');
      return;
    }

    if (id === 'inbox') {
      router.push('/(resident)/inbox');
      return;
    }

    // Private staff conversations belong to a specific Feedback. Let the
    // resident select one instead of calling the removed generic inbox API.
    if (id === 'staff') {
      router.push('/(resident)/support/select-feedback');
    }
  };

  return (
    <View style={styles.chatWrap}>
      <FloatingChatMenu mode="home" bottomOffset={90} onSelectOption={handleSelect} />
    </View>
  );
}
