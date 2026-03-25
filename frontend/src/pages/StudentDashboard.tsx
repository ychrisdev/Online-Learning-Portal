import React, { useState, useEffect } from 'react';
import { formatPrice, formatDate } from '../utils/format';

interface StudentDashboardProps {
  onNavigate: (page: string, courseId?: string) => void;
  onLogout: () => void;  // ← thêm
}

type Tab = 'overview' | 'courses' | 'payments' | 'profile';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'courses',  label: 'Khóa học của tôi' },
  { id: 'payments', label: 'Lịch sử thanh toán' },
  { id: 'profile',  label: 'Thông tin cá nhân' },
];

const API = 'http://127.0.0.1:8000';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface EnrolledCourse {
  id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  course_thumbnail: string | null;
  instructor_name: string;
  progress: number;
  total_lessons: number;
  completed_lessons: number;
  status: string;
}

interface Payment {
  id: string;
  course_title: string;
  created_at: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  method: string;
  ref_code: string;
}

interface UserForm {
  full_name: string;
  email: string;
  bio: string;
}

interface StudentForm {
  phone_number: string;
  date_of_birth: string;
  gender: string;
  country: string;
  city: string;
  current_level: string;
  learning_goal: string;
  target_exam: string;
  study_hours_per_week: number;
  occupation: string;
  education: string;
  facebook_url: string;
  linkedin_url: string;
  receive_email_notifications: boolean;
  receive_sms_notifications: boolean;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const authHeaders = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
  ...extra,
});

const toList = (data: any): any[] =>
  Array.isArray(data) ? data : (data?.results ?? []);

const DefaultAvatar = () => (
  <svg
    viewBox="0 0 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="db-profile__avatar-svg"
    style={{ width: '80px', height: '80px', display: 'block', borderRadius: '50%' }}
  >
    <circle cx="36" cy="36" r="36" fill="#1B263B" />
    <circle cx="36" cy="28" r="11" fill="#415A77" />
    <path d="M12 60c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#415A77" />
  </svg>
);

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  success:  'Thành công',
  pending:  'Đang xử lý',
  failed:   'Thất bại',
  refunded: 'Đã hoàn tiền',
};
const PAYMENT_STATUS_CLASS: Record<string, string> = {
  success:  'db-badge--success',
  pending:  'db-badge--warn',
  failed:   'db-badge--err',
  refunded: 'db-badge--warn',
};

