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

type Tab = 'overview' | 'users' | 'courses' | 'stats' | 'payments';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Tổng quan'    },
  { id: 'users',     label: 'Người dùng'   },
  { id: 'courses',   label: 'Khóa học'     },
  { id: 'payments',  label: 'Thanh toán'   },
  { id: 'stats',     label: 'Thống kê'     },
];

const ROLE_LABEL:   Record<string, string> = { student: 'Học viên', instructor: 'Giảng viên', admin: 'Admin' };
const STATUS_LABEL: Record<string, string> = {
  active: 'Hoạt động', banned: 'Bị khóa', inactive: 'Không HĐ',
  draft: 'Nháp', review: 'Chờ duyệt', published: 'Đã xuất bản', archived: 'Đã lưu trữ',
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  completed: 'Hoàn thành', pending: 'Chờ xử lý', refunded: 'Đã hoàn tiền', failed: 'Thất bại',
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // ── Data ──────────────────────────────────────────────────────────────────
  const [users,        setUsers]        = useState<any[]>([]);
  const [courses,      setCourses]      = useState<any[]>([]);
  const [revenueStats, setRevenueStats] = useState<any>(null);
  const [payments,     setPayments]     = useState<any[]>([]);
  const [loadingUsers,    setLoadingUsers]    = useState(false);
  const [loadingCourses,  setLoadingCourses]  = useState(false);
  const [loadingStats,    setLoadingStats]    = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [searchUser,      setSearchUser]      = useState('');
  const [searchCourse,    setSearchCourse]    = useState('');
  const [filterStatus,    setFilterStatus]    = useState('');
  const [sortPrice,       setSortPrice]       = useState('');
  const [searchPayment,   setSearchPayment]   = useState('');
  const [filterPayStatus, setFilterPayStatus] = useState('');

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
      const data = await res.json();
      if (res.ok) setCourses(toList(data));
    } catch {}
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

  // ── Fetch payments ────────────────────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch(`${API}/api/payments/admin/`, { headers: authHeader() });
      if (res.ok) setPayments(toList(await res.json()));
    } catch {}
    setLoadingPayments(false);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchCourses();
    fetchStats();
    fetchPayments();
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
      await fetch(`${API}/api/courses/admin/${id}/approve/`, { method: 'PATCH', headers: authHeader() });
      fetchCourses();
    } catch {}
  };

  const rejectCourse = async (id: string) => {
    try {
      await fetch(`${API}/api/courses/admin/${id}/reject/`, { method: 'PATCH', headers: authHeader() });
      fetchCourses();
    } catch {}
  };

  const archiveCourse = async (id: string) => {
    try {
      await fetch(`${API}/api/courses/admin/${id}/archive/`, { method: 'PATCH', headers: authHeader() });
      fetchCourses();
    } catch {}
  };

  const unarchiveCourse = async (id: string) => {
    try {
      await fetch(`${API}/api/courses/admin/${id}/unarchive/`, { method: 'PATCH', headers: authHeader() });
      fetchCourses();
    } catch {}
  };

  // ── Refund action ─────────────────────────────────────────────────────────
  const refundPayment = async (id: string) => {
    if (!window.confirm('Xác nhận hoàn tiền cho đơn hàng này?')) return;
    try {
      await fetch(`${API}/api/payments/admin/${id}/refund/`, { method: 'POST', headers: authHeader() });
      fetchPayments();
      fetchStats();
    } catch {}
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const normalize = (s: string) =>
    s.toLowerCase()
     .normalize('NFD')
     .replace(/[\u0300-\u036f]/g, '')
     .replace(/\s+/g, '');

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

  const filteredPayments = payments.filter(p => {
    const q = normalize(searchPayment);
    const matchSearch = !q ||
      normalize(p.user_name ?? p.user?.name ?? p.user?.email ?? '').includes(q) ||
      normalize(p.course_title ?? p.course?.title ?? '').includes(q);
    const matchStatus = !filterPayStatus || p.status === filterPayStatus;
    return matchSearch && matchStatus;
  });

  const pendingCourses  = courses.filter(c => c.status === 'review');
  const approvedCourses = courses.filter(c => c.status === 'published');
  const totalRevenue    = revenueStats?.total_revenue ?? revenueStats?.revenue ?? 0;
  const activeToday     = revenueStats?.active_today ?? 0;

  const getUserStatus = (u: any) => {
    if (u.status) return u.status;
    return u.is_active === false ? 'banned' : 'active';
  };

  // ── Stat: revenue by category ─────────────────────────────────────────────
  const catRevenueMap: Record<string, number> = {};
  courses.forEach(c => {
    const cat     = c.category_name ?? 'Khác';
    const revenue = (c.sale_price ?? c.price ?? 0) * (c.total_students ?? 0);
    catRevenueMap[cat] = (catRevenueMap[cat] ?? 0) + revenue;
  });
  const catRevenueEntries = Object.entries(catRevenueMap).sort((a, b) => b[1] - a[1]);
  const maxCatRevenue = catRevenueEntries[0]?.[1] ?? 1;

  const CAT_COLORS: Record<string, string> = {
    A1: '#4CAF82', A2: '#5BA4CF', B1: '#778DA9',
    B2: '#415A77', C1: '#2E4A6B', C2: '#1B263B',
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
                    <tr>
                      <th>Khóa học</th>
                      <th>Giảng viên</th>
                      <th>Học viên</th>
                      <th>Học phí</th>
                      {/* NEW: Cột doanh thu */}
                      <th>Doanh thu</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCourses ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center' }}>⏳ Đang tải…</td></tr>
                    ) : filteredCourses.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                          🔍 Không tìm thấy khóa học phù hợp.
                        </td>
                      </tr>
                    ) : filteredCourses.map(c => {
                      const price    = c.sale_price ?? c.price ?? 0;
                      const students = c.total_students ?? c.enrolled_count ?? 0;
                      // Ưu tiên dùng revenue thực từ API nếu có, fallback tính ước tính
                      const revenue  = c.revenue ?? c.total_revenue ?? (price * students);
                      return (
                        <tr key={c.id}>
                          <td className="ad-table__title">{c.title}</td>
                          <td>{c.instructor_name ?? c.instructor?.name ?? '—'}</td>
                          <td>{students.toLocaleString()}</td>
                          <td>{price === 0 ? 'Miễn phí' : formatPrice(price, 'VND')}</td>
                          {/* NEW: Doanh thu */}
                          <td className="ad-table__revenue">
                            {price === 0 ? (
                              <span style={{ color: 'rgba(224,225,221,0.3)', fontSize: 'var(--text-xs)' }}>—</span>
                            ) : (
                              formatPrice(revenue, 'VND')
                            )}
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Payments ── */}
          {activeTab === 'payments' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý thanh toán</h1>
                <p className="ad-page-sub">
                  {loadingPayments ? 'Đang tải…' : `${filteredPayments.length} / ${payments.length} giao dịch`}
                </p>
              </div>
              <div className="ad-filters">
                <input className="ad-search" type="search"
                  placeholder="Tìm theo tên người dùng, khóa học..."
                  value={searchPayment}
                  onChange={e => setSearchPayment(e.target.value)}
                />
                <select className="ad-select" value={filterPayStatus} onChange={e => setFilterPayStatus(e.target.value)}>
                  <option value="">Tất cả trạng thái</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="pending">Chờ xử lý</option>
                  <option value="refunded">Đã hoàn tiền</option>
                  <option value="failed">Thất bại</option>
                </select>
                {(searchPayment || filterPayStatus) && (
                  <button className="filter-clear" onClick={() => {
                    setSearchPayment(''); setFilterPayStatus('');
                  }}>✕ Xoá lọc</button>
                )}
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Người dùng</th>
                      <th>Khóa học</th>
                      <th>Số tiền</th>
                      <th>Ngày thanh toán</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPayments ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center' }}>⏳ Đang tải…</td></tr>
                    ) : filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                          🔍 Không tìm thấy giao dịch phù hợp.
                        </td>
                      </tr>
                    ) : filteredPayments.map(p => {
                      const status = p.status ?? 'pending';
                      return (
                        <tr key={p.id}>
                          <td>
                            <div className="ad-user-cell">
                              <span className="ad-user-cell__name">
                                {p.user_name ?? p.user?.full_name ?? p.user?.username ?? '—'}
                              </span>
                              <span className="ad-user-cell__email">
                                {p.user_email ?? p.user?.email ?? ''}
                              </span>
                            </div>
                          </td>
                          <td className="ad-table__title">
                            {p.course_title ?? p.course?.title ?? '—'}
                          </td>
                          <td style={{ color: '#4caf82', fontWeight: 600 }}>
                            {formatPrice(p.amount ?? p.price ?? 0, 'VND')}
                          </td>
                          <td className="ad-table__muted">
                            {p.created_at
                              ? new Date(p.created_at).toLocaleDateString('vi-VN')
                              : '—'}
                          </td>
                          <td>
                            <span className={`ad-badge ad-badge--pay-${status}`}>
                              {PAYMENT_STATUS_LABEL[status] ?? status}
                            </span>
                          </td>
                          <td>
                            {status === 'completed' && (
                              <button
                                className="ad-btn-sm ad-btn-sm--refund"
                                onClick={() => refundPayment(p.id)}
                              >
                                Hoàn tiền
                              </button>
                            )}
                            {status === 'refunded' && (
                              <span style={{ fontSize: 'var(--text-xs)', color: 'rgba(224,225,221,0.35)' }}>
                                Đã hoàn
                              </span>
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

              {/* Biểu đồ cột doanh thu theo danh mục — gộp 1 block */}
              <div className="ad-stats-breakdown">
                <h2 className="ad-section-title">Doanh thu theo danh mục</h2>
                {catRevenueEntries.length === 0 || maxCatRevenue === 0 ? (
                  <p className="ad-empty">Chưa có dữ liệu doanh thu.</p>
                ) : (() => {
                  return (
                    <div className="ad-col-chart">
                      {catRevenueEntries.map(([label, revenue]) => {
                        const heightPct = Math.round((revenue / maxCatRevenue) * 100);
                        const color     = CAT_COLORS[label] ?? '#778DA9';
                        return (
                          <div key={label} className="ad-col-chart__item">
                            <span className="ad-col-chart__pct">{formatPrice(revenue, 'VND')}</span>
                            <div className="ad-col-chart__bar-wrap">
                              <div
                                className="ad-col-chart__bar"
                                style={{ height: `${heightPct}%`, background: color }}
                              />
                            </div>
                            <span className="ad-col-chart__label">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;