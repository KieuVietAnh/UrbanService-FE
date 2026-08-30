import { useEffect, useMemo, useState } from 'react';
import { GeoJSON, MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  MAP_GEOCODING_REVERSE_URL,
  MAP_GEOCODING_SEARCH_URL,
} from '../../config/mapConfig';
import ConfiguredMapTileLayer from './ConfiguredMapTileLayer';
import * as Lucide from 'lucide-react';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DEFAULT_CENTER = [10.776530, 106.700981];
const DEFAULT_ZOOM = 14;
const GEOCODING_ENDPOINT = MAP_GEOCODING_SEARCH_URL;
const REVERSE_GEOCODING_ENDPOINT = MAP_GEOCODING_REVERSE_URL;
const GEOCODING_CACHE_PREFIX = 'urbanmind:location-search:';
const REVERSE_GEOCODING_CACHE_PREFIX = 'urbanmind:location-reverse:';
let lastNominatimRequestAt = 0;


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

function normalizeSearchText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeWardName(value = '') {
  return normalizeSearchText(value)
    .replace(/^(phuong|xa|thi tran)\s+/, '')
    .trim();
}

function doesSearchResultMatchBoundaryName(result, boundaryName) {
  const expectedWard = normalizeWardName(boundaryName);
  if (!expectedWard) return true;

  const address = result?.address && typeof result.address === 'object'
    ? result.address
    : {};

  const administrativeCandidates = [
    address.suburb,
    address.quarter,
    address.neighbourhood,
    address.village,
    address.town,
    address.city_district,
    address.municipality,
  ]
    .map(normalizeWardName)
    .filter(Boolean);

  if (administrativeCandidates.some((candidate) => (
    candidate === expectedWard ||
    candidate.includes(expectedWard) ||
    expectedWard.includes(candidate)
  ))) {
    return true;
  }

  const displayName = normalizeSearchText(result?.display_name || '');
  return displayName.includes(expectedWard);
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

  const withoutWrappingQuotes = (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  )
    ? trimmed.slice(1, -1)
    : trimmed;

  const candidates = [
    trimmed,
    withoutWrappingQuotes,
    trimmed.replace(/""/g, '"'),
    withoutWrappingQuotes.replace(/""/g, '"'),
    trimmed.replace(/\\"/g, '"'),
    withoutWrappingQuotes.replace(/\\"/g, '"'),
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed === 'string' && parsed !== candidate) return normalizeBoundaryGeoJson(parsed);
      return parsed && ['Polygon', 'MultiPolygon', 'Feature', 'FeatureCollection'].includes(parsed.type)
        ? parsed
        : null;
    } catch {
      // Try next serialized boundary representation.
    }
  }

  console.warn('Unsupported area boundary format', trimmed.slice(0, 120));
  return null;
}

function getBoundaryLayerKey(boundaryGeoJson) {
  if (!boundaryGeoJson) return 'no-boundary';

  if (boundaryGeoJson.type === 'FeatureCollection') {
    return `feature-collection-${boundaryGeoJson.features?.length || 0}`;
  }

  if (boundaryGeoJson.type === 'Feature') {
    return `feature-${boundaryGeoJson.geometry?.type || 'unknown'}`;
  }

  return boundaryGeoJson.type || 'boundary';
}

function isPointOnSegment(lng, lat, start, end) {
  const [startLng, startLat] = start;
  const [endLng, endLat] = end;
  const cross = (lat - startLat) * (endLng - startLng) - (lng - startLng) * (endLat - startLat);
  if (Math.abs(cross) > 1e-10) return false;

  const dot = (lng - startLng) * (endLng - startLng) + (lat - startLat) * (endLat - startLat);
  if (dot < 0) return false;

  const squaredLength = (endLng - startLng) ** 2 + (endLat - startLat) ** 2;
  return dot <= squaredLength;
}

