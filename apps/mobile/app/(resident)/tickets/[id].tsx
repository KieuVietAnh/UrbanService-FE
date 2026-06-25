import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { colors } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ticketApi } from '@urbanmind/shared-api';
import Icon from '@expo/vector-icons/Feather';
import { ResizeMode, Video } from 'expo-av';

type RawAttachment =
  | string
  | {
    attachmentId?: number | string;
    url?: string;
    uri?: string;
    fileUrl?: string;
    attachmentUrl?: string;
    path?: string;
    name?: string;
    fileName?: string;
    filename?: string;
    fileType?: string;
    mimeType?: string;
    contentType?: string;
    uploadedAt?: string;
  };

type TicketAttachment = {
  id: string;
  uri: string;
  type: string;
  name: string;
};

type RawTicketDetail = {
  data?: RawTicketDetail;
  feedbackId?: string;
  id?: string;
  categoryName?: string;
  category?: string | { name?: string };
  title?: string;
  feedbackTitle?: string;
  description?: string;
  content?: string;
  locationText?: string;
  location?: string | { address?: string };
  priority?: string;
  status?: string;
  createdAt?: string;
  createdDate?: string;
  updatedAt?: string;
  updatedDate?: string;
  attachmentCount?: number;
  commentCount?: number;
  supportCount?: number;
  attachments?: RawAttachment[];
  evidence?: RawAttachment[];
  attachmentUrls?: RawAttachment[];
  images?: RawAttachment[];
  files?: RawAttachment[];
  media?: RawAttachment[];
  comments?: unknown[];
  supports?: unknown[];
};

type TicketDetail = {
  id: string;
  category: string;
  title: string;
  description: string;
  location: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
  commentCount: number;
  supportCount: number;
  attachments: TicketAttachment[];
};

type StatusMeta = {
  label: string;
  color: string;
  background: string;
  icon: keyof typeof Icon.glyphMap;
};

const getStatusMeta = (status?: string): StatusMeta => {
  const normalized = (status ?? '').toLowerCase();

  if (normalized === 'verified' || normalized === 'in_progress') {
    return {
      label: 'Đang xử lý',
      color: '#7C3AED',
      background: '#EDE9FE',
      icon: 'loader',
    };
  }

  if (
    normalized === 'resolved' ||
    normalized === 'completed' ||
    normalized === 'closed' ||
    normalized === 'complete'
  ) {
    return {
      label: 'Đã xử lý',
      color: '#047857',
      background: '#D1FAE5',
      icon: 'check-circle',
    };
  }

  return {
    label: 'Chờ tiếp nhận',
    color: '#B45309',
    background: '#FEF3C7',
    icon: 'clock',
  };
};

const getPriorityLabel = (priority?: string) => {
  const normalized = (priority ?? '').toLowerCase();

  if (normalized === 'urgent') return 'Khẩn cấp';
  if (normalized === 'high') return 'Cao';
  if (normalized === 'medium') return 'Trung bình';
  if (normalized === 'low') return 'Thấp';

  return priority || 'Không xác định';
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Chưa có thời gian';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getAttachmentUri = (item: RawAttachment) => {
  if (typeof item === 'string') return item;

  return item.fileUrl || item.url || item.uri || item.attachmentUrl || item.path || '';
};

const getAttachmentType = (item: RawAttachment, uri: string) => {
  if (typeof item !== 'string') {
    const type = item.fileType || item.mimeType || item.contentType;
    if (type) return type;
  }

  const lowerUri = uri.toLowerCase();

  if (lowerUri.includes('.mp4') || lowerUri.includes('/video/upload')) return 'video/mp4';
  if (lowerUri.includes('.webp')) return 'image/webp';
  if (lowerUri.includes('.png')) return 'image/png';
  if (lowerUri.includes('.jpg') || lowerUri.includes('.jpeg')) return 'image/jpeg';

  return 'file';
};

const getAttachmentName = (item: RawAttachment, index: number) => {
  if (typeof item !== 'string') {
    return item.name || item.fileName || item.filename || `Minh chứng ${index + 1}`;
  }

  return `Minh chứng ${index + 1}`;
};

