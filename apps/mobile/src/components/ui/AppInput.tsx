import React, { useState, useRef } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import Icon from '@expo/vector-icons/Feather';
import { Text } from './Text';
import { colors } from '@/constants/theme';

interface AppInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  leftIcon?: keyof typeof Icon.glyphMap;
  rightIcon?: keyof typeof Icon.glyphMap;
  onRightIconPress?: () => void;
  isPassword?: boolean;
  containerClassName?: string;
  className?: string;
}

export function AppInput({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  isPassword = false,
  containerClassName = '',
  className = '',
  value,
  onFocus,
  onBlur,
  ...props
}: AppInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const hasValue = Boolean(value);

  const animateLabel = (toValue: number) => {
    Animated.timing(labelAnim, {
      toValue,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleFocus = (e: any) => {
    setIsFocused(true);
    animateLabel(1);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (!hasValue) animateLabel(0);
    onBlur?.(e);
  };

  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [17, 6],
  });

  const labelFontSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 11],
  });

  const borderColor = error
    ? colors.red
    : isFocused
    ? colors.primary
    : colors.border;

  const passwordIcon = showPassword ? 'eye-off' : 'eye';

  return (
    <View className={`mb-4 ${containerClassName}`}>
      <View
        style={[
          styles.inputContainer,
          { borderColor },
          isFocused && styles.inputFocused,
        ]}
      >
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={18}
            color={isFocused ? colors.primary : colors.muted}
            style={styles.leftIcon}
          />
        )}

        <View style={styles.inputWrap}>
          <Animated.Text
            style={[
              styles.floatingLabel,
              { top: labelTop, fontSize: labelFontSize },
              isFocused || hasValue
                ? { color: isFocused ? colors.primary : colors.muted }
                : { color: colors.lightMuted },
            ]}
          >
            {label}
          </Animated.Text>

          <TextInput
            style={[
              styles.input,
              leftIcon ? styles.inputWithLeftIcon : null,
            ]}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={colors.lightMuted}
            secureTextEntry={isPassword && !showPassword}
            autoCapitalize="none"
            {...props}
          />
        </View>

        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            style={styles.rightIconWrap}
            hitSlop={8}
          >
            <Icon name={passwordIcon} size={18} color={colors.muted} />
          </Pressable>
        ) : rightIcon ? (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIconWrap}
            hitSlop={8}
          >
            <Icon name={rightIcon} size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View className="flex-row items-center gap-1 mt-1.5 ml-1">
          <Icon name="alert-circle" size={12} color={colors.red} />
          <Text className="text-xs text-red">{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 56,
    paddingHorizontal: 14,
  },
  inputFocused: {
    ...Platform.select({
      ios: {
        shadowColor: '#0052CC',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {},
    }),
  },
  leftIcon: {
    marginRight: 10,
    marginTop: 4,
  },
  inputWrap: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  floatingLabel: {
    position: 'absolute',
    left: 0,
    fontFamily: 'Geist-Medium',
  },
  input: {
    fontFamily: 'Geist-Regular',
    fontSize: 15,
    color: '#0F172A',
    paddingTop: 20,
    paddingBottom: 6,
    paddingLeft: 0,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  rightIconWrap: {
    marginLeft: 8,
    padding: 4,
  },
});

export default AppInput;