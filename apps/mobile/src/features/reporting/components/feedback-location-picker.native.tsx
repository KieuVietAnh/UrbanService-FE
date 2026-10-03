import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import MapView, { Marker, Polygon } from 'react-native-maps';
import type { FeedbackLocationMapHandle, FeedbackLocationPickerProps } from './reporting-map.types';

const FeedbackLocationPicker = forwardRef<FeedbackLocationMapHandle, FeedbackLocationPickerProps>(
  ({ latitude, longitude, boundaryPolygons = [], onCoordinateSelect }, ref) => {
    const mapRef = useRef<MapView>(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (region, duration) => mapRef.current?.animateToRegion(region, duration),
      fitToCoordinates: (coordinates, options) => mapRef.current?.fitToCoordinates(coordinates, options),
    }));

    return (
      <MapView
      ref={mapRef}
      style={{ width: '100%', height: 300, borderRadius: 16 }}
      initialRegion={{
        latitude: latitude ?? 21.0278,
        longitude: longitude ?? 105.8342,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      }}
      onPress={(event) => {
        const coordinate = event.nativeEvent.coordinate;
        onCoordinateSelect(coordinate.latitude, coordinate.longitude);
      }}
    >
      {boundaryPolygons.map((polygon, index) => (
        <Polygon
          key={`area-boundary-${index}`}
          coordinates={polygon.coordinates}
          holes={polygon.holes}
          strokeColor="#2563EB"
          strokeWidth={3}
          fillColor="rgba(37, 99, 235, 0.14)"
          tappable={false}
        />
      ))}
      {latitude != null && longitude != null ? (
        <Marker coordinate={{ latitude: Number(latitude), longitude: Number(longitude) }} />
      ) : null}
      </MapView>
    );
  }
);

FeedbackLocationPicker.displayName = 'FeedbackLocationPicker';

export default FeedbackLocationPicker;
