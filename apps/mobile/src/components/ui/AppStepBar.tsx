import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from './Text';
import { colors } from '@/constants/theme';

interface AppStepBarProps {
  currentStep: number; // 1-based
  totalSteps: number;
  label?: string;
}

export function AppStepBar({ currentStep, totalSteps, label }: AppStepBarProps) {
  const progress = (currentStep - 1) / (totalSteps - 1);

  return (
    <View className="px-5 pt-3 pb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-sans-semibold text-primary">
          Bước {currentStep}/{totalSteps}
        </Text>
        {label && (
          <Text className="text-xs font-sans-medium text-text-muted">
            {label}
          </Text>
        )}
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Step dots */}
      <View className="flex-row justify-between mt-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const done = i < currentStep - 1;
          const active = i === currentStep - 1;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                done && styles.dotDone,
                active && styles.dotActive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  dotDone: {
    backgroundColor: '#BFDBFE',
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: -1,
  },
});

export default AppStepBar;
