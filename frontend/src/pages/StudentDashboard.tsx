import React, { useState } from 'react';
import { MOCK_ENROLLED_COURSES } from '../data/mockData';
import { formatPrice, formatDate } from '../utils/format';

interface StudentDashboardProps {
  onNavigate: (page: string, courseId?: string) => void;
}

type Tab = 'overview' | 'courses' | 'payments' | 'profile';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Tổng quan' },
  { id: 'courses',   label: 'Khóa học của tôi' },
  { id: 'payments',  label: 'Lịch sử thanh toán' },
  { id: 'profile',   label: 'Thông tin cá nhân' },
];

const MOCK_USER = {
  name: 'Nguyễn Văn An',
  email: 'vanan@example.com',
  joinedDate: '2024-03-15',
  level: 'B1',
  hoursLearned: 47,
  streak: 12,
};

const MOCK_PAYMENTS = [
  { id: 'p1', course: 'Tiếng Anh A2 — Giao tiếp hàng ngày', date: '2024-11-15', amount: 49000, status: 'success' },
  { id: 'p2', course: 'Tiếng Anh B1 — Tự tin diễn đạt',    date: '2024-10-03', amount: 79000, status: 'success' },
  { id: 'p3', course: 'Tiếng Anh B2 — Thảo luận chuyên sâu', date: '2024-09-20', amount: 99000, status: 'refunded' },
];

const DefaultAvatar = () => (
  <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="db-profile__avatar-svg">
    <circle cx="36" cy="36" r="36" fill="#1B263B"/>
    <circle cx="36" cy="28" r="11" fill="#415A77"/>
    <path d="M12 60c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#415A77"/>
  </svg>
);

