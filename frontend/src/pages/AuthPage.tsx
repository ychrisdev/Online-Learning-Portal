// src/pages/AuthPage.tsx
import React, { useState } from 'react';
import './AuthPage.css';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onSuccess: () => void;
  onNavigate: (page: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login', onSuccess, onNavigate }) => {
  const [mode, setMode]       = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email) e.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ';
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
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    onSuccess();
  };

  return (
    <div className="auth-root">
      <div className="auth-card">

        {/* Logo */}
        <button className="auth-brand" onClick={() => onNavigate('home')}>
          <div className="auth-brand__icon">E</div>
          <span className="auth-brand__name">EnglishHub</span>
        </button>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab${mode === 'login' ? ' auth-tab--active' : ''}`}
            onClick={() => setMode('login')}
          >Đăng nhập</button>
          <button
            className={`auth-tab${mode === 'register' ? ' auth-tab--active' : ''}`}
            onClick={() => setMode('register')}
          >Đăng ký</button>
        </div>

        {/* Heading */}
        <div>
          <h1 className="auth-title">
            {mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
          </h1>
          <p className="auth-sub">
            {mode === 'login' ? 'Tiếp tục lộ trình học của bạn' : 'Bắt đầu học từ đúng cấp độ của bạn'}
          </p>
        </div>

        {/* Fields */}
        <div className="auth-fields">
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
            <button className="auth-forgot__btn">Quên mật khẩu?</button>
          </div>
        )}

        <button
          className="auth-submit"
          onClick={handleSubmit}
          disabled={loading}
        >
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
    </div>
  );
};

export default AuthPage;