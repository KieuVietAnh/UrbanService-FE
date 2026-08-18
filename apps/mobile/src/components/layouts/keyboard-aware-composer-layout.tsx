import React from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  KeyboardStickyView,
  useKeyboardHandler,
} from 'react-native-keyboard-controller';

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

  useKeyboardHandler(
    {
      onStart: (event) => {
        'worklet';
        console.log(
          '[KeyboardController] start',
          event.height,
        );
      },

      onMove: (event) => {
        'worklet';
        console.log(
          '[KeyboardController] move',
          event.height,
        );
      },

      onEnd: (event) => {
        'worklet';
        console.log(
          '[KeyboardController] end',
          event.height,
        );
      },
    },
    [],
  );

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>

      <KeyboardStickyView
        enabled
        offset={{
          closed: -insets.bottom,
          opened: 0,
        }}
        style={styles.stickyComposer}
      >
        {composer}
      </KeyboardStickyView>
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
  stickyComposer: {
    alignSelf: 'stretch',
  },
});

export default KeyboardAwareComposerLayout;