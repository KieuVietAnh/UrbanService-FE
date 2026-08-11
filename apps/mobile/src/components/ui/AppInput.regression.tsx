import React from 'react';
import { View, TextInput } from 'react-native';
import { AppInput } from './AppInput';

export function AppInputRegressionHarness() {
  const [value, setValue] = React.useState('');
  return (
    <View style={{ padding: 24 }}>
      <AppInput label="Regression input" value={value} onChangeText={setValue} />
      <TextInput value={value} onChangeText={setValue} style={{ height: 0, opacity: 0 }} />
    </View>
  );
}
