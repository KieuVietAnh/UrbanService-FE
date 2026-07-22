// src/pages/auth/VerifyEmailPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';
import { AuthLayout } from '../../components/auth/AuthLayout';
import * as Lucide from 'lucide-react';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const OTP_VALIDITY_MINUTES = 5;
const REGISTER_DRAFT_STORAGE_KEY = 'urbanmind:registration-draft';

const normalizeRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'serviceuser' || normalized === 'service-user') return 'service-user';
  if (normalized === 'systemstaff' || normalized === 'system-staff') return 'system-staff';
  if (
    normalized === 'serviceprovider' ||
    normalized === 'service-provider' ||
    normalized === 'serviceoperator' ||
    normalized === 'service-operator'
  ) return 'service-provider';
  if (normalized === 'interactionmanager' || normalized === 'interaction-manager') return 'interaction-manager';
  if (normalized === 'systemadmin' || normalized === 'admin' || normalized === 'administrator') return 'administrator';
  return normalized;
};

const getRoleDashboard = (role) => {
  const roleMap = {
    'service-user': '/dashboard',
    'system-staff': '/staff/queue',
    'service-provider': '/provider/tasks',
    'interaction-manager': '/manager/interactions',
    administrator: '/admin/audit',
  };
  return roleMap[normalizeRole(role)] || '/dashboard';
};

const normalizeForMatch = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const collectApiMessages = (error) => {
  const payload = error?.response?.data;
  const values = [
    payload?.msg,
    payload?.message,
    payload?.error,
    payload?.title,
    error?.message,
  ];

  if (payload?.errors && typeof payload.errors === 'object') {
    Object.values(payload.errors).forEach((fieldMessages) => {
      if (Array.isArray(fieldMessages)) values.push(...fieldMessages);
      else values.push(fieldMessages);
    });
  }

  return values
    .flat()
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim());
};

const getOtpError = (error, action) => {
  const status = error?.status || error?.response?.status;
  const code = error?.code;
  const messages = collectApiMessages(error);
  const rawMessage = messages[0] || '';
  const normalized = normalizeForMatch(messages.join(' '));

  if (code === 'ERR_NETWORK' || normalized.includes('network error')) {
    return {
      title: 'Không thể kết nối',
      message: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
    };
  }

  if (code === 'ECONNABORTED' || normalized.includes('timeout')) {
    return {
      title: 'Yêu cầu mất quá nhiều thời gian',
      message: 'Máy chủ phản hồi chậm. Vui lòng thử lại sau ít phút.',
    };
  }

  if (status === 401 || status === 403) {
    return {
      title: 'Phiên đăng nhập đã hết hạn',
      message: 'Vui lòng đổi tài khoản hoặc đăng nhập lại để tiếp tục xác thực email.',
    };
  }

  if (status === 429 || normalized.includes('too many') || normalized.includes('qua nhieu')) {
    return {
      title: 'Bạn thao tác quá nhanh',
      message: 'Vui lòng chờ một lúc trước khi gửi lại mã xác thực.',
    };
  }

  if (
    normalized.includes('already verified') ||
    normalized.includes('da xac thuc') ||
    normalized.includes('email verified')
  ) {
    return {
      title: 'Email đã được xác thực',
      message: 'Tài khoản này đã hoàn tất xác thực email. Bạn có thể tiếp tục sử dụng hệ thống.',
    };
  }

  if (action === 'send') {
    if (
      normalized.includes('brevo') ||
      normalized.includes('email service') ||
      normalized.includes('mail service') ||
      normalized.includes('gui email')
    ) {
      return {
        title: 'Chưa thể gửi email',
        message: 'Dịch vụ gửi email đang tạm thời gián đoạn. Vui lòng thử lại sau.',
      };
    }

    if (status >= 500) {
      return {
        title: 'Chưa thể gửi mã xác thực',
        message: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút.',
      };
    }

    return {
      title: 'Không thể gửi mã xác thực',
      message: rawMessage && rawMessage.length <= 180
        ? rawMessage
        : 'Vui lòng kiểm tra kết nối và thử gửi lại mã.',
    };
  }

  if (
    normalized.includes('expired') ||
    normalized.includes('het han') ||
    normalized.includes('qua han')
  ) {
    return {
      title: 'Mã xác thực đã hết hạn',
      message: 'Mã OTP chỉ có hiệu lực trong 5 phút. Vui lòng gửi lại mã mới.',
      allowResend: true,
    };
  }

  if (
    normalized.includes('invalid') ||
    normalized.includes('incorrect') ||
    normalized.includes('not match') ||
    normalized.includes('khong dung') ||
    normalized.includes('khong hop le') ||
    normalized.includes('ma otp sai')
  ) {
    return {
      title: 'Mã xác thực không đúng',
      message: 'Vui lòng kiểm tra lại 6 chữ số trong email và nhập lại.',
    };
  }

  if (normalized.includes('used') || normalized.includes('da su dung')) {
    return {
      title: 'Mã xác thực đã được sử dụng',
      message: 'Vui lòng gửi lại mã mới để tiếp tục.',
      allowResend: true,
    };
  }

  if (status >= 500) {
    return {
      title: 'Chưa thể xác thực email',
      message: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút.',
    };
  }

  return {
    title: 'Không thể xác thực email',
    message: rawMessage && rawMessage.length <= 180
      ? rawMessage
      : 'Mã xác thực chưa được chấp nhận. Vui lòng kiểm tra và thử lại.',
  };
};