function isPointInRing(lat, lng, ring = []) {
  if (!Array.isArray(ring) || ring.length < 3) return false;

  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    if (!Array.isArray(currentPoint) || !Array.isArray(previousPoint)) continue;

    if (isPointOnSegment(lng, lat, previousPoint, currentPoint)) return true;

    const [currentLng, currentLat] = currentPoint;
    const [previousLng, previousLat] = previousPoint;
    const intersects = ((currentLat > lat) !== (previousLat > lat)) &&
      (lng < ((previousLng - currentLng) * (lat - currentLat)) / (previousLat - currentLat) + currentLng);

    if (intersects) inside = !inside;
  }

  return inside;
}

function isPointInPolygon(lat, lng, polygonCoordinates = []) {
  if (!Array.isArray(polygonCoordinates) || polygonCoordinates.length === 0) return false;
  if (!isPointInRing(lat, lng, polygonCoordinates[0])) return false;

  return !polygonCoordinates.slice(1).some((hole) => isPointInRing(lat, lng, hole));
}

function isPointInsideBoundary(lat, lng, geoJson) {
  if (!geoJson) return true;

  if (geoJson.type === 'FeatureCollection') {
    return (geoJson.features || []).some((feature) => isPointInsideBoundary(lat, lng, feature));
  }

  if (geoJson.type === 'Feature') {
    return geoJson.geometry
      ? isPointInsideBoundary(lat, lng, geoJson.geometry)
      : false;
  }

  if (geoJson.type === 'GeometryCollection') {
    return (geoJson.geometries || []).some((geometry) => isPointInsideBoundary(lat, lng, geometry));
  }

  if (geoJson.type === 'Polygon') {
    return isPointInPolygon(lat, lng, geoJson.coordinates);
  }

  if (geoJson.type === 'MultiPolygon') {
    return (geoJson.coordinates || []).some((polygon) => isPointInPolygon(lat, lng, polygon));
  }

  // Unsupported geometries (Point/LineString/etc.) must never make an arbitrary
  // coordinate pass a ward-boundary validation.
  return false;
}


// eslint-disable-next-line react-refresh/only-export-components
export function isLocationInsideBoundaryGeoJson(lat, lng, boundaryGeoJson) {
  if (!isValidLocation(lat, lng)) return false;
  if (!boundaryGeoJson) return true;

  const normalizedBoundary = normalizeBoundaryGeoJson(boundaryGeoJson);
  if (!normalizedBoundary) return false;

  return isPointInsideBoundary(lat, lng, normalizedBoundary);
}


// eslint-disable-next-line react-refresh/only-export-components
export async function reverseGeocodeApproximateAddress(lat, lng, boundaryName = '') {
  if (!isValidLocation(lat, lng)) {
    return boundaryName
      ? `${boundaryName} (vị trí gần đúng)`
      : 'Vị trí đã được xác định trên bản đồ';
  }

  const numericLat = Number(lat);
  const numericLng = Number(lng);
  const cacheKey = `${numericLat.toFixed(5)},${numericLng.toFixed(5)}`;
  const cached = readReverseGeocodingCache(cacheKey);

  if (cached) {
    return formatApproximateAddress(cached, boundaryName, numericLat, numericLng);
  }

  try {
    await waitForNominatimRateLimit();

    const params = new URLSearchParams({
      lat: String(numericLat),
      lon: String(numericLng),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18',
      'accept-language': 'vi',
    });

    const response = await fetch(
      `${REVERSE_GEOCODING_ENDPOINT}?${params.toString()}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status ${response.status}`);
    }

    const payload = await response.json();
    writeReverseGeocodingCache(cacheKey, payload);
    return formatApproximateAddress(payload, boundaryName, numericLat, numericLng);
  } catch (reverseError) {
    console.warn('Reverse geocoding unavailable', reverseError);
    return boundaryName
      ? `${boundaryName} (vị trí gần đúng)`
      : 'Vị trí đã được xác định trên bản đồ';
  }
}

function getBoundaryViewbox(boundaryGeoJson) {
  if (!boundaryGeoJson) return null;

  try {
    const bounds = L.geoJSON(boundaryGeoJson).getBounds();
    if (!bounds.isValid()) return null;

    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();
    const south = bounds.getSouth();
    return `${west},${north},${east},${south}`;
  } catch {
    return null;
  }
}

