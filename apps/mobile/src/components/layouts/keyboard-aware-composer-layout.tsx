import React from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';

interface KeyboardAwareComposerLayoutProps {
  children: React.ReactNode;
  composer: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function KeyboardAwareComposerLayout({
  children,
  composer,
  style,
  contentStyle,
}: KeyboardAwareComposerLayoutProps) {
  const insets = useSafeAreaInsets();

  const keyboardHeight = useSharedValue(0);
  const keyboardProgress = useSharedValue(0);

  useKeyboardHandler(
    {
      onMove: (event) => {
        'worklet';

        keyboardHeight.value = event.height;
        keyboardProgress.value = event.progress;
      },

      onEnd: (event) => {
        'worklet';

        keyboardHeight.value = event.height;
        keyboardProgress.value = event.progress;
      },
    },
    [],
  );

  const composerAnimatedStyle = useAnimatedStyle(() => {
    const restingInset =
      (1 - keyboardProgress.value) * insets.bottom;

    return {
      transform: [
        {
          translateY:
            -keyboardHeight.value -
            restingInset,
        },
      ],
    };
  }, [insets.bottom]);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>

      <Animated.View
        style={[
          styles.composer,
          composerAnimatedStyle,
        ]}
      >
        {composer}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  composer: {
    alignSelf: 'stretch',
  },
});

export default KeyboardAwareComposerLayout;