import { useEffect, useMemo, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as Lucide from 'lucide-react';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DEFAULT_CENTER = [10.776530, 106.700981];
const DEFAULT_ZOOM = 14;

const defaultIcon = new L.Icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

function isValidCoordinate(value, min, max) {
  return typeof value === 'number' && isFinite(value) && value >= min && value <= max;
}

function isValidLocation(lat, lng) {
  return isValidCoordinate(lat, -90, 90) && isValidCoordinate(lng, -180, 180);
}

function stripWrappingQuotes(value) {
  const trimmed = value.trim();

  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseJsonBoundary(value) {
  const unwrapped = stripWrappingQuotes(value);
  const candidates = [
    value,
    unwrapped,
    value.replace(/""/g, '"'),
    unwrapped.replace(/""/g, '"'),
    value.replace(/\\"/g, '"'),
    unwrapped.replace(/\\"/g, '"'),
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);

      if (typeof parsed === 'string' && parsed !== candidate) {
        const nested = parseJsonBoundary(parsed);
        if (nested) return nested;
      }

      if (parsed && ['Polygon', 'MultiPolygon', 'Feature', 'FeatureCollection'].includes(parsed.type)) {
        return parsed;
      }
    } catch {
      // Try the next possible representation.
    }
  }

  return null;
}

function parseCoordinatePair(pairText) {
  const values = pairText
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter(Number.isFinite);

  if (values.length < 2) return null;

  return [values[0], values[1]];
}

function parseWktPolygonRings(ringsText) {
  return ringsText
    .split(/\)\s*,\s*\(/)
    .map((ringText) => ringText.replace(/[()]/g, '').trim())
    .filter(Boolean)
    .map((ringText) => ringText.split(',').map(parseCoordinatePair).filter(Boolean))
    .filter((ring) => ring.length >= 4);
}

function parseWktBoundary(value) {
  const normalized = value.trim();

  const polygonMatch = normalized.match(/^POLYGON\s*\(\((.*)\)\)$/i);
  if (polygonMatch) {
    const coordinates = parseWktPolygonRings(polygonMatch[1]);
    return coordinates.length ? { type: 'Polygon', coordinates } : null;
  }

  const multiPolygonMatch = normalized.match(/^MULTIPOLYGON\s*\(\(\((.*)\)\)\)$/i);
  if (multiPolygonMatch) {
    const polygons = multiPolygonMatch[1]
      .split(/\)\s*\)\s*,\s*\(\s*\(/)
      .map(parseWktPolygonRings)
      .filter((polygon) => polygon.length > 0);

    return polygons.length ? { type: 'MultiPolygon', coordinates: polygons } : null;
  }

  return null;
}

function normalizeBoundaryGeoJson(boundaryGeoJson) {
  if (!boundaryGeoJson) return null;

  if (typeof boundaryGeoJson === 'object') {
    return ['Polygon', 'MultiPolygon', 'Feature', 'FeatureCollection'].includes(boundaryGeoJson.type)
      ? boundaryGeoJson
      : null;
  }

  if (typeof boundaryGeoJson !== 'string') return null;

  const trimmed = boundaryGeoJson.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;

  const jsonBoundary = parseJsonBoundary(trimmed);
  if (jsonBoundary) return jsonBoundary;

  const wktBoundary = parseWktBoundary(trimmed);
  if (wktBoundary) return wktBoundary;

  console.warn('Unsupported area boundary format', trimmed.slice(0, 120));
  return null;
}

function getPolygonRings(geoJson) {
  if (!geoJson) return [];

  if (geoJson.type === 'Polygon') {
    return [geoJson.coordinates];
  }

  if (geoJson.type === 'MultiPolygon') {
    return geoJson.coordinates;
  }

  if (geoJson.type === 'Feature') {
    return getPolygonRings(geoJson.geometry);
  }

  if (geoJson.type === 'FeatureCollection') {
    return geoJson.features.flatMap((feature) => getPolygonRings(feature));
  }

  return [];
}

function isPointInRing(lng, lat, ring) {
  let inside = false;

  for (let index = 0, previousIndex = ring.length - 1; index < ring.length; previousIndex = index) {
    const [currentLng, currentLat] = ring[index];
    const [previousLng, previousLat] = ring[previousIndex];

    const intersects = ((currentLat > lat) !== (previousLat > lat)) &&
      (lng < ((previousLng - currentLng) * (lat - currentLat)) / (previousLat - currentLat || Number.EPSILON) + currentLng);

    if (intersects) inside = !inside;
  }

  return inside;
}

function isPointInsideBoundary(lat, lng, boundaryGeoJson) {
  const polygons = getPolygonRings(boundaryGeoJson);

  if (polygons.length === 0) return true;

  return polygons.some((rings) => {
    const [outerRing, ...holes] = rings;
    if (!outerRing || !isPointInRing(lng, lat, outerRing)) return false;
    return !holes.some((hole) => isPointInRing(lng, lat, hole));
  });
}

function MapBoundaryFit({ boundaryGeoJson }) {
  const map = useMap();

  useEffect(() => {
    if (!boundaryGeoJson) return;

    const layer = L.geoJSON(boundaryGeoJson);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        animate: true,
        maxZoom: 16,
        padding: [28, 28]
      });
    }
  }, [boundaryGeoJson, map]);

  return null;
}

