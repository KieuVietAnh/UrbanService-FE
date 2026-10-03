import type { MapBoundaryPolygon, MapCoordinate } from '../components/reporting-map.types';

const coordinate = (value: unknown): MapCoordinate | null => {
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null;
};

export function normalizeAreaBoundary(value: unknown): Record<string, unknown> | null {
  let candidate = value;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (candidate && typeof candidate === 'object') return candidate as Record<string, unknown>;
    if (typeof candidate !== 'string') return null;

    const text = candidate.trim();
    if (!text || text === 'null' || text === 'undefined') return null;
    try {
      candidate = JSON.parse(attempt === 0 ? text : text.replace(/\\"/g, '"').replace(/""/g, '"'));
    } catch {
      return null;
    }
  }

  return candidate && typeof candidate === 'object' ? candidate as Record<string, unknown> : null;
}

export function areaBoundaryValue(area: Record<string, unknown> | null | undefined) {
  return area?.BoundaryGeoJson
    ?? area?.boundaryGeoJson
    ?? area?.boundaryGeoJSON
    ?? area?.boundary
    ?? area?.geoJson
    ?? area?.geoJSON
    ?? null;
}

const ring = (value: unknown): MapCoordinate[] => (
  Array.isArray(value)
    ? value.map(coordinate).filter((item): item is MapCoordinate => item !== null)
    : []
);

export function extractBoundaryPolygons(value: unknown): MapBoundaryPolygon[] {
  const geo = normalizeAreaBoundary(value);
  if (!geo) return [];

  if (geo.type === 'FeatureCollection' && Array.isArray(geo.features)) {
    return geo.features.flatMap(extractBoundaryPolygons);
  }
  if (geo.type === 'Feature') return extractBoundaryPolygons(geo.geometry);
  if (geo.type === 'GeometryCollection' && Array.isArray(geo.geometries)) {
    return geo.geometries.flatMap(extractBoundaryPolygons);
  }

  const coordinates = geo.coordinates;
  const polygons = geo.type === 'Polygon'
    ? [coordinates]
    : geo.type === 'MultiPolygon' && Array.isArray(coordinates)
      ? coordinates
      : [];

  return polygons.flatMap((polygon) => {
    if (!Array.isArray(polygon)) return [];
    const rings = polygon.map(ring).filter((item) => item.length >= 3);
    return rings.length ? [{ coordinates: rings[0], holes: rings.slice(1) }] : [];
  });
}

export function flattenBoundaryCoordinates(polygons: MapBoundaryPolygon[]) {
  return polygons.flatMap((polygon) => polygon.coordinates);
}

export function boundaryViewbox(polygons: MapBoundaryPolygon[]) {
  const coordinates = flattenBoundaryCoordinates(polygons);
  if (!coordinates.length) return '';
  const latitudes = coordinates.map((item) => item.latitude);
  const longitudes = coordinates.map((item) => item.longitude);
  return `${Math.min(...longitudes)},${Math.max(...latitudes)},${Math.max(...longitudes)},${Math.min(...latitudes)}`;
}