const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: MOCK_USER.name,
    email: MOCK_USER.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileSaved, setProfileSaved] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleProfileSave = () => {
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const totalProgress = MOCK_ENROLLED_COURSES.length > 0
    ? Math.round(MOCK_ENROLLED_COURSES.reduce((a, c) => a + c.progress, 0) / MOCK_ENROLLED_COURSES.length)
    : 0;

  return (
    <div className="db-page">
      <div className="container db-layout">

        <aside className="db-sidebar">
          <div className="db-profile">
            <div className="db-profile__avatar-wrap">
              {avatarUrl
                ? <img src={avatarUrl} alt={MOCK_USER.name} className="db-profile__avatar" />
                : <DefaultAvatar />
              }
              <span className="db-profile__level">{MOCK_USER.level}</span>
            </div>
            <strong className="db-profile__name">{profileForm.name}</strong>
            <span className="db-profile__email">{profileForm.email}</span>
            <span className="db-profile__joined">Tham gia {formatDate(MOCK_USER.joinedDate)}</span>
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

          <button className="db-nav__item db-nav__item--danger" onClick={() => onNavigate('home')}>
            Đăng xuất
          </button>
        </aside>

        <main className="db-main">

          {activeTab === 'overview' && (
            <div className="db-content">
              <div className="db-page-header">
                <h1 className="db-page-title">Xin chào, {MOCK_USER.name.split(' ').pop()}</h1>
                <p className="db-page-sub">Tiếp tục hành trình học tiếng Anh của bạn.</p>
              </div>

              <div className="db-stats-grid">
                <div className="db-stat-card">
                  <span className="db-stat-card__value">{MOCK_ENROLLED_COURSES.length}</span>
                  <span className="db-stat-card__label">Khóa đã đăng ký</span>
                </div>
                <div className="db-stat-card">
                  <span className="db-stat-card__value">{MOCK_USER.hoursLearned}h</span>
                  <span className="db-stat-card__label">Giờ đã học</span>
                </div>
                <div className="db-stat-card">
                  <span className="db-stat-card__value">{MOCK_USER.streak}</span>
                  <span className="db-stat-card__label">Ngày học liên tiếp</span>
                </div>
                <div className="db-stat-card">
                  <span className="db-stat-card__value">{totalProgress}%</span>
                  <span className="db-stat-card__label">Tiến độ trung bình</span>
                </div>
              </div>

              <h2 className="db-section-title">Tiếp tục học</h2>
              <div className="db-course-list">
                {MOCK_ENROLLED_COURSES.filter(e => e.progress < 100).map(enrolled => (
                  <div key={enrolled.course.id} className="db-course-row">
                    <img src={enrolled.course.thumbnail} alt={enrolled.course.title} className="db-course-row__thumb" />
                    <div className="db-course-row__info">
                      <span className="db-course-row__title">{enrolled.course.title}</span>
                      <span className="db-course-row__meta">
                        {enrolled.course.instructor.name} · Cập nhật {enrolled.lastAccessedAt}
                      </span>
                      <div className="db-progress">
                        <div className="db-progress__bar">
                          <div className="db-progress__fill" style={{ width: `${enrolled.progress}%` }} />
                        </div>
                        <span className="db-progress__text">
                          {enrolled.completedLessons.length}/{enrolled.course.lessonCount} bài
                        </span>
                      </div>
                    </div>
                    <button
                      className="db-btn-continue"
                      onClick={() => onNavigate('course-detail', enrolled.course.id)}
                    >
                      Tiếp tục
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="db-content">
              <div className="db-page-header">
                <h1 className="db-page-title">Khóa học của tôi</h1>
                <p className="db-page-sub">{MOCK_ENROLLED_COURSES.length} khóa học đã đăng ký</p>
              </div>

              <div className="db-course-list">
                {MOCK_ENROLLED_COURSES.map(enrolled => (
                  <div key={enrolled.course.id} className="db-course-row">
                    <img src={enrolled.course.thumbnail} alt={enrolled.course.title} className="db-course-row__thumb" />
                    <div className="db-course-row__info">
                      <span className="db-course-row__title">{enrolled.course.title}</span>
                      <span className="db-course-row__meta">
                        {enrolled.course.instructor.name} · {enrolled.course.lessonCount} bài · {enrolled.course.duration}
                      </span>
                      <div className="db-progress">
                        <div className="db-progress__bar">
                          <div className="db-progress__fill" style={{ width: `${enrolled.progress}%` }} />
                        </div>
                        <span className="db-progress__text">
                          {enrolled.progress === 100
                            ? 'Hoàn thành'
                            : `${enrolled.completedLessons.length} / ${enrolled.course.lessonCount} bài`}
                        </span>
                      </div>
                      <div className="db-progress__detail">
                        {enrolled.progress}% · {enrolled.course.lessonCount - enrolled.completedLessons.length} bài còn lại
                      </div>
                    </div>
                    <button
                      className={`db-btn-continue${enrolled.progress === 100 ? ' db-btn-continue--done' : ''}`}
                      onClick={() => onNavigate('course-detail', enrolled.course.id)}
                    >
                      {enrolled.progress === 100 ? 'Xem lại' : 'Tiếp tục'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="db-explore">
                <p>Khám phá thêm khóa học phù hợp với trình độ của bạn.</p>
                <button className="db-btn-explore" onClick={() => onNavigate('courses')}>
                  Xem tất cả khóa học
                </button>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="db-content">
              <div className="db-page-header">
                <h1 className="db-page-title">Lịch sử thanh toán</h1>
                <p className="db-page-sub">{MOCK_PAYMENTS.length} giao dịch</p>
              </div>

              <div className="db-table-wrap">
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Khóa học</th>
                      <th>Ngày</th>
                      <th>Số tiền</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_PAYMENTS.map(p => (
                      <tr key={p.id}>
                        <td className="db-table__course">{p.course}</td>
                        <td className="db-table__date">{formatDate(p.date)}</td>
                        <td className="db-table__amount">{formatPrice(p.amount, 'VND')}</td>
                        <td>
                          <span className={`db-status db-status--${p.status}`}>
                            {p.status === 'success' ? 'Thành công' : 'Hoàn tiền'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="db-content">
              <div className="db-page-header">
                <h1 className="db-page-title">Thông tin cá nhân</h1>
                <p className="db-page-sub">Cập nhật thông tin và mật khẩu của bạn.</p>
              </div>

              <div className="db-form-section">
                <h3 className="db-form-section__title">Ảnh đại diện</h3>
                <div className="db-avatar-upload">
                  <div className="db-avatar-upload__preview">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="Avatar" />
                      : <DefaultAvatar />
                    }
                  </div>
                  <div className="db-avatar-upload__info">
                    <span className="db-avatar-upload__name">
                      {avatarUrl ? 'Ảnh đã tải lên' : 'Chưa có ảnh đại diện'}
                    </span>
                    <span className="db-avatar-upload__hint">JPG, PNG · Tối đa 2MB</span>
                    <label className="db-avatar-upload__btn">
                      {avatarUrl ? 'Đổi ảnh' : 'Chọn ảnh'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        style={{ display: 'none' }}
                        onChange={handleAvatarChange}
                      />
                    </label>
                    {avatarUrl && (
                      <button
                        className="db-avatar-upload__remove"
                        onClick={() => setAvatarUrl(null)}
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="db-form-section">
                <h3 className="db-form-section__title">Thông tin cơ bản</h3>
                <div className="db-form-grid">
                  <div className="db-field">
                    <label className="db-field__label">Họ và tên</label>
                    <input
                      className="db-field__input"
                      type="text"
                      value={profileForm.name}
                      onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="db-field">
                    <label className="db-field__label">Email</label>
                    <input
                      className="db-field__input"
                      type="email"
                      value={profileForm.email}
                      onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="db-form-section">
                <h3 className="db-form-section__title">Đổi mật khẩu</h3>
                <div className="db-form-grid">
                  <div className="db-field">
                    <label className="db-field__label">Mật khẩu hiện tại</label>
                    <input
                      className="db-field__input"
                      type="password"
                      placeholder="••••••••"
                      value={profileForm.currentPassword}
                      onChange={e => setProfileForm(f => ({ ...f, currentPassword: e.target.value }))}
                    />
                  </div>
                  <div className="db-field">
                    <label className="db-field__label">Mật khẩu mới</label>
                    <input
                      className="db-field__input"
                      type="password"
                      placeholder="••••••••"
                      value={profileForm.newPassword}
                      onChange={e => setProfileForm(f => ({ ...f, newPassword: e.target.value }))}
                    />
                  </div>
                  <div className="db-field">
                    <label className="db-field__label">Xác nhận mật khẩu mới</label>
                    <input
                      className="db-field__input"
                      type="password"
                      placeholder="••••••••"
                      value={profileForm.confirmPassword}
                      onChange={e => setProfileForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="db-form-actions">
                {profileSaved && <span className="db-form-saved">Đã lưu thay đổi</span>}
                <button className="db-btn-save" onClick={handleProfileSave}>
                  Lưu thay đổi
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;