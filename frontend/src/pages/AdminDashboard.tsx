import React, { useState, useEffect, useCallback } from 'react';
import { formatPrice } from '../utils/format';

interface AdminDashboardProps {
  onNavigate: (page: string, courseId?: string) => void;
  onLogout: () => void;
}

const API = 'http://127.0.0.1:8000';
const authHeader = () => {
  const token = localStorage.getItem('access');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const toList = (data: any): any[] => Array.isArray(data) ? data : (data?.results ?? []);

type Tab = 'overview' | 'users' | 'courses' | 'stats';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Tổng quan'     },
  { id: 'users',    label: 'Người dùng'    },
  { id: 'courses',  label: 'Khóa học'      },
  { id: 'stats',    label: 'Thống kê'      },
];

const ROLE_LABEL:   Record<string, string> = { student: 'Học viên', instructor: 'Giảng viên', admin: 'Admin' };
const STATUS_LABEL: Record<string, string> = { active: 'Hoạt động', banned: 'Bị khóa', inactive: 'Không HĐ', draft: 'Nháp', review: 'Chờ duyệt', published: 'Đã xuất bản', archived: 'Đã lưu trữ' };

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // ── Data ──────────────────────────────────────────────────────────────────
  const [users,        setUsers]        = useState<any[]>([]);
  const [courses,      setCourses]      = useState<any[]>([]);
  const [revenueStats, setRevenueStats] = useState<any>(null);
  const [loadingUsers,   setLoadingUsers]   = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingStats,   setLoadingStats]   = useState(false);

  const [searchUser,   setSearchUser]   = useState('');
  const [searchCourse, setSearchCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortPrice,    setSortPrice]    = useState('');
  // ── Fetch users ───────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API}/api/auth/users/`, { headers: authHeader() });
      if (res.ok) setUsers(toList(await res.json()));
    } catch {}
    setLoadingUsers(false);
  }, []);

  // ── Fetch courses (admin) ─────────────────────────────────────────────────
  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const res = await fetch(`${API}/api/courses/admin/`, { headers: authHeader() });
      console.log('[Admin] GET /api/courses/admin/ →', res.status, res.statusText);
      const data = await res.json();
      console.log('[Admin] courses data:', data);
      if (res.ok) setCourses(toList(data));
      else console.error('[Admin] lỗi:', data);
    } catch (e) {
      console.error('[Admin] fetch courses exception:', e);
    }
    setLoadingCourses(false);
  }, []);

  // ── Fetch revenue stats ───────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${API}/api/payments/admin/stats/`, { headers: authHeader() });
      if (res.ok) setRevenueStats(await res.json());
    } catch {}
    setLoadingStats(false);
  }, []);

  // Load tất cả khi mount
  useEffect(() => {
    fetchUsers();
    fetchCourses();
    fetchStats();
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggleUserStatus = async (user: any) => {
    const isBanned = user.is_active === false || user.status === 'banned';
    try {
      await fetch(`${API}/api/auth/users/${user.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ is_active: isBanned }),
      });
      fetchUsers();
    } catch {}
  };

  const approveCourse = async (id: string) => {
    try {
      await fetch(`${API}/api/courses/admin/${id}/approve/`, {
        method: 'PATCH',
        headers: authHeader(),
      });
      fetchCourses();
    } catch {}
  };

  const rejectCourse = async (id: string) => {
    try {
      await fetch(`${API}/api/courses/admin/${id}/reject/`, {
        method: 'PATCH',
        headers: authHeader(),
      });
      fetchCourses();
    } catch {}
  };

  const archiveCourse = async (id: string) => {
  try {
    await fetch(`${API}/api/courses/admin/${id}/archive/`, {
      method: 'PATCH', headers: authHeader(),
    });
    fetchCourses();
  } catch {}
};

const unarchiveCourse = async (id: string) => {
  try {
    await fetch(`${API}/api/courses/admin/${id}/unarchive/`, {
      method: 'PATCH', headers: authHeader(),
    });
    fetchCourses();
  } catch {}
};

  // ── Derived ───────────────────────────────────────────────────────────────
  const normalize = (s: string) =>
  s.toLowerCase()
   .normalize('NFD')
   .replace(/[\u0300-\u036f]/g, '')  // bỏ dấu
   .replace(/\s+/g, '');             // bỏ hết khoảng trắng
   
  const filteredUsers = users.filter(u => {
    const q = normalize(searchUser);
    return (
      normalize(u.full_name ?? u.name ?? u.username ?? '').includes(q) ||
      normalize(u.email ?? '').includes(q)
    );
  });

  const filteredCourses = courses.filter(c => {
    const q = normalize(searchCourse);
    const matchSearch = !q ||
      normalize(c.title ?? '').includes(q) ||
      normalize(c.instructor_name ?? '').includes(q);
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    if (!sortPrice) return 0;
    const pa = a.sale_price ?? a.price ?? 0;
    const pb = b.sale_price ?? b.price ?? 0;
    return sortPrice === 'asc' ? pa - pb : pb - pa;
  });

  const pendingCourses  = courses.filter(c => c.status === 'review');
  const approvedCourses = courses.filter(c => c.status === 'published');
  const totalRevenue    = revenueStats?.total_revenue ?? revenueStats?.revenue ?? 0;
  const activeToday     = revenueStats?.active_today ?? 0;

  const getUserStatus = (u: any) => {
    if (u.status) return u.status;
    return u.is_active === false ? 'banned' : 'active';
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ad-page">
      <div className="container ad-layout">

        {/* Sidebar */}
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
              <button key={tab.id}
                className={`ad-nav__item${activeTab === tab.id ? ' ad-nav__item--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >{tab.label}</button>
            ))}
          </nav>
          <button className="ad-nav__item ad-nav__item--back" onClick={() => onNavigate('home')}>
            Về trang chủ
          </button>
          <button className="ad-nav__item ad-nav__item--danger" onClick={onLogout}>
            Đăng xuất
          </button>
        </aside>

        <main className="ad-main">

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Tổng quan hệ thống</h1>
                <p className="ad-page-sub">Thống kê tổng hợp của nền tảng EnglishHub.</p>
              </div>

              <div className="ad-stats-grid">
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {loadingUsers ? '…' : users.length.toLocaleString()}
                  </span>
                  <span className="ad-stat-card__label">Tổng người dùng</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {loadingCourses ? '…' : courses.length}
                  </span>
                  <span className="ad-stat-card__label">Khóa học</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {loadingStats ? '…' : formatPrice(totalRevenue, 'VND')}
                  </span>
                  <span className="ad-stat-card__label">Doanh thu</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {loadingStats ? '…' : activeToday.toLocaleString()}
                  </span>
                  <span className="ad-stat-card__label">Hoạt động hôm nay</span>
                </div>
              </div>

              <div className="ad-overview-grid">
                <div>
                  <h2 className="ad-section-title">Chờ duyệt ({pendingCourses.length})</h2>
                  <div className="ad-pending-list">
                    {loadingCourses ? (
                      <p className="ad-empty">Đang tải…</p>
                    ) : pendingCourses.length === 0 ? (
                      <p className="ad-empty">Không có khóa học chờ duyệt.</p>
                    ) : pendingCourses.map(c => (
                      <div key={c.id} className="ad-pending-row">
                        <span className="ad-pending-row__title">{c.title}</span>
                        <button className="ad-btn-approve" onClick={() => approveCourse(c.id)}>Duyệt</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="ad-section-title">Người dùng mới nhất</h2>
                  <div className="ad-recent-users">
                    {loadingUsers ? (
                      <p className="ad-empty">Đang tải…</p>
                    ) : users.slice(0, 4).map(u => (
                      <div key={u.id} className="ad-recent-user">
                        <div>
                          <span className="ad-recent-user__name">
                            {u.full_name ?? u.name ?? u.username}
                          </span>
                          <span className="ad-recent-user__email">{u.email}</span>
                        </div>
                        <span className={`ad-badge ad-badge--role-${u.role}`}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Users ── */}
          {activeTab === 'users' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý người dùng</h1>
                <p className="ad-page-sub">
                  {loadingUsers ? 'Đang tải…' : `${users.length} người dùng`}
                </p>
              </div>
              <input className="ad-search" type="search"
                placeholder="Tìm theo tên hoặc email..."
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
              />
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Người dùng</th><th>Vai trò</th><th>Ngày tham gia</th>
                      <th>Trạng thái</th><th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center' }}>⏳ Đang tải…</td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                          🔍 Không tìm thấy người dùng phù hợp.
                        </td>
                      </tr>
                    ) : filteredUsers.map(u => {
                      const status = getUserStatus(u);
                      return (
                        <tr key={u.id}>
                          <td>
                            <div className="ad-user-cell">
                              <span className="ad-user-cell__name">{u.full_name ?? u.name ?? u.username}</span>
                              <span className="ad-user-cell__email">{u.email}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`ad-badge ad-badge--role-${u.role}`}>
                              {ROLE_LABEL[u.role] ?? u.role}
                            </span>
                          </td>
                          <td className="ad-table__muted">
                            {u.date_joined ? new Date(u.date_joined).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td>
                            <span className={`ad-badge ad-badge--${status}`}>
                              {STATUS_LABEL[status] ?? status}
                            </span>
                          </td>
                          <td>
                            {u.role !== 'admin' && (
                              <button
                                className={`ad-btn-sm${status === 'banned' ? ' ad-btn-sm--restore' : ' ad-btn-sm--ban'}`}
                                onClick={() => toggleUserStatus(u)}
                              >
                                {status === 'banned' ? 'Mở khóa' : 'Khóa TK'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Courses ── */}
          {activeTab === 'courses' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý khóa học</h1>
                <p className="ad-page-sub">
                  {loadingCourses ? 'Đang tải…' : `${filteredCourses.length} / ${courses.length} khóa học`}
                </p>
              </div>
              <div className="ad-filters">
                <input className="ad-search" type="search"
                  placeholder="Tìm theo tên khóa học, giảng viên..."
                  value={searchCourse}
                  onChange={e => setSearchCourse(e.target.value)}
                />
                <select className="ad-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">Tất cả trạng thái</option>
                  <option value="draft">Nháp</option>
                  <option value="review">Chờ duyệt</option>
                  <option value="published">Đã xuất bản</option>
                  <option value="archived">Đã lưu trữ</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Học phí:</span>
                  {[
                    { value: '',     label: 'Tất cả'     },
                    { value: 'asc',  label: 'Thấp → Cao' },
                    { value: 'desc', label: 'Cao → Thấp' },
                  ].map(s => (
                    <button key={s.value}
                      className={`sort-btn${sortPrice === s.value ? ' sort-btn--active' : ''}`}
                      onClick={() => setSortPrice(s.value)}
                    >{s.label}</button>
                  ))}
                </div>
                {(searchCourse || filterStatus || sortPrice) && (
                  <button className="filter-clear" onClick={() => {
                    setSearchCourse(''); setFilterStatus(''); setSortPrice('');
                  }}>✕ Xoá lọc</button>
                )}
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr><th>Khóa học</th><th>Giảng viên</th><th>Học viên</th><th>Học phí</th><th>Trạng thái</th><th>Hành động</th></tr>
                  </thead>
                  <tbody>
                    {loadingCourses ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center' }}>⏳ Đang tải…</td></tr>
                    ) : filteredCourses.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                          🔍 Không tìm thấy khóa học phù hợp.
                        </td>
                      </tr>
                    ) : filteredCourses.map(c => (
                      <tr key={c.id}>
                        <td className="ad-table__title">{c.title}</td>
                        <td>{c.instructor_name ?? c.instructor?.name ?? '—'}</td>
                        <td>{(c.total_students ?? c.enrolled_count ?? 0).toLocaleString()}</td>
                        <td>{c.sale_price === 0 ? 'Miễn phí' : formatPrice(c.sale_price ?? c.price ?? 0, 'VND')}</td>
                        <td>
                          <span className={`ad-badge ad-badge--${c.status}`}>
                            {STATUS_LABEL[c.status] ?? c.status}
                          </span>
                        </td>
                        <td>
                          <div className="ad-actions">
                            {c.status === 'review' && (
                              <>
                                <button className="ad-btn-sm ad-btn-sm--approve" onClick={() => approveCourse(c.id)}>
                                  Duyệt
                                </button>
                                <button className="ad-btn-sm ad-btn-sm--ban" onClick={() => rejectCourse(c.id)}>
                                  Từ chối
                                </button>
                              </>
                            )}
                            {c.status === 'published' && (
                              <button className="ad-btn-sm ad-btn-sm--ban" onClick={() => archiveCourse(c.id)}>
                                Ẩn
                              </button>
                            )}
                            {c.status === 'archived' && (
                              <button className="ad-btn-sm ad-btn-sm--restore" onClick={() => unarchiveCourse(c.id)}>
                                Hiện
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Stats ── */}
          {activeTab === 'stats' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Thống kê</h1>
                <p className="ad-page-sub">Số liệu tổng hợp của nền tảng</p>
              </div>
              <div className="ad-stats-grid">
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {users.filter(u => u.role === 'student').length}
                  </span>
                  <span className="ad-stat-card__label">Học viên</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {users.filter(u => u.role === 'instructor').length}
                  </span>
                  <span className="ad-stat-card__label">Giảng viên</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">{approvedCourses.length}</span>
                  <span className="ad-stat-card__label">Khóa đã duyệt</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">{pendingCourses.length}</span>
                  <span className="ad-stat-card__label">Chờ duyệt</span>
                </div>
              </div>

              <div className="ad-stats-breakdown">
                <h2 className="ad-section-title">Phân bổ học viên theo danh mục</h2>
                <div className="ad-bar-chart">
                  {(() => {
                    const colors: Record<string, string> = {
                      A1: '#4CAF82', A2: '#5BA4CF', B1: '#778DA9',
                      B2: '#415A77', C1: '#2E4A6B', C2: '#1B263B',
                    };
                    const totalStudents = courses.reduce((sum, c) => sum + (c.total_students ?? 0), 0);
                    if (totalStudents === 0) return <p className="ad-empty">Chưa có dữ liệu học viên.</p>;

                    // Gộp total_students theo category_name
                    const catMap: Record<string, number> = {};
                    courses.forEach(c => {
                      const cat = c.category_name ?? 'Khác';
                      catMap[cat] = (catMap[cat] ?? 0) + (c.total_students ?? 0);
                    });

                    return Object.entries(catMap)
                      .sort((a, b) => b[1] - a[1])
                      .map(([label, count]) => ({
                        label,
                        value: Math.round((count / totalStudents) * 100),
                        color: colors[label] ?? '#888',
                      }))
                      .map(item => (
                        <div key={item.label} className="ad-bar-item">
                          <span className="ad-bar-item__label">{item.label}</span>
                          <div className="ad-bar-item__track">
                            <div className="ad-bar-item__fill"
                              style={{ width: `${item.value}%`, background: item.color }} />
                          </div>
                          <span className="ad-bar-item__value">{item.value}%</span>
                        </div>
                      ));
                  })()}
                </div>
              </div>

              <div className="ad-stats-breakdown">
                <h2 className="ad-section-title">Doanh thu ước tính theo danh mục</h2>
                <div className="ad-bar-chart">
                  {(() => {
                    const colors: Record<string, string> = {
                      A1: '#4CAF82', A2: '#5BA4CF', B1: '#778DA9',
                      B2: '#415A77', C1: '#2E4A6B', C2: '#1B263B',
                    };

                    // Tính doanh thu ước tính = sale_price × total_students mỗi khóa
                    const catMap: Record<string, number> = {};
                    courses.forEach(c => {
                      const cat      = c.category_name ?? 'Khác';
                      const revenue  = (c.sale_price ?? c.price ?? 0) * (c.total_students ?? 0);
                      catMap[cat] = (catMap[cat] ?? 0) + revenue;
                    });

                    const totalRevenueCat = Object.values(catMap).reduce((a, b) => a + b, 0);
                    if (totalRevenueCat === 0) return <p className="ad-empty">Chưa có dữ liệu doanh thu.</p>;

                    return Object.entries(catMap)
                      .sort((a, b) => b[1] - a[1])
                      .map(([label, revenue]) => ({
                        label,
                        value: Math.round((revenue / totalRevenueCat) * 100),
                        revenue,
                        color: colors[label] ?? '#888',
                      }))
                      .map(item => (
                        <div key={item.label} className="ad-bar-item">
                          <span className="ad-bar-item__label">{item.label}</span>
                          <div className="ad-bar-item__track">
                            <div className="ad-bar-item__fill"
                              style={{ width: `${item.value}%`, background: item.color }} />
                          </div>
                          <span className="ad-bar-item__value">
                            {formatPrice(item.revenue, 'VND')} ({item.value}%)
                          </span>
                        </div>
                      ));
                  })()}
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