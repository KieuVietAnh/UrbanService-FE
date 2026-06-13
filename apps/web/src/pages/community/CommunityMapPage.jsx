// src/pages/community/CommunityMapPage.jsx
import { IncidentMap } from '../../components/maps/IncidentMap';
import { useIncidentMapData } from '../../hooks/useIncidentMapData';

export const CommunityMapPage = () => {
  const { incidents, loading, error } = useIncidentMapData();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black">Bản Đồ Phản Ánh Cộng Đồng</h2>
        <p className="text-xs text-gray-500 font-semibold">
          Bản đồ vị trí định vị sự cố đô thị trực tuyến. Rà soát, theo dõi mật độ phân bố các vấn đề đô thị theo khu vực dân cư.
        </p>
      </div>

      <div className="card bg-base-100 border border-base-300 p-4 rounded-3xl shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center h-[550px] text-slate-500">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : incidents.length > 0 ? (
          <IncidentMap incidents={incidents} />
        ) : (
          <div className="flex h-[550px] flex-col items-center justify-center gap-3 text-slate-500 text-sm">
            <span className="text-lg">Không tìm thấy phản ánh có tọa độ hợp lệ.</span>
            <span>Vui lòng kiểm tra lại dữ liệu hoặc tải lại trang.</span>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
