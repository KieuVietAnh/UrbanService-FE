import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import MapView from 'react-native-map-clustering';
import { Marker, Circle } from 'react-native-maps';
import { Text } from '@/components/ui';
import { AppHeader } from '@/components/ui';
import { AppCard } from '@/components/ui';
import { AppButton } from '@/components/ui';
import { BottomSheet } from '@/components/shared';
import { feedbackApi } from '@/features/reporting/api';
import { communityApi, communityKeys } from '@/features/community/api';
import { colors } from '@/constants/theme';

const DEFAULT_REGION = {
  latitude: 21.0278,
  longitude: 105.8342,
  latitudeDelta: 0.16,
  longitudeDelta: 0.16,
};

const LIST_SHEET_HEIGHT = Dimensions.get('window').height * 0.55;
const OVERLAP = 22; // how much each item overlaps the previous

const getAreaId = (area: any) => String(area?.areaId ?? area?.id ?? '');
const getAreaName = (area: any) => area?.areaName ?? area?.name ?? area?.displayName ?? 'Khu vực chưa xác định';
const getFeedbackId = (item: any) => String(item?.feedbackId ?? item?.id ?? item?.ticketId ?? '');
const getFeedbackTitle = (item: any) => item?.title ?? item?.subject ?? item?.name ?? 'Phản ánh chưa có tiêu đề';
const getFeedbackAddress = (item: any) => item?.locationText ?? item?.address ?? item?.areaName ?? 'Vị trí không xác định';
const getCreatedAt = (item: any) => item?.createdAt ?? item?.createdDate ?? item?.createdAtUtc ?? item?.createdOn ?? '';

const normalizeBoundary = (boundaryGeoJson: any) => {
  if (!boundaryGeoJson) return null;
  if (typeof boundaryGeoJson === 'object') return boundaryGeoJson;
  if (typeof boundaryGeoJson !== 'string') return null;
  const trimmed = boundaryGeoJson.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
  const candidates = [trimmed, trimmed.replace(/""/g, '"'), trimmed.replace(/\\"/g, '"')];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed) return parsed;
    } catch {
      continue;
    }
  }
  return null;
};

const extractCoordinates = (geo: any) => {
  const coords: Array<{ latitude: number; longitude: number }> = [];
  const visit = (value: any) => {
    if (!value) return;
    if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number') {
      const [lng, lat] = value;
      if (Number.isFinite(lat) && Number.isFinite(lng)) coords.push({ latitude: lat, longitude: lng });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'object') {
      visit(value.coordinates ?? value.geometry ?? value.geoJson ?? value.geoJSON);
    }
  };
  visit(geo);
  return coords;
};

