import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import MapView from 'react-native-map-clustering';
import { Circle, Marker } from 'react-native-maps';
import Icon from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { SkeletonCard } from '@/components/ui/AppSkeleton';
import { TicketStatusBadge } from '@/components/ui/TicketStatusBadge';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';
import type { RouterLike, TicketLike } from '../types';
import { styles } from '../homeStyles';

type Props = {
  nearbyLoading: boolean;
  nearby: TicketLike[];
  router: RouterLike;
};

export function NearbyIncidents({ nearbyLoading, nearby, router }: Props) {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapRefLocal = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Quyền vị trí bị từ chối');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted) return;
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch (e) {
        setLocationError('Không thể lấy vị trí');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userLocation || !mapRefLocal.current) return;
    const { latitude, longitude } = userLocation;
    setTimeout(() => {
      try {
        if (typeof mapRefLocal.current.animateCamera === 'function') {
          mapRefLocal.current.animateCamera({ center: { latitude, longitude } }, { duration: 400 });
        } else if (typeof mapRefLocal.current.animateToRegion === 'function') {
          mapRefLocal.current.animateToRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 400);
        }
      } catch (e) {
        // Map preview should remain tappable even if the native map ref is not ready.
      }
    }, 120);
  }, [userLocation]);

  const markers = nearby
    .filter((it) => Number.isFinite(Number((it as any)?.latitude)) && Number.isFinite(Number((it as any)?.longitude)))
    .map((it) => ({
      id: String((it as any).feedbackId ?? (it as any).id ?? Math.random()),
      latitude: Number((it as any).latitude),
      longitude: Number((it as any).longitude),
    }));

  return (
    <View style={styles.section}>
      {nearbyLoading ? (
        <View style={styles.mapSkeleton}>
          <SkeletonCard />
        </View>
      ) : nearby.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Icon name="map" size={28} color={colors.lightMuted} />
          <Text style={styles.emptyTitle}>Chưa có sự cố gần đây</Text>
          <Text style={styles.emptySubtitle}>Các phản ánh trong bán kính gần bạn sẽ xuất hiện ở đây.</Text>
        </View>
      ) : (
        <View style={styles.mapCard}>
          <View style={styles.mapHeaderOverlay}>
            <View>
              <Text style={styles.mapTitle}>Sự cố gần bạn</Text>
              <View style={styles.mapCountRow}>
                <View style={styles.mapCountDot} />
                <Text style={styles.mapSubtitle}>{nearby.length} sự cố trong bán kính 1 km</Text>
              </View>
            </View>
            <Pressable
              style={styles.mapLink}
              onPress={() => router.push('/(resident)/community/map')}
              accessibilityRole="button"
              accessibilityLabel={`${nearby.length} phản ánh trong bán kính 1 km, xem bản đồ`}
            >
              <Text style={styles.mapLinkText}>Xem bản đồ</Text>
              <Icon name="chevron-right" size={15} color={colors.primary} />
            </Pressable>
          </View>

          <View style={styles.mapIllustration}>
            <MapView
              style={{ ...StyleSheet.absoluteFillObject }}
              initialRegion={
                userLocation
                  ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }
                  : { latitude: 10.7399, longitude: 106.7019, latitudeDelta: 0.05, longitudeDelta: 0.05 }
              }
              mapRef={(map) => {
                mapRefLocal.current = map;
              }}
              onRegionChangeComplete={() => {}}
              showsUserLocation={false}
              showsMyLocationButton={false}
              toolbarEnabled={false}
            >
              {userLocation ? (
                <>
                  <Circle
                    center={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
                    radius={1000}
                    strokeColor="rgba(37,99,235,0.18)"
                    fillColor="rgba(37,99,235,0.08)"
                  />
                  <Marker key="__user" coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}>
                    <View style={styles.mapPinUser} />
                  </Marker>
                </>
              ) : null}

              {markers.map((marker, index) => (
                <Marker key={marker.id} coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}>
                  <View style={[styles.mapPin, index % 3 === 0 && styles.mapPinHot, index % 3 === 1 && styles.mapPinWarn]} />
                </Marker>
              ))}
            </MapView>
          </View>

          {nearby[0] ? (
            <Pressable
              style={styles.mapTicketCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const id = (nearby[0] as any).feedbackId ?? (nearby[0] as any).id;
                if (id) router.push(`/(resident)/tickets/${id}`);
              }}
              accessibilityRole="button"
              accessibilityLabel="Mở chi tiết phản ánh gần bạn"
            >
              <View style={styles.mapStrongRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapStrongTitle} numberOfLines={1}>
                    {nearby[0].title ?? 'Phản ánh gần bạn'}
                  </Text>
                  <Text style={styles.mapStrongMeta} numberOfLines={1}>
                    {nearby[0].locationText ?? locationError ?? 'Vị trí đang cập nhật'}
                  </Text>
                </View>
                <TicketStatusBadge status={nearby[0].status ?? 'Submitted'} size="sm" />
              </View>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