function readGeocodingCache(cacheKey) {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(`${GEOCODING_CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeGeocodingCache(cacheKey, results) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      `${GEOCODING_CACHE_PREFIX}${cacheKey}`,
      JSON.stringify(results)
    );
  } catch {
    // Storage can be unavailable in private mode.
  }
}


function readReverseGeocodingCache(cacheKey) {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(
      `${REVERSE_GEOCODING_CACHE_PREFIX}${cacheKey}`
    );
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeReverseGeocodingCache(cacheKey, result) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      `${REVERSE_GEOCODING_CACHE_PREFIX}${cacheKey}`,
      JSON.stringify(result)
    );
  } catch {
    // Storage can be unavailable in private mode.
  }
}

async function waitForNominatimRateLimit() {
  const elapsed = Date.now() - lastNominatimRequestAt;
  if (elapsed < 1000) {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 1000 - elapsed);
    });
  }
  lastNominatimRequestAt = Date.now();
}

function formatApproximateAddress(result, boundaryName, lat, lng) {
  if (!result || typeof result !== 'object') {
    return boundaryName
      ? `${boundaryName} (vị trí gần đúng)`
      : 'Vị trí đã được xác định trên bản đồ';
  }

  if (!boundaryName || doesSearchResultMatchBoundaryName(result, boundaryName)) {
    return result.display_name || (
      boundaryName
        ? `${boundaryName} (vị trí gần đúng)`
        : 'Vị trí đã được xác định trên bản đồ'
    );
  }

  const address = result.address && typeof result.address === 'object'
    ? result.address
    : {};
  const streetParts = [
    address.house_number,
    address.road || address.pedestrian || address.path || address.neighbourhood || address.quarter,
  ].filter(Boolean);

  if (streetParts.length > 0) {
    return `${streetParts.join(' ')}, ${boundaryName}`;
  }

  return `${boundaryName} · ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function MapAutoCenter({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

function MapBoundaryAutoFit({ boundaryGeoJson }) {
  const map = useMap();

  useEffect(() => {
    if (!boundaryGeoJson) return;

    const boundaryLayer = L.geoJSON(boundaryGeoJson);
    const bounds = boundaryLayer.getBounds();

    if (!bounds.isValid()) return;

    map.fitBounds(bounds, {
      animate: true,
      duration: 0.8,
      padding: [36, 36],
      maxZoom: DEFAULT_ZOOM
    });
  }, [boundaryGeoJson, map]);

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
  const [areaBoundary, setAreaBoundary] = useState(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addressSearchMessage, setAddressSearchMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    setAreaBoundary(null);

    if (!boundaryGeoJson) return undefined;

    const timer = window.setTimeout(() => {
      const normalizedBoundary = normalizeBoundaryGeoJson(boundaryGeoJson);

      if (!cancelled) {
        setAreaBoundary(normalizedBoundary);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [boundaryGeoJson]);

  useEffect(() => {
    setAddressResults([]);
    setAddressSearchMessage('');
  }, [boundaryName, boundaryGeoJson]);

  const boundaryLayerKey = useMemo(
    () => getBoundaryLayerKey(areaBoundary),
    [areaBoundary]
  );

  const selectedPosition = useMemo(() => {
    if (!isValidLocation(latitude, longitude)) return null;

    if (
      boundaryGeoJson &&
      !isLocationInsideBoundaryGeoJson(latitude, longitude, boundaryGeoJson)
    ) {
      return null;
    }

    return { lat: latitude, lng: longitude };
  }, [latitude, longitude, boundaryGeoJson]);

  const center = useMemo(() => {
    if (selectedPosition) {
      return [selectedPosition.lat, selectedPosition.lng];
    }
    return [initialLatitude, initialLongitude];
  }, [selectedPosition, initialLatitude, initialLongitude]);

  const reverseGeocodeLocation = (lat, lng) => (
    reverseGeocodeApproximateAddress(lat, lng, boundaryName)
  );

  const updateSelection = (lat, lng, message = null) => {
    if (!isValidLocation(lat, lng)) {
      setError('Tọa độ không hợp lệ. Vui lòng chọn lại.');
      return false;
    }

    if (boundaryGeoJson && !isLocationInsideBoundaryGeoJson(lat, lng, boundaryGeoJson)) {
      setError(
        boundaryName
          ? `Vị trí này không thuộc ${boundaryName}. Vui lòng chọn lại vị trí trong khu vực đã chọn.`
          : 'Vị trí này nằm ngoài khu vực đã chọn. Vui lòng chọn lại.'
      );
      return false;
    }

    setError('');
    setStatus('');
    if (typeof onSelectLocation === 'function') {
      onSelectLocation(
        lat,
        lng,
        message || (
          boundaryName
            ? `${boundaryName} (vị trí gần đúng)`
            : 'Vị trí đã được xác định trên bản đồ'
        )
      );
    }
    return true;
  };

  const updateSelectionFromCoordinates = async (lat, lng) => {
    if (!isValidLocation(lat, lng)) {
      setError('Tọa độ không hợp lệ. Vui lòng chọn lại.');
      return false;
    }

    if (
      boundaryGeoJson &&
      !isLocationInsideBoundaryGeoJson(lat, lng, boundaryGeoJson)
    ) {
      setError(
        boundaryName
          ? `Vị trí này không thuộc ${boundaryName}. Vui lòng chọn lại vị trí trong khu vực đã chọn.`
          : 'Vị trí này nằm ngoài khu vực đã chọn. Vui lòng chọn lại.'
      );
      return false;
    }

    setStatus('Đang xác định địa chỉ gần đúng...');
    const approximateAddress = await reverseGeocodeLocation(lat, lng);
    const selected = updateSelection(lat, lng, approximateAddress);
    if (selected) {
      setStatus('Đã xác định vị trí và địa chỉ gần đúng.');
    }
    return selected;
  };

  const handleAddressSearch = async (event) => {
    event.preventDefault();
    if (readonly || searchingAddress) return;

    const query = addressQuery.trim();
    if (query.length < 3) {
      setAddressResults([]);
      setAddressSearchMessage('Vui lòng nhập ít nhất 3 ký tự để tìm địa chỉ.');
      return;
    }

    setSearchingAddress(true);
    setError('');
    setAddressSearchMessage('');

    const viewbox = getBoundaryViewbox(areaBoundary);
    const cacheKey = JSON.stringify({ query: query.toLowerCase(), viewbox: viewbox || '' });
    const cachedResults = readGeocodingCache(cacheKey);

    try {
      let results = cachedResults;

      if (!results) {
        const params = new URLSearchParams({
          q: query,
          format: 'jsonv2',
          addressdetails: '1',
          limit: '5',
          countrycodes: 'vn',
          'accept-language': 'vi',
        });

        if (viewbox) {
          params.set('viewbox', viewbox);
          params.set('bounded', '1');
        }

        await waitForNominatimRateLimit();

        const response = await fetch(`${GEOCODING_ENDPOINT}?${params.toString()}`, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Geocoding request failed with status ${response.status}`);
        }

        const payload = await response.json();
        results = Array.isArray(payload) ? payload : [];
        writeGeocodingCache(cacheKey, results);
      }

      const normalizedResults = results
        .map((result) => ({
          id: result.place_id,
          lat: Number(result.lat),
          lng: Number(result.lon),
          displayName: result.display_name || query,
          address: result.address || {},
        }))
        .filter((result) => isValidLocation(result.lat, result.lng))
        .filter((result) => (
          !boundaryGeoJson ||
          isLocationInsideBoundaryGeoJson(result.lat, result.lng, boundaryGeoJson)
        ))
        .filter((result) => (
          !boundaryName ||
          doesSearchResultMatchBoundaryName(result, boundaryName)
        ));

      setAddressResults(normalizedResults);
      setAddressSearchMessage(
        normalizedResults.length > 0
          ? `Tìm thấy ${normalizedResults.length} vị trí phù hợp${boundaryName ? ` trong ${boundaryName}` : ''}.`
          : `Không tìm thấy địa chỉ phù hợp${boundaryName ? ` trong ${boundaryName}` : ''}. Hãy thử nhập rõ số nhà, tên đường.`
      );
    } catch (searchError) {
      console.warn('Address search unavailable', searchError);
      setAddressResults([]);
      setAddressSearchMessage('Không thể tìm địa chỉ lúc này. Bạn vẫn có thể chọn trực tiếp trên bản đồ.');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleAddressResultSelect = (result) => {
    if (!result) return;

    if (boundaryName && !doesSearchResultMatchBoundaryName(result, boundaryName)) {
      setError(
        `Địa chỉ này không thuộc ${boundaryName}. Vui lòng chọn kết quả đúng khu vực đã chọn.`
      );
      return;
    }

    const selected = updateSelection(result.lat, result.lng, result.displayName);
    if (!selected) return;

    setAddressQuery(result.displayName);
    setAddressResults([]);
    setAddressSearchMessage('Đã chọn địa chỉ và chuyển thành tọa độ trên bản đồ.');
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
        setStatus('Đã lấy vị trí hiện tại. Đang tìm địa chỉ gần đúng...');
        const { latitude: lat, longitude: lng } = position.coords;
        updateSelectionFromCoordinates(lat, lng);
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
      {!readonly ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <form onSubmit={handleAddressSearch} className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <Lucide.Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <span className="sr-only">Tìm địa chỉ</span>
              <input
                type="search"
                value={addressQuery}
                onChange={(event) => {
                  setAddressQuery(event.target.value);
                  setAddressResults([]);
                  setAddressSearchMessage('');
                }}
                placeholder={boundaryName ? `Nhập địa chỉ trong ${boundaryName}...` : 'Nhập số nhà, tên đường để tìm vị trí...'}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </label>
            <button
              type="submit"
              disabled={searchingAddress}
              className="btn h-11 min-h-11 rounded-xl border-0 bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {searchingAddress ? (
                <span className="loading loading-spinner loading-xs" aria-label="Đang tìm địa chỉ" />
              ) : (
                <Lucide.Search size={15} aria-hidden="true" />
              )}
              Tìm địa chỉ
            </button>
          </form>

          {addressSearchMessage ? (
            <p className="mt-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400" role="status">
              {addressSearchMessage}
            </p>
          ) : null}

          {addressResults.length > 0 ? (
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              {addressResults.map((result) => (
                <button
                  key={result.id || `${result.lat}-${result.lng}`}
                  type="button"
                  onClick={() => handleAddressResultSelect(result)}
                  className="flex w-full items-start gap-3 border-b border-slate-100 bg-white px-3 py-3 text-left transition last:border-b-0 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-blue-950/30"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                    <Lucide.MapPin size={14} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-5 text-slate-800 dark:text-slate-100">
                      {result.displayName}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {result.lat.toFixed(6)}, {result.lng.toFixed(6)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
            Tìm kiếm địa chỉ © OpenStreetMap contributors
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm h-[400px]">
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={!readonly}
          className="w-full h-full"
          zoomControl={true}
        >
          <ConfiguredMapTileLayer />
          <MapAutoCenter center={center} />
          <MapBoundaryAutoFit boundaryGeoJson={areaBoundary} />
          {areaBoundary ? (
            <GeoJSON
              key={boundaryLayerKey}
              data={areaBoundary}
              style={{
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.14,
                opacity: 0.9,
                weight: 3
              }}
              eventHandlers={{
                click: (event) => {
                  if (readonly) return;
                  const { lat, lng } = event.latlng;
                  updateSelectionFromCoordinates(lat, lng);
                }
              }}
            />
          ) : null}
          {!areaBoundary ? (
            <LocationSelector readonly={readonly} onSelect={({ lat, lng }) => updateSelectionFromCoordinates(lat, lng)} />
          ) : null}
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
                  ? `Tìm địa chỉ hoặc nhấp vào bản đồ${boundaryName ? ` trong khu vực ${boundaryName}` : ''}`
                  : 'Tìm địa chỉ hoặc nhấp vào bản đồ'}
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
                  ? 'Khu vực đã chọn được tô sáng. Tìm địa chỉ hoặc nhấp vào bản đồ để đặt vị trí.'
                  : 'Tìm địa chỉ hoặc nhấp vào bản đồ để đặt vị trí.'}
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
