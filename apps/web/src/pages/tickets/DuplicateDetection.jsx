// src/pages/tickets/DuplicateDetection.jsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { duplicateManagementApi } from '@urbanmind/shared-api';
import { SuccessAlert, ErrorAlert } from '../../components/alerts/ErrorAlert';
import * as Lucide from 'lucide-react';

const PAGE_SIZE = 10;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'Pending':
      return 'Chờ xử lý';
    case 'Confirmed':
      return 'Đã xác nhận';
    case 'Rejected':
      return 'Đã từ chối';
    default:
      return status || 'Không xác định';
  }
};

export const DuplicateDetection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [summary, setSummary] = useState({ pending: 0, confirmed: 0, rejected: 0, total: 0 });
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, totalCount: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const successMessage = location.state?.successMessage;
    if (successMessage) {
      setMessage({ type: 'success', text: successMessage });
    }
  }, [location.state]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [summaryResponse, candidatesResponse] = await Promise.all([
          duplicateManagementApi.getDuplicateSummary(),
          duplicateManagementApi.getDuplicateCandidates({ status: 'Pending', page, pageSize: PAGE_SIZE }),
        ]);

        setSummary(summaryResponse || { pending: 0, confirmed: 0, rejected: 0, total: 0 });
        setItems(Array.isArray(candidatesResponse?.items) ? candidatesResponse.items : []);
        setPagination(candidatesResponse?.pagination || { page, pageSize: PAGE_SIZE, totalCount: 0, totalPages: 0 });
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: err?.message || 'Không thể tải danh sách phản ánh trùng lặp.' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [page]);

  const pageNumbers = useMemo(() => {
    const totalPages = pagination?.totalPages || 0;
    if (!totalPages) return [];
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }, [pagination]);

  return (
    <div className="space-y-6">
      {message.type === 'success' && (
        <SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />
      )}
      {message.type === 'error' && (
        <ErrorAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />
      )}

      <div>
        <h2 className="text-2xl font-black">Xử Lý Phản Ánh Trùng Lặp</h2>
        <p className="text-xs text-gray-500 font-semibold">Danh sách các trường hợp phản ánh trùng lặp đang chờ xem xét từ hệ thống.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Chờ xử lý', value: summary.pending, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Đã xác nhận', value: summary.confirmed, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Đã từ chối', value: summary.rejected, tone: 'bg-rose-50 text-rose-700 border-rose-200' },
          { label: 'Tổng cộng', value: summary.total, tone: 'bg-slate-50 text-slate-700 border-slate-200' },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border p-4 ${card.tone}`}>
            <div className="text-[11px] font-bold uppercase tracking-wide">{card.label}</div>
            <div className="mt-2 text-2xl font-black">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="card bg-base-100 border border-base-300 rounded-3xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
          <div>
            <h3 className="font-extrabold text-sm">Danh sách ứng viên trùng lặp</h3>
            <p className="text-xs text-gray-500 font-semibold">Hiển thị các mục đang ở trạng thái Pending từ endpoint backend.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-500">
            <span className="loading loading-spinner loading-sm mr-2" />
            Đang tải dữ liệu trùng lặp...
          </div>
        ) : message.type === 'error' && !items.length ? (
          <div className="p-8 text-center text-sm text-gray-500">{message.text}</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Không có dữ liệu trùng lặp nào ở trạng thái Pending.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full text-sm">
                <thead>
                  <tr>
                    <th>Duplicate Candidate ID</th>
                    <th>Primary Feedback</th>
                    <th>Duplicate Feedback</th>
                    <th>Confidence Score</th>
                    <th>Created Date</th>
                    <th>Status</th>
                    <th>View Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.duplicateCandidateId || item.id}>
                      <td className="font-semibold">{item.duplicateCandidateId || item.id || '—'}</td>
                      <td>{item.primaryFeedbackId || item.primaryFeedback?.feedbackId || item.primaryFeedback?.id || '—'}</td>
                      <td>{item.duplicateFeedbackId || item.duplicateFeedback?.feedbackId || item.duplicateFeedback?.id || '—'}</td>
                      <td>{item.confidenceScore ?? item.confidence ?? '—'}</td>
                      <td>{formatDate(item.createdAt || item.createdDate)}</td>
                      <td>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                          {getStatusLabel(item.status || 'Pending')}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => navigate(`/staff/duplicates/${item.duplicateCandidateId || item.id}`)}
                          className="btn btn-xs btn-outline rounded-lg"
                        >
                          <Lucide.Eye size={14} />
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pageNumbers.length > 1 && (
              <div className="flex items-center justify-end gap-2 border-t border-base-300 px-6 py-4">
                <button
                  type="button"
                  className="btn btn-sm btn-outline rounded-lg"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Trước
                </button>
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`btn btn-sm rounded-lg ${pageNumber === page ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-sm btn-outline rounded-lg"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
