import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { formatPrice } from '../utils/format';

interface InstructorDashboardProps {
  onNavigate: (page: string, courseId?: string) => void;
  onLogout: () => void;
}

type Tab = 'overview' | 'revenue' | 'courses' | 'lessons' | 'quiz' | 'students' | 'qa' | 'reviews' | 'profile';
type ChartRange = '3m' | '6m' | '1y';
type QAFilter = 'all' | 'pending' | 'resolved';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Tổng quan' },
  { id: 'revenue',   label: 'Doanh thu' },
  { id: 'courses',   label: 'Khóa học' },
  { id: 'lessons',   label: 'Bài học' },
  { id: 'quiz',      label: 'Bài kiểm tra' },
  { id: 'students',  label: 'Học viên' },
  { id: 'qa',        label: 'Hỏi & Đáp' },
  { id: 'reviews',   label: 'Đánh giá' },
  { id: 'profile',   label: 'Hồ sơ cá nhân' },
];

const API = 'http://127.0.0.1:8000';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
  'Content-Type': 'application/json',
});

const toList = (data: any): any[] =>
  Array.isArray(data) ? data : (data?.results ?? []);

const thumbSrc = (t: string | null) =>
  !t ? null : t.startsWith('http') ? t : `${API}${t}`;

// ── Chart tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="id-chart-tooltip">
      <p className="id-chart-tooltip__label">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="id-chart-tooltip__value" style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'revenue'
            ? formatPrice(p.value, 'VND')
            : `${p.value} học viên`}
        </p>
      ))}
    </div>
  );
};

// ── Donut chart ────────────────────────────────────────────────────────────
const DonutChart: React.FC<{ pct: number; color?: string }> = ({ pct, color = '#5b8dee' }) => {
  const size = 64, r = (size - 8) / 2, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="id-donut">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(119,141,169,0.15)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="id-donut__fill"
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill="#e0e1dd" fontSize={13} fontWeight={700}>
        {pct}%
      </text>
    </svg>
  );
};

