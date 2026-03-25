import React, { useState } from 'react';
import { MOCK_COURSES } from '../data/mockData';
import { formatPrice } from '../utils/format';

interface AdminDashboardProps {
  onNavigate: (page: string, courseId?: string) => void;
}

type Tab = 'overview' | 'users' | 'courses' | 'stats';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'users',    label: 'Người dùng' },
  { id: 'courses',  label: 'Khóa học' },
  { id: 'stats',    label: 'Thống kê' },
];

const MOCK_STATS = {
  totalUsers: 48200,
  totalCourses: 24,
  totalRevenue: 284000000,
  activeToday: 3200,
};

const MOCK_USERS = [
  { id: 'u1', name: 'Hoàng Minh',   email: 'hminh@gmail.com',    role: 'student',    courses: 4,  status: 'active',   joined: '2024-01-12' },
  { id: 'u2', name: 'Ms. Emily Tran', email: 'emily@englishhub.vn', role: 'instructor', courses: 6,  status: 'active',   joined: '2023-06-03' },
  { id: 'u3', name: 'Thu Hương',    email: 'thuhuong@gmail.com',  role: 'student',    courses: 2,  status: 'active',   joined: '2024-09-20' },
  { id: 'u4', name: 'Quang Huy',    email: 'qhuy@gmail.com',     role: 'student',    courses: 7,  status: 'banned',   joined: '2024-02-08' },
  { id: 'u5', name: 'Mr. David Nguyen', email: 'david@englishhub.vn', role: 'instructor', courses: 4, status: 'active', joined: '2023-08-15' },
  { id: 'u6', name: 'Minh Châu',    email: 'mchau@gmail.com',    role: 'student',    courses: 3,  status: 'active',   joined: '2024-11-01' },
];

const MOCK_ADMIN_COURSES = MOCK_COURSES.map((c, i) => ({
  ...c,
  status: i === 3 ? 'pending' : 'approved',
  enrolledCount: [1840, 2150, 890, 320, 410, 2650][i] ?? 100,
}));

