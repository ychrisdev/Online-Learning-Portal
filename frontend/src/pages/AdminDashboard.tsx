import React, { useState } from 'react';
import { MOCK_COURSES } from '../data/mockData';
import { formatPrice } from '../utils/format';

interface AdminDashboardProps {
  onNavigate: (page: string, courseId?: string) => void;
}

type Tab = 'overview' | 'users' | 'courses' | 'content' | 'payments' | 'roles' | 'stats';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Tổng quan'  },
  { id: 'users',    label: 'Người dùng' },
  { id: 'courses',  label: 'Khóa học'   },
  { id: 'content',  label: 'Nội dung'   },
  { id: 'payments', label: 'Thanh toán' },
  { id: 'roles',    label: 'Phân quyền' },
  { id: 'stats',    label: 'Thống kê'   },
];

// ── Mock data ────────────────────────────────────────────────

const MOCK_STATS = {
  totalUsers: 48200,
  totalCourses: 24,
  totalRevenue: 284000000,
  activeToday: 3200,
};

const MOCK_USERS = [
  { id: 'u1', name: 'Hoàng Minh',       email: 'hminh@gmail.com',      role: 'student'    as const, courses: 4, status: 'active', joined: '2024-01-12' },
  { id: 'u2', name: 'Ms. Emily Tran',   email: 'emily@englishhub.vn',  role: 'instructor' as const, courses: 6, status: 'active', joined: '2023-06-03' },
  { id: 'u3', name: 'Thu Hương',        email: 'thuhuong@gmail.com',   role: 'student'    as const, courses: 2, status: 'active', joined: '2024-09-20' },
  { id: 'u4', name: 'Quang Huy',        email: 'qhuy@gmail.com',       role: 'student'    as const, courses: 7, status: 'banned', joined: '2024-02-08' },
  { id: 'u5', name: 'Mr. David Nguyen', email: 'david@englishhub.vn',  role: 'instructor' as const, courses: 4, status: 'active', joined: '2023-08-15' },
  { id: 'u6', name: 'Minh Châu',        email: 'mchau@gmail.com',      role: 'student'    as const, courses: 3, status: 'active', joined: '2024-11-01' },
];

const MOCK_ADMIN_COURSES = MOCK_COURSES.map((c, i) => ({
  ...c,
  status: i === 3 ? 'pending' : 'approved',
  enrolledCount: [1840, 2150, 890, 320, 410, 2650][i] ?? 100,
}));

const MOCK_TRANSACTIONS = [
  { id: 'tx1', user: 'Hoàng Minh',  course: 'Tiếng Anh B1 — Tự tin diễn đạt',           amount: 79000,  status: 'completed',        date: '2024-12-01', method: 'MoMo'  },
  { id: 'tx2', user: 'Thu Hương',   course: 'Tiếng Anh A2 — Giao tiếp hàng ngày',        amount: 49000,  status: 'refund_requested', date: '2024-11-28', method: 'VNPay' },
  { id: 'tx3', user: 'Minh Châu',   course: 'Tiếng Anh C1 — Thành thạo chuyên nghiệp',  amount: 129000, status: 'refunded',         date: '2024-11-20', method: 'Thẻ'   },
  { id: 'tx4', user: 'Quang Huy',   course: 'Tiếng Anh B2 — Thảo luận chuyên sâu',      amount: 99000,  status: 'completed',        date: '2024-11-15', method: 'MoMo'  },
  { id: 'tx5', user: 'Hoàng Phúc',  course: 'Tiếng Anh A2 — Giao tiếp hàng ngày',       amount: 49000,  status: 'completed',        date: '2024-11-10', method: 'VNPay' },
];

const MOCK_PENDING_LESSONS = [
  { id: 'pl1', course: 'Tiếng Anh B2',  section: 'Kỹ năng đọc', lesson: 'Phân tích văn bản học thuật', instructor: 'Ms. Emily Tran',   type: 'theory'  as const, submittedAt: '2024-12-02' },
  { id: 'pl2', course: 'Phát âm chuẩn', section: 'Ngữ điệu',    lesson: 'Trọng âm câu nâng cao',       instructor: 'Mr. David Nguyen', type: 'theory'  as const, submittedAt: '2024-12-01' },
  { id: 'pl3', course: 'Tiếng Anh C1',  section: 'Viết luận',   lesson: 'Bài tập viết #5',             instructor: 'Mr. James Miller', type: 'project' as const, submittedAt: '2024-11-30' },
  { id: 'pl4', course: 'Tiếng Anh A2',  section: 'Hội thoại',   lesson: 'Quiz: Mua sắm hàng ngày',     instructor: 'Mr. David Nguyen', type: 'quiz'    as const, submittedAt: '2024-11-29' },
];

