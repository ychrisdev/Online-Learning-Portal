import React, { useState } from 'react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onSuccess: () => void;
  onNavigate: (page: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login', onSuccess, onNavigate }) => {
  const [mode, setMode]       = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState({ username: '', name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors]   = useState<Record<string, string>>({});

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
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        mode === 'login'
          ? 'http://127.0.0.1:8000/api/auth/token/'
          : 'http://127.0.0.1:8000/api/auth/register/';

      const body =
        mode === 'login'
          ? {
              username: form.username,
              password: form.password,
            }
          : {
              username: form.username,
              full_name: form.name,
              email: form.email,
              password: form.password,
              password2: form.password,
            }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(JSON.stringify(data));
        return;
      }

      if (mode === 'login') {
        localStorage.setItem('access', data.access);
        localStorage.setItem('refresh', data.refresh);

        const profileRes = await fetch('http://127.0.0.1:8000/api/auth/profile/', {
          headers: {
            Authorization: `Bearer ${data.access}`,
          },
        });

        const profile = await profileRes.json();

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
          <button
            className={`auth-tab${mode === 'login' ? ' auth-tab--active' : ''}`}
            onClick={() => setMode('login')}
          >Đăng nhập</button>
          <button
            className={`auth-tab${mode === 'register' ? ' auth-tab--active' : ''}`}
            onClick={() => setMode('register')}
          >Đăng ký</button>
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