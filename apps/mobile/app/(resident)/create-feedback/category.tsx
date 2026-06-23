import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { colors } from '@/constants/theme';
import { useCreateFeedbackStore } from '@/features/feedback/createFeedback.store';
import { useRouter } from 'expo-router';

export default function CategoryScreen() {
  const router = useRouter();
  const { category, setCategory } = useCreateFeedbackStore();
  const [error, setError] = React.useState<string | null>(null);

  const categories = [
    { id: '1', name: 'Đèn đường hỏng' },
    { id: '2', name: 'Ống nước nổ' },
    { id: '3', name: 'Đường hố' },
    { id: '4', name: 'Rác rỏng rác' },
    { id: '5', name: 'Biển dấu hỏng' },
    { id: '6', name: 'Cây thụ ngã' },
  ];

  const handleNext = () => {
    if (!category) {
      setError('Vui lòng chọn danh mục');
      return;
    }
    setError(null);
    router.push('/(resident)/create-feedback/description');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chọn danh mục phản hồi</Text>
      <View>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryItem,
                category === item.name && styles.selectedItem,
              ]}
              onPress={() => {
                setCategory(item.name);
              }}
            >
              <Text style={styles.categoryText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
        {error && (
          <Text style={styles.error}>{error}</Text>
        )}
      </View>
      <AppButton onPress={handleNext}>Tiếp theo</AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.text,
  },
  listContent: {
    paddingBottom: 20,
  },
  categoryItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedItem: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 16,
    color: colors.text,
  },
  error: {
    fontSize: 14,
    color: colors.red,
    marginTop: 8,
  },
});