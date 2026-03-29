import React, { useState, useRef, useEffect } from 'react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onSuccess: () => void;
  onNavigate: (page: string) => void;
}

const API = 'http://127.0.0.1:8000';

type ForgotStep = 'email' | 'otp' | 'done';

const ForgotModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep]       = useState<ForgotStep>('email');
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState(['', '', '', '', '', '']);
  const [password, setPassword]  = useState('');
  const [confirm, setConfirm]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendOtp = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Vui lòng nhập email hợp lệ');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/password-reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.detail ?? data?.email?.[0] ?? 'Không tìm thấy tài khoản với email này');
        return;
      }
      setStep('otp');
      setCountdown(60);
    } catch {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Vui lòng nhập đủ 6 chữ số OTP'); return; }
    if (!password || password.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/password-reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code, new_password: password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.detail ?? data?.otp?.[0] ?? 'OTP không hợp lệ hoặc đã hết hạn');
        return;
      }
      setStep('done');
    } catch {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (digits.length === 6) {
      setOtp(digits.split(''));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className="fp-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fp-modal">

        <div className="fp-header">
          <div className="fp-header__left">
            <div>
              <h2 className="fp-title">
                {step === 'email' && 'Quên mật khẩu'}
                {step === 'otp'   && 'Xác nhận OTP'}
                {step === 'done'  && 'Đặt lại thành công'}
              </h2>
              <p className="fp-sub">
                {step === 'email' && 'Nhập email để nhận mã xác nhận'}
                {step === 'otp'   && `Mã OTP đã gửi tới ${email}`}
                {step === 'done'  && 'Mật khẩu của bạn đã được cập nhật'}
              </p>
            </div>
          </div>
          <button className="fp-close" onClick={onClose}>✕</button>
        </div>



        <div className="fp-body">

          {step === 'email' && (
            <>
              <div className="fp-field">
                <label className="fp-label">Địa chỉ email</label>
                <input
                  className={`fp-input${error ? ' fp-input--error' : ''}`}
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()}
                  autoFocus
                />
                {error && <span className="fp-error">{error}</span>}
              </div>
              <button className="fp-btn" onClick={sendOtp} disabled={loading}>
                {loading ? <span className="fp-spinner" /> : 'Gửi mã OTP'}
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="fp-field">
                <label className="fp-label">Mã OTP (6 chữ số)</label>
                <div className="fp-otp-row" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      className={`fp-otp-box${error && !digit ? ' fp-otp-box--error' : ''}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                    />
                  ))}
                </div>
                <div className="fp-resend">
                  {countdown > 0 ? (
                    <span className="fp-resend__count">Gửi lại sau {countdown}s</span>
                  ) : (
                    <button className="fp-resend__btn" onClick={sendOtp} disabled={loading}>
                      Gửi lại OTP
                    </button>
                  )}
                </div>
              </div>

              <div className="fp-field">
                <label className="fp-label">Mật khẩu mới</label>
                <input
                  className="fp-input"
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                />
              </div>
              <div className="fp-field">
                <label className="fp-label">Xác nhận mật khẩu</label>
                <input
                  className="fp-input"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && confirmReset()}
                />
              </div>

              {error && <span className="fp-error">{error}</span>}

              <div className="fp-btn-row">
                <button className="fp-btn fp-btn--ghost" onClick={() => { setStep('email'); setError(''); setOtp(['','','','','','']); }}>
                  ← Quay lại
                </button>
                <button className="fp-btn" onClick={confirmReset} disabled={loading}>
                  {loading ? <span className="fp-spinner" /> : 'Xác nhận'}
                </button>
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="fp-done">
              <div className="fp-done__check">✓</div>
              <p className="fp-done__text">
                Mật khẩu mới đã được lưu. Bạn có thể đăng nhập ngay bây giờ.
              </p>
              <button className="fp-btn" onClick={onClose}>
                Đăng nhập ngay
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login', onSuccess, onNavigate }) => {
  const [mode, setMode]           = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading]     = useState(false);
  const [form, setForm]           = useState({ username: '', name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [showForgot, setShowForgot] = useState(false);

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === 'login') {
      if (!form.username) e.username = 'Vui lòng nhập username';
    } else {
      if (!form.email) e.email = 'Vui lòng nhập email';
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ';
      if (!form.username) e.username = 'Vui lòng nhập username';
    }
    if (!form.password) e.password = 'Vui lòng nhập mật khẩu';
    else if (form.password.length < 6) e.password = 'Tối thiểu 6 ký tự';
    if (mode === 'register') {
      if (!form.name) e.name = 'Vui lòng nhập họ tên';
      if (form.confirm !== form.password) e.confirm = 'Mật khẩu không khớp';
    }
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const endpoint = mode === 'login'
        ? `${API}/api/auth/token/`
        : `${API}/api/auth/register/`;
      const body = mode === 'login'
        ? { username: form.username, password: form.password }
        : { username: form.username, full_name: form.name, email: form.email, password: form.password, password2: form.password };

      const res  = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { alert(JSON.stringify(data)); return; }

      if (mode === 'login') {
        localStorage.setItem('access', data.access);
        localStorage.setItem('refresh', data.refresh);
        const profileRes = await fetch(`${API}/api/auth/profile/`, { headers: { Authorization: `Bearer ${data.access}` } });
        const profile    = await profileRes.json();
        localStorage.setItem('role', profile.role);
      }
      onSuccess();
    } catch {
      alert('Lỗi server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-card">

        <button className="auth-brand" onClick={() => onNavigate('home')}>
          <div className="auth-brand__icon">E</div>
          <span className="auth-brand__name">EnglishHub</span>
        </button>

        <div className="auth-tabs">
          <button className={`auth-tab${mode === 'login' ? ' auth-tab--active' : ''}`} onClick={() => setMode('login')}>
            Đăng nhập
          </button>
          <button className={`auth-tab${mode === 'register' ? ' auth-tab--active' : ''}`} onClick={() => setMode('register')}>
            Đăng ký
          </button>
        </div>

        <div>
          <h1 className="auth-title">
            {mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
          </h1>
          <p className="auth-sub">
            {mode === 'login' ? 'Tiếp tục lộ trình học của bạn' : 'Bắt đầu học từ đúng cấp độ của bạn'}
          </p>
        </div>

        <div className="auth-fields">
          <div className="auth-field">
            <label className="auth-label">Username</label>
            <input
              className={`auth-input${errors.username ? ' auth-input--error' : ''}`}
              placeholder="username"
              value={form.username}
              onChange={e => update('username', e.target.value)}
            />
            {errors.username && <span className="auth-error">{errors.username}</span>}
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label className="auth-label">Họ và tên</label>
              <input
                className={`auth-input${errors.name ? ' auth-input--error' : ''}`}
                placeholder="Nguyễn Văn A"
                value={form.name}
                onChange={e => update('name', e.target.value)}
              />
              {errors.name && <span className="auth-error">{errors.name}</span>}
            </div>
          )}

          {mode === 'register' && (
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                className={`auth-input${errors.email ? ' auth-input--error' : ''}`}
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
              />
              {errors.email && <span className="auth-error">{errors.email}</span>}
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Mật khẩu</label>
            <input
              className={`auth-input${errors.password ? ' auth-input--error' : ''}`}
              type="password"
              placeholder={mode === 'login' ? 'Nhập mật khẩu' : 'Tối thiểu 6 ký tự'}
              value={form.password}
              onChange={e => update('password', e.target.value)}
            />
            {errors.password && <span className="auth-error">{errors.password}</span>}
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label className="auth-label">Xác nhận mật khẩu</label>
              <input
                className={`auth-input${errors.confirm ? ' auth-input--error' : ''}`}
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={form.confirm}
                onChange={e => update('confirm', e.target.value)}
              />
              {errors.confirm && <span className="auth-error">{errors.confirm}</span>}
            </div>
          )}
        </div>

        {mode === 'login' && (
          <div className="auth-forgot">
            <button className="auth-forgot__btn" onClick={() => setShowForgot(true)}>
              Quên mật khẩu?
            </button>
          </div>
        )}

        <button className="auth-submit" onClick={handleSubmit} disabled={loading}>
          {loading
            ? <span className="auth-spinner" />
            : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản miễn phí'}
        </button>

        <p className="auth-switch">
          {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
          {' '}
          <button
            className="auth-switch__link"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </p>

      </div>

      {showForgot && <ForgotModal onClose={() => setShowForgot(false)} />}
    </div>
  );
};

export default AuthPage;