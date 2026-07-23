import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';


const STATUS_LABELS = {
  submitted: 'Đã gửi',
  aireviewed: 'Đã phân loại tự động',
  verified: 'Đã xác minh',
  assigned: 'Đã chuyển xử lý',
  inprogress: 'Đang xử lý',
  resolved: 'Đã có kết quả',
  submittedforapproval: 'Đang kiểm tra kết quả',
  needrework: 'Cần xử lý lại',
  approved: 'Chờ người dân đánh giá',
  closed: 'Đã kết thúc',
};

const PRIORITY_LABELS = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Khẩn cấp',
  urgent: 'Khẩn cấp',
};

const CATEGORY_LABELS = {
  'garbage collection': 'Thu gom rác',
  'waste management': 'Quản lý chất thải',
  'road maintenance': 'Bảo trì đường bộ',
  'street lighting': 'Chiếu sáng đô thị',
  drainage: 'Thoát nước',
  'water supply': 'Cấp nước',
  'public safety': 'An toàn công cộng',
};

const normalizeLookupKey = (value) => (
  String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLocaleLowerCase('en-US')
);

const translateStatus = (value) => (
  STATUS_LABELS[normalizeLookupKey(value)] ||
  value ||
  'Chưa xác định'
);

const translatePriority = (value) => (
  PRIORITY_LABELS[
    String(value || '').trim().toLocaleLowerCase('en-US')
  ] ||
  value ||
  'Chưa xác định'
);

const translateCategory = (value) => {
  const normalizedCategory = String(value || '')
    .trim()
    .toLocaleLowerCase('en-US');

  return (
    CATEGORY_LABELS[normalizedCategory] ||
    value ||
    'Chưa xác định'
  );
};

const DEFAULT_CENTER = [10.776530, 106.700981];
const DEFAULT_ZOOM = 12;

const defaultIcon = new L.Icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const isValidCoordinate = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const isValidLocation = (latitude, longitude) => isValidCoordinate(latitude, -90, 90) && isValidCoordinate(longitude, -180, 180);

const distanceMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function AutoFitBounds({ incidents, fitRequestKey }) {
  const map = useMap();

  const validPositions = useMemo(
    () => incidents
      .filter((incident) => isValidLocation(incident.latitude, incident.longitude))
      .map((incident) => [incident.latitude, incident.longitude]),
    [incidents]
  );

  useEffect(() => {
    if (validPositions.length > 0) {
      map.fitBounds(validPositions, {
        padding: [40, 40],
        maxZoom: 15,
        animate: true,
      });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
    }
  }, [fitRequestKey, map, validPositions]);

  return null;
}

const IncidentMapThemeStyles = () => (
  <style>{`
    .incident-map-shell {
      position: relative;
      isolation: isolate;
      z-index: 0;
      border-color: rgba(203, 213, 225, 0.82);
      background: #ffffff;
    }

    .incident-map-shell .leaflet-container {
      position: relative;
      z-index: 0;
      height: 100%;
      width: 100%;
      background: #dbeafe;
    }

    .incident-map-shell .leaflet-control-zoom,
    .incident-map-shell .leaflet-control-attribution {
      border: 1px solid rgba(148, 163, 184, 0.5) !important;
      border-radius: 12px !important;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14) !important;
    }

    .incident-map-shell .leaflet-control-zoom a {
      border-color: rgba(203, 213, 225, 0.78) !important;
      background: rgba(255, 255, 255, 0.94) !important;
      color: #334155 !important;
    }

    .incident-map-shell .leaflet-control-zoom a:hover {
      background: #eff6ff !important;
      color: #1d4ed8 !important;
    }

    .incident-map-shell .leaflet-control-attribution {
      background: rgba(255, 255, 255, 0.86) !important;
      color: #64748b !important;
      backdrop-filter: blur(8px);
    }

    .incident-map-shell .leaflet-popup-content-wrapper,
    .incident-map-shell .leaflet-popup-tip,
    .incident-map-shell .leaflet-tooltip {
      border: 1px solid rgba(203, 213, 225, 0.82);
      background: rgba(255, 255, 255, 0.97);
      color: #334155;
      box-shadow: 0 18px 46px rgba(15, 23, 42, 0.18);
    }

    .incident-map-shell .leaflet-popup-content-wrapper {
      border-radius: 16px;
    }

    .incident-map-shell .leaflet-popup-close-button {
      color: #64748b !important;
    }

    html[data-theme="dark"] .incident-map-shell {
      border-color: rgba(96, 165, 250, 0.2);
      background: #0a1930;
      box-shadow:
        0 22px 58px rgba(0, 0, 0, 0.34),
        inset 0 1px 0 rgba(255, 255, 255, 0.035);
    }

    html[data-theme="dark"] .incident-map-shell .leaflet-container {
      background: #10223a;
    }

    html[data-theme="dark"] .incident-map-shell .leaflet-tile-pane {
      filter:
        invert(0.74)
        hue-rotate(176deg)
        brightness(0.9)
        contrast(0.82)
        saturate(0.62);
    }

    html[data-theme="dark"] .incident-map-shell .leaflet-tile {
      opacity: 0.96;
    }

    html[data-theme="dark"] .incident-map-shell .leaflet-control-zoom,
    html[data-theme="dark"] .incident-map-shell .leaflet-control-attribution {
      border-color: rgba(96, 165, 250, 0.22) !important;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28) !important;
    }

    html[data-theme="dark"] .incident-map-shell .leaflet-control-zoom a,
    html[data-theme="dark"] .incident-map-shell .leaflet-control-attribution {
      border-color: rgba(96, 165, 250, 0.18) !important;
      background: rgba(7, 20, 39, 0.92) !important;
      color: #dbeafe !important;
    }

    html[data-theme="dark"] .incident-map-shell .leaflet-control-zoom a:hover {
      background: rgba(17, 38, 70, 0.98) !important;
      color: #ffffff !important;
    }

    html[data-theme="dark"] .incident-map-shell .leaflet-popup-content-wrapper,
    html[data-theme="dark"] .incident-map-shell .leaflet-popup-tip,
    html[data-theme="dark"] .incident-map-shell .leaflet-tooltip {
      border-color: rgba(96, 165, 250, 0.2) !important;
      background: rgba(11, 24, 48, 0.97) !important;
      color: #dbeafe !important;
      box-shadow: 0 22px 54px rgba(0, 0, 0, 0.4) !important;
    }

    html[data-theme="dark"] .incident-map-shell .leaflet-popup-close-button {
      color: #93c5fd !important;
    }

    html[data-theme="dark"] .incident-map-shell .leaflet-popup-content button {
      border-color: rgba(96, 165, 250, 0.2) !important;
      background: rgba(13, 29, 54, 0.92) !important;
      color: #e8eef8 !important;
    }

    html[data-theme="dark"] .incident-map-shell .leaflet-popup-content button:hover {
      border-color: rgba(56, 189, 248, 0.4) !important;
      background: rgba(17, 38, 70, 0.98) !important;
    }

    html[data-theme="dark"] .incident-map-shell .leaflet-popup-content .text-slate-900,
    html[data-theme="dark"] .incident-map-shell .leaflet-tooltip .text-slate-900 {
      color: #f8fafc !important;
    }

    html[data-theme="dark"] .incident-map-shell .leaflet-popup-content .text-slate-500 {
      color: #9fb0c7 !important;
    }
  `}</style>
);

