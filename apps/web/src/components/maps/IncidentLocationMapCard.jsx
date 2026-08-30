import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as Lucide from 'lucide-react';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

import { buildExternalMapUrl } from '../../config/mapConfig';
import ConfiguredMapTileLayer from './ConfiguredMapTileLayer';

const markerIcon = new L.Icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

const isValidCoordinate = (value, min, max) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max;
};

function SyncIncidentPosition({ position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, 16, { animate: false });
  }, [map, position]);

  return null;
}

function ResizeIncidentMap() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const parent = container.parentElement;
    const timeoutIds = [];
    let frameId = 0;

    const refreshSize = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => map.invalidateSize(false));
      });
    };

    refreshSize();
    timeoutIds.push(window.setTimeout(refreshSize, 120));
    timeoutIds.push(window.setTimeout(refreshSize, 320));

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refreshSize);
    observer?.observe(container);
    if (parent) observer?.observe(parent);
    window.addEventListener('resize', refreshSize);
    parent?.addEventListener('transitionend', refreshSize);

    return () => {
      window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      observer?.disconnect();
      window.removeEventListener('resize', refreshSize);
      parent?.removeEventListener('transitionend', refreshSize);
    };
  }, [map]);

  return null;
}

export function IncidentLocationMapCard({
  incidentId,
  latitude,
  longitude,
  locationText,
  areaName,
  tone = 'cyan',
}) {
  const [tileLoadFailed, setTileLoadFailed] = useState(false);
  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoordinates = isValidCoordinate(lat, -90, 90) && isValidCoordinate(lng, -180, 180);
  const position = useMemo(() => [lat, lng], [lat, lng]);
  const headingId = `incident-location-${incidentId || 'detail'}`;
  const externalMapUrl = buildExternalMapUrl(lat, lng);
  const blueTone = tone === 'blue';

  useEffect(() => {
    setTileLoadFailed(false);
  }, [lat, lng]);

  return (
    <section className={`admin-panel overflow-hidden border-t-[3px] ${blueTone ? 'border-t-blue-500 shadow-[0_18px_44px_rgba(37,99,235,0.07)]' : 'border-t-cyan-500 shadow-[0_18px_44px_rgba(6,182,212,0.07)]'}`} aria-labelledby={headingId}>
      <header className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 dark:border-slate-800">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${blueTone ? 'bg-blue-100 text-blue-700 ring-blue-200 shadow-[0_10px_24px_rgba(37,99,235,0.14)] dark:bg-blue-950/45 dark:text-blue-300 dark:ring-blue-800' : 'bg-cyan-100 text-cyan-700 ring-cyan-200 shadow-[0_10px_24px_rgba(6,182,212,0.14)] dark:bg-cyan-950/45 dark:text-cyan-300 dark:ring-cyan-800'}`} aria-hidden="true">
            <Lucide.MapPinned size={20} />
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="admin-section-title">Bản đồ vị trí sự vụ</h2>
            <p className="admin-section-description mt-1 break-words">{locationText || areaName || 'Chưa có thông tin vị trí'}</p>
            {locationText && areaName && locationText !== areaName ? (
              <p className={`mt-1 text-xs font-semibold ${blueTone ? 'text-blue-700 dark:text-blue-300' : 'text-cyan-700 dark:text-cyan-300'}`}>{areaName}</p>
            ) : null}
          </div>
        </div>

        {hasCoordinates ? (
          <a
            href={externalMapUrl}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 ${blueTone ? 'border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300 hover:bg-blue-100 focus-visible:ring-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/50' : 'border-cyan-200 bg-cyan-50 text-cyan-800 hover:border-cyan-300 hover:bg-cyan-100 focus-visible:ring-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200 dark:hover:bg-cyan-900/50'}`}
            aria-label="Mở vị trí sự vụ trên Google Maps trong thẻ mới"
          >
            Mở bằng Google Maps
            <Lucide.ArrowUpRight size={16} aria-hidden="true" />
          </a>
        ) : null}
      </header>

      {hasCoordinates ? (
        <>
          <div className="relative h-72 w-full sm:h-80" role="region" aria-label={`Bản đồ sự vụ tại tọa độ ${lat.toFixed(5)}, ${lng.toFixed(5)}`}>
            <MapContainer
              center={position}
              zoom={16}
              scrollWheelZoom={false}
              doubleClickZoom
              touchZoom
              boxZoom
              keyboard
              zoomControl
              attributionControl
              className="h-full w-full"
            >
              <ConfiguredMapTileLayer
                onReady={() => setTileLoadFailed(false)}
                onUnavailable={() => setTileLoadFailed(true)}
              />
              <SyncIncidentPosition position={position} />
              <ResizeIncidentMap />
              <Marker position={position} icon={markerIcon} />
            </MapContainer>
            <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-xl border border-white/70 bg-slate-950/80 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur" aria-hidden="true">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
            {tileLoadFailed ? (
              <div className="absolute inset-x-4 top-4 z-[500] rounded-xl border border-amber-200 bg-amber-50/95 px-3.5 py-3 text-xs leading-5 text-amber-950 shadow-lg backdrop-blur-sm dark:border-amber-900 dark:bg-amber-950/90 dark:text-amber-100" role="status">
                Không thể tải nền bản đồ trong mạng hiện tại. Bạn vẫn có thể mở tọa độ bằng Google Maps.
              </div>
            ) : null}
          </div>
          <footer className={`flex items-start gap-2 border-t border-slate-200 px-5 py-3 text-xs leading-5 text-slate-600 sm:px-6 dark:border-slate-800 dark:text-slate-300 ${blueTone ? 'bg-blue-50/40 dark:bg-blue-950/15' : 'bg-cyan-50/40 dark:bg-cyan-950/15'}`}>
            <Lucide.MousePointer2 className={`mt-0.5 h-4 w-4 shrink-0 ${blueTone ? 'text-blue-700 dark:text-blue-300' : 'text-cyan-700 dark:text-cyan-300'}`} aria-hidden="true" />
            Kéo bản đồ hoặc dùng nút phóng to, thu nhỏ để kiểm tra khu vực xung quanh sự vụ.
          </footer>
        </>
      ) : (
        <div className="flex min-h-52 items-center justify-center border-b border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center dark:border-slate-800 dark:bg-slate-900/55">
          <div className="max-w-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-500 dark:ring-slate-800" aria-hidden="true"><Lucide.MapPinOff size={22} /></span>
            <h3 className="mt-4 text-sm font-black text-slate-950 dark:text-white">Chưa có tọa độ sự vụ</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Backend chưa cung cấp vĩ độ và kinh độ để hiển thị sự vụ trên bản đồ.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default IncidentLocationMapCard;
