import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '@/constants/theme';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export function OTPInput({ length = 6, value, onChange, error = false }: OTPInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const cleanedValue = value.replace(/\D/g, '').slice(0, length);
  const activeIndex = Math.min(cleanedValue.length, length - 1);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.row}>
        {Array.from({ length }, (_, index) => {
          const digit = cleanedValue[index] || '';
          const active = focused && index === activeIndex;
          return (
            <View
              key={index}
              style={[
                styles.cell,
                digit ? styles.cellFilled : null,
                active ? styles.cellActive : null,
                error ? styles.cellError : null,
              ]}
            >
              <Text style={[styles.digit, digit ? styles.digitFilled : null]}>{digit}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        accessibilityLabel={`Mã OTP gồm ${length} chữ số`}
        value={cleanedValue}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={length}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        importantForAutofill="yes"
        caretHidden
        style={styles.nativeInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    position: 'relative',
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  cell: {
    flex: 1,
    minWidth: 0,
    maxWidth: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  cellActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cellError: {
    borderColor: colors.red,
    backgroundColor: '#FEE2E2',
  },
  digit: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Geist-Bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  digitFilled: {
    color: colors.primary,
  },
  nativeInput: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    color: 'transparent',
    backgroundColor: 'transparent',
    opacity: 0.01,
  },
});

export default OTPInput;