// ── Component ─────────────────────────────────────────────────────────────────
const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [user, setUser]           = useState<any>(null);

  // Real data
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [payments, setPayments]               = useState<Payment[]>([]);
  const [loadingCourses, setLoadingCourses]   = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Form states
  const [userForm, setUserForm]       = useState<UserForm>({ full_name: '', email: '', bio: '' });
  const [studentForm, setStudentForm] = useState<StudentForm>({
    phone_number: '', date_of_birth: '', gender: '', country: 'Vietnam', city: '',
    current_level: 'beginner', learning_goal: 'communication', target_exam: '',
    study_hours_per_week: 0, occupation: '', education: '',
    facebook_url: '', linkedin_url: '',
    receive_email_notifications: true, receive_sms_notifications: false,
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  // Snapshots để Hủy
  const [userFormSnapshot, setUserFormSnapshot]       = useState<UserForm | null>(null);
  const [studentFormSnapshot, setStudentFormSnapshot] = useState<StudentForm | null>(null);

  // Edit mode
  const [editingUser, setEditingUser]         = useState(false);
  const [editingStudent, setEditingStudent]   = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  // Feedback
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/api/auth/profile/`, { headers: authHeaders() });
      if (!res.ok) { localStorage.clear(); onNavigate('auth'); return; }
      const data = await res.json();
      setUser(data);
      setUserForm({ full_name: data.full_name || '', email: data.email || '', bio: data.bio || '' });
      if (data.avatar) setAvatarUrl(
        data.avatar.startsWith('http') ? data.avatar : `${API}${data.avatar}`
      );
      if (data.role === 'student' && data.student_profile) {
        const sp = data.student_profile;
        setStudentForm({
          phone_number:                sp.phone_number               ?? '',
          date_of_birth:               sp.date_of_birth              ?? '',
          gender:                      sp.gender                     ?? '',
          country:                     sp.country                    ?? 'Vietnam',
          city:                        sp.city                       ?? '',
          current_level:               sp.current_level              ?? 'beginner',
          learning_goal:               sp.learning_goal              ?? 'communication',
          target_exam:                 sp.target_exam                ?? '',
          study_hours_per_week:        sp.study_hours_per_week       ?? 0,
          occupation:                  sp.occupation                 ?? '',
          education:                   sp.education                  ?? '',
          facebook_url:                sp.facebook_url               ?? '',
          linkedin_url:                sp.linkedin_url               ?? '',
          receive_email_notifications: sp.receive_email_notifications ?? true,
          receive_sms_notifications:   sp.receive_sms_notifications  ?? false,
        });
      }
    })();
  }, []);

  // ── Fetch enrolled courses ────────────────────────────────────────────────
  // Thử /api/enrollments/ trước, fallback sang /api/courses/enrolled/
  useEffect(() => {
    (async () => {
      setLoadingCourses(true);
      try {
        let res = await fetch(`${API}/api/enrollments/`, { headers: authHeaders() });
        if (!res.ok) res = await fetch(`${API}/api/courses/enrolled/`, { headers: authHeaders() });
        if (res.ok) {
          const list = toList(await res.json());
          setEnrolledCourses(list.map((item: any) => ({
            id:               item.id,
            course_id:        item.course?.id        ?? item.course_id        ?? item.id,
            course_title:     item.course?.title     ?? item.course_title     ?? item.title     ?? '',
            course_slug:      item.course?.slug      ?? item.course_slug      ?? item.slug      ?? '',
            course_thumbnail: item.course?.thumbnail ?? item.course_thumbnail ?? item.thumbnail ?? null,
            instructor_name:  item.course?.instructor_name ?? item.instructor_name ?? '',
            progress:         item.progress          ?? 0,
            total_lessons:    item.course?.total_lessons ?? item.total_lessons ?? 0,
            completed_lessons: item.completed_lessons ?? 0,
            status:           item.status            ?? 'active',
          })));
        }
      } catch (_) {}
      setLoadingCourses(false);
    })();
  }, []);

  // ── Fetch payments — GET /api/payments/history/ ───────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingPayments(true);
      try {
        const res = await fetch(`${API}/api/payments/history/`, { headers: authHeaders() });
        if (res.ok) {
          const list = toList(await res.json());
          setPayments(list.map((item: any) => ({
            id:           item.id,
            course_title: item.course?.title ?? item.course_title ?? '',
            created_at:   item.created_at    ?? '',
            amount:       Number(item.amount) ?? 0,
            status:       item.status        ?? 'success',
            method:       item.method        ?? '',
            ref_code:     item.ref_code      ?? '',
          })));
        }
      } catch (_) {}
      setLoadingPayments(false);
    })();
  }, []);

  // ── Avatar ────────────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    const res  = await fetch(`${API}/api/auth/profile/`, { method: 'PATCH', headers: authHeaders(), body: fd });
    const data = await res.json();
    if (res.ok && data.avatar) setAvatarUrl(`${API}${data.avatar}`);
  };

  // ── Save user ─────────────────────────────────────────────────────────────
  const saveUserForm = async () => {
    setSaving(true);
    const res = await fetch(`${API}/api/auth/profile/`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ full_name: userForm.full_name, email: userForm.email, bio: userForm.bio }),
    });
    setSaving(false);
    if (!res.ok) { showToast('Lưu thất bại', false); return; }
    const data = await res.json();
    setUser((prev: any) => ({ ...prev, ...data }));
    setEditingUser(false);
    setUserFormSnapshot(null);
    showToast('Đã lưu thông tin cơ bản');
  };

  // ── Save student profile ──────────────────────────────────────────────────
  const saveStudentForm = async () => {
    setSaving(true);
    const res = await fetch(`${API}/api/auth/profile/student/`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...studentForm, date_of_birth: studentForm.date_of_birth || null }),
    });
    setSaving(false);
    if (!res.ok) { showToast('Lưu thất bại', false); return; }
    setEditingStudent(false);
    setStudentFormSnapshot(null);
    showToast('Đã lưu hồ sơ học viên');
  };

  // ── Change password ───────────────────────────────────────────────────────
  const savePassword = async () => {
    const errs: Record<string, string> = {};
    if (!passwordForm.currentPassword) errs.currentPassword = 'Nhập mật khẩu hiện tại';
    if (!passwordForm.newPassword)     errs.newPassword     = 'Nhập mật khẩu mới';
    if (passwordForm.newPassword !== passwordForm.confirmPassword)
      errs.confirmPassword = 'Mật khẩu xác nhận không khớp';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    const res = await fetch(`${API}/api/auth/change-password/`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ old_password: passwordForm.currentPassword, new_password: passwordForm.newPassword }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      showToast(data?.old_password?.[0] || 'Đổi mật khẩu thất bại', false);
      return;
    }
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setEditingPassword(false);
    showToast('Đổi mật khẩu thành công');
  };

  // ── Edit helpers ──────────────────────────────────────────────────────────
  const startEditUser     = () => { setUserFormSnapshot({ ...userForm }); setEditingUser(true); };
  const cancelEditUser    = () => { if (userFormSnapshot) setUserForm(userFormSnapshot); setEditingUser(false); setUserFormSnapshot(null); };
  const startEditStudent  = () => { setStudentFormSnapshot({ ...studentForm }); setEditingStudent(true); };
  const cancelEditStudent = () => { if (studentFormSnapshot) setStudentForm(studentFormSnapshot); setEditingStudent(false); setStudentFormSnapshot(null); };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const activeCourses     = enrolledCourses.filter(c => c.status === 'active' || c.status === 'completed');
  const inProgressCourses = activeCourses.filter(c => c.progress > 0 && c.progress < 100);
  const completedCount    = activeCourses.filter(c => c.progress === 100).length;
  const avgProgress       = activeCourses.length > 0
    ? Math.round(activeCourses.reduce((a, c) => a + c.progress, 0) / activeCourses.length)
    : 0;
  const totalSpent = payments
    .filter(p => p.status === 'success')
    .reduce((a, p) => a + p.amount, 0);

  const thumbnailSrc = (t: string | null) =>
    !t ? null : t.startsWith('http') ? t : `${API}${t}`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="db-page">
      {toast && (
        <div className={`db-toast ${toast.ok ? 'db-toast--ok' : 'db-toast--err'}`}>{toast.msg}</div>
      )}

      <div className="container db-layout">
        {/* ── Sidebar ── */}
        <aside className="db-sidebar">
          <div className="db-profile">
            <div className="db-profile__avatar-wrap">
              {avatarUrl
                ? <img
                    src={avatarUrl}
                    alt={userForm.full_name}
                    className="db-profile__avatar"
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                  />
                : <DefaultAvatar />}
              <label className="db-profile__avatar-edit" title="Đổi ảnh">
                <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />✏️
              </label>
              <span className="db-profile__level">
                {user?.role === 'student' ? 'Học viên' : user?.role}
              </span>
            </div>
            <strong className="db-profile__name">{userForm.full_name}</strong>
            <span className="db-profile__email">{userForm.email}</span>
            <span className="db-profile__joined">
              {user?.date_joined ? `Tham gia ${formatDate(user.date_joined)}` : ''}
            </span>
          </div>

          <nav className="db-nav">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`db-nav__item${activeTab === tab.id ? ' db-nav__item--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <button
            className="db-nav__item db-nav__item--danger"
            onClick={onLogout}
          >
            Đăng xuất
          </button>
        </aside>

        {/* ── Main ── */}
        <main className="db-main">

          {/* ════ OVERVIEW ════ */}
          {activeTab === 'overview' && (
            <div className="db-content">
              <div className="db-page-header">
                <h1 className="db-page-title">Xin chào, {userForm.full_name.split(' ').pop()} 👋</h1>
                <p className="db-page-sub">Tiếp tục hành trình học tiếng Anh của bạn.</p>
              </div>

              {/* Stats */}
              <div className="db-stats-grid">
                <div className="db-stat-card">
                  <span className="db-stat-card__value">{loadingCourses ? '…' : activeCourses.length}</span>
                  <span className="db-stat-card__label">Khóa đã đăng ký</span>
                </div>
                <div className="db-stat-card">
                  <span className="db-stat-card__value">{loadingCourses ? '…' : `${avgProgress}%`}</span>
                  <span className="db-stat-card__label">Tiến độ trung bình</span>
                </div>
                <div className="db-stat-card">
                  <span className="db-stat-card__value">{loadingCourses ? '…' : completedCount}</span>
                  <span className="db-stat-card__label">Khóa hoàn thành</span>
                </div>
                <div className="db-stat-card">
                  <span className="db-stat-card__value">{loadingPayments ? '…' : formatPrice(totalSpent)}</span>
                  <span className="db-stat-card__label">Tổng đã thanh toán</span>
                </div>
              </div>

              {/* Đang học */}
              {!loadingCourses && inProgressCourses.length > 0 && (
                <div className="db-card">
                  <div className="db-card__header">
                    <h3>Đang học</h3>
                    {inProgressCourses.length > 3 && (
                      <button className="btn btn--ghost btn--sm" onClick={() => setActiveTab('courses')}>
                        Xem tất cả {inProgressCourses.length} khóa →
                      </button>
                    )}
                  </div>
                  {inProgressCourses.slice(0, 3).map(c => (
                    <div key={c.id} className="db-course-card"
                      onClick={() => onNavigate('course', c.course_slug || c.course_id)}>
                      {thumbnailSrc(c.course_thumbnail) && (
                        <img src={thumbnailSrc(c.course_thumbnail)!} alt={c.course_title}
                          className="db-course-card__thumb" />
                      )}
                      <div className="db-course-card__body">
                        <strong>{c.course_title}</strong>
                        {c.instructor_name && <span className="db-muted">{c.instructor_name}</span>}
                        <div className="db-progress-bar">
                          <div className="db-progress-bar__fill" style={{ width: `${c.progress}%` }} />
                        </div>
                        <span className="db-muted">
                          {c.progress}%{c.total_lessons > 0 && ` · ${c.completed_lessons}/${c.total_lessons} bài`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}      
            </div>
          )}

          {/* ════ COURSES ════ */}
          {activeTab === 'courses' && (
            <div className="db-content">
              <h2 className="db-section-title">Khóa học của tôi</h2>
              {loadingCourses ? (
                <p className="db-muted">Đang tải…</p>
              ) : activeCourses.length === 0 ? (
                <div className="db-empty">
                  <p>Bạn chưa đăng ký khóa học nào.</p>
                  <button className="btn btn--primary" onClick={() => onNavigate('courses')}>
                    Khám phá khóa học
                  </button>
                </div>
              ) : (
                activeCourses.map(c => (
                  <div key={c.id} className="db-course-card"
                    onClick={() => onNavigate('course', c.course_slug || c.course_id)}>
                    {thumbnailSrc(c.course_thumbnail) && (
                      <img src={thumbnailSrc(c.course_thumbnail)!} alt={c.course_title}
                        className="db-course-card__thumb" />
                    )}
                    <div className="db-course-card__body">
                      <strong>{c.course_title}</strong>
                      {c.instructor_name && <span className="db-muted">{c.instructor_name}</span>}
                      <div className="db-progress-bar">
                        <div className="db-progress-bar__fill" style={{ width: `${c.progress}%` }} />
                      </div>
                      <span className="db-muted">
                        {c.progress}%{c.total_lessons > 0 && ` · ${c.completed_lessons}/${c.total_lessons} bài`}
                      </span>
                    </div>
                    {c.progress === 100 && (
                      <span className="db-badge db-badge--success">Hoàn thành</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ════ PAYMENTS ════ */}
          {activeTab === 'payments' && (
            <div className="db-content">
              <h2 className="db-section-title">Lịch sử thanh toán</h2>
              {loadingPayments ? (
                <p className="db-muted">Đang tải…</p>
              ) : payments.length === 0 ? (
                <p className="db-muted">Chưa có giao dịch nào.</p>
              ) : (
                payments.map(p => (
                  <div key={p.id} className="db-payment-row">
                    <span>{p.course_title}</span>
                    <span>{formatDate(p.created_at)}</span>
                    <span>{formatPrice(p.amount)}</span>
                    <span className={`db-badge ${PAYMENT_STATUS_CLASS[p.status] ?? ''}`}>
                      {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ════ PROFILE ════ */}
          {activeTab === 'profile' && (
            <div className="db-content">
              <h2 className="db-section-title">Thông tin cá nhân</h2>

              {/* Thông tin cơ bản */}
              <div className="db-card">
                <div className="db-card__header">
                  <h3>Thông tin cơ bản</h3>
                  {!editingUser
                    ? <button className="btn btn--outline btn--sm" onClick={startEditUser}>Chỉnh sửa</button>
                    : <div className="db-btn-group">
                        <button className="btn btn--primary btn--sm" onClick={saveUserForm} disabled={saving}>
                          {saving ? 'Đang lưu…' : 'Lưu'}
                        </button>
                        <button className="btn btn--ghost btn--sm" onClick={cancelEditUser}>Hủy</button>
                      </div>
                  }
                </div>
                <div className="db-form-grid">
                  <Field label="Họ và tên" error={errors.full_name}>
                    {editingUser
                      ? <input className="db-input" value={userForm.full_name}
                          onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} />
                      : <span>{userForm.full_name || '—'}</span>}
                  </Field>
                  <Field label="Email" error={errors.email}>
                    {editingUser
                      ? <input className="db-input" type="email" value={userForm.email}
                          onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
                      : <span>{userForm.email || '—'}</span>}
                  </Field>
                  <Field label="Giới thiệu bản thân" fullWidth>
                    {editingUser
                      ? <textarea className="db-input db-input--textarea" value={userForm.bio}
                          onChange={e => setUserForm(f => ({ ...f, bio: e.target.value }))} />
                      : <span>{userForm.bio || '—'}</span>}
                  </Field>
                </div>
              </div>

              {/* Hồ sơ học viên */}
              <div className="db-card">
                <div className="db-card__header">
                  <h3>Hồ sơ học viên</h3>
                  {!editingStudent
                    ? <button className="btn btn--outline btn--sm" onClick={startEditStudent}>Chỉnh sửa</button>
                    : <div className="db-btn-group">
                        <button className="btn btn--primary btn--sm" onClick={saveStudentForm} disabled={saving}>
                          {saving ? 'Đang lưu…' : 'Lưu'}
                        </button>
                        <button className="btn btn--ghost btn--sm" onClick={cancelEditStudent}>Hủy</button>
                      </div>
                  }
                </div>
                <div className="db-form-grid">
                  <Field label="Số điện thoại">
                    {editingStudent
                      ? <input className="db-input" value={studentForm.phone_number}
                          onChange={e => setStudentForm(f => ({ ...f, phone_number: e.target.value }))} />
                      : <span>{studentForm.phone_number || '—'}</span>}
                  </Field>
                  <Field label="Ngày sinh">
                    {editingStudent
                      ? <input className="db-input" type="date" value={studentForm.date_of_birth}
                          onChange={e => setStudentForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                      : <span>{studentForm.date_of_birth || '—'}</span>}
                  </Field>
                  <Field label="Giới tính">
                    {editingStudent
                      ? <select className="db-input" value={studentForm.gender}
                          onChange={e => setStudentForm(f => ({ ...f, gender: e.target.value }))}>
                          <option value="">— Chọn —</option>
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                          <option value="other">Khác</option>
                        </select>
                      : <span>{{ male: 'Nam', female: 'Nữ', other: 'Khác' }[studentForm.gender] || '—'}</span>}
                  </Field>
                  <Field label="Quốc gia">
                    {editingStudent
                      ? <input className="db-input" value={studentForm.country}
                          onChange={e => setStudentForm(f => ({ ...f, country: e.target.value }))} />
                      : <span>{studentForm.country || '—'}</span>}
                  </Field>
                  <Field label="Thành phố / Tỉnh">
                    {editingStudent
                      ? <input className="db-input" value={studentForm.city}
                          onChange={e => setStudentForm(f => ({ ...f, city: e.target.value }))} />
                      : <span>{studentForm.city || '—'}</span>}
                  </Field>
                  <Field label="Nghề nghiệp">
                    {editingStudent
                      ? <input className="db-input" value={studentForm.occupation}
                          onChange={e => setStudentForm(f => ({ ...f, occupation: e.target.value }))} />
                      : <span>{studentForm.occupation || '—'}</span>}
                  </Field>
                  <Field label="Trình độ học vấn">
                    {editingStudent
                      ? <select className="db-input" value={studentForm.education}
                          onChange={e => setStudentForm(f => ({ ...f, education: e.target.value }))}>
                          <option value="">— Chọn —</option>
                          <option value="high_school">THPT</option>
                          <option value="college">Cao đẳng</option>
                          <option value="bachelor">Đại học</option>
                          <option value="master">Thạc sĩ</option>
                          <option value="doctor">Tiến sĩ</option>
                          <option value="other">Khác</option>
                        </select>
                      : <span>{{ high_school:'THPT', college:'Cao đẳng', bachelor:'Đại học', master:'Thạc sĩ', doctor:'Tiến sĩ', other:'Khác' }[studentForm.education] || '—'}</span>}
                  </Field>
                  <Field label="Trình độ tiếng Anh">
                    {editingStudent
                      ? <select className="db-input" value={studentForm.current_level}
                          onChange={e => setStudentForm(f => ({ ...f, current_level: e.target.value }))}>
                          <option value="beginner">Mới bắt đầu (A1)</option>
                          <option value="elementary">Sơ cấp (A2)</option>
                          <option value="intermediate">Trung cấp (B1)</option>
                          <option value="upper_intermediate">Trên trung cấp (B2)</option>
                          <option value="advanced">Nâng cao (C1)</option>
                          <option value="proficient">Thành thạo (C2)</option>
                        </select>
                      : <span>{{ beginner:'Mới bắt đầu (A1)', elementary:'Sơ cấp (A2)', intermediate:'Trung cấp (B1)', upper_intermediate:'Trên trung cấp (B2)', advanced:'Nâng cao (C1)', proficient:'Thành thạo (C2)' }[studentForm.current_level] || '—'}</span>}
                  </Field>
                  <Field label="Mục tiêu học tập">
                    {editingStudent
                      ? <select className="db-input" value={studentForm.learning_goal}
                          onChange={e => setStudentForm(f => ({ ...f, learning_goal: e.target.value }))}>
                          <option value="communication">Giao tiếp hàng ngày</option>
                          <option value="business">Tiếng Anh thương mại</option>
                          <option value="exam">Luyện thi (IELTS/TOEIC/…)</option>
                          <option value="academic">Tiếng Anh học thuật</option>
                          <option value="travel">Du lịch</option>
                          <option value="other">Mục tiêu khác</option>
                        </select>
                      : <span>{{ communication:'Giao tiếp hàng ngày', business:'Tiếng Anh thương mại', exam:'Luyện thi', academic:'Học thuật', travel:'Du lịch', other:'Khác' }[studentForm.learning_goal] || '—'}</span>}
                  </Field>
                  <Field label="Kỳ thi mục tiêu">
                    {editingStudent
                      ? <input className="db-input" placeholder="VD: IELTS 7.0, TOEIC 900"
                          value={studentForm.target_exam}
                          onChange={e => setStudentForm(f => ({ ...f, target_exam: e.target.value }))} />
                      : <span>{studentForm.target_exam || '—'}</span>}
                  </Field>
                  <Field label="Giờ học / tuần">
                    {editingStudent
                      ? <input className="db-input" type="number" min={0} max={168}
                          value={studentForm.study_hours_per_week}
                          onChange={e => setStudentForm(f => ({ ...f, study_hours_per_week: +e.target.value }))} />
                      : <span>{studentForm.study_hours_per_week} giờ</span>}
                  </Field>
                  <Field label="Facebook">
                    {editingStudent
                      ? <input className="db-input" placeholder="https://facebook.com/..."
                          value={studentForm.facebook_url}
                          onChange={e => setStudentForm(f => ({ ...f, facebook_url: e.target.value }))} />
                      : <span>{studentForm.facebook_url
                          ? <a href={studentForm.facebook_url} target="_blank" rel="noreferrer">{studentForm.facebook_url}</a>
                          : '—'}</span>}
                  </Field>
                  <Field label="LinkedIn">
                    {editingStudent
                      ? <input className="db-input" placeholder="https://linkedin.com/in/..."
                          value={studentForm.linkedin_url}
                          onChange={e => setStudentForm(f => ({ ...f, linkedin_url: e.target.value }))} />
                      : <span>{studentForm.linkedin_url
                          ? <a href={studentForm.linkedin_url} target="_blank" rel="noreferrer">{studentForm.linkedin_url}</a>
                          : '—'}</span>}
                  </Field>
                  <Field label="Thông báo" fullWidth>
                    {editingStudent ? (
                      <div className="db-checkbox-group">
                        <label>
                          <input type="checkbox" checked={studentForm.receive_email_notifications}
                            onChange={e => setStudentForm(f => ({ ...f, receive_email_notifications: e.target.checked }))} />
                          {' '}Nhận thông báo Email
                        </label>
                        <label>
                          <input type="checkbox" checked={studentForm.receive_sms_notifications}
                            onChange={e => setStudentForm(f => ({ ...f, receive_sms_notifications: e.target.checked }))} />
                          {' '}Nhận thông báo SMS
                        </label>
                      </div>
                    ) : (
                      <span>
                        {[
                          studentForm.receive_email_notifications && 'Email',
                          studentForm.receive_sms_notifications   && 'SMS',
                        ].filter(Boolean).join(', ') || 'Tắt tất cả'}
                      </span>
                    )}
                  </Field>
                </div>
              </div>

              {/* Đổi mật khẩu */}
              <div className="db-card">
                <div className="db-card__header">
                  <h3>Đổi mật khẩu</h3>
                  {!editingPassword
                    ? <button className="btn btn--outline btn--sm" onClick={() => setEditingPassword(true)}>Thay đổi</button>
                    : <div className="db-btn-group">
                        <button className="btn btn--primary btn--sm" onClick={savePassword} disabled={saving}>
                          {saving ? 'Đang lưu…' : 'Lưu'}
                        </button>
                        <button className="btn btn--ghost btn--sm" onClick={() => {
                          setEditingPassword(false);
                          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          setErrors({});
                        }}>Hủy</button>
                      </div>
                  }
                </div>
                {editingPassword && (
                  <div className="db-form-grid">
                    <Field label="Mật khẩu hiện tại" error={errors.currentPassword}>
                      <input className="db-input" type="password" value={passwordForm.currentPassword}
                        onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} />
                    </Field>
                    <Field label="Mật khẩu mới" error={errors.newPassword}>
                      <input className="db-input" type="password" value={passwordForm.newPassword}
                        onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} />
                    </Field>
                    <Field label="Xác nhận mật khẩu mới" error={errors.confirmPassword}>
                      <input className="db-input" type="password" value={passwordForm.confirmPassword}
                        onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                    </Field>
                  </div>
                )}
                {!editingPassword && (
                  <p className="db-muted">Nhấn "Thay đổi" để cập nhật mật khẩu của bạn.</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// ── Field wrapper ─────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  error?: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}
const Field: React.FC<FieldProps> = ({ label, error, fullWidth, children }) => (
  <div className={`db-field${fullWidth ? ' db-field--full' : ''}`}>
    <label className="db-field__label">{label}</label>
    <div className="db-field__control">{children}</div>
    {error && <span className="db-field__error">{error}</span>}
  </div>
);

export default StudentDashboard;