export const IncidentMap = ({ incidents, fitRequestKey = 0 }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();

  const openFeedbackDetail = (ticket) => {
    const currentUserId = user?.userId ?? user?.id;
    const isOwnFeedback =
      currentUserId != null &&
      ticket?.reporterUserId != null &&
      String(ticket.reporterUserId) === String(currentUserId);

    navigate(
      isOwnFeedback
        ? `/tickets/${ticket.feedbackId}`
        : `/community/feed/${ticket.feedbackId}`,
      { state: { from: '/community/map' } }
    );
  };

  const markers = useMemo(() => {
    if (!Array.isArray(incidents)) return [];

    const validIncidents = incidents.filter((incident) => isValidLocation(incident.latitude, incident.longitude));
    const groups = [];
    const threshold = 40; // khoảng cách gần nhau (m)

    validIncidents.forEach((incident) => {
      const existingGroup = groups.find((group) =>
        distanceMeters(group.latitude, group.longitude, incident.latitude, incident.longitude) <= threshold
      );

      if (existingGroup) {
        existingGroup.tickets.push(incident);
      } else {
        groups.push({
          latitude: incident.latitude,
          longitude: incident.longitude,
          tickets: [incident],
        });
      }
    });

    return groups;
  }, [incidents]);

  return (
    <>
      <IncidentMapThemeStyles />
      <div className="public-map-stack incident-map-shell h-[550px] w-full overflow-hidden border-0 shadow-none transition-shadow duration-200 ease-out map-interaction">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          className="relative z-0 h-full w-full"
          zoomControl={true}
        >
          <TileLayer
            key={theme}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <AutoFitBounds
            incidents={markers}
            fitRequestKey={fitRequestKey}
          />
          {markers.map((marker) => (
          <Marker
            key={`${marker.latitude}-${marker.longitude}`}
            position={[marker.latitude, marker.longitude]}
            icon={defaultIcon}
            eventHandlers={{
              click: (event) => {
                event.target.openPopup();
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95} sticky interactive={false} className="pointer-events-none">
              <div className="space-y-1 text-xs">
                {marker.tickets.length === 1 ? (
                  <>
                    <div className="truncate font-bold text-slate-900">
                      {marker.tickets[0].title}
                    </div>
                    <div>
                      Danh mục: {translateCategory(
                        marker.tickets[0].categoryName
                      )}
                    </div>
                    <div>
                      Trạng thái: {translateStatus(
                        marker.tickets[0].status
                      )}
                    </div>
                    <div>
                      Mức độ ảnh hưởng: {translatePriority(
                        marker.tickets[0].priority
                      )}
                    </div>
                  </>
                ) : (
                  <div className="font-bold text-slate-900 truncate">{marker.tickets.length} phản ánh tại điểm này</div>
                )}
              </div>
            </Tooltip>
            <Popup>
              <div className="space-y-3 text-xs">
                <div className="font-bold text-slate-900">
                  {marker.tickets.length === 1
                    ? 'Thông tin phản ánh'
                    : `${marker.tickets.length} phản ánh tại điểm này`}
                </div>
                <div className="grid gap-2">
                  {marker.tickets.map((ticket) => (
                    <button
                      key={ticket.feedbackId}
                      type="button"
                      onClick={() => openFeedbackDetail(ticket)}
                      className="w-full text-left rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-primary hover:bg-slate-50"
                    >
                      <div className="truncate font-bold">{ticket.title}</div>
                      <div className="mt-1 text-[10px] font-normal text-slate-500">
                        {translateCategory(ticket.categoryName)}
                        {' · '}
                        {translateStatus(ticket.status)}
                        {' · '}
                        {translatePriority(ticket.priority)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </>
  );
};

export default IncidentMap;
