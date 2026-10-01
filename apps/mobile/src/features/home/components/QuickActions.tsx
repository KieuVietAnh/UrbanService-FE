import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import type { RouterLike } from '../types';
import { QUICK_ACTIONS } from '../constants/homeActions';
import { QuickActionCard } from './QuickActionCard';
import { styles } from '../homeStyles';

type Props = { router: RouterLike };

export function QuickActions({ router }: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const columnCount = isTablet ? QUICK_ACTIONS.length : 3;
  const rows = Array.from(
    { length: Math.ceil(QUICK_ACTIONS.length / columnCount) },
    (_, rowIndex) => QUICK_ACTIONS.slice(rowIndex * columnCount, (rowIndex + 1) * columnCount),
  );

  return (
    <View style={styles.sectionTight}>
      <View style={styles.quickActionsPanel}>
        {rows.map((row, rowIndex) => (
          <View key={`quick-action-row-${rowIndex}`} style={styles.quickActionsRow}>
            {row.map((action, columnIndex) => (
              <QuickActionCard
                key={action.id}
                action={action}
                delay={(rowIndex * columnCount + columnIndex) * 45}
                isTablet={isTablet}
                router={router}
              />
            ))}
            {Array.from({ length: columnCount - row.length }, (_, index) => (
              <View key={`quick-action-spacer-${index}`} style={styles.quickActionSpacer} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
