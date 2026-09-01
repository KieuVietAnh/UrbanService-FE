import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, StaffIcon } from '@/features/staff/components/staff-ui';
import { getStaffTabLayout } from '@/features/staff/staff-layout';

function AdaptiveTabBar({ layout, height, ...props }: BottomTabBarProps & {
  layout: ReturnType<typeof getStaffTabLayout>;
  height: number;
  reportLabelHeight: (height: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    const selectedCenter = (props.state.index + 0.5) * layout.itemWidth;
    scrollRef.current?.scrollTo({ x: Math.max(0, selectedCenter - layout.viewportWidth / 2), animated: false });
  }, [props.state.index, layout.itemWidth, layout.viewportWidth]);
  // Render the five destinations directly. Importing BottomTabBar as a child
  // can bind to a second navigation theme instance in hoisted/pnpm builds.
  return <View testID="staff-bottom-tab-bar" style={{ height, paddingLeft: props.insets.left, paddingRight: props.insets.right, paddingBottom: props.insets.bottom, paddingTop: 5, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
    <ScrollView ref={scrollRef} horizontal scrollEnabled={layout.scrollable} showsHorizontalScrollIndicator={layout.scrollable} bounces={false} contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} contentContainerStyle={{ width: layout.rowWidth, flexDirection: 'row' }}>
      {props.state.routes.map((route, index) => {
        const focused = props.state.index === index;
        const options = props.descriptors[route.key].options;
        const color = focused ? colors.primary : colors.muted;
        const label = typeof options.title === 'string' ? options.title : route.name;
        const press = () => {
          const event = props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) props.navigation.navigate(route.name, route.params);
        };
        return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={options.tabBarAccessibilityLabel || label} accessibilityState={{ selected: focused }} testID={options.tabBarButtonTestID} onPress={press} onLongPress={() => props.navigation.emit({ type: 'tabLongPress', target: route.key })} android_ripple={{ color: colors.primarySoft }} style={({ pressed }) => ({ width: layout.itemWidth, minWidth: 48, minHeight: 48, paddingHorizontal: 4, paddingTop: 3, gap: 3, alignItems: 'center', justifyContent: 'flex-start', opacity: pressed ? 0.65 : 1 })}>
          {options.tabBarIcon?.({ focused, color, size: 24 })}
          <Text allowFontScaling maxFontSizeMultiplier={layout.labelFontScale} numberOfLines={2} style={{ width: '100%', minWidth: 0, flexShrink: 0, textAlign: 'center', color, fontFamily: 'Geist-Medium', fontSize: 11, lineHeight: layout.labelLineHeight }} onLayout={({ nativeEvent }) => props.reportLabelHeight(nativeEvent.layout.height)} onTextLayout={({ nativeEvent }) => props.reportLabelHeight(nativeEvent.lines.reduce((total, line) => total + line.height, 0))}>{label}</Text>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}

export default function StaffTabs() {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const layout = getStaffTabLayout({ width, fontScale, insets });
  const measurementKey = `${layout.itemWidth}:${fontScale}`;
  const [measuredLabel, setMeasuredLabel] = useState({ key: '', height: 0 });
  const reportLabelHeight = (labelHeight: number) => {
    if (!Number.isFinite(labelHeight) || labelHeight <= 0) return;
    setMeasuredLabel((previous) => previous.key === measurementKey && previous.height >= labelHeight ? previous : { key: measurementKey, height: labelHeight });
  };
  const measuredControlHeight = measuredLabel.key === measurementKey ? Math.ceil(measuredLabel.height + 48) : 0;
  const height = Math.max(layout.controlHeight, measuredControlHeight) + insets.bottom;
  return <Tabs initialRouteName="home" tabBar={(props) => <AdaptiveTabBar {...props} layout={layout} height={height} reportLabelHeight={reportLabelHeight} />} screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarLabelPosition: 'below-icon',
    tabBarAllowFontScaling: true,
    tabBarItemStyle: { minWidth: 48, minHeight: 48, paddingHorizontal: 4 },
    tabBarStyle: { height, paddingTop: 5, paddingBottom: insets.bottom + 5, paddingHorizontal: 0, borderTopColor: colors.border, backgroundColor: colors.surface, elevation: 0 },
  }}>
    <Tabs.Screen name="home" options={{ title: 'Tổng quan', tabBarAccessibilityLabel: 'Tổng quan', tabBarIcon: ({ color, size }) => <StaffIcon name="home" color={color} size={size} /> }} />
    <Tabs.Screen name="incidents" options={{ title: 'Sự vụ', tabBarAccessibilityLabel: 'Sự vụ', tabBarIcon: ({ color, size }) => <StaffIcon name="incidents" color={color} size={size} /> }} />
    <Tabs.Screen name="feedbacks" options={{ title: 'Tra cứu', tabBarAccessibilityLabel: 'Tra cứu', tabBarIcon: ({ color, size }) => <StaffIcon name="feedbacks" color={color} size={size} /> }} />
    <Tabs.Screen name="conversations" options={{ title: 'Trao đổi', tabBarAccessibilityLabel: 'Trao đổi', tabBarIcon: ({ color, size }) => <StaffIcon name="chat" color={color} size={size} /> }} />
    <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarAccessibilityLabel: 'Tài khoản', tabBarIcon: ({ color, size }) => <StaffIcon name="account" color={color} size={size} /> }} />
  </Tabs>;
}
