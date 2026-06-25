import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { colors } from '@/constants/theme';
import { useCreateFeedbackStore } from '@/features/feedback/createFeedback.store';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/Feather';

type CategoryItem = {
  id: string;
  name: string;
  icon: keyof typeof Icon.glyphMap;
};

const categories: CategoryItem[] = [
  {
    id: 'lighting',
    name: 'Chiếu sáng công cộng',
    icon: 'sun',
  },
  {
    id: 'environment',
    name: 'Vệ sinh môi trường',
    icon: 'trash-2',
  },
  {
    id: 'drainage',
    name: 'Thoát nước',
    icon: 'droplet',
  },
  {
    id: 'road',
    name: 'Đường sá hư hỏng',
    icon: 'alert-triangle',
  },
  {
    id: 'security',
    name: 'An ninh trật tự',
    icon: 'shield',
  },
  {
    id: 'other',
    name: 'Khác',
    icon: 'more-horizontal',
  },
];

export default function CategoryScreen() {
  const router = useRouter();
  const { category, setCategory } = useCreateFeedbackStore();
  const [error, setError] = useState<string | null>(null);

  const handleSelectCategory = (value: string) => {
    setCategory(value);
    setError(null);
  };

  const handleNext = () => {
    if (!category) {
      setError('Vui lòng chọn loại vấn đề trước khi tiếp tục.');
      return;
    }

    router.push('/(resident)/create-feedback/description');
  };

  const handleBack = () => {
    router.replace('/(resident)/create-feedback');
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton} onPress={handleBack}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Chọn loại vấn đề</Text>

          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton}>
            <Icon name="bell" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Bước 1/5</Text>
              <Text style={styles.progressPercent}>20%</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
          </View>

          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Icon name="clipboard" size={22} color={colors.primary} />
            </View>

            <Text style={styles.sectionTitle}>Bạn muốn phản ánh vấn đề gì?</Text>
            <Text style={styles.sectionDescription}>
              Chọn nhóm vấn đề phù hợp để hệ thống chuyển phản ánh đến đúng bộ phận xử lý.
            </Text>
          </View>

          <View style={styles.categoriesGrid}>
            {categories.map((item) => {
              const selected = category === item.name;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.82}
                  style={[styles.categoryCard, selected && styles.selectedCard]}
                  onPress={() => handleSelectCategory(item.name)}
                >
                  <View style={[styles.categoryIcon, selected && styles.selectedIcon]}>
                    <Icon
                      name={item.icon}
                      size={22}
                      color={selected ? colors.surface : colors.primary}
                    />
                  </View>

                  <Text style={[styles.categoryText, selected && styles.selectedText]}>
                    {item.name}
                  </Text>

                  {selected ? (
                    <View style={styles.checkBadge}>
                      <Icon name="check" size={14} color={colors.primary} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity activeOpacity={0.88} style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Tiếp theo</Text>
            <Icon name="arrow-right" size={18} color={colors.surface} />
          </TouchableOpacity>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 86,
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 170,
  },
  progressSection: {
    marginBottom: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    overflow: 'hidden',
  },
  progressFill: {
    width: '20%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  introCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 7,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  categoryCard: {
    width: '48%',
    minHeight: 134,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 15,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  selectedIcon: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  categoryText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    color: colors.text,
  },
  selectedText: {
    color: colors.surface,
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 78,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: colors.background,
  },
  nextButton: {
    height: 54,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
  },
});