// ── Label maps ───────────────────────────────────────────────

type RoleKey   = 'student' | 'instructor' | 'admin' | 'moderator';
type StatusKey = 'active' | 'banned' | 'pending' | 'approved' | 'completed' | 'refund_requested' | 'refunded';
type LessonTypeKey = 'theory' | 'quiz' | 'article' | 'project';

const ROLE_LABEL: Record<RoleKey, string> = {
  student:    'Học viên',
  instructor: 'Giảng viên',
  admin:      'Admin',
  moderator:  'Kiểm duyệt',
};

const STATUS_LABEL: Record<StatusKey, string> = {
  active:           'Hoạt động',
  banned:           'Bị khóa',
  pending:          'Chờ duyệt',
  approved:         'Đã duyệt',
  completed:        'Thành công',
  refund_requested: 'Yêu cầu hoàn',
  refunded:         'Đã hoàn tiền',
};

const LESSON_TYPE_LABEL: Record<LessonTypeKey, string> = {
  theory:  'Lý thuyết',
  quiz:    'Quiz',
  article: 'Bài đọc',
  project: 'Bài tập',
};

// ── Helpers ──────────────────────────────────────────────────

const txBadgeClass = (status: string) => {
  if (status === 'completed')        return 'approved';
  if (status === 'refunded')         return 'banned';
  if (status === 'refund_requested') return 'pending';
  return 'pending';
};