function MapAutoCenter({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

function LocationSelector({ readonly, onSelect }) {
  useMapEvents({
    click: (event) => {
      if (readonly || typeof onSelect !== 'function') return;
      const { lat, lng } = event.latlng;
      onSelect({ lat, lng });
    }
  });

  return null;
}

export const LocationPicker = ({
  latitude = null,
  longitude = null,
  initialLatitude = DEFAULT_CENTER[0],
  initialLongitude = DEFAULT_CENTER[1],
  onSelectLocation,
  readonly = false,
  markers = [],
  boundaryGeoJson = null,
  boundaryName = '',
  className = ''
}) => {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const areaBoundary = useMemo(
    () => normalizeBoundaryGeoJson(boundaryGeoJson),
    [boundaryGeoJson]
  );

  const selectedPosition = useMemo(() => {
    if (isValidLocation(latitude, longitude)) {
      return { lat: latitude, lng: longitude };
    }
    return null;
  }, [latitude, longitude]);

  const center = useMemo(() => {
    if (selectedPosition) {
      return [selectedPosition.lat, selectedPosition.lng];
    }
    return [initialLatitude, initialLongitude];
  }, [selectedPosition, initialLatitude, initialLongitude]);

  const updateSelection = (lat, lng, message = null) => {
    if (!isValidLocation(lat, lng)) {
      setError('Tọa độ không hợp lệ. Vui lòng chọn lại.');
      return;
    }

    if (areaBoundary && !isPointInsideBoundary(lat, lng, areaBoundary)) {
      setError(boundaryName
        ? `Vị trí đã chọn nằm ngoài khu vực ${boundaryName}. Vui lòng chọn điểm bên trong khu vực này.`
        : 'Vị trí đã chọn nằm ngoài khu vực đã chọn. Vui lòng chọn lại.');
      return;
    }

    setError('');
    if (typeof onSelectLocation === 'function') {
      onSelectLocation(lat, lng, message || `Vị trí đã chọn: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  const handleUseCurrentLocation = () => {
    if (readonly) return;
    if (!navigator.geolocation) {
      setError('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }

    setError('');
    setStatus('Đang xác định vị trí hiện tại...');
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false);
        setStatus('Đã lấy vị trí hiện tại.');
        const { latitude: lat, longitude: lng } = position.coords;
        updateSelection(lat, lng, `Vị trí hiện tại: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      },
      (geoError) => {
        setLoading(false);
        if (geoError.code === 1) {
          setError('Quyền truy cập vị trí bị từ chối. Vui lòng bật quyền GPS và thử lại.');
        } else if (geoError.code === 2) {
          setError('Không thể xác định vị trí. Vui lòng kiểm tra GPS hoặc thử lại sau.');
        } else {
          setError('Lỗi định vị GPS. Vui lòng thử lại.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  };

  return (
    <div className={`space-y-3 text-slate-800 ${className}`}>
      <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm h-[400px]">
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={!readonly}
          className="w-full h-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {areaBoundary ? (
            <>
              <MapBoundaryFit boundaryGeoJson={areaBoundary} />
              <GeoJSON
                key={JSON.stringify(areaBoundary)}
                data={areaBoundary}
                style={{
                  color: '#2563eb',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.16,
                  opacity: 0.95,
                  weight: 3
                }}
              />
            </>
          ) : (
            <MapAutoCenter center={center} />
          )}
          <LocationSelector readonly={readonly} onSelect={({ lat, lng }) => updateSelection(lat, lng)} />
          {markers.map((marker, index) => {
            if (!isValidLocation(marker.latitude, marker.longitude)) return null;
            return (
              <Marker
                key={`marker-${marker.feedbackId || marker.id || index}`}
                position={[marker.latitude, marker.longitude]}
                icon={defaultIcon}
              >
                <Popup>
                  <div className="text-xs font-bold text-slate-900">
                    {marker.title || marker.locationText || 'Ticket'}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    {marker.locationText || `Vị trí: ${marker.latitude.toFixed(6)}, ${marker.longitude.toFixed(6)}`}
                  </div>
                </Popup>
              </Marker>
            );
          })}
          {selectedPosition && (
            <Marker position={[selectedPosition.lat, selectedPosition.lng]} icon={defaultIcon}>
              <Popup>
                {readonly ? 'Vị trí vé' : 'Vị trí đã chọn'}<br />
                {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <span>
              {readonly
                ? 'Chế độ xem chỉ'
                : areaBoundary
                  ? 'Chọn vị trí bằng cách nhấp vào vùng khu vực được tô sáng'
                  : 'Chọn vị trí bằng cách nhấp vào bản đồ'}
            </span>
          </div>
          {selectedPosition ? (
            <div className="text-[11px] font-bold text-slate-700">
              Vĩ độ: {selectedPosition.lat.toFixed(6)} • Kinh độ: {selectedPosition.lng.toFixed(6)}
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 font-semibold">
              {readonly
                ? 'Vị trí chưa có trên vé.'
                : areaBoundary
                  ? 'Nhấp vào vùng được tô sáng để đặt vị trí.'
                  : 'Nhấp vào bản đồ để đặt vị trí.'}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={readonly || loading}
            className={`btn btn-sm rounded-xl font-bold btn-primary ${readonly ? 'btn-disabled bg-slate-200 text-slate-400 border-slate-200' : 'text-white'} ${loading ? 'opacity-80 cursor-wait' : ''}`}
          >
            {loading ? (
              <span className="loading loading-spinner"></span>
            ) : (
              <>
                <Lucide.Compass size={14} />
                Sử dụng vị trí hiện tại
              </>
            )}
          </button>
          {status && <span className="text-[11px] text-slate-500 font-semibold">{status}</span>}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
          <div className="font-bold">Lỗi định vị</div>
          <div>{error}</div>
        </div>
      )}
    </div>
  );
};
