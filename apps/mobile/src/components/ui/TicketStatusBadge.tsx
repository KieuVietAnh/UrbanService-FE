import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { STATUS_CONFIG, TicketStatus } from '@/constants/status';

interface TicketStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export function TicketStatusBadge({
  status,
  size = 'md',
  showDot = true,
}: TicketStatusBadgeProps) {
  const config = STATUS_CONFIG[status?.toUpperCase?.()] ?? STATUS_CONFIG['PENDING'];

  const paddingClass = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  const textClass = size === 'sm' ? 'text-2xs' : 'text-xs';

  return (
    <View className={`flex-row items-center rounded-full ${config.twBg} ${paddingClass} self-start gap-1.5`}>
      {showDot && (
        <View className={`w-1.5 h-1.5 rounded-full ${config.twDot}`} />
      )}
      <Text className={`font-sans-semibold ${config.twText} ${textClass}`}>
        {config.label}
      </Text>
    </View>
  );
}

export default TicketStatusBadge;