// ── Component ────────────────────────────────────────────────

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Users
  const [userStatuses, setUserStatuses] = useState<Record<string, string>>(
    Object.fromEntries(MOCK_USERS.map(u => [u.id, u.status]))
  );
  const [userRoles, setUserRoles] = useState<Record<string, RoleKey>>(
    Object.fromEntries(MOCK_USERS.map(u => [u.id, u.role as RoleKey]))
  );
  const [searchUser, setSearchUser] = useState('');

  // Courses
  const [courseStatuses, setCourseStatuses] = useState<Record<string, string>>(
    Object.fromEntries(MOCK_ADMIN_COURSES.map(c => [c.id, c.status]))
  );

  // Pending lessons
  const [lessonStatuses, setLessonStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>(
    Object.fromEntries(MOCK_PENDING_LESSONS.map(l => [l.id, 'pending']))
  );

  // Transactions
  const [txStatuses, setTxStatuses] = useState<Record<string, string>>(
    Object.fromEntries(MOCK_TRANSACTIONS.map(t => [t.id, t.status]))
  );

  // Actions
  const toggleUserStatus = (id: string) =>
    setUserStatuses(prev => ({ ...prev, [id]: prev[id] === 'banned' ? 'active' : 'banned' }));

  const approveCourse  = (id: string) => setCourseStatuses(prev => ({ ...prev, [id]: 'approved' }));
  const approveLesson  = (id: string) => setLessonStatuses(prev => ({ ...prev, [id]: 'approved' }));
  const rejectLesson   = (id: string) => setLessonStatuses(prev => ({ ...prev, [id]: 'rejected' }));
  const processRefund  = (id: string) => setTxStatuses(prev => ({ ...prev, [id]: 'refunded' }));
  const rejectRefund   = (id: string) => setTxStatuses(prev => ({ ...prev, [id]: 'completed' }));

  const filteredUsers = MOCK_USERS.filter(u =>
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const pendingLessonsCount = MOCK_PENDING_LESSONS.filter(l => lessonStatuses[l.id] === 'pending').length;
  const pendingRefundsCount = MOCK_TRANSACTIONS.filter(t => txStatuses[t.id] === 'refund_requested').length;
  const pendingCoursesCount = MOCK_ADMIN_COURSES.filter(c => courseStatuses[c.id] === 'pending').length;

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
                <span>{tab.label}</span>
                {tab.id === 'content'  && pendingLessonsCount > 0 && (
                  <span className="ad-nav__badge">{pendingLessonsCount}</span>
                )}
                {tab.id === 'payments' && pendingRefundsCount > 0 && (
                  <span className="ad-nav__badge">{pendingRefundsCount}</span>
                )}
              </button>
            ))}
          </nav>

          <button className="ad-nav__item ad-nav__item--back" onClick={() => onNavigate('home')}>
            Về trang chủ
          </button>
        </aside>

        <main className="ad-main">

          {activeTab === 'overview' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Tổng quan hệ thống</h1>
                <p className="ad-page-sub">Thống kê tổng hợp — EnglishHub Admin</p>
              </div>

              <div className="ad-kpi-row">
                <div className="ad-kpi">
                  <span className="ad-kpi__value">{MOCK_STATS.totalUsers.toLocaleString()}</span>
                  <span className="ad-kpi__label">Người dùng</span>
                </div>
                <div className="ad-kpi-divider" />
                <div className="ad-kpi">
                  <span className="ad-kpi__value">{MOCK_STATS.totalCourses}</span>
                  <span className="ad-kpi__label">Khóa học</span>
                </div>
                <div className="ad-kpi-divider" />
                <div className="ad-kpi">
                  <span className="ad-kpi__value">{formatPrice(MOCK_STATS.totalRevenue, 'VND')}</span>
                  <span className="ad-kpi__label">Doanh thu</span>
                </div>
                <div className="ad-kpi-divider" />
                <div className="ad-kpi">
                  <span className="ad-kpi__value">{MOCK_STATS.activeToday.toLocaleString()}</span>
                  <span className="ad-kpi__label">Hoạt động hôm nay</span>
                </div>
              </div>

              {(pendingCoursesCount > 0 || pendingLessonsCount > 0 || pendingRefundsCount > 0) && (
                <div className="ad-alert-strip">
                  {pendingCoursesCount > 0 && (
                    <span className="ad-alert-chip ad-alert-chip--warn">
                      {pendingCoursesCount} khóa chờ duyệt
                    </span>
                  )}
                  {pendingLessonsCount > 0 && (
                    <span className="ad-alert-chip ad-alert-chip--warn">
                      {pendingLessonsCount} bài học chờ duyệt
                    </span>
                  )}
                  {pendingRefundsCount > 0 && (
                    <span className="ad-alert-chip ad-alert-chip--danger">
                      {pendingRefundsCount} yêu cầu hoàn tiền
                    </span>
                  )}
                </div>
              )}

              <div className="ad-ov-grid">

                <div className="ad-ov-col">

                  <div className="ad-ov-card">
                    <div className="ad-ov-card__head">
                      <span className="ad-ov-card__title">Khóa học chờ duyệt</span>
                      <button className="ad-ov-card__link" onClick={() => setActiveTab('courses')}>
                        Xem tất cả →
                      </button>
                    </div>
                    <div className="ad-ov-list">
                      {pendingCoursesCount === 0 && (
                        <p className="ad-empty">Không có khóa học chờ duyệt.</p>
                      )}
                      {MOCK_ADMIN_COURSES.filter(c => courseStatuses[c.id] === 'pending').map(c => (
                        <div key={c.id} className="ad-ov-row">
                          <span className="ad-ov-row__title">{c.title}</span>
                          <button className="ad-btn-approve" onClick={() => approveCourse(c.id)}>Duyệt</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="ad-ov-card">
                    <div className="ad-ov-card__head">
                      <span className="ad-ov-card__title">Bài học chờ kiểm duyệt</span>
                      <button className="ad-ov-card__link" onClick={() => setActiveTab('content')}>
                        Xem tất cả →
                      </button>
                    </div>
                    <div className="ad-ov-list">
                      {pendingLessonsCount === 0 && (
                        <p className="ad-empty">Không có bài học chờ duyệt.</p>
                      )}
                      {MOCK_PENDING_LESSONS.filter(l => lessonStatuses[l.id] === 'pending').slice(0, 3).map(l => (
                        <div key={l.id} className="ad-ov-row">
                          <div className="ad-ov-row__info">
                            <span className="ad-ov-row__title">{l.lesson}</span>
                            <span className="ad-ov-row__sub">{l.course} · {l.instructor}</span>
                          </div>
                          <button className="ad-btn-approve" onClick={() => approveLesson(l.id)}>Duyệt</button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                <div className="ad-ov-col">

                  <div className="ad-ov-card">
                    <div className="ad-ov-card__head">
                      <span className="ad-ov-card__title">Yêu cầu hoàn tiền</span>
                      <button className="ad-ov-card__link" onClick={() => setActiveTab('payments')}>
                        Xem tất cả →
                      </button>
                    </div>
                    <div className="ad-ov-list">
                      {pendingRefundsCount === 0 && (
                        <p className="ad-empty">Không có yêu cầu hoàn tiền.</p>
                      )}
                      {MOCK_TRANSACTIONS.filter(t => txStatuses[t.id] === 'refund_requested').map(t => (
                        <div key={t.id} className="ad-ov-row">
                          <div className="ad-ov-row__info">
                            <span className="ad-ov-row__title">{t.user}</span>
                            <span className="ad-ov-row__sub">{formatPrice(t.amount, 'VND')} · {t.course}</span>
                          </div>
                          <button className="ad-btn-approve" onClick={() => processRefund(t.id)}>Hoàn tiền</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="ad-ov-card">
                    <div className="ad-ov-card__head">
                      <span className="ad-ov-card__title">Người dùng mới nhất</span>
                      <button className="ad-ov-card__link" onClick={() => setActiveTab('users')}>
                        Xem tất cả →
                      </button>
                    </div>
                    <div className="ad-ov-list">
                      {MOCK_USERS.slice(0, 4).map(u => (
                        <div key={u.id} className="ad-ov-row">
                          <div className="ad-ov-row__info">
                            <span className="ad-ov-row__title">{u.name}</span>
                            <span className="ad-ov-row__sub">{u.email}</span>
                          </div>
                          <span className={`ad-badge ad-badge--role-${u.role}`}>{ROLE_LABEL[u.role as RoleKey]}</span>
                        </div>
                      ))}
                    </div>
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
                    <tr>
                      <th>Người dùng</th>
                      <th>Vai trò</th>
                      <th>Khóa học</th>
                      <th>Ngày tham gia</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
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
                          <span className={`ad-badge ad-badge--role-${userRoles[u.id]}`}>
                            {ROLE_LABEL[userRoles[u.id]]}
                          </span>
                        </td>
                        <td>{u.courses}</td>
                        <td className="ad-table__muted">{u.joined}</td>
                        <td>
                          <span className={`ad-badge ad-badge--${userStatuses[u.id]}`}>
                            {STATUS_LABEL[userStatuses[u.id] as StatusKey]}
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
                    <tr>
                      <th>Khóa học</th>
                      <th>Giảng viên</th>
                      <th>Học viên</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_ADMIN_COURSES.map(c => (
                      <tr key={c.id}>
                        <td className="ad-table__title">{c.title}</td>
                        <td>{c.instructor.name}</td>
                        <td>{c.enrolledCount.toLocaleString()}</td>
                        <td>
                          <span className={`ad-badge ad-badge--${courseStatuses[c.id]}`}>
                            {STATUS_LABEL[courseStatuses[c.id] as StatusKey]}
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

          {activeTab === 'content' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Kiểm duyệt nội dung</h1>
                <p className="ad-page-sub">
                  {pendingLessonsCount > 0
                    ? `${pendingLessonsCount} bài học đang chờ duyệt`
                    : 'Tất cả nội dung đã được duyệt'}
                </p>
              </div>

              <div className="ad-stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">{MOCK_PENDING_LESSONS.filter(l => lessonStatuses[l.id] === 'pending').length}</span>
                  <span className="ad-stat-card__label">Chờ duyệt</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">{MOCK_PENDING_LESSONS.filter(l => lessonStatuses[l.id] === 'approved').length}</span>
                  <span className="ad-stat-card__label">Đã duyệt</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">{MOCK_PENDING_LESSONS.filter(l => lessonStatuses[l.id] === 'rejected').length}</span>
                  <span className="ad-stat-card__label">Từ chối</span>
                </div>
              </div>

              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Bài học</th>
                      <th>Khóa học › Chương</th>
                      <th>Giảng viên</th>
                      <th>Loại</th>
                      <th>Nộp lúc</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_PENDING_LESSONS.map(item => (
                      <tr key={item.id}>
                        <td className="ad-table__title">{item.lesson}</td>
                        <td>
                          <div className="ad-user-cell">
                            <span className="ad-user-cell__name" style={{ fontSize: 'var(--text-xs)' }}>{item.course}</span>
                            <span className="ad-user-cell__email">{item.section}</span>
                          </div>
                        </td>
                        <td className="ad-table__muted">{item.instructor}</td>
                        <td>
                          <span className="ad-badge ad-badge--role-student">
                            {LESSON_TYPE_LABEL[item.type]}
                          </span>
                        </td>
                        <td className="ad-table__muted">{item.submittedAt}</td>
                        <td>
                          <span className={`ad-badge ad-badge--${
                            lessonStatuses[item.id] === 'approved' ? 'approved'
                            : lessonStatuses[item.id] === 'rejected' ? 'banned'
                            : 'pending'
                          }`}>
                            {lessonStatuses[item.id] === 'approved' ? 'Đã duyệt'
                              : lessonStatuses[item.id] === 'rejected' ? 'Từ chối'
                              : 'Chờ duyệt'}
                          </span>
                        </td>
                        <td>
                          {lessonStatuses[item.id] === 'pending' && (
                            <div className="ad-actions">
                              <button className="ad-btn-sm ad-btn-sm--approve" onClick={() => approveLesson(item.id)}>
                                Duyệt
                              </button>
                              <button className="ad-btn-sm">Xem trước</button>
                              <button className="ad-btn-sm ad-btn-sm--ban" onClick={() => rejectLesson(item.id)}>
                                Từ chối
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý thanh toán</h1>
                <p className="ad-page-sub">{MOCK_TRANSACTIONS.length} giao dịch gần nhất</p>
              </div>

              <div className="ad-stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {formatPrice(
                      MOCK_TRANSACTIONS.filter(t => txStatuses[t.id] === 'completed').reduce((s, t) => s + t.amount, 0),
                      'VND'
                    )}
                  </span>
                  <span className="ad-stat-card__label">Doanh thu tháng này</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {MOCK_TRANSACTIONS.filter(t => txStatuses[t.id] === 'refund_requested').length}
                  </span>
                  <span className="ad-stat-card__label">Chờ xét hoàn</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {formatPrice(
                      MOCK_TRANSACTIONS.filter(t => txStatuses[t.id] === 'refunded').reduce((s, t) => s + t.amount, 0),
                      'VND'
                    )}
                  </span>
                  <span className="ad-stat-card__label">Đã hoàn tháng này</span>
                </div>
              </div>

              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Người dùng</th>
                      <th>Khóa học</th>
                      <th>Số tiền</th>
                      <th>Phương thức</th>
                      <th>Ngày</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_TRANSACTIONS.map(tx => (
                      <tr key={tx.id}>
                        <td><span className="ad-user-cell__name">{tx.user}</span></td>
                        <td className="ad-table__title">{tx.course}</td>
                        <td style={{ color: '#e0e1dd', fontWeight: 600 }}>{formatPrice(tx.amount, 'VND')}</td>
                        <td className="ad-table__muted">{tx.method}</td>
                        <td className="ad-table__muted">{tx.date}</td>
                        <td>
                          <span className={`ad-badge ad-badge--${txBadgeClass(txStatuses[tx.id])}`}>
                            {STATUS_LABEL[txStatuses[tx.id] as StatusKey]}
                          </span>
                        </td>
                        <td>
                          {txStatuses[tx.id] === 'refund_requested' && (
                            <div className="ad-actions">
                              <button className="ad-btn-sm ad-btn-sm--approve" onClick={() => processRefund(tx.id)}>
                                Hoàn tiền
                              </button>
                              <button className="ad-btn-sm ad-btn-sm--ban" onClick={() => rejectRefund(tx.id)}>
                                Từ chối
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Phân quyền người dùng</h1>
                <p className="ad-page-sub">Gán vai trò và quyền hạn cho từng tài khoản</p>
              </div>

              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Người dùng</th>
                      <th>Email</th>
                      <th>Vai trò hiện tại</th>
                      <th>Đổi vai trò</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_USERS.map(u => (
                      <tr key={u.id}>
                        <td><span className="ad-user-cell__name">{u.name}</span></td>
                        <td><span className="ad-user-cell__email">{u.email}</span></td>
                        <td>
                          <span className={`ad-badge ad-badge--role-${userRoles[u.id]}`}>
                            {ROLE_LABEL[userRoles[u.id]]}
                          </span>
                        </td>
                        <td>
                          <select
                            className="ad-select"
                            value={userRoles[u.id]}
                            onChange={e => setUserRoles(prev => ({ ...prev, [u.id]: e.target.value as RoleKey }))}
                          >
                            <option value="student">Học viên</option>
                            <option value="instructor">Giảng viên</option>
                            <option value="moderator">Kiểm duyệt</option>
                            <option value="admin">Admin</option>
                          </select>
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
                        <div className="ad-bar-item__fill" style={{ width: `${item.value}%`, background: item.color }} />
                      </div>
                      <span className="ad-bar-item__value">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ad-stats-breakdown">
                <h2 className="ad-section-title">Phân bổ phương thức thanh toán</h2>
                <div className="ad-bar-chart">
                  {[
                    { label: 'MoMo',  value: 48, color: '#a855f7' },
                    { label: 'VNPay', value: 35, color: '#5BA4CF' },
                    { label: 'Thẻ',   value: 17, color: '#4CAF82' },
                  ].map(item => (
                    <div key={item.label} className="ad-bar-item">
                      <span className="ad-bar-item__label" style={{ width: 48 }}>{item.label}</span>
                      <div className="ad-bar-item__track">
                        <div className="ad-bar-item__fill" style={{ width: `${item.value}%`, background: item.color }} />
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