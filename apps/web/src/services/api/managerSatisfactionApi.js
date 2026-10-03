import { incidentManagementApi } from '@urbanmind/shared-api';

const INCIDENT_PAGE_SIZE = 100;
const REVIEW_CONCURRENCY = 4;

const getIncidentId = (incident) => incident?.incidentId ?? incident?.id ?? null;

const fetchAllIncidents = async () => {
  const first = await incidentManagementApi.getIncidents({
    pageNumber: 1,
    pageSize: INCIDENT_PAGE_SIZE,
  });

  const firstItems = Array.isArray(first?.items) ? first.items : [];
  const totalPages = Math.max(1, Number(first?.totalPages) || 1);

  if (totalPages === 1) return firstItems;

  const items = [...firstItems];

  for (let page = 2; page <= totalPages; page += 3) {
    const batchPages = Array.from(
      { length: Math.min(3, totalPages - page + 1) },
      (_, index) => page + index,
    );

    const results = await Promise.all(
      batchPages.map((pageNumber) =>
        incidentManagementApi.getIncidents({
          pageNumber,
          pageSize: INCIDENT_PAGE_SIZE,
        })
      )
    );

    results.forEach((response) => {
      if (Array.isArray(response?.items)) items.push(...response.items);
    });
  }

  const byId = new Map();
  items.forEach((incident) => {
    const incidentId = getIncidentId(incident);
    if (incidentId != null) byId.set(String(incidentId), incident);
  });

  return Array.from(byId.values());
};

const mapWithConcurrency = async (items, concurrency, worker) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(1, concurrency), Math.max(1, items.length)) },
      () => runWorker(),
    ),
  );

  return results;
};

const toReviewItem = (review, incident) => ({
  ...review,
  incident: {
    incidentId: getIncidentId(incident),
    title: incident?.title ?? incident?.summary ?? 'Sự vụ chưa có tiêu đề',
    areaId: incident?.areaId ?? incident?.area?.areaId ?? incident?.area?.id ?? null,
    areaName: incident?.areaName ?? incident?.wardName ?? incident?.area?.name ?? 'Chưa xác định khu vực',
    categoryId: incident?.categoryId ?? incident?.category?.categoryId ?? incident?.category?.id ?? null,
    categoryName: incident?.categoryName ?? incident?.category?.name ?? 'Chưa phân loại',
    status: incident?.status ?? null,
    priority: incident?.priority ?? null,
    severity: incident?.severity ?? null,
  },
});

export const managerSatisfactionApi = {
  async getDashboardData() {
    const incidents = await fetchAllIncidents();

    let failedIncidentCount = 0;

    const summaries = await mapWithConcurrency(
      incidents,
      REVIEW_CONCURRENCY,
      async (incident) => {
        const incidentId = getIncidentId(incident);
        if (!incidentId) return null;

        try {
          const summary = await incidentManagementApi.getIncidentResolutionReviews(incidentId);
          return { incident, summary };
        } catch (error) {
          failedIncidentCount += 1;
          console.warn(`Không thể tải đánh giá của sự vụ ${incidentId}`, error);
          return null;
        }
      },
    );

    const reviews = summaries.flatMap((entry) => {
      const items = Array.isArray(entry?.summary?.items) ? entry.summary.items : [];
      return entry ? items.map((review) => toReviewItem(review, entry.incident)) : [];
    });

    const eligibleReportCount = summaries.reduce(
      (total, entry) => total + (Number(entry?.summary?.eligibleReportCount) || 0),
      0,
    );

    return {
      items: reviews,
      incidentCount: incidents.length,
      eligibleReportCount,
      failedIncidentCount,
    };
  },
};

export default managerSatisfactionApi;
