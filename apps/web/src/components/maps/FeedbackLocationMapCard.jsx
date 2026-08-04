import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as Lucide from 'lucide-react';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

const markerIcon = new L.Icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

const SyncView = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(position, 16, { animate: false });
  }, [map, position]);

  return null;
};

const ResizeMap = () => {
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

    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(refreshSize);

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
};

export const FeedbackLocationMapCard = ({
  feedbackId,
  latitude,
  longitude,
  locationText,
  areaName,
  className = '',
  variant = 'public',
}) => {
  const navigate = useNavigate();
  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const position = useMemo(() => [lat, lng], [lat, lng]);

  const isAdmin = variant === 'admin';

  const openFullMap = () => {
    if (isAdmin) {
      navigate('/management/map', {
        state: {
          mapState: {
            focusFeedbackId: feedbackId,
            focusLatitude: lat,
            focusLongitude: lng,
          },
        },
      });
      return;
    }

    navigate('/community/map', {
      state: {
        focusFeedbackId: feedbackId,
        focusLatitude: lat,
        focusLongitude: lng,
      },
    });
  };

  return (
    <section className={`${isAdmin ? 'admin-panel' : 'rounded-[24px] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-[0_14px_34px_rgba(15,23,42,0.07)]'} overflow-hidden ${className}`} aria-labelledby={`feedback-location-${feedbackId}`}>
      <header className={`flex items-start justify-between gap-3 px-5 py-4 sm:px-6 ${isAdmin ? 'border-b border-slate-200 dark:border-white/10' : ''}`}>
        <div className="flex min-w-0 items-start gap-3">
          <span className={isAdmin ? 'admin-mini-icon' : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'} aria-hidden="true">
            <Lucide.MapPinned size={18} />
          </span>
          <div className="min-w-0">
            <h2 id={`feedback-location-${feedbackId}`} className={isAdmin ? 'admin-section-title' : 'text-base font-bold'}>Vị trí phản ánh</h2>
            <p className={isAdmin ? 'mt-1 break-words text-sm text-slate-500 dark:text-slate-400' : 'mt-1 break-words text-sm font-medium text-base-content/65'}>
              {areaName || locationText || 'Chưa xác định khu vực'}
            </p>
          </div>
        </div>
      </header>

      {hasCoordinates ? (
        <button type="button" onClick={openFullMap} className={`group relative block w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35 ${isAdmin ? 'h-72' : 'h-56 border-y border-[var(--public-border)]'}`} aria-label="Xem vị trí phản ánh trên bản đồ sự cố">
          <MapContainer center={position} zoom={16} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} boxZoom={false} keyboard={false} zoomControl={false} attributionControl={false} className="pointer-events-none h-full w-full">
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <SyncView position={position} />
            <ResizeMap />
            <Marker position={position} icon={markerIcon} />
          </MapContainer>
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-slate-950/75 via-slate-950/35 to-transparent px-4 pb-3 pt-12 text-white">
            <span className="text-sm font-semibold">Xem vị trí trên bản đồ</span>
            <Lucide.ArrowUpRight size={17} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </span>
        </button>
      ) : (
        <div className="flex h-44 items-center justify-center border-y border-dashed border-[var(--public-border)] bg-[var(--public-surface-soft)] px-5 text-center">
          <div>
            <Lucide.MapPin size={24} className="mx-auto text-base-content/30" aria-hidden="true" />
            <p className="mt-2 text-sm text-base-content/50">Phản ánh chưa có tọa độ để hiển thị trên bản đồ.</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default FeedbackLocationMapCard;