const extractAttachments = (data?: RawTicketDetail | null): TicketAttachment[] => {
  if (!data) return [];

  const candidates = [
    ...(Array.isArray(data.attachments) ? data.attachments : []),
    ...(Array.isArray(data.evidence) ? data.evidence : []),
    ...(Array.isArray(data.attachmentUrls) ? data.attachmentUrls : []),
    ...(Array.isArray(data.images) ? data.images : []),
    ...(Array.isArray(data.files) ? data.files : []),
    ...(Array.isArray(data.media) ? data.media : []),
  ];

  const mapped = candidates
    .map((item, index) => {
      const uri = getAttachmentUri(item);

      if (!uri) return null;

      return {
        id:
          typeof item === 'string'
            ? `${uri}-${index}`
            : String(item.attachmentId ?? `${uri}-${index}`),
        uri,
        type: getAttachmentType(item, uri),
        name: getAttachmentName(item, index),
      };
    })
    .filter(Boolean) as TicketAttachment[];

  return mapped.filter(
    (item, index, array) => array.findIndex((current) => current.uri === item.uri) === index
  );
};

const getCategoryText = (category?: RawTicketDetail['category'], categoryName?: string) => {
  if (categoryName) return categoryName;
  if (typeof category === 'string') return category;
  return category?.name ?? 'Chưa phân loại';
};

const getLocationText = (location?: RawTicketDetail['location'], locationText?: string) => {
  if (locationText) return locationText;
  if (typeof location === 'string') return location;
  return location?.address ?? 'Chưa có vị trí';
};

const normalizeTicketDetail = (raw?: any): TicketDetail => {
  const data =
    raw?.data?.data ??
    raw?.data?.feedback ??
    raw?.data?.result ??
    raw?.data ??
    raw?.feedback ??
    raw?.result ??
    raw?.item ??
    raw ??
    {};

  const attachments = extractAttachments(data);

  return {
    id: String(data.feedbackId ?? data.id ?? ''),
    category: getCategoryText(data.category, data.categoryName),
    title: data.title ?? data.feedbackTitle ?? 'Phản ánh chưa có tiêu đề',
    description: data.description ?? data.content ?? data.title ?? 'Chưa có mô tả chi tiết.',
    location: getLocationText(data.location, data.locationText),
    priority: getPriorityLabel(data.priority),
    status: data.status ?? 'Submitted',
    createdAt: data.createdAt ?? data.createdDate ?? '',
    updatedAt: data.updatedAt ?? data.updatedDate ?? data.createdAt ?? '',
    attachmentCount: data.attachmentCount ?? attachments.length,
    commentCount: data.commentCount ?? data.comments?.length ?? 0,
    supportCount: data.supportCount ?? data.supports?.length ?? 0,
    attachments,
  };
};

const isVideoAttachment = (attachment: TicketAttachment) => {
  const type = attachment.type.toLowerCase();
  const uri = attachment.uri.toLowerCase();

  return type.startsWith('video') || uri.endsWith('.mp4') || uri.includes('/video/upload');
};