// ══════════════════════════════════════════════════════════════════════════
const InstructorDashboard: React.FC<InstructorDashboardProps> = ({ onNavigate, onLogout }) => {
  const [activeTab, setActiveTab]   = useState<Tab>('overview');
  const [chartRange, setChartRange] = useState<ChartRange>('6m');

  // ── Profile ──────────────────────────────────────────────────────────────
  const [user, setUser]           = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: '', title: '', email: '', phone: '', location: '', bio: '',
    facebook: '', linkedin: '', youtube: '',
  });
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Real data ─────────────────────────────────────────────────────────────
  const [courses,        setCourses]        = useState<any[]>([]);
  const [students,       setStudents]       = useState<any[]>([]);
  const [qaList,         setQaList]         = useState<any[]>([]);
  const [reviews,        setReviews]        = useState<any[]>([]);
  const [monthlyData,    setMonthlyData]    = useState<any[]>([]);

  const [loadingCourses,  setLoadingCourses]  = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingQA,       setLoadingQA]       = useState(true);
  const [loadingReviews,  setLoadingReviews]  = useState(true);

  // ── Form states ───────────────────────────────────────────────────────────
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', level: 'Beginner', price: '' });

  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', courseId: '', type: 'video' });

  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizForm, setQuizForm] = useState({
    title: '', courseId: '',
    questions: [{ question: '', options: ['', '', '', ''], correct: 0, explanation: '' }],
  });

  // ── QA states ─────────────────────────────────────────────────────────────
  const [qaFilter,   setQaFilter]   = useState<QAFilter>('all');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [openReply,  setOpenReply]  = useState<string | null>(null);

  // ── Review states ─────────────────────────────────────────────────────────
  const [reviewReply,     setReviewReply]     = useState<Record<string, string>>({});
  const [openReviewReply, setOpenReviewReply] = useState<string | null>(null);

  // ── Chat states ───────────────────────────────────────────────────────────
  const [chatStudentId, setChatStudentId] = useState<string | null>(null);
  const [chatMessages,  setChatMessages]  = useState<Record<string, { from: string; text: string; time: string }[]>>({});
  const [chatInput,     setChatInput]     = useState('');

  // ── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/api/auth/profile/`, { headers: authHeaders() });
      if (!res.ok) { localStorage.clear(); onNavigate('auth'); return; }
      const data = await res.json();
      setUser(data);
      if (data.avatar) {
        setAvatarUrl(data.avatar.startsWith('http') ? data.avatar : `${API}${data.avatar}`);
      }
      setProfileForm({
        name:     data.full_name     ?? '',
        title:    data.title         ?? '',
        email:    data.email         ?? '',
        phone:    data.phone         ?? '',
        location: data.location      ?? '',
        bio:      data.bio           ?? '',
        facebook: data.social?.facebook ?? '',
        linkedin: data.social?.linkedin ?? '',
        youtube:  data.social?.youtube  ?? '',
      });
    })();
  }, []);

  // ── Fetch courses ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingCourses(true);
      try {
        const res = await fetch(`${API}/api/courses/mine/`, { headers: authHeaders() });
        if (res.ok) setCourses(toList(await res.json()));
      } catch (_) {}
      setLoadingCourses(false);
    })();
  }, []);

  // ── Fetch students ────────────────────────────────────────────────────────
  useEffect(() => {
    if (courses.length === 0) return;
    (async () => {
      setLoadingStudents(true);
      try {
        const allResults = await Promise.all(
          courses.map(c =>
            fetch(`${API}/api/enrollments/instructor/${c.id}/students/`, { headers: authHeaders() })
              .then(r => r.ok ? r.json() : [])
              .then(data => toList(data).map((item: any) => ({
                id:         item.id,
                name:       item.student?.full_name  ?? item.student_name  ?? '—',
                email:      item.student?.email      ?? item.student_email ?? '—',
                course:     c.title,
                progress:   item.progress            ?? 0,
                joinedDate: (item.created_at         ?? item.enrolled_at   ?? '').slice(0, 10),
                lastActive: item.last_active         ?? '',
              })))
          )
        );
        const merged = allResults.flat();
        const unique = merged.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
        setStudents(unique);
      } catch (_) {}
      setLoadingStudents(false);
    })();
  }, [courses]);

  // ── Fetch QA ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingQA(true);
      try {
        const res = await fetch(`${API}/api/qa/instructor/`, { headers: authHeaders() });
        if (res.ok) setQaList(toList(await res.json()));
      } catch (_) {}
      setLoadingQA(false);
    })();
  }, []);

  // ── Fetch reviews ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingReviews(true);
      try {
        const res = await fetch(`${API}/api/reviews/instructor/`, { headers: authHeaders() });
        if (res.ok) setReviews(toList(await res.json()));
      } catch (_) {}
      setLoadingReviews(false);
    })();
  }, []);

  // ── Fetch monthly revenue stats ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/analytics/revenue/monthly/`, { headers: authHeaders() });
        if (res.ok) setMonthlyData(toList(await res.json()));
      } catch (_) {}
    })();
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalRevenue = courses.reduce((a, c) => {
    const price    = Number(c.sale_price) || Number(c.price) || 0;
    const studs    = Number(c.total_students) || 0;
    return a + price * studs;
  }, 0);
  const avgRating = courses.length > 0
    ? (courses.reduce((a, c) => a + (Number(c.rating) || 0), 0) / courses.length).toFixed(1)
    : '—';

  const quizList = courses.flatMap(c =>
    (c.curriculum ?? c.sections ?? []).flatMap((s: any) =>
      (s.lessons ?? [])
        .filter((l: any) => l.quiz || l.has_quiz)
        .map((l: any) => ({
          id:        l.id,
          title:     l.quiz?.title           ?? l.title,
          course:    c.title,
          questions: l.quiz?.questions_count  ?? 0,
          attempts:  l.quiz?.attempts_count   ?? 0,
          avgScore:  l.quiz?.avg_score        ?? 0,
        }))
    )
  );

  const pendingCount = qaList.filter(q => !q.resolved).length;

  const filteredQA = useMemo(() => {
    if (qaFilter === 'pending')  return qaList.filter(q => !q.resolved);
    if (qaFilter === 'resolved') return qaList.filter(q =>  q.resolved);
    return qaList;
  }, [qaList, qaFilter]);

  // Chart data — dùng monthlyData từ API nếu có, fallback empty
  const chartData = useMemo(() => {
    if (monthlyData.length === 0) return [];
    if (chartRange === '3m') return monthlyData.slice(-3);
    if (chartRange === '6m') return monthlyData.slice(-6);
    return monthlyData;
  }, [monthlyData, chartRange]);

  const chartTotalRevenue     = chartData.reduce((a: number, b: any) => a + (b.revenue ?? 0), 0);
  const chartTotalEnrollments = chartData.reduce((a: number, b: any) => a + (b.enrollments ?? 0), 0);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addQuizQuestion = () => setQuizForm(f => ({
    ...f,
    questions: [...f.questions, { question: '', options: ['', '', '', ''], correct: 0, explanation: '' }],
  }));

  const handleReplyQA = async (qaId: string) => {
    const text = replyTexts[qaId]?.trim();
    if (!text) return;
    try {
      await fetch(`${API}/api/qa/${qaId}/reply/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text }),
      });
    } catch (_) {}
    setQaList(list => list.map(q => q.id !== qaId ? q : {
      ...q, resolved: true,
      replies: [...(q.replies ?? []), {
        author: user?.full_name ?? 'Giảng viên', isInstructor: true,
        text, time: new Date().toLocaleString('vi-VN'),
      }],
    }));
    setReplyTexts(r => ({ ...r, [qaId]: '' }));
    setOpenReply(null);
  };

  const handleReplyReview = async (rvId: string) => {
    const text = reviewReply[rvId]?.trim();
    if (!text) return;
    try {
      await fetch(`${API}/api/reviews/${rvId}/reply/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text }),
      });
    } catch (_) {}
    setReviews(list => list.map(r => r.id !== rvId ? r : { ...r, replied: true, replyText: text }));
    setReviewReply(r => ({ ...r, [rvId]: '' }));
    setOpenReviewReply(null);
  };

  const handleSendChat = (studentId: string) => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => ({
      ...prev,
      [studentId]: [
        ...(prev[studentId] || []),
        {
          from: 'instructor', text: chatInput.trim(),
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    }));
    setChatInput('');
  };

  const getLessonTypeLabel = (type: string) => {
    if (type === 'theory' || type === 'video') return 'Lý thuyết';
    if (type === 'quiz') return 'Bài kiểm tra';
    if (type === 'article') return 'Bài viết';
    if (type === 'project') return 'Bài tập';
    return type ?? '';
  };

  const chatStudent = chatStudentId ? students.find(s => s.id === chatStudentId) : null;
  const chatMsgs    = chatStudentId ? (chatMessages[chatStudentId] || []) : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="id-page">
      <div className="container id-layout">

        {/* ── Sidebar ── */}
        <aside className="id-sidebar">
          <div className="id-profile">
            <div className="id-profile__avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <svg viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="32" fill="#1B263B" />
                  <circle cx="32" cy="24" r="10" fill="#415A77" />
                  <path d="M8 56c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#415A77" />
                </svg>
              )}
            </div>
            <strong className="id-profile__name">{user?.full_name || 'Instructor'}</strong>
            <span className="id-profile__title">{user?.title || user?.email || ''}</span>
          </div>

          <nav className="id-nav">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`id-nav__item${activeTab === tab.id ? ' id-nav__item--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.id === 'qa' && pendingCount > 0 && (
                  <span className="id-nav__badge">{pendingCount}</span>
                )}
              </button>
            ))}
          </nav>

          <button className="id-nav__item id-nav__item--back" onClick={onLogout}>
            Đăng xuất
          </button>
        </aside>

        {/* ── Main ── */}
        <main className="id-main">

          {/* ════ OVERVIEW ════ */}
          {activeTab === 'overview' && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">
                  Xin chào, {user?.full_name?.split(' ').pop() || 'Instructor'} 👋
                </h1>
                <p className="id-page-sub">Quản lý khóa học và theo dõi học viên của bạn.</p>
              </div>

              <div className="id-stats-grid">
                {[
                  { value: loadingCourses  ? '…' : courses.length.toString(),                  label: 'Khóa học' },
                  { value: loadingStudents ? '…' : students.length.toLocaleString(),            label: 'Học viên' },
                  { value: loadingCourses  ? '…' : formatPrice(totalRevenue, 'VND'),            label: 'Doanh thu' },
                  { value: loadingCourses  ? '…' : `${avgRating} ★`,                           label: 'Đánh giá TB' },
                ].map((s, i) => (
                  <div key={i} className="id-stat-card">
                    <span className="id-stat-card__value">{s.value}</span>
                    <span className="id-stat-card__label">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Mini chart — 6 tháng gần nhất */}
              {chartData.length > 0 && (
                <div className="id-chart-card">
                  <div className="id-chart-card__header">
                    <div>
                      <div className="id-chart-card__title">Doanh thu 6 tháng qua</div>
                      <div className="id-chart-card__meta">
                        Tổng: {formatPrice(monthlyData.slice(-6).reduce((a: number, b: any) => a + (b.revenue ?? 0), 0), 'VND')}
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={monthlyData.slice(-6)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(119,141,169,0.1)" />
                      <XAxis dataKey="month" tick={{ fill: 'rgba(224,225,221,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(224,225,221,0.4)', fontSize: 10 }} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" name="Doanh thu" fill="#5b8dee" radius={[4, 4, 0, 0]}>
                        {monthlyData.slice(-6).map((_: any, i: number) => <Cell key={i} fill="#5b8dee" />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tỷ lệ hoàn thành */}
              {!loadingCourses && courses.length > 0 && (
                <>
                  <h2 className="id-section-title">Tỷ lệ hoàn thành theo khóa</h2>
                  <div className="id-completion-list">
                    {courses.map(c => {
                      const completionRate = Number(c.completion_rate) || Number(c.completionRate) || 0;
                      const enrolledCount  = Number(c.total_students) || 0;
                      const revenue        = (Number(c.sale_price) || Number(c.price) || 0) * enrolledCount;
                      return (
                        <div key={c.id} className="id-completion-row">
                          <DonutChart pct={completionRate} color={completionRate >= 70 ? '#4caf82' : '#5b8dee'} />
                          <div className="id-completion-row__info">
                            <span className="id-completion-row__title">{c.title}</span>
                            <span className="id-completion-row__meta">
                              {enrolledCount.toLocaleString()} học viên · {formatPrice(revenue, 'VND')}
                            </span>
                          </div>
                          <span className={`id-badge id-badge--${c.status}`}>
                            {c.status === 'published' ? 'Đã đăng' : 'Nháp'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {pendingCount > 0 && (
                <button className="id-alert id-alert--warning" onClick={() => setActiveTab('qa')}>
                  <div>
                    <div className="id-alert__title">{pendingCount} câu hỏi chưa được trả lời</div>
                    <div className="id-alert__sub">Nhấn để xem và trả lời học viên →</div>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* ════ REVENUE ════ */}
          {activeTab === 'revenue' && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Doanh thu & Thống kê</h1>
                <p className="id-page-sub">Tổng quan tài chính và lượt đăng ký</p>
              </div>

              <div className="id-stats-grid">
                {[
                  { value: formatPrice(chartTotalRevenue, 'VND'),
                    label: `Doanh thu (${chartRange === '3m' ? '3T' : chartRange === '6m' ? '6T' : '1N'})` },
                  { value: chartTotalEnrollments.toLocaleString(),  label: 'Lượt đăng ký' },
                  { value: chartTotalEnrollments > 0
                      ? formatPrice(Math.round(chartTotalRevenue / chartTotalEnrollments), 'VND')
                      : '—',
                    label: 'DT / học viên' },
                  { value: `${avgRating} ★`, label: 'Đánh giá TB' },
                ].map((s, i) => (
                  <div key={i} className="id-stat-card">
                    <span className="id-stat-card__value id-stat-card__value--sm">{s.value}</span>
                    <span className="id-stat-card__label">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="id-chart-card">
                <div className="id-chart-card__header">
                  <div className="id-chart-card__title">Doanh thu theo tháng</div>
                  <div className="id-chart-filters">
                    {(['3m', '6m', '1y'] as ChartRange[]).map(r => (
                      <button
                        key={r}
                        className={`id-chart-filter-btn${chartRange === r ? ' id-chart-filter-btn--active' : ''}`}
                        onClick={() => setChartRange(r)}
                      >
                        {r === '3m' ? '3 tháng' : r === '6m' ? '6 tháng' : '1 năm'}
                      </button>
                    ))}
                  </div>
                </div>
                {chartData.length === 0 ? (
                  <p className="id-muted">Chưa có dữ liệu doanh thu.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(119,141,169,0.1)" />
                      <XAxis dataKey="month" tick={{ fill: 'rgba(224,225,221,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(224,225,221,0.4)', fontSize: 10 }} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(224,225,221,0.5)', paddingTop: 8 }} />
                      <Bar dataKey="revenue" name="Doanh thu" fill="#5b8dee" radius={[4, 4, 0, 0]}>
                        {chartData.map((_: any, i: number) => <Cell key={i} fill="#5b8dee" />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {chartData.length > 0 && (
                <div className="id-chart-card">
                  <div className="id-chart-card__header">
                    <div className="id-chart-card__title">Lượt đăng ký theo tháng</div>
                    <div className="id-chart-card__meta">Tổng: {chartTotalEnrollments} học viên</div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(119,141,169,0.1)" />
                      <XAxis dataKey="month" tick={{ fill: 'rgba(224,225,221,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(224,225,221,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="enrollments" name="Lượt đăng ký" fill="#5b8dee" radius={[4, 4, 0, 0]}>
                        {chartData.map((_: any, i: number) => <Cell key={i} fill="#5b8dee" />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Bảng doanh thu theo khóa */}
              {!loadingCourses && courses.length > 0 && (
                <div className="id-chart-card">
                  <div className="id-chart-card__header">
                    <div className="id-chart-card__title">Doanh thu theo khóa học</div>
                  </div>
                  <div className="id-table-wrap" style={{ border: 'none' }}>
                    <table className="id-table">
                      <thead>
                        <tr><th>Khóa học</th><th>Học viên</th><th>Hoàn thành</th><th>Doanh thu</th><th>Đơn giá TB</th></tr>
                      </thead>
                      <tbody>
                        {courses.map(c => {
                          const enrolled       = Number(c.total_students) || 0;
                          const price          = Number(c.sale_price) || Number(c.price) || 0;
                          const revenue        = price * enrolled;
                          const completionRate = Number(c.completion_rate) || Number(c.completionRate) || 0;
                          return (
                            <tr key={c.id}>
                              <td className="id-table__title">{c.title}</td>
                              <td>{enrolled.toLocaleString()}</td>
                              <td>
                                <div className="id-progress-cell">
                                  <div className="id-progress-bar">
                                    <div className="id-progress-fill" style={{ width: `${completionRate}%` }} />
                                  </div>
                                  <span>{completionRate}%</span>
                                </div>
                              </td>
                              <td className="id-table__positive">{formatPrice(revenue, 'VND')}</td>
                              <td>{formatPrice(price, 'VND')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ COURSES ════ */}
          {activeTab === 'courses' && (
            <div className="id-content">
              <div className="id-page-header id-page-header--row">
                <div>
                  <h1 className="id-page-title">Quản lý khóa học</h1>
                  <p className="id-page-sub">
                    {loadingCourses ? '…' : `${courses.length} khóa học`}
                  </p>
                </div>
                <button className="id-btn-primary" onClick={() => setShowCourseForm(v => !v)}>
                  {showCourseForm ? 'Hủy' : '+ Tạo khóa học'}
                </button>
              </div>

              {showCourseForm && (
                <div className="id-form-card">
                  <h3 className="id-form-card__title">Tạo khóa học mới</h3>
                  <div className="id-form-grid">
                    <div className="id-field id-field--full">
                      <label className="id-field__label">Tên khóa học</label>
                      <input className="id-field__input" placeholder="Ví dụ: Tiếng Anh B2 — Nâng cao"
                        value={courseForm.title}
                        onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="id-field id-field--full">
                      <label className="id-field__label">Mô tả ngắn</label>
                      <textarea className="id-field__textarea" rows={3} placeholder="Mô tả ngắn gọn..."
                        value={courseForm.description}
                        onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="id-field">
                      <label className="id-field__label">Cấp độ</label>
                      <select className="id-field__input" value={courseForm.level}
                        onChange={e => setCourseForm(f => ({ ...f, level: e.target.value }))}>
                        <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                      </select>
                    </div>
                    <div className="id-field">
                      <label className="id-field__label">Học phí (VND)</label>
                      <input className="id-field__input" type="number" placeholder="0 = Miễn phí"
                        value={courseForm.price}
                        onChange={e => setCourseForm(f => ({ ...f, price: e.target.value }))} />
                    </div>
                  </div>
                  <div className="id-form-actions">
                    <button className="id-btn-primary" onClick={() => setShowCourseForm(false)}>Lưu nháp</button>
                    <button className="id-btn-secondary" onClick={() => setShowCourseForm(false)}>Đăng ngay</button>
                  </div>
                </div>
              )}

              {loadingCourses ? (
                <p className="id-muted">Đang tải…</p>
              ) : courses.length === 0 ? (
                <p className="id-muted">Chưa có khóa học nào.</p>
              ) : (
                <div className="id-course-list">
                  {courses.map(c => {
                    const enrolled = Number(c.total_students) || 0;
                    const revenue  = (Number(c.sale_price) || Number(c.price) || 0) * enrolled;
                    const completion = Number(c.completion_rate) || Number(c.completionRate) || 0;
                    return (
                      <div key={c.id} className="id-course-row">
                        {thumbSrc(c.thumbnail) && (
                          <img src={thumbSrc(c.thumbnail)!} alt={c.title} className="id-course-row__thumb" />
                        )}
                        <div className="id-course-row__info">
                          <span className="id-course-row__title">{c.title}</span>
                          <span className="id-course-row__meta">
                            {enrolled.toLocaleString()} học viên · {formatPrice(revenue, 'VND')} · Hoàn thành: {completion}%
                          </span>
                        </div>
                        <span className={`id-badge id-badge--${c.status}`}>
                          {c.status === 'published' ? 'Đã đăng' : 'Nháp'}
                        </span>
                        <div className="id-course-row__actions">
                          <button className="id-btn-sm">Sửa</button>
                          <button className="id-btn-sm id-btn-sm--danger">Xóa</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════ LESSONS ════ */}
          {activeTab === 'lessons' && (
            <div className="id-content">
              <div className="id-page-header id-page-header--row">
                <div>
                  <h1 className="id-page-title">Quản lý bài học</h1>
                  <p className="id-page-sub">Thêm bài học, lý thuyết và tài liệu</p>
                </div>
                <button className="id-btn-primary" onClick={() => setShowLessonForm(v => !v)}>
                  {showLessonForm ? 'Hủy' : '+ Thêm bài học'}
                </button>
              </div>

              {showLessonForm && (
                <div className="id-form-card">
                  <h3 className="id-form-card__title">Thêm bài học mới</h3>
                  <div className="id-form-grid">
                    <div className="id-field">
                      <label className="id-field__label">Khóa học</label>
                      <select className="id-field__input" value={lessonForm.courseId}
                        onChange={e => setLessonForm(f => ({ ...f, courseId: e.target.value }))}>
                        <option value="">Chọn khóa học...</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div className="id-field">
                      <label className="id-field__label">Loại bài học</label>
                      <select className="id-field__input" value={lessonForm.type}
                        onChange={e => setLessonForm(f => ({ ...f, type: e.target.value }))}>
                        <option value="theory">Lý thuyết</option>
                        <option value="article">Bài viết</option>
                        <option value="project">Bài tập</option>
                      </select>
                    </div>
                    <div className="id-field id-field--full">
                      <label className="id-field__label">Tiêu đề bài học</label>
                      <input className="id-field__input" placeholder="Ví dụ: Phát âm nguyên âm đôi"
                        value={lessonForm.title}
                        onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="id-field id-field--full">
                      <label className="id-field__label">
                        {lessonForm.type === 'theory' ? 'Upload lý thuyết' : 'Upload tài liệu'}
                      </label>
                      <label className="id-upload-area">
                        <input type="file" style={{ display: 'none' }}
                          accept={lessonForm.type === 'theory' ? 'video/*' : '.pdf,.doc,.docx'} />
                        <span className="id-upload-area__text">Kéo thả hoặc bấm để chọn file</span>
                        <span className="id-upload-area__hint">
                          {lessonForm.type === 'theory' ? 'MP4, MOV · Tối đa 500MB' : 'PDF, DOC · Tối đa 50MB'}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="id-form-actions">
                    <button className="id-btn-primary" onClick={() => setShowLessonForm(false)}>Lưu bài học</button>
                  </div>
                </div>
              )}

              <div className="id-lesson-list">
                {loadingCourses ? (
                  <p className="id-muted">Đang tải…</p>
                ) : courses.length === 0 ? (
                  <p className="id-muted">Chưa có bài học nào.</p>
                ) : (
                  courses.map(course => {
                    const allLessons = (course.curriculum ?? course.sections ?? [])
                      .flatMap((s: any) => s.lessons ?? []);
                    return (
                      <div key={course.id} className="id-lesson-group">
                        <div className="id-lesson-group__header">
                          <span className="id-lesson-group__title">{course.title}</span>
                          <span className="id-lesson-group__count">
                            {course.lesson_count ?? course.total_lessons ?? allLessons.length} bài
                          </span>
                        </div>
                        {allLessons.length === 0 ? (
                          <p className="id-muted" style={{ padding: '8px 0 8px 16px' }}>Chưa có bài học.</p>
                        ) : (
                          allLessons.slice(0, 5).map((lesson: any, i: number) => (
                            <div key={lesson.id} className="id-lesson-row">
                              <span className="id-lesson-row__num">{i + 1}</span>
                              <span className="id-lesson-row__title">{lesson.title}</span>
                              <span className="id-lesson-row__type">
                                {getLessonTypeLabel(lesson.type ?? lesson.lesson_type ?? '')}
                              </span>
                              <span className="id-lesson-row__duration">{lesson.duration ?? ''}</span>
                              <div className="id-lesson-row__actions">
                                <button className="id-btn-sm">Sửa</button>
                                <button className="id-btn-sm id-btn-sm--danger">Xóa</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ════ QUIZ ════ */}
          {activeTab === 'quiz' && (
            <div className="id-content">
              <div className="id-page-header id-page-header--row">
                <div>
                  <h1 className="id-page-title">Bài kiểm tra</h1>
                  <p className="id-page-sub">{quizList.length} bài kiểm tra</p>
                </div>
                <button className="id-btn-primary" onClick={() => setShowQuizForm(v => !v)}>
                  {showQuizForm ? 'Hủy' : '+ Tạo bài kiểm tra'}
                </button>
              </div>

              {showQuizForm && (
                <div className="id-form-card">
                  <h3 className="id-form-card__title">Tạo bài kiểm tra mới</h3>
                  <div className="id-form-grid">
                    <div className="id-field">
                      <label className="id-field__label">Khóa học</label>
                      <select className="id-field__input" value={quizForm.courseId}
                        onChange={e => setQuizForm(f => ({ ...f, courseId: e.target.value }))}>
                        <option value="">Chọn khóa học...</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div className="id-field">
                      <label className="id-field__label">Tiêu đề bài kiểm tra</label>
                      <input className="id-field__input" placeholder="Ví dụ: Kiểm tra chương 1"
                        value={quizForm.title}
                        onChange={e => setQuizForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                  </div>
                  <div className="id-quiz-questions">
                    {quizForm.questions.map((q, qi) => (
                      <div key={qi} className="id-quiz-question">
                        <div className="id-quiz-question__header">
                          <span className="id-quiz-question__num">Câu {qi + 1}</span>
                          <span className="id-quiz-question__hint">Chọn radio = đáp án đúng</span>
                        </div>
                        <input className="id-field__input" placeholder="Nội dung câu hỏi..."
                          value={q.question}
                          onChange={e => setQuizForm(f => {
                            const qs = [...f.questions]; qs[qi] = { ...qs[qi], question: e.target.value };
                            return { ...f, questions: qs };
                          })} />
                        <div className="id-quiz-options">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="id-quiz-option">
                              <input type="radio" name={`correct-${qi}`} checked={q.correct === oi}
                                onChange={() => setQuizForm(f => {
                                  const qs = [...f.questions]; qs[qi] = { ...qs[qi], correct: oi };
                                  return { ...f, questions: qs };
                                })} />
                              <input className="id-field__input" placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`}
                                value={opt}
                                onChange={e => setQuizForm(f => {
                                  const qs = [...f.questions];
                                  const opts = [...qs[qi].options]; opts[oi] = e.target.value;
                                  qs[qi] = { ...qs[qi], options: opts };
                                  return { ...f, questions: qs };
                                })} />
                            </div>
                          ))}
                        </div>
                        <div className="id-field">
                          <label className="id-field__label">Giải thích đáp án (tuỳ chọn)</label>
                          <input className="id-field__input" placeholder="Giải thích tại sao đáp án này đúng..."
                            value={q.explanation}
                            onChange={e => setQuizForm(f => {
                              const qs = [...f.questions]; qs[qi] = { ...qs[qi], explanation: e.target.value };
                              return { ...f, questions: qs };
                            })} />
                        </div>
                      </div>
                    ))}
                    <button className="id-btn-secondary" onClick={addQuizQuestion}>+ Thêm câu hỏi</button>
                  </div>
                  <div className="id-form-actions">
                    <button className="id-btn-primary" onClick={() => setShowQuizForm(false)}>Lưu bài kiểm tra</button>
                  </div>
                </div>
              )}

              <div className="id-quiz-list">
                {loadingCourses ? (
                  <p className="id-muted">Đang tải…</p>
                ) : quizList.length === 0 ? (
                  <p className="id-muted">Chưa có bài kiểm tra nào. Nhấn "+ Tạo bài kiểm tra" để bắt đầu.</p>
                ) : (
                  quizList.map(q => (
                    <div key={q.id} className="id-quiz-row">
                      <div className="id-quiz-row__info">
                        <span className="id-quiz-row__title">{q.title}</span>
                        <span className="id-quiz-row__meta">
                          {q.course} · {q.questions} câu · {q.attempts} lượt làm
                          {q.avgScore ? ` · Điểm TB: ${q.avgScore}%` : ''}
                        </span>
                      </div>
                      <div className="id-quiz-row__actions">
                        <button className="id-btn-sm">Sửa</button>
                        <button className="id-btn-sm id-btn-sm--danger">Xóa</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ════ STUDENTS ════ */}
          {activeTab === 'students' && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Danh sách học viên</h1>
                <p className="id-page-sub">
                  {loadingStudents ? '…' : `${students.length} học viên đang học`}
                </p>
              </div>

              <div className="id-table-wrap">
                {loadingStudents ? (
                  <p className="id-muted">Đang tải…</p>
                ) : students.length === 0 ? (
                  <p className="id-muted">Chưa có học viên nào.</p>
                ) : (
                  <table className="id-table">
                    <thead>
                      <tr>
                        <th>Học viên</th><th>Khóa học</th><th>Tiến độ</th>
                        <th>Hoạt động</th><th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.id}>
                          <td>
                            <div className="id-student-cell">
                              <span className="id-student-cell__name">{s.name}</span>
                              <span className="id-student-cell__email">{s.email}</span>
                            </div>
                          </td>
                          <td>{s.course}</td>
                          <td>
                            <div className="id-progress-cell">
                              <div className="id-progress-bar">
                                <div className="id-progress-fill" style={{ width: `${s.progress}%` }} />
                              </div>
                              <span>{s.progress}%</span>
                            </div>
                          </td>
                          <td className="id-table__muted">{s.lastActive || s.joinedDate}</td>
                          <td>
                            <button className="id-btn-sm" onClick={() => {
                              setChatStudentId(s.id);
                              if (!chatMessages[s.id]) setChatMessages(p => ({ ...p, [s.id]: [] }));
                            }}>
                              💬 Nhắn tin
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Chat panel */}
              {chatStudent && (
                <div className="id-chat-panel">
                  <div className="id-chat-header">
                    <div className="id-chat-header__info">
                      <div className="id-chat-header__avatar">{chatStudent.name.charAt(0)}</div>
                      <div>
                        <div className="id-chat-header__name">{chatStudent.name}</div>
                        <div className="id-chat-header__course">{chatStudent.course}</div>
                      </div>
                    </div>
                    <button className="id-chat-header__close" onClick={() => setChatStudentId(null)}>✕</button>
                  </div>
                  <div className="id-chat-body">
                    {chatMsgs.length === 0
                      ? <p className="id-chat-empty">Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!</p>
                      : chatMsgs.map((m, i) => (
                        <div key={i} className={`id-chat-row id-chat-row--${m.from === 'instructor' ? 'right' : 'left'}`}>
                          <div className={`id-chat-bubble id-chat-bubble--${m.from}`}>
                            {m.text}
                            <div className="id-chat-bubble__time">{m.time}</div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  <div className="id-chat-footer">
                    <input
                      className="id-field__input"
                      placeholder="Nhập tin nhắn..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(chatStudentId!); }
                      }}
                    />
                    <button className="id-btn-primary" onClick={() => handleSendChat(chatStudentId!)}>Gửi</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ QA ════ */}
          {activeTab === 'qa' && (
            <div className="id-content">
              <div className="id-page-header id-page-header--row">
                <div>
                  <h1 className="id-page-title">Hỏi & Đáp</h1>
                  <p className="id-page-sub">{filteredQA.length} câu hỏi · {pendingCount} chưa trả lời</p>
                </div>
                <div className="id-chart-filters">
                  {(['all', 'pending', 'resolved'] as QAFilter[]).map(f => (
                    <button
                      key={f}
                      className={`id-chart-filter-btn${qaFilter === f ? ' id-chart-filter-btn--active' : ''}`}
                      onClick={() => setQaFilter(f)}
                    >
                      {f === 'all' ? 'Tất cả' : f === 'pending' ? `Chờ (${pendingCount})` : 'Đã trả lời'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="id-qa-list">
                {loadingQA ? (
                  <p className="id-muted">Đang tải…</p>
                ) : filteredQA.length === 0 ? (
                  <p className="id-qa-empty">Không có câu hỏi nào.</p>
                ) : (
                  filteredQA.map((qa: any) => (
                    <div key={qa.id} className={`id-qa-card id-qa-card--${qa.resolved ? 'resolved' : 'pending'}`}>
                      <div className="id-qa-question">
                        <div className="id-qa-question__top">
                          {qa.student?.avatar
                            ? <img className="id-qa-question__avatar" src={qa.student.avatar} alt={qa.student?.name ?? ''} />
                            : (
                              <div className="id-qa-question__avatar" style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: '#1B263B', color: '#778da9', fontWeight: 700, fontSize: 14,
                              }}>
                                {(qa.student?.name ?? qa.student_name ?? '?').charAt(0)}
                              </div>
                            )
                          }
                          <div>
                            <div className="id-qa-question__name">{qa.student?.name ?? qa.student_name ?? '—'}</div>
                            <div className="id-qa-question__meta">
                              {qa.course ?? qa.course_title ?? ''}{qa.lesson ? ` · ${qa.lesson}` : ''} · {qa.askedAt ?? qa.created_at ?? ''}
                            </div>
                          </div>
                          <span className={`id-qa-question__status id-qa-question__status--${qa.resolved ? 'resolved' : 'pending'}`}>
                            {qa.resolved ? '✓ Đã trả lời' : '⏳ Chờ trả lời'}
                          </span>
                        </div>
                        <p className="id-qa-question__text">{qa.question ?? qa.content ?? ''}</p>
                      </div>

                      {(qa.replies ?? []).map((rep: any, i: number) => (
                        <div key={i} className={`id-qa-reply ${rep.isInstructor ? 'id-qa-reply--instructor' : 'id-qa-reply--student'}`}>
                          <div className="id-qa-reply__avatar-placeholder">
                            {rep.isInstructor ? 'GV' : rep.author?.charAt(0) ?? '?'}
                          </div>
                          <div>
                            <div className="id-qa-reply__author">
                              {rep.author}
                              {rep.isInstructor && <span className="id-qa-reply__instructor-tag"> · Giảng viên</span>}
                            </div>
                            <p className="id-qa-reply__text">{rep.text ?? rep.content ?? ''}</p>
                            <div className="id-qa-reply__time">{rep.time ?? rep.created_at ?? ''}</div>
                          </div>
                        </div>
                      ))}

                      {!qa.resolved && (
                        <div className="id-qa-action">
                          {openReply === qa.id ? (
                            <div className="id-qa-reply-form">
                              <textarea
                                className="id-qa-reply-form__textarea"
                                rows={2}
                                placeholder="Nhập câu trả lời của bạn..."
                                value={replyTexts[qa.id] || ''}
                                onChange={e => setReplyTexts(r => ({ ...r, [qa.id]: e.target.value }))}
                              />
                              <div className="id-qa-reply-form__actions">
                                <button className="id-btn-secondary" onClick={() => setOpenReply(null)}>Hủy</button>
                                <button className="id-btn-primary" onClick={() => handleReplyQA(qa.id)}>Gửi trả lời</button>
                              </div>
                            </div>
                          ) : (
                            <button className="id-btn-sm" onClick={() => setOpenReply(qa.id)}>
                              ✎ Trả lời câu hỏi này
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ════ REVIEWS ════ */}
          {activeTab === 'reviews' && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Đánh giá khóa học</h1>
                <p className="id-page-sub">
                  {reviews.length} đánh giá{avgRating !== '—' ? ` · Trung bình ${avgRating} ★` : ''}
                </p>
              </div>

              {/* Summary */}
              {reviews.length > 0 && (
                <div className="id-review-summary">
                  <div className="id-review-summary__score">
                    <div className="id-review-summary__big">{avgRating}</div>
                    <div className="id-review-summary__stars">★★★★★</div>
                    <div className="id-review-summary__sub">Điểm trung bình</div>
                  </div>
                  <div className="id-review-summary__bars">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = reviews.filter(r => Math.round(Number(r.rating)) === star).length;
                      const pct   = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                      return (
                        <div key={star} className="id-review-bar-row">
                          <span className="id-review-bar-label">{star} ★</span>
                          <div className="id-review-bar-track">
                            <div className="id-review-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="id-review-bar-pct">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="id-review-list">
                {loadingReviews ? (
                  <p className="id-muted">Đang tải…</p>
                ) : reviews.length === 0 ? (
                  <p className="id-muted">Chưa có đánh giá nào.</p>
                ) : (
                  reviews.map((rv: any) => (
                    <div key={rv.id} className="id-review-card">
                      <div className="id-review-card__body">
                        <div className="id-review-card__top">
                          {rv.student?.avatar
                            ? <img className="id-review-card__avatar" src={rv.student.avatar} alt={rv.student?.name ?? ''} />
                            : (
                              <div className="id-review-card__avatar" style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: '#1B263B', color: '#778da9', fontWeight: 700, fontSize: 14,
                              }}>
                                {(rv.student?.name ?? rv.student_name ?? '?').charAt(0)}
                              </div>
                            )
                          }
                          <div>
                            <div className="id-review-card__name">{rv.student?.name ?? rv.student_name ?? '—'}</div>
                            <div className="id-review-card__course">
                              {rv.course ?? rv.course_title ?? ''} · {(rv.date ?? rv.created_at ?? '').slice(0, 10)}
                            </div>
                          </div>
                          <div className="id-review-card__stars">
                            {'★'.repeat(Math.round(Number(rv.rating)))}
                            {'☆'.repeat(5 - Math.round(Number(rv.rating)))}
                          </div>
                        </div>
                        <p className="id-review-card__comment">{rv.comment ?? rv.content ?? ''}</p>
                      </div>

                      {rv.replied && rv.replyText && (
                        <div className="id-review-reply">
                          <div className="id-review-reply__avatar-placeholder">GV</div>
                          <div>
                            <div className="id-review-reply__author">
                              {user?.full_name || 'Giảng viên'}
                              <span className="id-review-reply__tag"> · Giảng viên</span>
                            </div>
                            <p className="id-review-reply__text">{rv.replyText}</p>
                          </div>
                        </div>
                      )}

                      {!rv.replied && (
                        <div className="id-review-action">
                          {openReviewReply === rv.id ? (
                            <div className="id-review-reply-form">
                              <textarea
                                className="id-review-reply-form__textarea"
                                rows={2}
                                placeholder="Phản hồi đánh giá này..."
                                value={reviewReply[rv.id] || ''}
                                onChange={e => setReviewReply(r => ({ ...r, [rv.id]: e.target.value }))}
                              />
                              <div className="id-review-reply-form__actions">
                                <button className="id-btn-secondary" onClick={() => setOpenReviewReply(null)}>Hủy</button>
                                <button className="id-btn-primary" onClick={() => handleReplyReview(rv.id)}>Gửi phản hồi</button>
                              </div>
                            </div>
                          ) : (
                            <button className="id-btn-sm" onClick={() => setOpenReviewReply(rv.id)}>
                              ✎ Phản hồi đánh giá
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ════ PROFILE ════ */}
          {activeTab === 'profile' && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Hồ sơ cá nhân</h1>
                <p className="id-page-sub">Cập nhật thông tin hiển thị công khai của bạn</p>
              </div>

              <div className="id-profile-card">
                <div className="id-profile-card__avatar-section">
                  <div className="id-profile-card__avatar-col">
                    <div className="id-profile-card__avatar-wrap">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="id-profile-card__avatar-img" />
                      ) : (
                        <svg viewBox="0 0 100 100" fill="none" width="100" height="100">
                          <circle cx="50" cy="50" r="50" fill="#1B263B" />
                          <circle cx="50" cy="38" r="16" fill="#415A77" />
                          <path d="M10 88c0-22.091 17.909-40 40-40s40 17.909 40 40" fill="#415A77" />
                        </svg>
                      )}
                    </div>
                    <label className="id-avatar-upload-btn">
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                      Đổi ảnh
                    </label>
                  </div>
                  <div className="id-profile-card__avatar-info">
                    <div className="id-profile-card__name">{profileForm.name || user?.full_name}</div>
                    <div className="id-profile-card__title-text">{profileForm.title || user?.title}</div>
                    <div className="id-profile-card__stats">
                      <span>{students.length.toLocaleString()} học viên</span>
                      <span>·</span>
                      <span>{courses.length} khóa học</span>
                      <span>·</span>
                      <span>{avgRating} ★</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="id-form-card">
                <h3 className="id-form-card__title">Thông tin cơ bản</h3>
                <div className="id-form-grid">
                  <div className="id-field">
                    <label className="id-field__label">Họ và tên</label>
                    <input className="id-field__input"
                      value={profileForm.name}
                      onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Chức danh</label>
                    <input className="id-field__input"
                      value={profileForm.title}
                      onChange={e => setProfileForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Email</label>
                    <input className="id-field__input" type="email"
                      value={profileForm.email}
                      onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Số điện thoại</label>
                    <input className="id-field__input" type="tel"
                      value={profileForm.phone}
                      onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="id-field id-field--full">
                    <label className="id-field__label">Địa điểm</label>
                    <input className="id-field__input"
                      value={profileForm.location}
                      onChange={e => setProfileForm(f => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div className="id-field id-field--full">
                    <label className="id-field__label">Giới thiệu bản thân</label>
                    <textarea className="id-field__textarea" rows={4}
                      value={profileForm.bio}
                      onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="id-form-card">
                <h3 className="id-form-card__title">Mạng xã hội</h3>
                <div className="id-form-grid">
                  <div className="id-field">
                    <label className="id-field__label">Facebook</label>
                    <input className="id-field__input" placeholder="facebook.com/..."
                      value={profileForm.facebook}
                      onChange={e => setProfileForm(f => ({ ...f, facebook: e.target.value }))} />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">LinkedIn</label>
                    <input className="id-field__input" placeholder="linkedin.com/in/..."
                      value={profileForm.linkedin}
                      onChange={e => setProfileForm(f => ({ ...f, linkedin: e.target.value }))} />
                  </div>
                  <div className="id-field id-field--full">
                    <label className="id-field__label">YouTube</label>
                    <input className="id-field__input" placeholder="youtube.com/@..."
                      value={profileForm.youtube}
                      onChange={e => setProfileForm(f => ({ ...f, youtube: e.target.value }))} />
                  </div>
                </div>
                <div className="id-form-actions">
                  <button className="id-btn-primary">Lưu thay đổi</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default InstructorDashboard;