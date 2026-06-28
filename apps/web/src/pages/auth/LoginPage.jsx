// src/pages/auth/LoginPage.jsx
import { useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useGoogleIdentity } from '../../hooks/useGoogleIdentity';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import * as Lucide from 'lucide-react';

const normalizeRole = (role) => {
  if (!role) return role;
  const normalized = String(role).trim().toLowerCase();
  if (normalized === 'serviceuser' || normalized === 'service-user') return 'service-user';
  if (normalized === 'systemstaff' || normalized === 'system-staff') return 'system-staff';
  if (normalized === 'serviceprovider' || normalized === 'service-provider' || normalized === 'serviceoperator' || normalized === 'service-operator') return 'service-provider';
  if (normalized === 'interactionmanager' || normalized === 'interaction-manager') return 'interaction-manager';
  if (normalized === 'systemadmin' || normalized === 'admin' || normalized === 'administrator') return 'administrator';
  return normalized;
};

const getRoleDashboard = (role) => {
  const normalizedRole = normalizeRole(role);
  const roleMap = {
    'service-user': '/dashboard',
    'system-staff': '/staff/queue',
    'service-provider': '/provider/tasks',
    'interaction-manager': '/manager/interactions',
    'administrator': '/admin/audit',
  };
  return roleMap[normalizedRole] || '/dashboard';
};

export const LoginPage = () => {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError('Vui lòng điền đầy đủ thông tin đăng nhập.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      
      // If email not verified, redirect to verification
      if (!user?.isVerified) {
        navigate('/verify-email');
        return;
      }
      
      // Redirect to appropriate dashboard based on role
      const redirect = searchParams.get('redirect') || getRoleDashboard(user.role);
      navigate(redirect);
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutofill = (autofillEmail, autofillPassword = '123456789') => {
    setEmail(autofillEmail);
    setPassword(autofillPassword);
    setError('');
  };

  const handleGoogleLoginCallback = useCallback(
    async (response) => {
      try {
        setLoading(true);
        const idToken = response?.credential;
        if (!idToken) {
          setError('Google login failed to return credential.');
          return;
        }
        const user = await googleLogin(idToken);
        if (!user?.isVerified) {
          navigate('/verify-email');
          return;
        }
        const redirect = searchParams.get('redirect') || getRoleDashboard(user.role);
        navigate(redirect);
      } catch (err) {
        setError(err.message || 'Google đăng nhập thất bại.');
      } finally {
        setLoading(false);
      }
    },
    [googleLogin, navigate, searchParams],
  );

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  useGoogleIdentity(googleClientId, handleGoogleLoginCallback);

  const handleGoogleSignIn = () => {
    if (!googleClientId) {
      setError('Google login not configured.');
      return;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      setError('Google SDK not loaded yet. Vui lòng thử lại.');
      return;
    }

    window.google.accounts.id.prompt();
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50/40 flex items-center justify-center p-6 font-sans text-slate-800">
      <div className="card w-full max-w-[420px] bg-white border border-slate-200 shadow-2xl p-8 rounded-3xl space-y-6">
        
        {/* Logo and title */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#0052CC] text-white flex items-center justify-center">
            <Lucide.Building size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-[#0052CC]">UrbanMind</h3>
            <h2 className="text-lg font-black text-slate-900">Đăng nhập UrbanMind</h2>
            <p className="text-xs text-slate-400 font-semibold">Kết nối cộng đồng, kiến tạo tương lai đô thị.</p>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <ErrorAlert 
            title="Lỗi đăng nhập"
            message={error}
            onClose={() => setError('')}
          />
        )}

        {/* Inputs form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="form-control space-y-1">
            <label htmlFor="login-email" className="text-xs font-bold text-slate-500">Email hoặc số điện thoại</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400" aria-hidden="true">
                <Lucide.AtSign size={16} />
              </span>
              <input 
                id="login-email"
                name="email"
                type="text" 
                autoComplete="username"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-bordered w-full pl-10 text-xs font-medium rounded-xl h-11 border-slate-300 focus:border-[#0052CC] focus:outline-none"
              />
            </div>
          </div>

          <div className="form-control space-y-1">
            <label htmlFor="login-password" className="text-xs font-bold text-slate-500">Mật khẩu</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400" aria-hidden="true">
                <Lucide.Lock size={16} />
              </span>
              <input 
                id="login-password"
                name="password"
                type="password" 
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered w-full pl-10 pr-10 text-xs font-medium rounded-xl h-11 border-slate-300 focus:border-[#0052CC] focus:outline-none"
              />
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400" aria-hidden="true">
                <Lucide.Eye size={16} />
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold">
            <label htmlFor="remember-login" className="flex items-center gap-1.5 cursor-pointer text-slate-500">
              <input id="remember-login" type="checkbox" className="checkbox checkbox-primary checkbox-xs rounded" />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <button
              type="button"
              aria-label="Quên mật khẩu"
              className="text-[#0052CC] hover:underline"
            >
              Quên mật khẩu?
            </button>
          </div>

          <button 
            type="submit" 
            className="btn w-full bg-[#0052CC] hover:bg-[#0043a4] text-white border-none rounded-xl font-bold h-11 text-xs mt-2 flex gap-1 items-center justify-center shadow-lg shadow-blue-500/10"
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner"></span> : (
              <>
                <span>Đăng nhập</span>
                <Lucide.ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="divider text-[10px] font-bold text-slate-400 my-4">HOẶC</div>

        {/* OAuth Buttons */}
        <button 
          type="button"
          onClick={handleGoogleSignIn}
          className="btn bg-white text-black border-[#e5e5e5] hover:bg-slate-50 w-full rounded-xl text-xs font-bold h-11 min-h-0 flex gap-2 justify-center items-center"
        >
          <svg aria-label="Google logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <g>
              <path d="m0 0H512V512H0" fill="#fff"></path>
              <path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path>
              <path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path>
              <path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path>
              <path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path>
            </g>
          </svg>
          <span>Đăng nhập với Google</span>
        </button>

        {/* Registration Link */}
        <div className="text-center text-xs font-semibold text-slate-500">
          Bạn chưa có tài khoản?{' '}
          <Link to="/register" className="text-[#0052CC] hover:underline font-bold">
            Đăng ký ngay
          </Link>
        </div>

        {/* Quick login accounts */}
        <div className="border-t border-slate-200 pt-5 space-y-2">
          <h4 className="text-[9px] uppercase font-bold text-slate-400 text-center tracking-wider mb-2">
            Đăng nhập nhanh bằng tài khoản mẫu
          </h4>
          <p className="text-[10px] text-slate-500 text-center">Mật khẩu mặc định: <span className="font-semibold">123456789</span></p>
          <div className="grid grid-cols-2 gap-2 text-[9px] font-bold">
            <button onClick={() => handleAutofill('anhkvse182347@fpt.edu.vn', '123456789')} type="button" className="btn btn-xs btn-outline rounded-lg py-2 hover:bg-[#0052CC]">Administrator</button>
            <button onClick={() => handleAutofill('kvietanh123@gmail.com', '123456789')} type="button" className="btn btn-xs btn-outline rounded-lg py-2 hover:bg-info">System Staff</button>
            <button onClick={() => handleAutofill('xbg4623@gmail.com', '123456789')} type="button" className="btn btn-xs btn-outline rounded-lg py-2 hover:bg-warning">Interaction Manager</button>
            <button onClick={() => handleAutofill('xbg4622@gmail.com', '123456789')} type="button" className="btn btn-xs btn-outline rounded-lg py-2 hover:bg-secondary">Service Operator</button>
          </div>
        </div>
      </div>
    </div>
  );
};
