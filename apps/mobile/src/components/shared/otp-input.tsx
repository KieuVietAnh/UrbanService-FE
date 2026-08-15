import React, { useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Clipboard,
} from 'react-native';
import { colors } from '@/constants/theme';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export function OTPInput({ length = 6, value, onChange, error = false }: OTPInputProps) {
  const inputs = useRef<(TextInput | null)[]>([]);
  const digits = value.padEnd(length, '').split('').slice(0, length);

  const focusNext = (index: number) => {
    if (index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const focusPrev = (index: number) => {
    if (index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleChange = (text: string, index: number) => {
    // Handle paste
    if (text.length > 1) {
      const cleaned = text.replace(/\D/g, '').slice(0, length);
      onChange(cleaned);
      inputs.current[Math.min(cleaned.length, length - 1)]?.focus();
      return;
    }

    const char = text.replace(/\D/g, '');
    const next = digits.map((d, i) => (i === index ? char : d)).join('').replace(/ /g, '');
    onChange(next);

    if (char) focusNext(index);
  };

  const handleKeyPress = (
    { nativeEvent: { key } }: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (key === 'Backspace' && !digits[index]) {
      const next = digits.map((d, i) => (i === index - 1 ? '' : d)).join('');
      onChange(next);
      focusPrev(index);
    }
  };

  useEffect(() => {
    setTimeout(() => inputs.current[0]?.focus(), 300);
  }, []);

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => {
        const filled = Boolean(digits[i]);
        const isFocused = !filled && digits.slice(0, i).every(Boolean);

        return (
          <TextInput
            key={i}
            ref={(ref) => { inputs.current[i] = ref; }}
            style={[
              styles.cell,
              filled && styles.cellFilled,
              error && styles.cellError,
            ]}
            value={digits[i] === ' ' ? '' : digits[i]}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={i === 0 ? length : 1}
            selectTextOnFocus
            textAlign="center"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  cell: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    fontSize: 22,
    fontFamily: 'Geist-Bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  cellFilled: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
    color: colors.primary,
  },
  cellError: {
    borderColor: colors.red,
    backgroundColor: '#FEE2E2',
  },
});

export default OTPInput;