const formatDate = (value: string | undefined) => {
  if (!value) return 'Không xác định';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getMarkerColor = (item: any) => {
  const status = String(item.status ?? '').toLowerCase();
  if (status === 'resolved' || status === 'closed') return '#22C55E';
  if (status === 'in progress' || status === 'in-progress' || status === 'processing' || status === 'progress') return '#F59E0B';
  if (status === 'pending' || status === 'waiting' || status === 'new') return '#3B82F6';
  if (status === 'rejected' || status === 'denied' || status === 'cancelled') return '#EF4444';
  return '#0B56D9';
};

export default function CommunityMapNative() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [feedbackListVisible, setFeedbackListVisible] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);

  const {
    data: areas,
    isLoading: areasLoading,
    isError: areasError,
    error: areasFetchError,
  } = useQuery<any[], Error>({
    queryKey: communityKeys.areas(),
    queryFn: async () => {
      const result = await communityApi.getAreas();
      return result;
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const selectedArea = useMemo(
    () => (areas ?? []).find((area: any) => getAreaId(area) === selectedAreaId) ?? null,
    [areas, selectedAreaId]
  );

  const PAGE_SIZE = 20;

  const {
    data: feedbackPages,
    isLoading: feedbackLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: communityKeys.mapFeed(),
    queryFn: async ({ pageParam = 1 }: { pageParam?: number }) => {
      return await communityApi.getFeed({ pageNumber: pageParam, pageSize: PAGE_SIZE });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      if (!lastPage) return undefined;
      const current = Number(lastPage.pageNumber ?? lastPage.page ?? 1);
      const total = Number(lastPage.totalPages ?? lastPage.pageCount ?? 1);
      if (Number.isFinite(current) && Number.isFinite(total) && current < total) return current + 1;
      const itemsLen = Array.isArray(lastPage.items) ? lastPage.items.length : 0;
      if (itemsLen >= PAGE_SIZE) return current + 1;
      return undefined;
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const feedbackItems = useMemo(() => {
    const pages = feedbackPages?.pages ?? [];
    return pages.filter(Boolean).flatMap((p: any) => (Array.isArray(p?.items) ? p.items : []));
  }, [feedbackPages]);

  const markers = useMemo(() => {
    const list = feedbackItems
      .filter((item: any) =>
        Number.isFinite(Number(item?.latitude)) && Number.isFinite(Number(item?.longitude))
      )
      .map((item: any) => ({
        ...item,
        id: getFeedbackId(item),
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
      }));

    const filtered = list.filter((item: any) => {
      if (!selectedAreaId) return true;
      return String(item.areaId ?? item.area?.areaId ?? item.area?.id ?? item.areaId ?? '').trim() === selectedAreaId;
    });

    if (selectedMarker && selectedMarker.id) {
      const markerId = getFeedbackId(selectedMarker);
      const exists = filtered.some((item: any) => item.id === markerId);
      if (!exists && Number.isFinite(Number(selectedMarker.latitude)) && Number.isFinite(Number(selectedMarker.longitude))) {
        filtered.push({
          ...selectedMarker,
          id: markerId,
          latitude: Number(selectedMarker.latitude),
          longitude: Number(selectedMarker.longitude),
        });
      }
    }

    return filtered;
  }, [feedbackItems, selectedAreaId, selectedMarker]);

  useEffect(() => {
    if (!selectedArea || !mapRef.current) return;

    const rawBoundary =
      selectedArea?.BoundaryGeoJson ??
      selectedArea?.boundaryGeoJson ??
      selectedArea?.boundaryGeoJSON ??
      selectedArea?.boundary ??
      selectedArea?.geoJson ??
      selectedArea?.geoJSON ??
      null;

    const normalized = normalizeBoundary(rawBoundary);
    const coords = normalized ? extractCoordinates(normalized) : [];

    if (coords.length > 0) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 96, left: 56, right: 56, bottom: 220 },
        animated: true,
      });
      return;
    }

    const centerLat =
      selectedArea?.centerLatitude ??
      selectedArea?.centerLat ??
      selectedArea?.latitude ??
      selectedArea?.lat ??
      selectedArea?.center?.lat;
    const centerLng =
      selectedArea?.centerLongitude ??
      selectedArea?.centerLng ??
      selectedArea?.longitude ??
      selectedArea?.lng ??
      selectedArea?.center?.lng;

    if (Number.isFinite(Number(centerLat)) && Number.isFinite(Number(centerLng))) {
      mapRef.current.animateToRegion(
        {
          latitude: Number(centerLat),
          longitude: Number(centerLng),
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        520
      );
    }
  }, [selectedArea]);

  const selectedAreaLabel = selectedArea ? getAreaName(selectedArea) : 'Tất cả khu vực';
  const loading = areasLoading || feedbackLoading;

  const handleOpenFeedbackExplorer = () => setFeedbackListVisible(true);
  const handleCloseFeedbackExplorer = () => setFeedbackListVisible(false);
  const [locating, setLocating] = useState(false);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const first = viewableItems[0];
      if (first && first.item) {
        const id = getFeedbackId(first.item);
        if (!selectedFeedback || getFeedbackId(selectedFeedback) !== id) {
          setSelectedFeedback(first.item);
        }
      }
    }
  }).current;

  const focusMapToLocation = (latitude: number, longitude: number) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !mapRef.current) return;

    const target = {
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    if (typeof mapRef.current.animateCamera === 'function') {
      mapRef.current.animateCamera(
        {
          center: { latitude, longitude },
          pitch: 0,
          heading: 0,
          altitude: 0,
        },
        { duration: 500 }
      );
      return;
    }

    if (typeof mapRef.current.animateToRegion === 'function') {
      mapRef.current.animateToRegion(target, 500);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) return;

        // Check permission status without prompting
        const current = await Location.getForegroundPermissionsAsync();
        if (current?.status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (!mounted) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ latitude: lat, longitude: lng });
          if (mapRef.current?.animateToRegion) {
            mapRef.current.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 520);
          }
          return;
        }

        // Try to use last known position so marker can appear without prompting
        try {
          const last = await Location.getLastKnownPositionAsync();
          if (last?.coords && mounted) {
            const lat = last.coords.latitude;
            const lng = last.coords.longitude;
            setUserLocation({ latitude: lat, longitude: lng });
            // don't force animate here
          }
        } catch (e) {
          // ignore last-known failures
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSelectFeedback = (item: any) => {
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    setSelectedFeedback(item);
    setSelectedMarker(item);
    setSelectedIncident(item);
    setFeedbackListVisible(false);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setTimeout(() => focusMapToLocation(lat, lng), 220);
    }
  };

  const handleSupport = async () => {
    if (!selectedIncident) return;
    const feedbackId = selectedIncident.id;
    if (!feedbackId) return;

    setSupportLoading(true);
    try {
      await feedbackApi.support(feedbackId);
      setSelectedIncident((current: any) =>
        current
          ? {
              ...current,
              isSupported: true,
              supportCount: Math.max(0, Number(current.supportCount ?? 0) + 1),
            }
          : current
      );
    } catch {
      // swallow, UX only
    } finally {
      setSupportLoading(false);
    }
  };

  const supportDisabled = Boolean(
    selectedIncident?.isSupported ?? selectedIncident?.supported ?? false
  );

  const goToDetail = (item: any) => {
    if (!item) return;
    setSelectedIncident(null);
    const id = item.feedbackId ?? item.id ?? item.ticketId;
    if (!id) return;
    router.push({
      pathname: '/community/[id]',
      params: { id: String(id) },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.screen}>
        <MapView
          ref={mapRef}
          mapRef={(map) => {
            mapRef.current = map;
          }}
          superClusterRef={clusterRef}
          onRegionChangeComplete={() => {}}
          onClusterPress={() => {}}
          onMarkersChange={() => {}}
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          clusterColor={colors.primary}
          clusterTextColor="#FFFFFF"
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          {userLocation ? (
            <>
              <Circle
                key="__user_circle_home"
                center={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
                radius={2000}
                strokeColor="rgba(37,99,235,0.18)"
                fillColor="rgba(37,99,235,0.06)"
              />
              <Marker key="__user_marker_home" coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}>
                <View style={[styles.marker, { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563EB' }]}> 
                  <Icon name="user" size={14} color="#FFFFFF" />
                </View>
              </Marker>
            </>
          ) : null}

          {markers.map((item: any) => (
            <Marker
              key={item.id}
              coordinate={{ latitude: item.latitude, longitude: item.longitude }}
              onPress={() => {
                setSelectedIncident(item);
                setSelectedMarker(item);
              }}
            >
              <View
                style={[
                  styles.marker,
                  { backgroundColor: getMarkerColor(item) },
                  selectedMarker?.id === item.id && styles.markerSelected,
                ]}
              >
                <Icon name="map-pin" size={18} color="#FFFFFF" />
              </View>
            </Marker>
          ))}
        </MapView>

        <View style={styles.headerOverlay} pointerEvents="box-none">
          <AppHeader showBack title="Bản đồ sự cố" />
        </View>

        <View style={styles.selectorWrapper}>
          <AppCard shadow="sm" style={styles.selectorCard}>
            <View style={styles.selectorRow}>
              <View>
                <Text style={styles.selectorLabel}>📍 Khu vực đang xem</Text>
                <Text style={styles.selectorTitle} numberOfLines={1}>
                  {selectedAreaLabel}
                </Text>
              </View>
              <Pressable style={styles.selectorAction} onPress={() => setAreaModalOpen(true)}>
                <Text style={styles.selectorActionText}>Thay đổi</Text>
                <Icon name="chevron-down" size={16} color={colors.primary} />
              </Pressable>
            </View>
            {areasError ? (
              <Text style={styles.selectorErrorText} numberOfLines={2}>
                {areasFetchError?.message ?? 'Không tải được danh sách khu vực. Vui lòng kiểm tra đăng nhập hoặc thử lại.'}
              </Text>
            ) : null}
          </AppCard>
        </View>

        {!(feedbackListVisible || Boolean(selectedIncident)) && (
          <Pressable
            style={styles.feedbackExplorerButton}
            onPress={handleOpenFeedbackExplorer}
            accessibilityLabel="Danh sách phản ánh"
          >
            <Icon name="list" size={20} color={colors.primary} />
          </Pressable>
        )}
        {!(feedbackListVisible || Boolean(selectedIncident)) && (
          <Pressable
            style={styles.locateButton}
            onPress={async () => {
              try {
                setLocating(true);
                const servicesEnabled = await Location.hasServicesEnabledAsync();
                if (!servicesEnabled) {
                  Alert.alert('Dịch vụ vị trí bị tắt', 'Vui lòng bật dịch vụ vị trí trên thiết bị để sử dụng tính năng này.', [
                    { text: 'Hủy', style: 'cancel', onPress: () => setLocating(false) },
                    { text: 'Mở cài đặt', onPress: () => { Linking.openSettings(); setLocating(false); } },
                  ]);
                  return;
                }

                // Check existing permission first to avoid unnecessary prompt
                const current = await Location.getForegroundPermissionsAsync();
                let granted = current?.status === 'granted';
                if (!granted) {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  granted = status === 'granted';
                }

                if (!granted) {
                  Alert.alert('Quyền vị trí bị từ chối', 'Vui lòng bật quyền vị trí cho ứng dụng trong Cài đặt.', [
                    { text: 'Hủy', style: 'cancel', onPress: () => setLocating(false) },
                    { text: 'Mở cài đặt', onPress: () => { Linking.openSettings(); setLocating(false); } },
                  ]);
                  return;
                }

                const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const { latitude, longitude } = result.coords;
                // update stored user location
                setUserLocation({ latitude, longitude });
                if (mapRef.current?.animateToRegion) {
                  mapRef.current.animateToRegion(
                    { latitude, longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 },
                    500
                  );
                }
              } catch (e) {
                console.warn('locate error', e);
              } finally {
                setLocating(false);
              }
            }}
            accessibilityLabel="Xác định vị trí"
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="crosshair" size={20} color={colors.primary} />
            )}
          </Pressable>
        )}

        <Modal visible={areaModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalPane}>
              <Text style={styles.modalTitle}>Chọn khu vực</Text>
              <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
                <Pressable
                  style={[
                    styles.modalItem,
                    selectedAreaId === '' && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setSelectedAreaId('');
                    setAreaModalOpen(false);
                  }}
                >
                  <Text style={[styles.modalItemText, selectedAreaId === '' && styles.modalItemTextActive]}>
                    Tất cả khu vực
                  </Text>
                </Pressable>
                {areas?.map((area: any) => {
                  const areaId = getAreaId(area);
                  const selected = areaId === selectedAreaId;
                  return (
                    <Pressable
                      key={areaId || getAreaName(area)}
                      style={[styles.modalItem, selected && styles.modalItemActive]}
                      onPress={() => {
                        setSelectedAreaId(areaId);
                        setAreaModalOpen(false);
                      }}
                    >
                      <Text style={[styles.modalItemText, selected && styles.modalItemTextActive]}>
                        {getAreaName(area)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <AppButton variant="ghost" size="md" onPress={() => setAreaModalOpen(false)}>
                Đóng
              </AppButton>
            </View>
          </View>
        </Modal>

        <BottomSheet
          visible={feedbackListVisible}
          onClose={handleCloseFeedbackExplorer}
          snapPoint={LIST_SHEET_HEIGHT}
        >
          <View style={styles.sheetContent}>
            <View style={styles.listHeader}>
              <Text style={styles.sheetTitle}>Feedback Explorer</Text>
            </View>
            <FlatList
              data={feedbackItems}
              keyExtractor={(item: any) => getFeedbackId(item)}
              contentContainerStyle={[styles.feedbackListContent, { paddingTop: 8 }]}
              style={styles.feedbackList}
              showsVerticalScrollIndicator={false}
              decelerationRate="fast"
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              viewabilityConfig={viewabilityConfig}
              onViewableItemsChanged={onViewableItemsChanged}
              onEndReached={() => {
                console.log('feed: onEndReached');
                if (typeof fetchNextPage === 'function' && hasNextPage) {
                  console.log('feed: fetchNextPage called');
                  fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.5}
              
              renderItem={({ item, index }: { item: any; index: number }) => {
                const id = getFeedbackId(item);
                const selected = selectedFeedback?.id === id;
                return (
                  <View
                    style={[
                      styles.feedbackItem,
                      index > 0 && { marginTop: -OVERLAP },
                      selected && styles.feedbackItemActive,
                    ]}
                  >
                    <Pressable onPress={() => handleSelectFeedback(item)} pressRetentionOffset={{ top: 2, left: 2, right: 2, bottom: 2 }}>
                      <View style={styles.feedbackItemHeader}>
                        <Text style={styles.feedbackItemTitle} numberOfLines={2}>
                          {getFeedbackTitle(item)}
                        </Text>
                        <View style={styles.feedbackPriorityBadge}>
                          <Text style={styles.feedbackPriorityText}>{String(item.priority ?? 'N/A')}</Text>
                        </View>
                      </View>
                      <Text style={styles.feedbackItemMetaText} numberOfLines={1}>
                        {getAreaName(item.area ?? { areaName: item.areaName ?? item.area ?? '' })} • {String(item.status ?? 'Pending').toUpperCase()}
                      </Text>
                    </Pressable>
                  </View>
                );
              }}
              ListFooterComponent={() =>
                isFetchingNextPage ? (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
            />
          </View>
        </BottomSheet>

        <BottomSheet visible={Boolean(selectedIncident)} onClose={() => setSelectedIncident(null)} snapPoint={380}>
          {selectedIncident ? (
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{getFeedbackTitle(selectedIncident)}</Text>
                <View style={styles.sheetBadgeRow}>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgeText}>{String(selectedIncident.status ?? 'Chờ xử lý').toUpperCase()}</Text>
                  </View>
                  <View style={[styles.badgePill, styles.priorityBadgePill]}>
                    <Text style={styles.badgeText}>{String(selectedIncident.priority ?? 'Normal')}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.sheetMetaRow}>
                <Icon name="map-pin" size={14} color={colors.primary} />
                <Text style={styles.sheetMetaText}>{getFeedbackAddress(selectedIncident)}</Text>
              </View>
              <View style={styles.sheetMetaRow}>
                <Icon name="layers" size={14} color={colors.muted} />
                <Text style={styles.sheetMetaText}>{getAreaName(selectedIncident.area ?? { areaName: selectedIncident.areaName ?? selectedIncident.area ?? '' })}</Text>
              </View>
              <View style={styles.sheetMetaRow}>
                <Icon name="calendar" size={14} color={colors.muted} />
                <Text style={styles.sheetMetaText}>{formatDate(getCreatedAt(selectedIncident))}</Text>
              </View>
              <View style={styles.sheetActions}>
                <AppButton
                  variant="outline"
                  size="md"
                  onPress={() => goToDetail(selectedIncident)}
                >
                  Xem chi tiết
                </AppButton>
                <AppButton
                  variant="primary"
                  size="md"
                  onPress={handleSupport}
                  disabled={supportDisabled || supportLoading}
                >
                  {supportLoading ? 'Đang gửi...' : supportDisabled ? 'Đã ủng hộ' : 'Tôi cũng gặp'}
                </AppButton>
              </View>
            </View>
          ) : null}
        </BottomSheet>

        {loading ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  screen: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  selectorWrapper: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  selectorCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectorLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    marginBottom: 4,
  },
  selectorTitle: {
    fontSize: 16,
    fontFamily: 'Geist-SemiBold',
    color: '#0F172A',
    maxWidth: '80%',
  },
  selectorAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectorActionText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Geist-Medium',
  },
  selectorErrorText: {
    marginTop: 10,
    fontSize: 13,
    color: '#B91C1C',
    fontFamily: 'Geist-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  modalPane: {
    maxHeight: '65%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Geist-Bold',
    color: '#0F172A',
    marginBottom: 14,
  },
  modalList: {
    marginBottom: 16,
  },
  modalListContent: {
    paddingBottom: 8,
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  modalItemActive: {
    backgroundColor: '#EEF2FF',
  },
  modalItemText: {
    fontSize: 15,
    color: '#0F172A',
  },
  modalItemTextActive: {
    color: colors.primary,
    fontFamily: 'Geist-SemiBold',
  },
  clusterText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  markerSelected: {
    borderColor: '#F59E0B',
    borderWidth: 4,
  },
  feedbackExplorerButton: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    zIndex: 25,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
  },
  locateButton: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    zIndex: 25,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
  },
  listHeader: {
    marginBottom: 16,
  },
  feedbackList: {
    flex: 1,
  },
  feedbackListContent: {
    paddingBottom: 12,
  },
  feedbackItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E6EEF8',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 4,
  },
  feedbackItemActive: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFF',
  },
  feedbackItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  feedbackItemTitle: {
    fontSize: 14,
    fontFamily: 'Geist-SemiBold',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  feedbackPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  feedbackPriorityText: {
    fontSize: 11,
    fontFamily: 'Geist-Medium',
    color: '#334155',
  },
  feedbackItemMetaText: {
    fontSize: 12,
    color: '#475569',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 82,
  },
  sheetHeader: {
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 19,
    fontFamily: 'Geist-Bold',
    color: '#0F172A',
    marginBottom: 10,
  },
  sheetBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  priorityBadgePill: {
    backgroundColor: '#FEF3F2',
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Geist-SemiBold',
    color: '#0F172A',
  },
  sheetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sheetMetaText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
