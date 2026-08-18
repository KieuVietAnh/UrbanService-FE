import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAwareComposerLayoutProps {
  children: React.ReactNode;
  composer: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
}

export function KeyboardAwareComposerLayout({
  children,
  composer,
  style,
  contentStyle,
  keyboardVerticalOffset = 0,
}: KeyboardAwareComposerLayoutProps) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    // On iOS, willShow/willHide are smoother as they fire before keyboard animation starts.
    // On Android, only didShow/didHide are reliable.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // When keyboard is visible, bottom inset is 0 because the composer sits on top of the keyboard.
  const bottomPadding = keyboardVisible ? 0 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
      <View style={{ paddingBottom: bottomPadding }}>
        {composer}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default KeyboardAwareComposerLayout;
