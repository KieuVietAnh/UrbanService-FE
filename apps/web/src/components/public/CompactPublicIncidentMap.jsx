import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import * as Lucide from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../../contexts/ThemeContext';

const DEFAULT_CENTER = [10.77653, 106.700981];
const DEFAULT_ZOOM = 12;

const normalizeStatus = (value) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9]/g, '')
  .toLocaleLowerCase('en-US');

const getMarkerColor = (status) => {
  const normalizedStatus = normalizeStatus(status);

  if (['resolved', 'approved', 'closed'].includes(normalizedStatus)) {
    return '#10b981';
  }

  if (normalizedStatus === 'needrework') {
    return '#f43f5e';
  }

  return '#2563eb';
};

const createMarkerIcon = (status) => {
  const color = getMarkerColor(status);

  return L.divIcon({
    className: '',
    html: `
      <span style="
        display:flex;
        align-items:center;
        justify-content:center;
        width:32px;
        height:32px;
        border-radius:999px;
        border:3px solid rgba(255,255,255,.96);
        background:${color};
        box-shadow:0 8px 20px rgba(15,23,42,.25),0 0 0 6px ${color}22;
      ">
        <span style="display:block;width:8px;height:8px;border-radius:999px;background:#fff"></span>
      </span>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -17],
  });
};

const getFeedbackId = (item) => (
  item?.feedbackId || item?.id || item?.ticketId || ''
);

const parseCoordinatesFromLocationText = (locationText) => {
  if (!locationText || typeof locationText !== 'string') {
    return { latitude: Number.NaN, longitude: Number.NaN };
  }

  const match = locationText.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return { latitude: Number.NaN, longitude: Number.NaN };

  return {
    latitude: Number(match[1]),
    longitude: Number(match[2]),
  };
};

const normalizeMapItem = (item) => {
  const parsedLocation = parseCoordinatesFromLocationText(item?.locationText);

  return {
    ...item,
    feedbackId: getFeedbackId(item),
    latitude: Number(
      item?.latitude ??
      item?.lat ??
      item?.location?.latitude ??
      item?.location?.lat ??
      parsedLocation.latitude
    ),
    longitude: Number(
      item?.longitude ??
      item?.lng ??
      item?.lon ??
      item?.location?.longitude ??
      item?.location?.lng ??
      item?.location?.lon ??
      parsedLocation.longitude
    ),
  };
};

function FitCompactBounds({ incidents }) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();

      if (incidents.length === 0) {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
        return;
      }

      if (incidents.length === 1) {
        map.setView(
          [incidents[0].latitude, incidents[0].longitude],
          15,
          { animate: false }
        );
        return;
      }

      map.fitBounds(
        incidents.map((incident) => [incident.latitude, incident.longitude]),
        {
          padding: [34, 34],
          maxZoom: 15,
          animate: false,
        }
      );
    }, 90);

    return () => window.clearTimeout(timer);
  }, [incidents, map]);

  return null;
}

const CompactPublicIncidentMapStyles = () => (
  <style>{`
    .compact-public-incident-map .leaflet-container {
      height: 100%;
      width: 100%;
      background: #dbeafe;
    }

    .compact-public-incident-map .leaflet-control-zoom,
    .compact-public-incident-map .leaflet-control-attribution {
      border: 1px solid rgba(148, 163, 184, 0.42) !important;
      border-radius: 10px !important;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12) !important;
    }

    .compact-public-incident-map .leaflet-control-zoom a,
    .compact-public-incident-map .leaflet-control-attribution {
      background: rgba(255, 255, 255, 0.92) !important;
      color: #475569 !important;
    }

    .compact-public-incident-map .leaflet-popup-content-wrapper,
    .compact-public-incident-map .leaflet-popup-tip {
      border: 1px solid rgba(203, 213, 225, 0.86);
      background: rgba(255, 255, 255, 0.98);
      color: #0f172a;
    }

    .compact-public-incident-map .leaflet-popup-content-wrapper {
      border-radius: 14px;
    }

    html[data-theme="dark"] .compact-public-incident-map .leaflet-container {
      background: #10223a;
    }

    html[data-theme="dark"] .compact-public-incident-map .leaflet-control-zoom a,
    html[data-theme="dark"] .compact-public-incident-map .leaflet-control-attribution {
      border-color: rgba(96, 165, 250, 0.16) !important;
      background: rgba(7, 20, 39, 0.92) !important;
      color: #dbeafe !important;
    }

    html[data-theme="dark"] .compact-public-incident-map .leaflet-popup-content-wrapper,
    html[data-theme="dark"] .compact-public-incident-map .leaflet-popup-tip {
      border-color: rgba(96, 165, 250, 0.18);
      background: #0b1830;
      color: #f8fafc;
    }
  `}</style>
);

const CompactPublicIncidentMap = ({
  items = [],
  loading = false,
  error = '',
  fullMapPath = '/community/map#incident-map',
  detailPathBuilder = (feedbackId) => `/community/feed/${feedbackId}`,
  detailStateBuilder = () => undefined,
  mapLabel = 'Bản đồ sự cố',
}) => {
  const { theme } = useTheme();

  const incidents = useMemo(
    () => items
      .map(normalizeMapItem)
      .filter((item) => (
        Number.isFinite(item.latitude) &&
        item.latitude >= -90 &&
        item.latitude <= 90 &&
        Number.isFinite(item.longitude) &&
        item.longitude >= -180 &&
        item.longitude <= 180
      )),
    [items]
  );

  const tileLayer = theme === 'dark'
    ? {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }
    : {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
      };

  const statusText = loading
    ? 'Đang tải vị trí'
    : error
      ? 'Mở bản đồ sự cố'
      : incidents.length > 0
        ? `${incidents.length} vị trí đang hiển thị`
        : 'Chưa có vị trí công khai';

  return (
    <>
      <CompactPublicIncidentMapStyles />
      <div className="compact-public-incident-map relative h-full min-h-[320px] overflow-hidden rounded-[22px] border border-[var(--public-border)] bg-[var(--public-surface-soft)]">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={false}
          zoomControl
          className="h-full min-h-[320px] w-full"
        >
          <TileLayer
            key={theme}
            attribution={tileLayer.attribution}
            url={tileLayer.url}
          />
          <FitCompactBounds incidents={incidents} />

          {incidents.map((incident) => (
            <Marker
              key={incident.feedbackId || `${incident.latitude}:${incident.longitude}`}
              position={[incident.latitude, incident.longitude]}
              icon={createMarkerIcon(incident.status)}
            >
              <Popup minWidth={220} maxWidth={270}>
                <div className="space-y-2 font-sans">
                  <h3 className="text-sm font-semibold leading-5">
                    {incident.title || 'Phản ánh đô thị'}
                  </h3>
                  <p className="text-xs leading-5 opacity-70">
                    {incident.areaName || incident.locationText || 'Chưa xác định khu vực'}
                  </p>
                  {incident.feedbackId ? (
                    <Link
                      to={detailPathBuilder(incident.feedbackId)}
                      state={detailStateBuilder(incident)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600"
                    >
                      Xem chi tiết
                      <Lucide.ArrowUpRight size={13} aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <Link
          to={fullMapPath}
          state={{ focusMap: true }}
          className="absolute bottom-4 left-4 z-[500] flex w-[min(250px,calc(100%-2rem))] items-center gap-3 rounded-2xl border border-white/75 bg-white/94 p-3.5 text-left shadow-[0_14px_34px_rgba(15,23,42,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-300 dark:border-white/10 dark:bg-slate-950/90 dark:hover:border-blue-400/35"
          aria-label="Mở bản đồ sự cố đầy đủ"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white" aria-hidden="true">
            <Lucide.MapPinned size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300">
              {mapLabel}
            </span>
            <strong className="mt-1 block truncate text-sm font-semibold text-slate-950 dark:text-white">
              {statusText}
            </strong>
          </span>
          <Lucide.ArrowUpRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
        </Link>
      </div>
    </>
  );
};

export default CompactPublicIncidentMap;
