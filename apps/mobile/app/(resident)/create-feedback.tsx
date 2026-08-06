import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppTextArea } from '@/components/ui/AppTextArea';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppStepBar } from '@/components/ui/AppStepBar';
import { useToast } from '@/components/ui/Toast';
import { feedbackApi, CreateFeedbackPayload } from '@/services/api/feedbackApi';
import { FEEDBACK_CATEGORIES } from '@/constants/status';
import { colors } from '@/constants/theme';

const { width: W } = Dimensions.get('window');
const STEPS = ['Danh mục', 'Mô tả', 'Vị trí', 'Hình ảnh', 'Xem lại'];

// ─── Step 1: Category ──────────────────────────────────────────────
function StepCategory({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.stepBody}>
      <Text className="text-xl font-sans-bold text-text mb-1" style={{ letterSpacing: -0.3 }}>
        Chọn danh mục phản ánh
      </Text>
      <Text className="text-sm text-text-muted mb-6">
        Phân loại đúng giúp xử lý nhanh hơn.
      </Text>
      <View style={styles.categoryGrid}>
        {FEEDBACK_CATEGORIES.map((cat) => {
          const active = value === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => onChange(cat.id)}
              style={[styles.categoryCard, active && styles.categoryCardActive]}
            >
              <View style={[styles.categoryIcon, active && styles.categoryIconActive]}>
                <Icon name={cat.icon as any} size={22} color={active ? '#FFFFFF' : colors.primary} />
              </View>
              <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
              <Text style={styles.categorySubtitle} numberOfLines={2}>
                {cat.subtitle}
              </Text>
              {active && (
                <View style={styles.categoryCheck}>
                  <Icon name="check" size={12} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 2: Description ───────────────────────────────────────────
function StepDescription({
  title,
  description,
  onTitleChange,
  onDescChange,
}: {
  title: string;
  description: string;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
}) {
  return (
    <View style={styles.stepBody}>
      <Text className="text-xl font-sans-bold text-text mb-1" style={{ letterSpacing: -0.3 }}>
        Mô tả vấn đề
      </Text>
      <Text className="text-sm text-text-muted mb-6">
        Mô tả càng chi tiết, xử lý càng chính xác.
      </Text>
      <AppInput
        label="Tiêu đề ngắn gọn"
        leftIcon="edit-3"
        value={title}
        onChangeText={onTitleChange}
        placeholder="VD: Đèn đường số 12 bị hỏng"
        maxLength={120}
      />
      <AppTextArea
        label="Mô tả chi tiết"
        value={description}
        onChangeText={onDescChange}
        placeholder="Mô tả thêm về vấn đề, thời gian xảy ra, mức độ ảnh hưởng..."
        rows={6}
        maxLength={1000}
      />
      <View className="flex-row justify-end">
        <Text className="text-xs text-text-muted">{description.length}/1000</Text>
      </View>
      {/* AI tips */}
      <View style={styles.aiTip}>
        <Icon name="zap" size={14} color={colors.primary} />
        <Text className="text-xs text-primary flex-1">
          Gợi ý: AI sẽ phân loại tự động dựa trên mô tả của bạn để xử lý nhanh hơn.
        </Text>
      </View>
    </View>
  );
}

// ─── Step 3: Location ──────────────────────────────────────────────
function StepLocation({
  location,
  onLocationChange,
}: {
  location: string;
  onLocationChange: (v: string) => void;
}) {
  return (
    <View style={styles.stepBody}>
      <Text className="text-xl font-sans-bold text-text mb-1" style={{ letterSpacing: -0.3 }}>
        Vị trí xảy ra
      </Text>
      <Text className="text-sm text-text-muted mb-6">
        Nhập địa chỉ hoặc mô tả vị trí để nhân viên dễ tiếp cận.
      </Text>

      {/* Manual address input */}
      <AppInput
        label="Địa chỉ cụ thể"
        leftIcon="map-pin"
        value={location}
        onChangeText={onLocationChange}
        placeholder="VD: 123 Lê Lợi, Quận 1, TP.HCM"
      />

      {/* Map placeholder */}
      <View style={styles.mapPlaceholder}>
        <Icon name="map" size={32} color="#94A3B8" />
        <Text className="text-sm text-text-muted mt-2 text-center">
          Bản đồ tương tác{'\n'}(sẽ mở khi chọn vị trí)
        </Text>
      </View>

      {/* Location tips */}
      <View style={styles.locationTips}>
        {[
          'Số nhà, tên đường, phường/quận',
          'Mô tả điểm mốc gần đó (siêu thị, trường học...)',
          'Tên khu vực hoặc tòa nhà nếu biết',
        ].map((tip) => (
          <View key={tip} className="flex-row items-start gap-2 mb-2">
            <Icon name="check" size={14} color={colors.emerald} style={{ marginTop: 1 }} />
            <Text className="text-xs text-text-muted flex-1">{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Step 4: Evidence ──────────────────────────────────────────────
function StepEvidence({
  images,
  onAdd,
  onRemove,
}: {
  images: string[];
  onAdd: (uri: string) => void;
  onRemove: (i: number) => void;
}) {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onAdd(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onAdd(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.stepBody}>
      <Text className="text-xl font-sans-bold text-text mb-1" style={{ letterSpacing: -0.3 }}>
        Hình ảnh minh chứng
      </Text>
      <Text className="text-sm text-text-muted mb-6">
        Thêm ảnh giúp nhân viên hiểu rõ vấn đề hơn (tùy chọn, tối đa 5 ảnh).
      </Text>

      {/* Add buttons */}
      <View className="flex-row gap-3 mb-5">
        <Pressable onPress={takePhoto} style={[styles.addImgBtn, { flex: 1 }]}>
          <Icon name="camera" size={20} color={colors.primary} />
          <Text className="text-sm font-sans-semibold text-primary mt-1">Chụp ảnh</Text>
        </Pressable>
        <Pressable onPress={pickImage} style={[styles.addImgBtn, { flex: 1 }]}>
          <Icon name="image" size={20} color={colors.primary} />
          <Text className="text-sm font-sans-semibold text-primary mt-1">Thư viện</Text>
        </Pressable>
      </View>

      {/* Preview grid */}
      {images.length > 0 ? (
        <View style={styles.imgGrid}>
          {images.map((uri, i) => (
            <View key={i} style={styles.imgItem}>
              <Image source={{ uri }} style={styles.imgPreview} />
              <Pressable
                onPress={() => onRemove(i)}
                style={styles.imgRemoveBtn}
                hitSlop={6}
              >
                <Icon name="x" size={12} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
          {images.length < 5 && (
            <Pressable onPress={pickImage} style={styles.imgAddMore}>
              <Icon name="plus" size={24} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.noImgBox}>
          <Icon name="image" size={40} color="#CBD5E1" />
          <Text className="text-sm text-text-muted mt-2 text-center">
            Chưa có ảnh nào.{'\n'}Bạn có thể bỏ qua bước này.
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Step 5: Review ────────────────────────────────────────────────
function StepReview({
  title,
  description,
  location,
  categoryId,
  images,
}: {
  title: string;
  description: string;
  location: string;
  categoryId: string;
  images: string[];
}) {
  const cat = FEEDBACK_CATEGORIES.find((c) => c.id === categoryId);

  return (
    <View style={styles.stepBody}>
      <Text className="text-xl font-sans-bold text-text mb-1" style={{ letterSpacing: -0.3 }}>
        Xem lại trước khi gửi
      </Text>
      <Text className="text-sm text-text-muted mb-6">
        Kiểm tra thông tin trước khi gửi phản ánh.
      </Text>

      {[
        { label: 'Danh mục', value: cat?.label ?? '—', icon: 'tag' },
        { label: 'Tiêu đề', value: title || '—', icon: 'edit-3' },
        { label: 'Vị trí', value: location || '—', icon: 'map-pin' },
      ].map((row) => (
        <View key={row.label} style={styles.reviewRow}>
          <Icon name={row.icon as any} size={15} color={colors.muted} style={styles.reviewIcon} />
          <View style={{ flex: 1 }}>
            <Text className="text-2xs font-sans-semibold text-text-muted uppercase tracking-wide">
              {row.label}
            </Text>
            <Text className="text-sm font-sans-medium text-text mt-0.5">{row.value}</Text>
          </View>
        </View>
      ))}

      <View style={styles.reviewRow}>
        <Icon name="file-text" size={15} color={colors.muted} style={styles.reviewIcon} />
        <View style={{ flex: 1 }}>
          <Text className="text-2xs font-sans-semibold text-text-muted uppercase tracking-wide">
            Mô tả
          </Text>
          <Text className="text-sm text-text mt-0.5 leading-snug" numberOfLines={4}>
            {description || '—'}
          </Text>
        </View>
      </View>

      {images.length > 0 && (
        <View style={styles.reviewRow}>
          <Icon name="image" size={15} color={colors.muted} style={styles.reviewIcon} />
          <View style={{ flex: 1 }}>
            <Text className="text-2xs font-sans-semibold text-text-muted uppercase tracking-wide mb-2">
              Hình ảnh ({images.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {images.map((uri, i) => (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={{ width: 60, height: 60, borderRadius: 10 }}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Commitment notice */}
      <View style={styles.commitNotice}>
        <Icon name="info" size={14} color={colors.primary} />
        <Text className="text-xs text-primary flex-1">
          Phản ánh sẽ được gửi đến cơ quan chức năng. Thông tin giả mạo có thể vi phạm pháp luật.
        </Text>
      </View>
    </View>
  );
}

// ─── Main Wizard ───────────────────────────────────────────────────
export default function CreateFeedbackScreen() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const goNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length) {
      setStep((s) => s + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      router.back();
    }
  };

  const validateStep = (): boolean => {
    if (step === 1 && !categoryId) {
      toast.error('Vui lòng chọn danh mục phản ánh');
      return false;
    }
    if (step === 2) {
      if (!title.trim()) {
        toast.error('Vui lòng nhập tiêu đề');
        return false;
      }
      if (!description.trim()) {
        toast.error('Vui lòng nhập mô tả');
        return false;
      }
    }
    if (step === 3 && !location.trim()) {
      toast.error('Vui lòng nhập địa chỉ');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: CreateFeedbackPayload = {
        categoryId,
        title: title.trim(),
        description: description.trim(),
        locationText: location.trim(),
        geoSource: 'MANUAL',
        attachments: images.map((uri, i) => ({
          uri,
          name: `evidence_${i + 1}.jpg`,
          type: 'image/jpeg',
        })),
      };
      await feedbackApi.create(payload);
      qc.invalidateQueries({ queryKey: ['feedbacks'] });
      toast.success('Phản ánh đã được gửi thành công!');
      router.replace('/(resident)/tickets');
    } catch {
      toast.error('Gửi phản ánh thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        showBack
        onBack={goBack}
        title="Tạo phản ánh"
      />

      <AppStepBar
        currentStep={step}
        totalSteps={STEPS.length}
        label={STEPS[step - 1]}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <StepCategory value={categoryId} onChange={setCategoryId} />
          )}
          {step === 2 && (
            <StepDescription
              title={title}
              description={description}
              onTitleChange={setTitle}
              onDescChange={setDescription}
            />
          )}
          {step === 3 && (
            <StepLocation location={location} onLocationChange={setLocation} />
          )}
          {step === 4 && (
            <StepEvidence
              images={images}
              onAdd={(uri) => {
                if (images.length < 5) setImages((p) => [...p, uri]);
              }}
              onRemove={(i) => setImages((p) => p.filter((_, idx) => idx !== i))}
            />
          )}
          {step === 5 && (
            <StepReview
              title={title}
              description={description}
              location={location}
              categoryId={categoryId}
              images={images}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        {step > 1 && (
          <AppButton variant="outline" size="lg" onPress={goBack} className="flex-1">
            Quay lại
          </AppButton>
        )}
        {step < STEPS.length ? (
          <AppButton size="lg" onPress={goNext} className="flex-1">
            Tiếp theo
          </AppButton>
        ) : (
          <AppButton
            size="lg"
            onPress={handleSubmit}
            loading={submitting}
            className="flex-1"
            rightIcon={<Icon name="send" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />}
          >
            Gửi phản ánh
          </AppButton>
        )}
      </View>
    </SafeAreaView>
  );
}

const CARD_W = (W - 52) / 2;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  stepBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0F7FF',
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryIconActive: {
    backgroundColor: colors.primary,
  },
  categoryLabel: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 4,
  },
  categoryLabelActive: {
    color: colors.primary,
  },
  categorySubtitle: {
    fontFamily: 'Geist-Regular',
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  categoryCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  mapPlaceholder: {
    height: 160,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  locationTips: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addImgBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
  },
  imgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imgItem: {
    position: 'relative',
  },
  imgPreview: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  imgRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  imgAddMore: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  noImgBox: {
    height: 150,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  commitNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});