const ROLE_LABEL: Record<string, string> = { student: 'Học viên', instructor: 'Giảng viên', admin: 'Admin' };
const STATUS_LABEL: Record<string, string> = { active: 'Hoạt động', banned: 'Bị khóa', pending: 'Chờ duyệt', approved: 'Đã duyệt' };

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [userStatuses, setUserStatuses] = useState<Record<string, string>>(
    Object.fromEntries(MOCK_USERS.map(u => [u.id, u.status]))
  );
  const [courseStatuses, setCourseStatuses] = useState<Record<string, string>>(
    Object.fromEntries(MOCK_ADMIN_COURSES.map(c => [c.id, c.status]))
  );
  const [searchUser, setSearchUser] = useState('');

  const toggleUserStatus = (id: string) => {
    setUserStatuses(prev => ({
      ...prev,
      [id]: prev[id] === 'banned' ? 'active' : 'banned',
    }));
  };

  const approveCourse = (id: string) => {
    setCourseStatuses(prev => ({ ...prev, [id]: 'approved' }));
  };

  const filteredUsers = MOCK_USERS.filter(u =>
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="ad-page">
      <div className="container ad-layout">

        <aside className="ad-sidebar">
          <div className="ad-brand">
            <span className="ad-brand__logo">E</span>
            <div>
              <strong className="ad-brand__name">EnglishHub</strong>
              <span className="ad-brand__role">Admin</span>
            </div>
          </div>

          <nav className="ad-nav">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`ad-nav__item${activeTab === tab.id ? ' ad-nav__item--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <button className="ad-nav__item ad-nav__item--back" onClick={() => onNavigate('home')}>
            Về trang chủ
          </button>

          <button
            className="ad-nav__item ad-nav__item--danger"
            onClick={async () => {
              const access = localStorage.getItem('access');
              if (access) {
                // Gọi API logout để invalidate token trên server
                await fetch('http://127.0.0.1:8000/api/accounts/logout/', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${access}` },
                });
              }

              // Xoá token & thông tin user ở localStorage
              localStorage.removeItem('access');
              localStorage.removeItem('refresh');
              localStorage.removeItem('role');
              localStorage.removeItem('user');

              // Quay về trang chủ hoặc login
              onNavigate('home');
            }}
          >
            Đăng xuất
          </button>
        </aside>

        <main className="ad-main">

          {activeTab === 'overview' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Tổng quan hệ thống</h1>
                <p className="ad-page-sub">Thống kê tổng hợp của nền tảng EnglishHub.</p>
              </div>

              <div className="ad-stats-grid">
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">{MOCK_STATS.totalUsers.toLocaleString()}</span>
                  <span className="ad-stat-card__label">Tổng người dùng</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">{MOCK_STATS.totalCourses}</span>
                  <span className="ad-stat-card__label">Khóa học</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">{formatPrice(MOCK_STATS.totalRevenue, 'VND')}</span>
                  <span className="ad-stat-card__label">Doanh thu</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">{MOCK_STATS.activeToday.toLocaleString()}</span>
                  <span className="ad-stat-card__label">Hoạt động hôm nay</span>
                </div>
              </div>

              <div className="ad-overview-grid">
                <div>
                  <h2 className="ad-section-title">Chờ duyệt</h2>
                  <div className="ad-pending-list">
                    {MOCK_ADMIN_COURSES.filter(c => courseStatuses[c.id] === 'pending').map(c => (
                      <div key={c.id} className="ad-pending-row">
                        <span className="ad-pending-row__title">{c.title}</span>
                        <button className="ad-btn-approve" onClick={() => approveCourse(c.id)}>Duyệt</button>
                      </div>
                    ))}
                    {!MOCK_ADMIN_COURSES.some(c => courseStatuses[c.id] === 'pending') && (
                      <p className="ad-empty">Không có khóa học chờ duyệt.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="ad-section-title">Người dùng mới nhất</h2>
                  <div className="ad-recent-users">
                    {MOCK_USERS.slice(0, 4).map(u => (
                      <div key={u.id} className="ad-recent-user">
                        <div>
                          <span className="ad-recent-user__name">{u.name}</span>
                          <span className="ad-recent-user__email">{u.email}</span>
                        </div>
                        <span className={`ad-badge ad-badge--role-${u.role}`}>{ROLE_LABEL[u.role]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý người dùng</h1>
                <p className="ad-page-sub">{MOCK_USERS.length} người dùng</p>
              </div>

              <input
                className="ad-search"
                type="search"
                placeholder="Tìm theo tên hoặc email..."
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
              />

              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr><th>Người dùng</th><th>Vai trò</th><th>Khóa học</th><th>Ngày tham gia</th><th>Trạng thái</th><th>Hành động</th></tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="ad-user-cell">
                            <span className="ad-user-cell__name">{u.name}</span>
                            <span className="ad-user-cell__email">{u.email}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`ad-badge ad-badge--role-${u.role}`}>{ROLE_LABEL[u.role]}</span>
                        </td>
                        <td>{u.courses}</td>
                        <td className="ad-table__muted">{u.joined}</td>
                        <td>
                          <span className={`ad-badge ad-badge--${userStatuses[u.id]}`}>
                            {STATUS_LABEL[userStatuses[u.id]]}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`ad-btn-sm${userStatuses[u.id] === 'banned' ? ' ad-btn-sm--restore' : ' ad-btn-sm--ban'}`}
                            onClick={() => toggleUserStatus(u.id)}
                          >
                            {userStatuses[u.id] === 'banned' ? 'Mở khóa' : 'Khóa TK'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý khóa học</h1>
                <p className="ad-page-sub">{MOCK_ADMIN_COURSES.length} khóa học trên hệ thống</p>
              </div>

              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr><th>Khóa học</th><th>Giảng viên</th><th>Học viên</th><th>Trạng thái</th><th>Hành động</th></tr>
                  </thead>
                  <tbody>
                    {MOCK_ADMIN_COURSES.map(c => (
                      <tr key={c.id}>
                        <td className="ad-table__title">{c.title}</td>
                        <td>{c.instructor.name}</td>
                        <td>{c.enrolledCount.toLocaleString()}</td>
                        <td>
                          <span className={`ad-badge ad-badge--${courseStatuses[c.id]}`}>
                            {STATUS_LABEL[courseStatuses[c.id]]}
                          </span>
                        </td>
                        <td>
                          <div className="ad-actions">
                            {courseStatuses[c.id] === 'pending' && (
                              <button className="ad-btn-sm ad-btn-sm--approve" onClick={() => approveCourse(c.id)}>
                                Duyệt
                              </button>
                            )}
                            <button className="ad-btn-sm ad-btn-sm--ban">Ẩn</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Thống kê</h1>
                <p className="ad-page-sub">Số liệu tổng hợp của nền tảng</p>
              </div>

              <div className="ad-stats-grid">
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">{MOCK_USERS.filter(u => u.role === 'student').length}</span>
                  <span className="ad-stat-card__label">Học viên</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">{MOCK_USERS.filter(u => u.role === 'instructor').length}</span>
                  <span className="ad-stat-card__label">Giảng viên</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">{MOCK_ADMIN_COURSES.filter(c => courseStatuses[c.id] === 'approved').length}</span>
                  <span className="ad-stat-card__label">Khóa đã duyệt</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">{MOCK_ADMIN_COURSES.filter(c => courseStatuses[c.id] === 'pending').length}</span>
                  <span className="ad-stat-card__label">Chờ duyệt</span>
                </div>
              </div>

              <div className="ad-stats-breakdown">
                <h2 className="ad-section-title">Phân bổ học viên theo cấp độ</h2>
                <div className="ad-bar-chart">
                  {[
                    { label: 'A1', value: 35, color: '#4CAF82' },
                    { label: 'A2', value: 28, color: '#5BA4CF' },
                    { label: 'B1', value: 20, color: '#778DA9' },
                    { label: 'B2', value: 10, color: '#415A77' },
                    { label: 'C1', value: 7,  color: '#2E4A6B' },
                  ].map(item => (
                    <div key={item.label} className="ad-bar-item">
                      <span className="ad-bar-item__label">{item.label}</span>
                      <div className="ad-bar-item__track">
                        <div
                          className="ad-bar-item__fill"
                          style={{ width: `${item.value}%`, background: item.color }}
                        />
                      </div>
                      <span className="ad-bar-item__value">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;