const createEmptyOtp = () => Array.from({ length: OTP_LENGTH }, () => '');

const getOtpSessionKey = (user) => {
  const identity = user?.userId || user?.email || 'current-user';
  return `urbanmind:otp-sent:${identity}`;
};

const readOtpSession = (sessionKey) => {
  if (!sessionKey || typeof window === 'undefined') return null;

  try {
    const rawValue = window.sessionStorage.getItem(sessionKey);
    if (!rawValue) return null;
    const parsedValue = JSON.parse(rawValue);
    const sentAt = Number(parsedValue?.sentAt || 0);
    return sentAt > 0 ? { ...parsedValue, sentAt } : null;
  } catch {
    return null;
  }
};

export const VerifyEmailPage = () => {
  const { user, sendOtp, verifyOtp, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [otpDigits, setOtpDigits] = useState(createEmptyOtp);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef([]);
  const sendInFlightRef = useRef(false);
  const redirectTimerRef = useRef(null);
  const verificationHandledRef = useRef(false);
  const deliveryStateHydratedRef = useRef(false);

  const otpCode = useMemo(() => otpDigits.join(''), [otpDigits]);
  const isOtpComplete = otpCode.length === OTP_LENGTH;
  const sessionKey = useMemo(() => getOtpSessionKey(user), [user]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user.isVerified && !verificationHandledRef.current) {
      navigate(getRoleDashboard(user.role), { replace: true });
    }
  }, [navigate, user]);

  useEffect(() => () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const focusOtpInput = useCallback((index) => {
    window.requestAnimationFrame(() => {
      inputRefs.current[index]?.focus();
      inputRefs.current[index]?.select();
    });
  }, []);

  useEffect(() => {
    if (!user || deliveryStateHydratedRef.current) return;
    deliveryStateHydratedRef.current = true;

    const routeDelivery = location.state?.otpDelivery;
    const storedDelivery = readOtpSession(sessionKey);
    const sentAt = Number(routeDelivery?.sentAt || storedDelivery?.sentAt || 0);

    if (routeDelivery?.status === 'sent' || sentAt > 0) {
      const elapsedSeconds = Math.floor((Date.now() - sentAt) / 1000);
      setOtpSent(true);
      setCountdown(Math.max(0, RESEND_COOLDOWN_SECONDS - elapsedSeconds));
      if (routeDelivery?.status === 'sent') {
        setSuccess(location.state?.emailChanged
          ? 'Thông tin đã được cập nhật và mã OTP mới đã được gửi đến email mới.'
          : 'Mã xác thực đã được gửi đến email của bạn.');
      } else if (location.state?.registrationUpdated) {
        setSuccess('Thông tin đăng ký đã được cập nhật. Bạn có thể tiếp tục xác thực email.');
      }
      focusOtpInput(0);
      return;
    }

    if (location.state?.registrationUpdated) {
      setSuccess('Thông tin đăng ký đã được cập nhật. Bạn có thể tiếp tục xác thực email.');
    }

    if (routeDelivery?.status === 'failed') {
      setOtpSent(false);
      setError(routeDelivery.error || {
        title: 'Chưa thể gửi mã xác thực',
        message: 'Tài khoản đã được tạo. Vui lòng thử gửi lại mã.',
      });
    }
  }, [focusOtpInput, location.state, sessionKey, user]);

  const handleSendOtp = useCallback(async () => {
    // Registration sends the first OTP automatically. This handler is used for
    // manual retry/resend, and the ref blocks duplicate requests before state updates.
    if (!user || sendInFlightRef.current) return;

    sendInFlightRef.current = true;
    setSendingOtp(true);
    setError(null);
    setSuccess('');

    try {
      await sendOtp();
      const sentAt = Date.now();
      window.sessionStorage.setItem(sessionKey, JSON.stringify({
        sentAt,
        email: user.email,
      }));
      setOtpDigits(createEmptyOtp());
      setOtpSent(true);
      setCountdown(RESEND_COOLDOWN_SECONDS);
      setSuccess('Mã xác thực đã được gửi đến email của bạn.');
      focusOtpInput(0);
    } catch (sendError) {
      setError(getOtpError(sendError, 'send'));
    } finally {
      sendInFlightRef.current = false;
      setSendingOtp(false);
    }
  }, [focusOtpInput, sendOtp, sessionKey, user]);

  const setDigitsFromText = (text, startIndex = 0) => {
    const digits = String(text || '').replace(/\D/g, '').slice(0, OTP_LENGTH - startIndex);
    if (!digits) return;

    setOtpDigits((current) => {
      const next = [...current];
      digits.split('').forEach((digit, offset) => {
        next[startIndex + offset] = digit;
      });
      return next;
    });

    setError(null);
    focusOtpInput(Math.min(startIndex + digits.length, OTP_LENGTH - 1));
  };

  const handleOtpChange = (index, value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length > 1) {
      setDigitsFromText(digits, index);
      return;
    }

    setOtpDigits((current) => {
      const next = [...current];
      next[index] = digits;
      return next;
    });
    setError(null);

    if (digits && index < OTP_LENGTH - 1) focusOtpInput(index + 1);
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      if (otpDigits[index]) {
        setOtpDigits((current) => {
          const next = [...current];
          next[index] = '';
          return next;
        });
      } else if (index > 0) {
        setOtpDigits((current) => {
          const next = [...current];
          next[index - 1] = '';
          return next;
        });
        focusOtpInput(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusOtpInput(index - 1);
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusOtpInput(index + 1);
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    setDigitsFromText(event.clipboardData.getData('text'), 0);
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    if (!isOtpComplete) {
      setError({
        title: 'Mã xác thực chưa đầy đủ',
        message: 'Vui lòng nhập đủ 6 chữ số được gửi đến email của bạn.',
      });
      const emptyIndex = otpDigits.findIndex((digit) => !digit);
      focusOtpInput(emptyIndex >= 0 ? emptyIndex : 0);
      return;
    }

    setError(null);
    setSuccess('');
    setVerifying(true);
    verificationHandledRef.current = true;

    try {
      const result = await verifyOtp(otpCode);
      window.sessionStorage.removeItem(sessionKey);
      window.sessionStorage.removeItem(REGISTER_DRAFT_STORAGE_KEY);
      setSuccess('Email đã được xác thực thành công. Đang chuyển bạn vào hệ thống...');

      const verifiedUser = result?.user || { ...user, isVerified: true };
      redirectTimerRef.current = window.setTimeout(() => {
        navigate(getRoleDashboard(verifiedUser?.role || user?.role), { replace: true });
      }, 900);
    } catch (verifyError) {
      verificationHandledRef.current = false;
      const parsedError = getOtpError(verifyError, 'verify');
      setError(parsedError);
      if (parsedError.allowResend) setCountdown(0);
      setOtpDigits(createEmptyOtp());
      focusOtpInput(0);
    } finally {
      setVerifying(false);
    }
  };

  const handleEditRegistration = () => {
    navigate('/register?mode=edit', {
      state: {
        from: '/verify-email',
      },
    });
  };

  const handleLogout = async () => {
    window.sessionStorage.removeItem(sessionKey);
    window.sessionStorage.removeItem(REGISTER_DRAFT_STORAGE_KEY);
    await logout();
    navigate('/login', { replace: true });
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <span className="loading loading-ring loading-lg text-primary" aria-label="Đang tải thông tin tài khoản" />
      </div>
    );
  }

  return (
    <AuthLayout
      brandTo={null}
      onBack={handleLogout}
      backLabel="Đổi tài khoản"
      backLabelMobile="Đổi tài khoản"
    >
      <article className="auth-login-card relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-[0_24px_65px_rgba(15,23,42,0.13)] sm:p-8 dark:border-slate-700 dark:bg-slate-900">
        <svg
          className="pointer-events-none absolute right-0 top-0 h-40 w-64 text-blue-600"
          viewBox="0 0 260 160"
          fill="none"
          aria-hidden="true"
        >
          <path d="M18 110C72 67 116 126 171 78C202 51 222 43 270 53" stroke="currentColor" strokeWidth="1.2" className="opacity-[0.07]" />
          <path d="M31 130C83 92 126 139 184 98C211 79 233 75 274 82" stroke="currentColor" strokeWidth="1" strokeDasharray="5 8" className="opacity-[0.055]" />
          <circle cx="171" cy="78" r="5" className="fill-blue-500/10" />
          <circle cx="222" cy="53" r="8" className="fill-emerald-500/10" />
          <circle cx="222" cy="53" r="17" stroke="currentColor" className="opacity-[0.05]" />
        </svg>

        <header className="relative z-10">
          <span className="auth-login-badge inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <Lucide.MailCheck size={14} aria-hidden="true" />
            Xác thực tài khoản UrbanMind
          </span>
          <h1 id="auth-page-title" className="auth-login-title mt-5 text-[30px] font-bold leading-tight tracking-[-0.035em] text-slate-950 dark:text-white">
            Xác thực email
          </h1>
          <p className="auth-login-description mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Nhập mã gồm 6 chữ số được gửi đến{' '}
            <strong className="font-semibold text-slate-700 dark:text-slate-200">{user.email}</strong>.
          </p>
          <button
            type="button"
            onClick={handleEditRegistration}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 transition hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 dark:text-blue-300 dark:hover:text-blue-200"
          >
            <Lucide.PencilLine size={14} aria-hidden="true" />
            Sửa email hoặc thông tin đăng ký
          </button>
        </header>

        <ol className="relative z-10 mt-5 grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400" aria-label="Tiến trình tạo tài khoản">
          <li className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Lucide.Check size={13} aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">Tạo tài khoản</span>
          </li>
          <li aria-hidden="true" className="h-px bg-emerald-300/60 dark:bg-emerald-800/60" />
          <li className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">2</span>
            <span className="hidden sm:inline">Xác thực email</span>
          </li>
          <li aria-hidden="true" className="h-px border-t border-dashed border-slate-300 dark:border-slate-700" />
          <li className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">3</span>
            <span className="hidden sm:inline">Hoàn tất</span>
          </li>
        </ol>

        <div className="relative z-10 mt-5 space-y-3">
          {error ? (
            <ErrorAlert
              title={error.title}
              message={error.message}
              onClose={() => setError(null)}
            />
          ) : null}

          {success ? (
            <SuccessAlert
              title={success.startsWith('Email đã được xác thực') ? 'Xác thực thành công' : 'Đã gửi mã xác thực'}
              message={success}
              onClose={() => setSuccess('')}
            />
          ) : null}
        </div>

        {!otpSent ? (
          <section className="relative z-10 mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/25" aria-labelledby="send-code-title">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                <Lucide.Send size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 id="send-code-title" className="text-sm font-semibold text-slate-900 dark:text-white">
                  {sendingOtp ? 'Đang gửi mã xác thực...' : 'Sẵn sàng gửi mã xác thực'}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Mã OTP có hiệu lực trong {OTP_VALIDITY_MINUTES} phút kể từ lúc được gửi.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSendOtp()}
              disabled={sendingOtp}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sendingOtp ? (
                <>
                  <span className="loading loading-spinner loading-sm" aria-hidden="true" />
                  Đang gửi mã...
                </>
              ) : (
                <>
                  <Lucide.Mail size={16} aria-hidden="true" />
                  Gửi mã xác thực
                </>
              )}
            </button>
          </section>
        ) : (
          <form onSubmit={handleVerifyOtp} className="relative z-10 mt-5">
            <fieldset disabled={verifying}>
              <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mã xác thực gồm 6 chữ số
              </legend>
              <div className="mt-2.5 grid grid-cols-6 gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    // Index is stable because the OTP always contains exactly six positions.
                    key={index}
                    ref={(element) => { inputRefs.current[index] = element; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    aria-label={`Chữ số OTP thứ ${index + 1}`}
                    className="h-12 min-w-0 rounded-xl border border-slate-300 bg-white text-center text-lg font-bold text-slate-900 outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:h-14 sm:rounded-2xl sm:text-xl dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600"
                  />
                ))}
              </div>
            </fieldset>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Lucide.Clock3 size={14} aria-hidden="true" />
                Mã có hiệu lực trong {OTP_VALIDITY_MINUTES} phút
              </p>
              {countdown > 0 ? (
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  Gửi lại sau <strong className="text-slate-700 dark:text-slate-200">{countdown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={sendingOtp}
                  className="font-semibold text-blue-700 transition hover:text-blue-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  {sendingOtp ? 'Đang gửi lại...' : 'Gửi lại mã'}
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={verifying || !isOtpComplete}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-blue-600/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <span className="loading loading-spinner loading-sm" aria-hidden="true" />
                  Đang xác thực...
                </>
              ) : (
                <>
                  Xác thực email
                  <Lucide.ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        )}

        <aside className="relative z-10 mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/75 px-4 py-3 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-slate-950/55 dark:text-slate-400" aria-label="Hướng dẫn nhận mã xác thực">
          <Lucide.CircleHelp size={17} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden="true" />
          <p>
            Chưa thấy email? Hãy kiểm tra thư mục Spam hoặc Thư rác, sau đó dùng nút “Gửi lại mã”.
          </p>
        </aside>
      </article>
    </AuthLayout>
  );
};
