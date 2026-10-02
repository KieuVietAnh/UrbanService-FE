type ErrorRecord = Record<string, unknown>;

export type UserErrorContext =
  | 'default'
  | 'login'
  | 'google-login'
  | 'register'
  | 'phone-otp-send'
  | 'phone-otp-verify'
  | 'forgot-password'
  | 'upload';

const asRecord = (value: unknown): ErrorRecord =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as ErrorRecord
    : {};

const asText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const getStatus = (error: unknown): number => {
  const source = asRecord(error);
  const response = asRecord(source.response);
  return Number(response.status ?? source.status) || 0;
};

const getCode = (error: unknown): string => {
  const source = asRecord(error);
  const response = asRecord(source.response);
  const data = asRecord(response.data ?? source.data);
  return asText(source.code ?? data.code).toLowerCase();
};

const getRawMessage = (error: unknown): string => {
  if (typeof error === 'string') return error.trim();
  const source = asRecord(error);
  const response = asRecord(source.response);
  const data = asRecord(response.data ?? source.data);
  const nestedError = asRecord(data.error);
  return asText(
    data.message
      ?? data.msg
      ?? nestedError.message
      ?? data.title
      ?? source.message,
  );
};

const hasVietnameseText = (message: string) =>
  /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i.test(message);

const looksTechnical = (message: string) =>
  /authcenter|firebase|backend|máy chủ|\bserver\b|\bapi\b|endpoint|controller|service|exception|stack trace|axios|network error|request failed|status\s*code|http\s*\d{3}|econn|enotfound|etimedout|sql|database|boundarygeojson|expo_public|google-services|\.net\b|system\.|microsoft\.|unknown error|undefined|null reference|�|A�|KhA'ng|PhiA/i.test(message);

const loginMessage = 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';

/**
 * Converts transport/service errors into short Vietnamese copy suitable for UI.
 * Technical details remain available to development logs, but never reach users.
 */
export function getUserFacingError(
  error: unknown,
  fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.',
  context: UserErrorContext = 'default',
): string {
  const status = getStatus(error);
  const code = getCode(error);
  const rawMessage = getRawMessage(error);
  const normalized = `${code} ${rawMessage}`.toLowerCase();

  if (/timeout|timed out|econnaborted|etimedout/.test(normalized)) {
    return 'Kết nối mất quá nhiều thời gian. Vui lòng kiểm tra mạng và thử lại.';
  }
  if (/err_network|network error|failed to fetch|econnrefused|enotfound|socket hang up|unable to resolve/.test(normalized)) {
    return 'Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.';
  }
  if (/canceled|cancelled|err_canceled|aborterror/.test(normalized)) {
    return 'Yêu cầu đã được dừng. Vui lòng thử lại.';
  }

  if (context === 'login') {
    if (status === 400 || status === 401 || /credential|password|account|authcenter|login/.test(normalized)) {
      return loginMessage;
    }
  }
  if (context === 'google-login' && /cancel|dismiss/.test(normalized)) {
    return 'Bạn đã hủy đăng nhập bằng Google.';
  }
  if (context === 'google-login' && (status === 400 || status === 401 || looksTechnical(rawMessage))) {
    return 'Không thể đăng nhập bằng Google. Vui lòng thử lại.';
  }

  if (/email/.test(normalized) && /already|exists|taken|duplicate|đã (?:được )?sử dụng|tồn tại/.test(normalized)) {
    return 'Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.';
  }
  if (/phone|số điện thoại/.test(normalized) && /already|exists|taken|duplicate|đã (?:được )?sử dụng|tồn tại/.test(normalized)) {
    return 'Số điện thoại này đã được liên kết với một tài khoản khác.';
  }
  if (/invalid[_ -]?phone|invalid phone|phone number.*invalid/.test(normalized)) {
    return 'Số điện thoại chưa hợp lệ. Vui lòng kiểm tra và nhập lại.';
  }
  if (/invalid[_ -]?(?:verification[_ -]?)?code|invalid otp|otp.*invalid|mã otp.*(?:sai|không chính xác)/.test(normalized)) {
    return 'Mã OTP không chính xác. Vui lòng kiểm tra và nhập lại.';
  }
  if (/otp|verification code|mã xác thực/.test(normalized) && /expired|hết hạn/.test(normalized)) {
    return 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.';
  }
  if (/quota|too many|rate limit|resource-exhausted/.test(normalized) || status === 429) {
    return context === 'phone-otp-send'
      ? 'Bạn đã yêu cầu mã quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.'
      : 'Bạn thao tác quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.';
  }

  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 404) return 'Không tìm thấy thông tin yêu cầu. Dữ liệu có thể đã được thay đổi.';
  if (status === 409) return 'Thông tin vừa được thay đổi. Vui lòng tải lại và thử lại.';
  if (status === 413 || context === 'upload' && /too large|payload/.test(normalized)) {
    return 'Tệp đã chọn quá lớn. Vui lòng giảm kích thước hoặc chọn ít tệp hơn.';
  }
  if (status === 422) return 'Một số thông tin chưa hợp lệ. Vui lòng kiểm tra lại.';
  if (status >= 500) return 'Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại sau.';

  if (looksTechnical(rawMessage)) return fallback;

  if (rawMessage && hasVietnameseText(rawMessage) && !looksTechnical(rawMessage)) {
    return rawMessage.replace(/\s+/g, ' ').slice(0, 240);
  }

  if (context === 'login') return loginMessage;
  if (context === 'phone-otp-verify') return 'Không thể xác thực mã OTP. Vui lòng kiểm tra và thử lại.';
  if (context === 'phone-otp-send') return 'Không thể gửi mã OTP. Vui lòng thử lại sau.';
  return fallback;
}
