// src/pages/tickets/CreateTicketPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ticketApi } from '../../services/api/ticketApi';
import { slaApi } from '../../services/api/slaApi';
import { toolsApi } from '@urbanmind/shared-api';
import { LocationPicker } from '../../components/maps/LocationPicker';
import * as Lucide from 'lucide-react';
import OnboardingTips from '../../components/onboarding/OnboardingTips';
import ConfettiBurst from '../../components/delight/ConfettiBurst';
import DelightToast from '../../components/delight/DelightToast';

export const CreateTicketPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Wizard Steps: 1: Description, 2: AI Category & Priority, 3: GPS Map Location, 4: Image Evidence, 5: Submit Success
  const [step, setStep] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const [stepVisible, setStepVisible] = useState(true);

  // Form State
  const [title, setTitle] = useState('');

  useEffect(() => {
    setStepVisible(false);
    const frame = requestAnimationFrame(() => setStepVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [step]);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [submitError, setSubmitError] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // AI Simulation States
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateWarn, setShowDuplicateWarn] = useState(false);
  const [loading, setLoading] = useState(false);

  const isVideoFile = (file) => {
    return file?.type?.startsWith('video/');
  };
  // File Upload base64 simulation
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);

    files.forEach((file) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        setAttachments((prev) => [
          ...prev,
          {
            file,
            preview: reader.result,
            type: file.type,
            name: file.name,
          },
        ]);
      };

      reader.readAsDataURL(file);
    });
  };

  // Trigger AI analysis when moving past step 1
  const handleNextToStep2 = () => {
    if (!title || !description) return;

    // Call simulated AI
    const analysis = toolsApi.aiClassify(title, description);
    setAiAnalysis(analysis);
    setCategoryId(analysis.categoryId);
    setPriority(analysis.urgencyLevel);
    setStep(2);
  };

  const handleLocationSelect = (lat, lng, address) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocationText(address);

    // Run duplicate check on location select
    const matches = toolsApi.checkDuplicates(Number(categoryId), lat, lng);
    setDuplicates(matches);
    if (matches.length > 0) {
      setShowDuplicateWarn(true);
    } else {
      setShowDuplicateWarn(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        let fetchedCategories = [];
        try {
          fetchedCategories = await slaApi.getCategories();
        } catch (apiErr) {
          console.warn('CreateTicketPage slaApi.getCategories failed, falling back to toolsApi', apiErr);
          fetchedCategories = await toolsApi.getCategories();
        }

        if (isMounted) {
          setCategories(Array.isArray(fetchedCategories) ? fetchedCategories : []);
        }
      } catch (err) {
        console.warn('CreateTicketPage failed to load categories', err);
        if (isMounted) setCategories([]);
      } finally {
        if (isMounted) setCategoriesLoading(false);
      }
    };

    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async () => {
    setSubmitError('');
    if (!latitude || !longitude || !locationText) {
      setSubmitError('Vui lòng chọn vị trí trên bản đồ trước khi gửi phản ánh.');
      return;
    }

    if (attachments.length === 0) {
      setSubmitError('Vui lòng tải lên ít nhất một hình ảnh hoặc video minh chứng trước khi gửi.');
      return;
    }
    if (!latitude || !longitude || !locationText) return;
    setLoading(true);
    const payload = {
      title,
      description,
      categoryId,
      priority,
      locationText,
      latitude,
      longitude,
      attachments: attachments.map((item) => item.file),
    };
    try {
      const role = user?.role || 'service-user';
      await ticketApi.createTicket(user.userId, user.fullName, payload, { role });
      setStep(5); // Success step
        setShowToast(true);
    } catch (err) {
      console.error('createTicket error', err);
      setSubmitError(err.message || 'Không thể gửi phản ánh. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card w-full bg-white border border-slate-200 shadow-sm p-6 md:p-8 rounded-3xl space-y-6 text-slate-800">

      {/* Wizard Steps indicator */}
      <div className="flex items-center justify-center border-b border-slate-100 pb-6">
          <ul className="steps steps-horizontal w-full max-w-xl text-[10px] font-bold text-slate-400">
          <li className={`step ${step >= 1 ? 'step-primary text-[color:var(--brand-primary)]' : ''}`}>Mô tả</li>
          <li className={`step ${step >= 2 ? 'step-primary text-[color:var(--brand-primary)]' : ''}`}>Phân Loại</li>
          <li className={`step ${step >= 3 ? 'step-primary text-[color:var(--brand-primary)]' : ''}`}>Vị trí</li>
          <li className={`step ${step >= 4 ? 'step-primary text-[color:var(--brand-primary)]' : ''}`}>Minh chứng</li>
          <li className={`step ${step >= 5 ? 'step-primary text-[color:var(--brand-primary)]' : ''}`}>Hoàn tất</li>
        </ul>
      </div>

      {/* STEP 1: TITLE & DESCRIPTION */}
      {step === 1 && (
        <div className={`space-y-5 max-w-xl mx-auto w-full fade-in-up ${stepVisible ? 'visible' : ''}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900">Bước 1: Mô Tả Sự Cố</h3>
                <p className="text-xs text-slate-500 font-semibold">Cung cấp tiêu đề ngắn gọn và nội dung chi tiết phản ánh sự cố đô thị.</p>
              </div>
              <div className="form-control space-y-1 mt-4">
                <label className="label py-0">
                  <span className="label-text font-bold text-xs text-slate-700">Tiêu đề phản ánh *</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Hỏng bóng đèn đường trước cửa số 123 Lê Lợi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input input-bordered w-full text-xs font-semibold rounded-xl h-11 border-slate-200 focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div className="form-control space-y-1 mt-3">
                <label className="label py-0">
                  <span className="label-text font-bold text-xs text-slate-700">Mô tả chi tiết *</span>
                </label>
                <textarea
                  rows="5"
                  placeholder="Mô tả cụ thể sự việc, tình trạng hiện tại, mức độ ảnh hưởng đến giao thông hoặc đời sống cư dân..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="textarea textarea-bordered w-full text-xs font-semibold rounded-xl p-3 border-slate-200 focus:border-primary focus:outline-none"
                  required
                ></textarea>
              </div>
            </div>
            <aside className="hidden lg:block">
              <OnboardingTips />
            </aside>
          </div>
          <button
            type="button"
            onClick={handleNextToStep2}
            disabled={!title.trim() || !description.trim()}
            className="btn btn-primary w-full rounded-xl font-bold h-11 text-xs gap-1"
          >
            Tiếp Tục
            <Lucide.ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* STEP 2: AI ANALYSIS REVIEW */}
      {step === 2 && aiAnalysis && (
        <div className={`space-y-6 max-w-xl mx-auto w-full fade-in-up ${stepVisible ? 'visible' : ''}`}>
          <div className="text-center space-y-1">
            <h3 className="text-base font-black text-slate-900">Bước 2: Phân Loại Sự Cố</h3>
            <p className="text-xs text-slate-500 font-semibold">Vui lòng chọn danh mục và mức độ khẩn cấp phù hợp cho sự cố.</p>
          </div>

          {/* Edit Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control space-y-1">
              <label className="label py-0">
                <span className="label-text font-bold text-xs text-slate-700">Chọn Danh mục *</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="select select-bordered text-xs font-bold rounded-xl border-slate-200 focus:outline-none"
                required
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
                ))}
              </select>
              {categoriesLoading && (
                <p className="text-[11px] text-slate-500 mt-2">Đang tải danh mục...</p>
              )}
              {!categoriesLoading && categories.length === 0 && (
                <p className="text-[11px] text-red-500 mt-2">Chưa có danh mục nào. Vui lòng liên hệ quản trị hoặc thử lại sau.</p>
              )}
            </div>
            <div className="form-control space-y-1">
              <label className="label py-0">
                <span className="label-text font-bold text-xs text-slate-700">Mức độ khẩn cấp *</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="select select-bordered text-xs font-bold rounded-xl border-slate-200 focus:outline-none"
                required
              >
                <option value="Low">Thấp (Low)</option>
                <option value="Medium">Trung bình (Medium)</option>
                <option value="High">Cao (High)</option>
                <option value="Critical">Khẩn cấp (Critical)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn btn-outline border-slate-200 flex-1 rounded-xl text-xs h-11 text-slate-600">
              Quay Lại
            </button>
            <button type="button" onClick={() => setStep(3)} disabled={!categoryId} className="btn btn-primary flex-1 rounded-xl font-bold text-xs h-11">
              Tiếp Tục Chọn Vị Trí
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: MAP PICKER & DUPLICATES CHECK */}
      {step === 3 && (
        <div className={`space-y-5 fade-in-up ${stepVisible ? 'visible' : ''}`}>
          <div className="text-center space-y-1">
            <h3 className="text-base font-black text-slate-900">Bước 3: Chọn Vị Trí Sự Cố</h3>
            <p className="text-xs text-slate-500 font-semibold">Định vị địa điểm xảy ra sự cố trên bản đồ số để nhân viên dễ tìm kiếm.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map column */}
            <div className="lg:col-span-2 border border-slate-200 rounded-3xl overflow-hidden shadow-xs transition-shadow duration-200 ease-out hover:shadow-sm">
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                onSelectLocation={handleLocationSelect}
              />
            </div>

            {/* Coordinates HUD Column */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="card bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3 transition-shadow duration-200 ease-out hover:shadow-sm">
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Thông tin địa điểm</h4>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Địa chỉ đã chọn:</span>
                    <span className="text-xs font-bold text-slate-700 block bg-white p-3 rounded-xl border border-slate-200 leading-relaxed min-h-12">
                      {locationText || 'Vui lòng click chọn điểm trên bản đồ...'}
                    </span>
                  </div>
                  {latitude && (
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-[color:var(--brand-primary)] mt-2">
                      <span>Vĩ độ: {latitude.toFixed(6)}</span>
                      <span>Kinh độ: {longitude.toFixed(6)}</span>
                    </div>
                  )}
                </div>

                {/* DUPLICATE WARNING CARD ALERT */}
                {showDuplicateWarn && (
                  <div className="card bg-red-50 border border-red-200 p-4 rounded-2xl space-y-3 transition-shadow duration-200 ease-out hover:shadow-sm">
                    <div className="flex items-center gap-1.5 text-red-600 font-extrabold text-xs">
                      <Lucide.AlertTriangle size={16} />
                      <span>Phát hiện sự cố nghi trùng lặp!</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      AI đã phát hiện có <span className="font-bold text-red-600">{duplicates.length} phản ánh trùng danh mục</span> đang xử lý gần vị trí bạn chọn. Bạn có muốn hủy tạo mới để theo dõi chung không?
                    </p>
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200 max-h-24 overflow-y-auto">
                      {duplicates.map((dup, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] py-1 border-b border-slate-100 last:border-b-0">
                          <span className="font-semibold text-slate-700 truncate w-40">{dup.title}</span>
                          <button
                            type="button"
                            onClick={() => navigate(`/tickets/${dup.feedbackId}`)}
                            className="text-[color:var(--brand-primary)] hover:underline font-bold text-[9px]"
                          >
                            Xem
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('/tickets')}
                        className="btn btn-xs bg-red-600 hover:bg-red-700 border-none text-white rounded-lg flex-1 font-bold text-[9px] h-7"
                      >
                        Theo dõi sự cố đã có
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDuplicateWarn(false)}
                        className="btn btn-xs btn-outline border-red-300 text-red-700 hover:bg-red-50 rounded-lg flex-1 text-[9px] h-7"
                      >
                        Vẫn tạo mới
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="btn btn-outline border-slate-200 flex-1 rounded-xl text-xs h-11 text-slate-600">
                  Quay Lại
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  disabled={!latitude}
                  className="btn btn-primary flex-1 rounded-xl font-bold text-xs h-11"
                >
                  Tải Ảnh Minh Chứng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: UPLOAD IMAGE PROOFS & REVIEW PREVIEW */}
      {step === 4 && (
        <div className={`space-y-6 max-w-xl mx-auto w-full fade-in-up ${stepVisible ? 'visible' : ''}`}>
          <div className="text-center space-y-1">
            <h3 className="text-base font-black text-slate-900">Bước 4: Tải Ảnh Minh Chứng</h3>
            <p className="text-xs text-slate-500 font-semibold">Tải lên bằng chứng thực tế tại hiện trường giúp cán bộ tiếp nhận nhanh hơn.</p>
          </div>

          {/* Drag & Drop uploader mockup */}
          <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center space-y-4 bg-slate-50/50 hover:border-[color:var(--brand-primary)] hover:bg-slate-50 transition-all duration-200 ease-out cursor-pointer relative">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="mx-auto w-12 h-12 rounded-full bg-[color:var(--color-info-bg)] text-[color:var(--color-info)] flex items-center justify-center" aria-hidden>
              <Lucide.UploadCloud size={24} />
            </div>
            <div className="space-y-1 text-xs">
              <span className="font-extrabold text-[color:var(--brand-primary)] block">
                Kéo thả ảnh/video hoặc click để tải lên
              </span>
              <p className="text-slate-400 font-semibold">
                Hỗ trợ JPG, PNG, MP4, WEBM dung lượng tối đa 10MB
              </p>
            </div>
          </div>

          {/* Preview uploaded images */}
          {attachments.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {attachments.map((attachment, idx) => {
                const isVideo = isVideoFile(attachment.file);

                return (
                  <div
                    key={`${attachment.name || attachment.file?.name || 'attachment'}-${idx}`}
                    className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 group bg-slate-100 transition-shadow duration-200 ease-out hover:shadow-lg"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewAttachment(attachment)}
                      className="block w-full h-full text-left"
                    >
                      {isVideo ? (
                        <div className="relative w-full h-full bg-black">
                          <video
                            src={attachment.preview}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover opacity-80"
                          />

                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg">
                              <Lucide.Play size={18} fill="currentColor" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={attachment.preview}
                          alt="Evidence"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black text-white rounded-full transition-colors z-10"
                    >
                      <Lucide.Trash size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Submission confirmation summary */}
          <div className="border-t border-slate-100 pt-5 space-y-3 text-xs">
            <h4 className="font-bold text-center text-slate-400 uppercase tracking-wide">Tóm tắt phản ánh của bạn</h4>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex"><span className="font-bold text-slate-400 w-24 shrink-0">Tiêu đề:</span> <span className="font-bold text-slate-700">{title}</span></div>
              <div className="flex"><span className="font-bold text-slate-400 w-24 shrink-0">Mô tả:</span> <span className="font-semibold text-slate-600 line-clamp-2">{description}</span></div>
              <div className="flex"><span className="font-bold text-slate-400 w-24 shrink-0">Danh mục:</span> <span className="font-bold text-slate-700">{categories.find((c) => c.categoryId === categoryId)?.categoryName || 'Chưa chọn danh mục'}</span></div>
              <div className="flex"><span className="font-bold text-slate-400 w-24 shrink-0">Vị trí sự cố:</span> <span className="font-bold text-slate-700">{locationText}</span></div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(3)} className="btn btn-outline border-slate-200 flex-1 rounded-xl text-xs h-11 text-slate-600">
              Quay Lại
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || attachments.length === 0}
              className="btn btn-primary flex-1 rounded-xl font-bold text-xs h-11"
            >
              {loading ? <span className="loading loading-spinner"></span> : 'Gửi Phản Ánh Ngay'}
            </button>
          </div>
          {submitError && (
            <div className="text-sm text-red-600 font-semibold text-center">{submitError}</div>
          )}
          {attachments.length === 0 && (
            <p className="text-[10px] text-red-500 font-semibold text-center">Bạn cần tải lên ít nhất một ảnh hoặc video minh chứng để gửi phản ánh.</p>
          )}
        </div>
      )}

      {/* STEP 5: SUCCESS & NEXT STEPS */}
      {step === 5 && (
        <div className={`space-y-6 max-w-md mx-auto text-center py-8 relative fade-in-up ${stepVisible ? 'visible' : ''}`}>
          <ConfettiBurst />
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Lucide.CheckCircle2 size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900">Gửi Phản Ánh Thành Công!</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Cảm ơn bạn đã phản ánh. Hồ sơ đã được tạo và gửi đến Ban điều hành. Chúng tôi sẽ cập nhật tiến trình sớm.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <button
              onClick={() => navigate('/tickets')}
              className="btn btn-primary rounded-xl font-bold text-xs h-11"
            >
              Xem danh sách phản ánh của tôi
            </button>
            <button
              onClick={() => {
                setTitle('');
                setDescription('');
                setCategoryId('');
                setLocationText('');
                setLatitude(null);
                setLongitude(null);
                setAttachments([]);
                setStep(1);
              }}
              className="btn btn-ghost rounded-xl text-xs text-slate-500 hover:text-slate-800"
            >
              Gửi thêm phản ánh mới
            </button>
          </div>

          <DelightToast open={showToast} message="Phản ánh đã gửi" sub="Cảm ơn bạn — chúng tôi đã nhận được thông tin." onClose={() => setShowToast(false)} />
        </div>
      )}
      {/* Attachment preview modal */}
      {previewAttachment && (() => {
        const isVideo = isVideoFile(previewAttachment.file);
        const previewUrl = previewAttachment.preview;

        return (
          <div
            className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center px-4 py-6 fade-in-up visible"
            onClick={() => setPreviewAttachment(null)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
                <div className="min-w-0">
                  <h3 className="font-black text-sm text-slate-900 truncate">
                    {isVideo ? 'Video minh chứng' : 'Hình ảnh minh chứng'}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Xem lại trước khi gửi phản ánh
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="btn btn-sm btn-ghost btn-circle"
                >
                  <Lucide.X size={18} />
                </button>
              </div>

              <div className="bg-black flex items-center justify-center max-h-[75vh]">
                {isVideo ? (
                  <video
                    src={previewUrl}
                    controls
                    autoPlay
                    className="w-full max-h-[75vh] object-contain"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Evidence preview"
                    className="w-full max-h-[75vh] object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