const isImageAttachment = (attachment: TicketAttachment) => {
  const type = attachment.type.toLowerCase();
  const uri = attachment.uri.toLowerCase();

  return (
    !isVideoAttachment(attachment) &&
    (type.startsWith('image') ||
      uri.endsWith('.jpg') ||
      uri.endsWith('.jpeg') ||
      uri.endsWith('.png') ||
      uri.endsWith('.webp'))
  );
};

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const router = useRouter();

  const ticketId = Array.isArray(id) ? id[0] : id;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  const statusMeta = useMemo(() => getStatusMeta(ticket?.status), [ticket?.status]);

  const imageAttachments = useMemo(() => {
    return ticket?.attachments.filter(isImageAttachment) ?? [];
  }, [ticket?.attachments]);

  const videoAttachments = useMemo(() => {
    return ticket?.attachments.filter(isVideoAttachment) ?? [];
  }, [ticket?.attachments]);

  const mediaAttachments = useMemo(() => {
    return ticket?.attachments.filter((attachment) => {
      return isImageAttachment(attachment) || isVideoAttachment(attachment);
    }) ?? [];
  }, [ticket?.attachments]);

  const selectedMedia =
    selectedMediaIndex !== null ? mediaAttachments[selectedMediaIndex] : null;

  const fetchTicket = async () => {
    if (!ticketId) {
      setError('ID phản ánh không hợp lệ.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await ticketApi.getTicketById(ticketId, { role: 'service-user' });
      setTicket(normalizeTicketDetail(response));
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.message?.includes('not found')) {
        setError('Không tìm thấy phản ánh.');
      } else {
        setError(err?.message || 'Không thể tải chi tiết phản ánh.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const handleBack = () => {
    router.replace('/(resident)/tickets');
  };

  const handleOpenMedia = (attachment: TicketAttachment) => {
    const index = mediaAttachments.findIndex((item) => item.id === attachment.id);
    setSelectedMediaIndex(index >= 0 ? index : 0);
  };

  const handleCloseMedia = () => {
    setSelectedMediaIndex(null);
  };

  const handlePrevMedia = () => {
    if (selectedMediaIndex === null || mediaAttachments.length === 0) return;

    setSelectedMediaIndex((current) => {
      if (current === null) return 0;
      return current === 0 ? mediaAttachments.length - 1 : current - 1;
    });
  };

  const handleNextMedia = () => {
    if (selectedMediaIndex === null || mediaAttachments.length === 0) return;

    setSelectedMediaIndex((current) => {
      if (current === null) return 0;
      return current === mediaAttachments.length - 1 ? 0 : current + 1;
    });
  };

  const statusLower = ticket?.status?.toLowerCase();

  const timelineItems = [
    {
      title: 'Tiếp nhận thông tin',
      description: 'Hệ thống ghi nhận phản ánh của bạn.',
      active: true,
    },
    {
      title: 'Phê duyệt nội dung',
      description: 'Đơn vị phụ trách kiểm tra thông tin.',
      active:
        statusLower === 'verified' ||
        statusLower === 'in_progress' ||
        statusLower === 'resolved' ||
        statusLower === 'completed' ||
        statusLower === 'closed',
    },
    {
      title: 'Chuyển đơn vị xử lý',
      description: 'Phản ánh được chuyển đến bộ phận liên quan.',
      active:
        statusLower === 'in_progress' ||
        statusLower === 'resolved' ||
        statusLower === 'completed' ||
        statusLower === 'closed',
    },
    {
      title: 'Hoàn tất xử lý',
      description: 'Cập nhật kết quả xử lý phản ánh.',
      active:
        statusLower === 'resolved' ||
        statusLower === 'completed' ||
        statusLower === 'closed',
    },
  ];

  if (loading) {
    return (
      <AppScreen>
        <View style={styles.centerScreen}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerTitle}>Đang tải chi tiết...</Text>
          <Text style={styles.centerDescription}>Vui lòng chờ trong giây lát.</Text>
        </View>
      </AppScreen>
    );
  }

  if (error || !ticket) {
    return (
      <AppScreen>
        <View style={styles.centerScreen}>
          <View style={styles.errorIcon}>
            <Icon name="alert-circle" size={32} color="#DC2626" />
          </View>

          <Text style={styles.centerTitle}>{error || 'Không tìm thấy phản ánh.'}</Text>
          <Text style={styles.centerDescription}>
            Dữ liệu phản ánh không tồn tại hoặc đã bị xóa.
          </Text>

          <TouchableOpacity activeOpacity={0.82} style={styles.primaryButton} onPress={handleBack}>
            <Text style={styles.primaryButtonText}>Quay lại danh sách</Text>
          </TouchableOpacity>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton} onPress={handleBack}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Chi tiết phản ánh</Text>

          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton}>
            <Icon name="bell" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText} numberOfLines={1}>
                  {ticket.category}
                </Text>
              </View>

              <View style={[styles.statusPill, { backgroundColor: statusMeta.background }]}>
                <Icon name={statusMeta.icon} size={14} color={statusMeta.color} />
                <Text style={[styles.statusText, { color: statusMeta.color }]}>
                  {statusMeta.label}
                </Text>
              </View>
            </View>

            <Text style={styles.ticketTitle}>{ticket.title}</Text>

            <Text style={styles.ticketDescription}>{ticket.description}</Text>

            <View style={styles.locationPanel}>
              <View style={styles.locationIcon}>
                <Icon name="map-pin" size={16} color={colors.primary} />
              </View>
              <View style={styles.locationTextBox}>
                <Text style={styles.locationLabel}>Vị trí</Text>
                <Text style={styles.infoText}>{ticket.location}</Text>
              </View>
            </View>

            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaItem}>
                <Icon name="calendar" size={15} color="#64748B" />
                <Text style={styles.heroMetaText}>{formatDateTime(ticket.createdAt)}</Text>
              </View>

              <View style={styles.heroMetaItem}>
                <Icon name="alert-triangle" size={15} color="#B45309" />
                <Text style={styles.heroMetaText}>{ticket.priority}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Icon name="paperclip" size={16} color={colors.primary} />
                <Text style={styles.statText}>{ticket.attachmentCount} file</Text>
              </View>

              <View style={styles.statItem}>
                <Icon name="message-circle" size={16} color={colors.primary} />
                <Text style={styles.statText}>{ticket.commentCount} bình luận</Text>
              </View>

              <View style={styles.statItem}>
                <Icon name="thumbs-up" size={16} color={colors.primary} />
                <Text style={styles.statText}>{ticket.supportCount} ủng hộ</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Thông tin phản ánh</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mã phản ánh</Text>
              <Text style={styles.detailValue}>{ticket.id}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mức độ ưu tiên</Text>
              <Text style={styles.detailValue}>{ticket.priority}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ngày tạo</Text>
              <Text style={styles.detailValue}>{formatDateTime(ticket.createdAt)}</Text>
            </View>

            <View style={styles.detailRowLast}>
              <Text style={styles.detailLabel}>Cập nhật gần nhất</Text>
              <Text style={styles.detailValue}>{formatDateTime(ticket.updatedAt)}</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleNoMargin}>Minh chứng</Text>
              <Text style={styles.sectionCount}>
                {ticket.attachments.length}/{ticket.attachmentCount} file
              </Text>
            </View>

            {imageAttachments.length > 0 || videoAttachments.length > 0 ? (
              <View style={styles.mediaGrid}>
                {imageAttachments.map((attachment) => (
                  <TouchableOpacity
                    key={attachment.id}
                    activeOpacity={0.82}
                    style={styles.mediaTile}
                    onPress={() => handleOpenMedia(attachment)}
                  >
                    <Image source={{ uri: attachment.uri }} style={styles.mediaThumb} />

                    <View style={styles.mediaTileOverlay}>
                      <Icon name="maximize-2" size={14} color={colors.surface} />
                    </View>
                  </TouchableOpacity>
                ))}

                {videoAttachments.map((attachment) => (
                  <TouchableOpacity
                    key={attachment.id}
                    activeOpacity={0.86}
                    style={styles.mediaTile}
                    onPress={() => handleOpenMedia(attachment)}
                  >
                    <Video
                      source={{ uri: attachment.uri }}
                      style={styles.mediaThumb}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={false}
                      isMuted
                    />

                    <View style={styles.videoDimOverlay} />

                    <View style={styles.videoPlayOverlay}>
                      <Icon name="play" size={22} color={colors.surface} />
                    </View>

                    <View style={styles.videoBadge}>
                      <Icon name="video" size={10} color={colors.surface} />
                      <Text style={styles.videoBadgeText}>Video</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {imageAttachments.length === 0 && videoAttachments.length === 0 ? (
              <View style={styles.emptyEvidence}>
                <Icon name="image" size={28} color="#94A3B8" />
                <Text style={styles.emptyEvidenceTitle}>Chưa có minh chứng hiển thị</Text>
                <Text style={styles.emptyEvidenceText}>
                  Phản ánh này chưa có ảnh hoặc video có thể hiển thị.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tiến trình xử lý</Text>

            <View style={styles.timeline}>
              {timelineItems.map((item, index) => (
                <View key={item.title} style={styles.timelineItem}>
                  <View style={styles.timelineMarkerWrap}>
                    <View
                      style={[
                        styles.timelineMarker,
                        item.active && styles.timelineMarkerActive,
                      ]}
                    >
                      {item.active ? (
                        <Icon name="check" size={14} color={colors.surface} />
                      ) : null}
                    </View>

                    {index < timelineItems.length - 1 ? (
                      <View
                        style={[
                          styles.timelineLine,
                          item.active && styles.timelineLineActive,
                        ]}
                      />
                    ) : null}
                  </View>

                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineTitle,
                        item.active && styles.timelineTitleActive,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.timelineDescription}>{item.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <Modal
          visible={Boolean(selectedMedia)}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={handleCloseMedia}
        >
          <StatusBar
            translucent
            backgroundColor="#0F172A"
            barStyle="light-content"
          />

          <View style={styles.mediaModalOverlay}>
            <View style={styles.mediaModalHeader}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.mediaHeaderButton}
                onPress={handleCloseMedia}
              >
                <Icon name="chevron-left" size={24} color={colors.surface} />
              </TouchableOpacity>

              <View style={styles.mediaTitleBox}>
                <Text style={styles.mediaModalTitle}>
                  {selectedMedia && isVideoAttachment(selectedMedia)
                    ? 'Video minh chứng'
                    : 'Ảnh minh chứng'}
                </Text>
                <Text style={styles.mediaModalSubtitle} numberOfLines={1}>
                  {selectedMediaIndex !== null
                    ? `Minh chứng ${selectedMediaIndex + 1}/${mediaAttachments.length}`
                    : 'Tệp minh chứng'}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.mediaHeaderButton}
                onPress={handleCloseMedia}
              >
                <Icon name="x" size={21} color={colors.surface} />
              </TouchableOpacity>
            </View>

            <View style={styles.mediaStage}>
              <View style={styles.mediaViewerFrame}>
                {selectedMedia && isVideoAttachment(selectedMedia) ? (
                  <View style={styles.videoPreviewFrame}>
                    <Video
                      source={{ uri: selectedMedia.uri }}
                      style={styles.mediaVideo}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay
                    />
                  </View>
                ) : selectedMedia ? (
                  <View style={styles.imagePreviewFrame}>
                    <Image
                      source={{ uri: selectedMedia.uri }}
                      style={styles.mediaImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}

                {mediaAttachments.length > 1 ? (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.82}
                      style={[styles.mediaNavButton, styles.mediaNavLeft]}
                      onPress={handlePrevMedia}
                    >
                      <Icon name="chevron-left" size={26} color={colors.surface} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.82}
                      style={[styles.mediaNavButton, styles.mediaNavRight]}
                      onPress={handleNextMedia}
                    >
                      <Icon name="chevron-right" size={26} color={colors.surface} />
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    minHeight: 92,
    paddingHorizontal: 20,
    paddingTop: 42,
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
    fontWeight: '900',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 112,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryPill: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  categoryText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '900',
  },
  ticketTitle: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
  },
  ticketDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    marginBottom: 14,
  },
  locationPanel: {
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locationTextBox: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '800',
    color: colors.muted,
    marginBottom: 3,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
    fontWeight: '600',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 14,
  },
  heroMetaItem: {
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: '#475569',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 13,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: colors.text,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 14,
  },
  sectionTitleNoMargin: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    color: colors.text,
  },
  sectionCount: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  detailRow: {
    paddingBottom: 13,
    marginBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRowLast: {
    paddingBottom: 0,
  },
  detailLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: colors.muted,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: colors.text,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#CBD5E1',
  },
  mediaTileOverlay: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.14)',
  },
  videoPlayOverlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 42,
    height: 42,
    marginLeft: -21,
    marginTop: -21,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  videoBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    color: colors.surface,
  },
  emptyEvidence: {
    minHeight: 138,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyEvidenceTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    color: colors.text,
    marginTop: 10,
    marginBottom: 4,
  },
  emptyEvidenceText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center',
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 68,
  },
  timelineMarkerWrap: {
    width: 30,
    alignItems: 'center',
  },
  timelineMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineMarkerActive: {
    backgroundColor: colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  timelineLineActive: {
    backgroundColor: colors.primarySoft,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 18,
  },
  timelineTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    color: '#94A3B8',
    marginBottom: 3,
  },
  timelineTitleActive: {
    color: colors.text,
  },
  timelineDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.muted,
  },
  centerScreen: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  errorIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  centerTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  centerDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    color: colors.surface,
  },
  mediaModalOverlay: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  mediaModalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    minHeight: 96,
    paddingTop: (StatusBar.currentHeight ?? 24) + 10,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
  },
  mediaHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTitleBox: {
    flex: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  mediaModalTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    color: colors.surface,
    textAlign: 'center',
  },
  mediaModalSubtitle: {
    maxWidth: 220,
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.62)',
    textAlign: 'center',
  },
  mediaStage: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 112,
    paddingBottom: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaViewerFrame: {
    position: 'relative',
    width: '100%',
    height: '74%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewFrame: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoPreviewFrame: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  mediaVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#020617',
  },
  mediaNavButton: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  mediaNavLeft: {
    left: 18,
  },
  mediaNavRight: {
    right: 18,
  },
  previewMedia: {
    width: '100%',
    height: 360,
    borderRadius: 20,
    backgroundColor: '#091B44',
  },
});
