import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useToast } from '@/components/ui/Toast';
import { axiosClient } from '@urbanmind/shared-api';
import { styles } from '../homeStyles';
import FloatingChatMenu from '@/components/ui/FloatingChatMenu';

type Props = {
  isOpen: boolean;
  onToggle: () => void;
  router?: any;
};

export function ChatFab({ isOpen, onToggle }: Props) {
  const router = useRouter();
  const toast = useToast();

  const handleSelect = async (id: 'ai' | 'staff' | 'inbox') => {
    if (id === 'ai') {
      router.push('/(resident)/ai' as any);
      return;
    }

    if (id === 'inbox') {
      router.push('/(resident)/inbox' as any);
      return;
    }

    // Staff flow: find or create a staff conversation then navigate
    if (id === 'staff') {
      toast.info('Đang kết nối Cán bộ hỗ trợ...');
      try {
        const res = await axiosClient.get('/api/inbox/conversations');
        const data = res?.data ?? res;
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        const staffConv = items.find((c: any) => c?.type === 'staff');
        let conversationId = staffConv?.id;
        if (!conversationId) {
          const createRes = await axiosClient.post('/api/inbox/conversations', { type: 'staff' });
          const created = createRes?.data ?? createRes;
          conversationId = created?.id;
        }
        if (conversationId) {
          router.push(`/(resident)/inbox/${conversationId}` as any);
        } else {
          toast.error('Không thể tạo phiên trò chuyện với cán bộ. Vui lòng thử lại sau.');
        }
      } catch (e) {
        console.warn('staff chat open failed', e);
        toast.error('Không thể kết nối tới cán bộ. Vui lòng thử lại sau.');
      }
    }
  };

  return (
    <View style={styles.chatWrap}>
      <FloatingChatMenu mode="home" bottomOffset={90} onSelectOption={handleSelect} />
    </View>
  );
}
