import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ticketApi } from '../services/api/ticketApi';

const isValidCoordinate = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const isValidLocation = (latitude, longitude) => isValidCoordinate(latitude, -90, 90) && isValidCoordinate(longitude, -180, 180);

const parseCoordinatesFromLocationText = (locationText) => {
  if (!locationText || typeof locationText !== 'string') return { latitude: NaN, longitude: NaN };

  const match = locationText.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return { latitude: NaN, longitude: NaN };

  return {
    latitude: Number(match[1]),
    longitude: Number(match[2]),
  };
};

const normalizeIncident = (ticket) => {
  const parsedLocation = parseCoordinatesFromLocationText(ticket?.locationText);
  const latitude = Number(
    ticket?.latitude ??
      ticket?.lat ??
      ticket?.location?.latitude ??
      ticket?.location?.lat ??
      parsedLocation.latitude
  );
  const longitude = Number(
    ticket?.longitude ??
      ticket?.lng ??
      ticket?.location?.longitude ??
      ticket?.location?.lng ??
      parsedLocation.longitude
  );

  return {
    feedbackId: ticket?.feedbackId || ticket?.id || ticket?._id || '',
    ownerId:
      ticket?.userId ||
      ticket?.reporterId ||
      ticket?.createdByUserId ||
      ticket?.createdById ||
      ticket?.createdBy?.userId ||
      ticket?.createdBy?.id ||
      ticket?.user?.userId ||
      ticket?.user?.id ||
      '',
    ownerEmail:
      ticket?.reporterEmail ||
      ticket?.createdByEmail ||
      ticket?.createdBy?.email ||
      ticket?.user?.email ||
      '',
    title:
      ticket?.title ||
      ticket?.summary ||
      ticket?.description ||
      ticket?.categoryName ||
      'Phản ánh đô thị',
    categoryName: ticket?.categoryName || ticket?.category || 'Chưa xác định',
    status: ticket?.status || 'Chưa xác định',
    priority: ticket?.priority || 'Trung bình',
    latitude,
    longitude,
  };
};

export function useIncidentMapData() {
  const { user } = useAuth();
  const role = user?.role;
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadIncidents = useCallback(async () => {
    if (!role) {
      setIncidents([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await ticketApi.getTickets({}, { role });
      const tickets = Array.isArray(response) ? response : [];
      const validIncidents = tickets
        .map(normalizeIncident)
        .filter((incident) => isValidLocation(incident.latitude, incident.longitude));
      setIncidents(validIncidents);
    } catch (err) {
      setError(err?.message || 'Không thể tải dữ liệu bản đồ sự cố.');
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  return {
    incidents,
    loading,
    error,
    reloadIncidents: loadIncidents,
  };
}

export default useIncidentMapData;
