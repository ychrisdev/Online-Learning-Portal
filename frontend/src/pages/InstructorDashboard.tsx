import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { MOCK_COURSES } from '../data/mockData';
import { formatPrice } from '../utils/format';

interface InstructorDashboardProps {
  onNavigate: (page: string, courseId?: string) => void;
}

type Tab = 'overview' | 'revenue' | 'courses' | 'lessons' | 'quiz' | 'students' | 'qa' | 'reviews' | 'profile';
type ChartRange = '3m' | '6m' | '1y';
type QAFilter = 'all' | 'pending' | 'resolved';

const TABS: { id: Tab; label: string}[] = [
  { id: 'overview',  label: 'Tổng quan'},
  { id: 'revenue',   label: 'Doanh thu'},
  { id: 'courses',   label: 'Khóa học'},
  { id: 'lessons',   label: 'Bài học'},
  { id: 'quiz',      label: 'Bài kiểm tra'},
  { id: 'students',  label: 'Học viên'},
  { id: 'qa',        label: 'Hỏi & Đáp'},
  { id: 'reviews',   label: 'Đánh giá'},
  { id: 'profile',   label: 'Hồ sơ cá nhân'},
];

const MOCK_INSTRUCTOR = {
  name: 'Ms. Emily Tran',
  title: 'Giảng viên tiếng Anh · CELTA Cambridge',
  totalStudents: 32400,
  totalRevenue: 12450000,
  avgRating: 4.9,
  email: 'emily.tran@englearn.vn',
  phone: '+84 901 234 567',
  location: 'Hà Nội, Việt Nam',
  bio: 'Hơn 8 năm giảng dạy tiếng Anh giao tiếp và học thuật. Chuyên gia luyện thi IELTS với học viên đạt band 7.0+. Tốt nghiệp Đại học Ngoại ngữ Hà Nội, chứng chỉ CELTA Cambridge.',
  expertise: ['Phát âm', 'IELTS', 'Tiếng Anh giao tiếp', 'Ngữ pháp nâng cao'],
  social: {
    facebook: 'facebook.com/emily.tran.english',
    linkedin: 'linkedin.com/in/emily-tran-english',
    youtube: 'youtube.com/@emilytran',
  },
};

const MOCK_INSTRUCTOR_COURSES = MOCK_COURSES.slice(0, 3).map((c, i) => ({
  ...c,
  status: i === 2 ? 'draft' : 'published',
  revenue: [4200000, 5800000, 2450000][i],
  enrolledCount: [1840, 2150, 890][i],
  completionRate: [68, 72, 45][i],
}));

const ALL_MONTHLY_DATA = [
  { month: 'T1',  revenue: 980000,  enrollments: 98  },
  { month: 'T2',  revenue: 1100000, enrollments: 110 },
  { month: 'T3',  revenue: 1350000, enrollments: 135 },
  { month: 'T4',  revenue: 1050000, enrollments: 105 },
  { month: 'T5',  revenue: 1400000, enrollments: 140 },
  { month: 'T6',  revenue: 1650000, enrollments: 165 },
  { month: 'T7',  revenue: 1200000, enrollments: 120 },
  { month: 'T8',  revenue: 1850000, enrollments: 185 },
  { month: 'T9',  revenue: 2100000, enrollments: 210 },
  { month: 'T10', revenue: 1750000, enrollments: 175 },
  { month: 'T11', revenue: 2450000, enrollments: 245 },
  { month: 'T12', revenue: 3100000, enrollments: 310 },
];

const MOCK_STUDENTS = [
  { id: 's1', name: 'Hoàng Minh',  email: 'hminh@gmail.com',   course: 'Tiếng Anh A1',  progress: 72,  joinedDate: '2024-10-12', lastActive: '2 giờ trước' },
  { id: 's2', name: 'Thu Hương',   email: 'thuhuong@gmail.com', course: 'Phát âm chuẩn', progress: 45,  joinedDate: '2024-11-03', lastActive: 'Hôm qua' },
  { id: 's3', name: 'Quang Huy',   email: 'qhuy@gmail.com',    course: 'Tiếng Anh A1',  progress: 100, joinedDate: '2024-09-20', lastActive: '3 ngày trước' },
  { id: 's4', name: 'Minh Châu',   email: 'mchau@gmail.com',   course: 'Phát âm chuẩn', progress: 88,  joinedDate: '2024-10-30', lastActive: '5 giờ trước' },
  { id: 's5', name: 'Bảo Nguyên',  email: 'bnguyen@gmail.com', course: 'Tiếng Anh A1',  progress: 23,  joinedDate: '2024-11-15', lastActive: 'Hôm nay' },
];

const MOCK_QA_INIT = [
  {
    id: 'qa1',
    student: { name: 'Hoàng Minh', avatar: 'https://i.pravatar.cc/40?img=12' },
    course: 'Tiếng Anh A1', lesson: 'Bảng chữ cái tiếng Anh',
    question: 'Thầy/cô ơi, âm /θ/ và /ð/ khác nhau như thế nào? Em hay bị nhầm hai âm này.',
    askedAt: '2024-12-02 09:15',
    replies: [
      { author: 'Ms. Emily Tran', isInstructor: true, text: '/θ/ là vô thanh (think), /ð/ là hữu thanh (this). Mẹo: đặt tay lên cổ — nếu rung là /ð/.', time: '2024-12-02 10:30' },
    ],
    resolved: true,
  },
  {
    id: 'qa2',
    student: { name: 'Thu Hương', avatar: 'https://i.pravatar.cc/40?img=25' },
    course: 'Phát âm chuẩn', lesson: '44 âm vị — Bảng IPA cơ bản',
    question: 'Âm schwa /ə/ có ở tất cả vị trí không ạ? Hay chỉ ở âm tiết không nhấn?',
    askedAt: '2024-12-01 14:22', replies: [], resolved: false,
  },
  {
    id: 'qa3',
    student: { name: 'Bảo Nguyên', avatar: 'https://i.pravatar.cc/40?img=33' },
    course: 'Tiếng Anh A1', lesson: 'Giới thiệu bản thân',
    question: '"Nice" trong "Nice to meet you" phát âm là /naɪs/ hay /naɪz/ ạ?',
    askedAt: '2024-11-30 16:05', replies: [], resolved: false,
  },
];

const MOCK_REVIEWS_INIT = [
  {
    id: 'rv1', course: 'Tiếng Anh A1', rating: 5, date: '2024-11-20',
    student: { name: 'Hoàng Minh', avatar: 'https://i.pravatar.cc/40?img=12' },
    comment: 'Khóa học rất dễ hiểu, phù hợp người mới. Sau 3 tuần tôi đã tự giới thiệu bản thân được.',
    replied: false, replyText: '',
  },
  {
    id: 'rv2', course: 'Phát âm chuẩn', rating: 5, date: '2024-11-18',
    student: { name: 'Thu Hương', avatar: 'https://i.pravatar.cc/40?img=25' },
    comment: 'Phần phát âm được giải thích rất chi tiết. Lần đầu tôi hiểu tại sao mình phát âm sai.',
    replied: true, replyText: 'Cảm ơn em đã chia sẻ! Chúc em tiếp tục tiến bộ nhé.',
  },
  {
    id: 'rv3', course: 'Tiếng Anh A1', rating: 4, date: '2024-11-05',
    student: { name: 'Quang Huy', avatar: 'https://i.pravatar.cc/40?img=51' },
    comment: 'Nội dung chất lượng, bài tập đa dạng. Mong có thêm bài luyện nghe với giọng Anh-Anh.',
    replied: false, replyText: '',
  },
];

const MOCK_QUIZ_LIST = [
  { id: 'q1', title: 'Kiểm tra phát âm — Chương 1', course: 'Tiếng Anh A1',  questions: 10, attempts: 342, avgScore: 78 },
  { id: 'q2', title: 'Nguyên âm & Phụ âm',          course: 'Phát âm chuẩn', questions: 15, attempts: 198, avgScore: 65 },
  { id: 'q3', title: 'Giao tiếp cơ bản',              course: 'Tiếng Anh A1',  questions: 8,  attempts: 567, avgScore: 82 },
];

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

const InstructorDashboard: React.FC<InstructorDashboardProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab]     = useState<Tab>('overview');
  const [chartRange, setChartRange]   = useState<ChartRange>('6m');

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', level: 'Beginner', price: '' });

  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', courseId: '', type: 'theory' });

  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizForm, setQuizForm] = useState({
    title: '', courseId: '',
    questions: [{ question: '', options: ['', '', '', ''], correct: 0, explanation: '' }],
  });

  const [qaList,      setQaList]      = useState(MOCK_QA_INIT);
  const [qaFilter,    setQaFilter]    = useState<QAFilter>('all');
  const [replyTexts,  setReplyTexts]  = useState<Record<string, string>>({});
  const [openReply,   setOpenReply]   = useState<string | null>(null);

  const [reviews,          setReviews]          = useState(MOCK_REVIEWS_INIT);
  const [reviewReply,      setReviewReply]      = useState<Record<string, string>>({});
  const [openReviewReply,  setOpenReviewReply]  = useState<string | null>(null);

  const [chatStudentId, setChatStudentId] = useState<string | null>(null);
  const [chatMessages,  setChatMessages]  = useState<Record<string, { from: string; text: string; time: string }[]>>({
    s1: [
      { from: 'student',    text: 'Cô ơi, em muốn hỏi thêm về bài phát âm ạ.', time: '09:00' },
      { from: 'instructor', text: 'Em cứ hỏi nhé!',                              time: '09:05' },
    ],
  });
  const [chatInput, setChatInput] = useState('');

  const [profileForm, setProfileForm] = useState({
    name: MOCK_INSTRUCTOR.name,
    title: MOCK_INSTRUCTOR.title,
    email: MOCK_INSTRUCTOR.email,
    phone: MOCK_INSTRUCTOR.phone,
    location: MOCK_INSTRUCTOR.location,
    bio: MOCK_INSTRUCTOR.bio,
    facebook: MOCK_INSTRUCTOR.social.facebook,
    linkedin: MOCK_INSTRUCTOR.social.linkedin,
    youtube: MOCK_INSTRUCTOR.social.youtube,
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const pendingCount = qaList.filter(q => !q.resolved).length;

  const filteredQA = useMemo(() => {
    if (qaFilter === 'pending')  return qaList.filter(q => !q.resolved);
    if (qaFilter === 'resolved') return qaList.filter(q =>  q.resolved);
    return qaList;
  }, [qaList, qaFilter]);

  const chartData = useMemo(() => {
    if (chartRange === '3m') return ALL_MONTHLY_DATA.slice(-3);
    if (chartRange === '6m') return ALL_MONTHLY_DATA.slice(-6);
    return ALL_MONTHLY_DATA;
  }, [chartRange]);

  const totalRevenue     = chartData.reduce((a, b) => a + b.revenue, 0);
  const totalEnrollments = chartData.reduce((a, b) => a + b.enrollments, 0);

  const addQuizQuestion = () => setQuizForm(f => ({
    ...f,
    questions: [...f.questions, { question: '', options: ['', '', '', ''], correct: 0, explanation: '' }],
  }));

  const handleReplyQA = (qaId: string) => {
    const text = replyTexts[qaId]?.trim();
    if (!text) return;
    setQaList(list => list.map(q => q.id !== qaId ? q : {
      ...q, resolved: true,
      replies: [...q.replies, {
        author: MOCK_INSTRUCTOR.name, isInstructor: true,
        text, time: new Date().toLocaleString('vi-VN'),
      }],
    }));
    setReplyTexts(r => ({ ...r, [qaId]: '' }));
    setOpenReply(null);
  };

  const handleReplyReview = (rvId: string) => {
    const text = reviewReply[rvId]?.trim();
    if (!text) return;
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

  const chatStudent = chatStudentId ? MOCK_STUDENTS.find(s => s.id === chatStudentId) : null;
  const chatMsgs    = chatStudentId ? (chatMessages[chatStudentId] || []) : [];

  const getLessonTypeLabel = (type: string) => {
    if (type === 'theory' || type === 'video') return 'Lý thuyết';
    if (type === 'quiz') return 'Bài kiểm tra';
    if (type === 'article') return 'Bài viết';
    if (type === 'project') return 'Bài tập';
    return type;
  };

  return (
    <div className="id-page">
      <div className="container id-layout">

        <aside className="id-sidebar">
          <div className="id-profile">
            <div className="id-profile__avatar">
              <svg viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="32" fill="#1B263B" />
                <circle cx="32" cy="24" r="10" fill="#415A77" />
                <path d="M8 56c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#415A77" />
              </svg>
            </div>
            <strong className="id-profile__name">{MOCK_INSTRUCTOR.name}</strong>
            <span className="id-profile__title">{MOCK_INSTRUCTOR.title}</span>
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

          <button className="id-nav__item id-nav__item--back" onClick={() => onNavigate('home')}>
            ← Về trang chủ
          </button>
        </aside>

        <main className="id-main">

          {activeTab === 'overview' && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Xin chào, {MOCK_INSTRUCTOR.name.split(' ').pop()}</h1>
                <p className="id-page-sub">Quản lý khóa học và theo dõi học viên của bạn.</p>
              </div>

              <div className="id-stats-grid">
                {[
                  { value: MOCK_INSTRUCTOR_COURSES.length.toString(),       label: 'Khóa học' },
                  { value: MOCK_INSTRUCTOR.totalStudents.toLocaleString(),   label: 'Học viên' },
                  { value: formatPrice(MOCK_INSTRUCTOR.totalRevenue, 'VND'), label: 'Doanh thu' },
                  { value: `${MOCK_INSTRUCTOR.avgRating} ★`,                label: 'Đánh giá TB' },
                ].map((s, i) => (
                  <div key={i} className="id-stat-card">
                    <span className="id-stat-card__value">{s.value}</span>
                    <span className="id-stat-card__label">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="id-chart-card">
                <div className="id-chart-card__header">
                  <div>
                    <div className="id-chart-card__title">Doanh thu 6 tháng qua</div>
                    <div className="id-chart-card__meta">Tổng: {formatPrice(ALL_MONTHLY_DATA.slice(-6).reduce((a, b) => a + b.revenue, 0), 'VND')}</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={ALL_MONTHLY_DATA.slice(-6)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(119,141,169,0.1)" />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(224,225,221,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(224,225,221,0.4)', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" name="Doanh thu" fill="#5b8dee" radius={[4, 4, 0, 0]}>{ALL_MONTHLY_DATA.map((_, i) => <Cell key={i} fill="#5b8dee" />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <h2 className="id-section-title">Tỷ lệ hoàn thành theo khóa</h2>
              <div className="id-completion-list">
                {MOCK_INSTRUCTOR_COURSES.map(c => (
                  <div key={c.id} className="id-completion-row">
                    <DonutChart pct={c.completionRate} color={c.completionRate >= 70 ? '#4caf82' : '#5b8dee'} />
                    <div className="id-completion-row__info">
                      <span className="id-completion-row__title">{c.title}</span>
                      <span className="id-completion-row__meta">
                        {c.enrolledCount.toLocaleString()} học viên · {formatPrice(c.revenue, 'VND')}
                      </span>
                    </div>
                    <span className={`id-badge id-badge--${c.status}`}>
                      {c.status === 'published' ? 'Đã đăng' : 'Nháp'}
                    </span>
                  </div>
                ))}
              </div>

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

          {activeTab === 'revenue' && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Doanh thu & Thống kê</h1>
                <p className="id-page-sub">Tổng quan tài chính và lượt đăng ký</p>
              </div>

              <div className="id-stats-grid">
                {[
                  { value: formatPrice(totalRevenue, 'VND'),                                        label: `Doanh thu (${chartRange === '3m' ? '3T' : chartRange === '6m' ? '6T' : '1N'})` },
                  { value: totalEnrollments.toLocaleString(),                                        label: 'Lượt đăng ký' },
                  { value: formatPrice(Math.round(totalRevenue / totalEnrollments), 'VND'),          label: 'DT / học viên' },
                  { value: `${MOCK_INSTRUCTOR.avgRating} ★`,                                        label: 'Đánh giá TB' },
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
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(119,141,169,0.1)" />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(224,225,221,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(224,225,221,0.4)', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(224,225,221,0.5)', paddingTop: 8 }} />
                    <Bar dataKey="revenue" name="Doanh thu" fill="#5b8dee" radius={[4, 4, 0, 0]}>{ALL_MONTHLY_DATA.map((_, i) => <Cell key={i} fill="#5b8dee" />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="id-chart-card">
                <div className="id-chart-card__header">
                  <div className="id-chart-card__title">Lượt đăng ký theo tháng</div>
                  <div className="id-chart-card__meta">Tổng: {totalEnrollments} học viên</div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(119,141,169,0.1)" />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(224,225,221,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(224,225,221,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="enrollments" name="Lượt đăng ký" fill="#5b8dee" radius={[4, 4, 0, 0]}>{ALL_MONTHLY_DATA.map((_, i) => <Cell key={i} fill="#5b8dee" />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="id-chart-card">
                <div className="id-chart-card__header">
                  <div className="id-chart-card__title">Doanh thu theo khóa học</div>
                </div>
                <div className="id-table-wrap" style={{ border: 'none' }}>
                  <table className="id-table">
                    <thead><tr><th>Khóa học</th><th>Học viên</th><th>Hoàn thành</th><th>Doanh thu</th><th>Đơn giá TB</th></tr></thead>
                    <tbody>
                      {MOCK_INSTRUCTOR_COURSES.map(c => (
                        <tr key={c.id}>
                          <td className="id-table__title">{c.title}</td>
                          <td>{c.enrolledCount.toLocaleString()}</td>
                          <td>
                            <div className="id-progress-cell">
                              <div className="id-progress-bar">
                                <div className="id-progress-fill" style={{ width: `${c.completionRate}%` }} />
                              </div>
                              <span>{c.completionRate}%</span>
                            </div>
                          </td>
                          <td className="id-table__positive">{formatPrice(c.revenue, 'VND')}</td>
                          <td>{formatPrice(Math.round(c.revenue / c.enrolledCount), 'VND')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="id-content">
              <div className="id-page-header id-page-header--row">
                <div>
                  <h1 className="id-page-title">Quản lý khóa học</h1>
                  <p className="id-page-sub">{MOCK_INSTRUCTOR_COURSES.length} khóa học</p>
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
                        value={courseForm.title} onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="id-field id-field--full">
                      <label className="id-field__label">Mô tả ngắn</label>
                      <textarea className="id-field__textarea" rows={3} placeholder="Mô tả ngắn gọn..."
                        value={courseForm.description} onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))} />
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
                        value={courseForm.price} onChange={e => setCourseForm(f => ({ ...f, price: e.target.value }))} />
                    </div>
                  </div>
                  <div className="id-form-actions">
                    <button className="id-btn-primary" onClick={() => setShowCourseForm(false)}>Lưu nháp</button>
                    <button className="id-btn-secondary" onClick={() => setShowCourseForm(false)}>Đăng ngay</button>
                  </div>
                </div>
              )}

              <div className="id-course-list">
                {MOCK_INSTRUCTOR_COURSES.map(c => (
                  <div key={c.id} className="id-course-row">
                    <img src={c.thumbnail} alt={c.title} className="id-course-row__thumb" />
                    <div className="id-course-row__info">
                      <span className="id-course-row__title">{c.title}</span>
                      <span className="id-course-row__meta">
                        {c.enrolledCount.toLocaleString()} học viên · {formatPrice(c.revenue, 'VND')} · Hoàn thành: {c.completionRate}%
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
                ))}
              </div>
            </div>
          )}

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
                        {MOCK_INSTRUCTOR_COURSES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
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
                        value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="id-field id-field--full">
                      <label className="id-field__label">{lessonForm.type === 'theory' ? 'Upload lý thuyết' : 'Upload tài liệu'}</label>
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
                {MOCK_INSTRUCTOR_COURSES.map(course => (
                  <div key={course.id} className="id-lesson-group">
                    <div className="id-lesson-group__header">
                      <span className="id-lesson-group__title">{course.title}</span>
                      <span className="id-lesson-group__count">{course.lessonCount} bài</span>
                    </div>
                    {course.curriculum.flatMap(s => s.lessons).slice(0, 3).map((lesson, i) => (
                      <div key={lesson.id} className="id-lesson-row">
                        <span className="id-lesson-row__num">{i + 1}</span>
                        <span className="id-lesson-row__title">{lesson.title}</span>
                        <span className="id-lesson-row__type">{getLessonTypeLabel(lesson.type)}</span>
                        <span className="id-lesson-row__duration">{lesson.duration}</span>
                        <div className="id-lesson-row__actions">
                          <button className="id-btn-sm">Sửa</button>
                          <button className="id-btn-sm id-btn-sm--danger">Xóa</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="id-content">
              <div className="id-page-header id-page-header--row">
                <div>
                  <h1 className="id-page-title">Bài kiểm tra</h1>
                  <p className="id-page-sub">{MOCK_QUIZ_LIST.length} bài kiểm tra</p>
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
                        {MOCK_INSTRUCTOR_COURSES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div className="id-field">
                      <label className="id-field__label">Tiêu đề bài kiểm tra</label>
                      <input className="id-field__input" placeholder="Ví dụ: Kiểm tra chương 1"
                        value={quizForm.title} onChange={e => setQuizForm(f => ({ ...f, title: e.target.value }))} />
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
                {MOCK_QUIZ_LIST.map(q => (
                  <div key={q.id} className="id-quiz-row">
                    <div className="id-quiz-row__info">
                      <span className="id-quiz-row__title">{q.title}</span>
                      <span className="id-quiz-row__meta">
                        {q.course} · {q.questions} câu · {q.attempts} lượt làm · Điểm TB: {q.avgScore}%
                      </span>
                    </div>
                    <div className="id-quiz-row__actions">
                      <button className="id-btn-sm">Sửa</button>
                      <button className="id-btn-sm id-btn-sm--danger">Xóa</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Danh sách học viên</h1>
                <p className="id-page-sub">{MOCK_STUDENTS.length} học viên đang học</p>
              </div>

              <div className="id-table-wrap">
                <table className="id-table">
                  <thead>
                    <tr><th>Học viên</th><th>Khóa học</th><th>Tiến độ</th><th>Hoạt động</th><th>Thao tác</th></tr>
                  </thead>
                  <tbody>
                    {MOCK_STUDENTS.map(s => (
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
                        <td className="id-table__muted">{s.lastActive}</td>
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
              </div>

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
                {filteredQA.length === 0
                  ? <p className="id-qa-empty">Không có câu hỏi nào.</p>
                  : filteredQA.map(qa => (
                    <div key={qa.id} className={`id-qa-card id-qa-card--${qa.resolved ? 'resolved' : 'pending'}`}>
                      <div className="id-qa-question">
                        <div className="id-qa-question__top">
                          <img className="id-qa-question__avatar" src={qa.student.avatar} alt={qa.student.name} />
                          <div>
                            <div className="id-qa-question__name">{qa.student.name}</div>
                            <div className="id-qa-question__meta">{qa.course} · {qa.lesson} · {qa.askedAt}</div>
                          </div>
                          <span className={`id-qa-question__status id-qa-question__status--${qa.resolved ? 'resolved' : 'pending'}`}>
                            {qa.resolved ? '✓ Đã trả lời' : '⏳ Chờ trả lời'}
                          </span>
                        </div>
                        <p className="id-qa-question__text">{qa.question}</p>
                      </div>

                      {qa.replies.map((rep, i) => (
                        <div key={i} className={`id-qa-reply ${rep.isInstructor ? 'id-qa-reply--instructor' : 'id-qa-reply--student'}`}>
                          <div className="id-qa-reply__avatar-placeholder">
                            {rep.isInstructor ? 'GV' : rep.author.charAt(0)}
                          </div>
                          <div>
                            <div className="id-qa-reply__author">
                              {rep.author}
                              {rep.isInstructor && <span className="id-qa-reply__instructor-tag"> · Giảng viên</span>}
                            </div>
                            <p className="id-qa-reply__text">{rep.text}</p>
                            <div className="id-qa-reply__time">{rep.time}</div>
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
                }
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Đánh giá khóa học</h1>
                <p className="id-page-sub">{reviews.length} đánh giá · Trung bình {MOCK_INSTRUCTOR.avgRating} ★</p>
              </div>

              <div className="id-review-summary">
                <div className="id-review-summary__score">
                  <div className="id-review-summary__big">{MOCK_INSTRUCTOR.avgRating}</div>
                  <div className="id-review-summary__stars">★★★★★</div>
                  <div className="id-review-summary__sub">Điểm trung bình</div>
                </div>
                <div className="id-review-summary__bars">
                  {[5, 4, 3, 2, 1].map(star => {
                    const pct = [78, 14, 5, 2, 1][5 - star];
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

              <div className="id-review-list">
                {reviews.map(rv => (
                  <div key={rv.id} className="id-review-card">
                    <div className="id-review-card__body">
                      <div className="id-review-card__top">
                        <img className="id-review-card__avatar" src={rv.student.avatar} alt={rv.student.name} />
                        <div>
                          <div className="id-review-card__name">{rv.student.name}</div>
                          <div className="id-review-card__course">{rv.course} · {rv.date}</div>
                        </div>
                        <div className="id-review-card__stars">
                          {'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}
                        </div>
                      </div>
                      <p className="id-review-card__comment">{rv.comment}</p>
                    </div>

                    {rv.replied && rv.replyText && (
                      <div className="id-review-reply">
                        <div className="id-review-reply__avatar-placeholder">GV</div>
                        <div>
                          <div className="id-review-reply__author">
                            {MOCK_INSTRUCTOR.name}
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
                ))}
              </div>
            </div>
          )}

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
                      {avatarUrl
                        ? <img src={avatarUrl} alt="avatar" className="id-profile-card__avatar-img" />
                        : (
                          <svg viewBox="0 0 100 100" fill="none" width="100" height="100">
                            <circle cx="50" cy="50" r="50" fill="#1B263B" />
                            <circle cx="50" cy="38" r="16" fill="#415A77" />
                            <path d="M10 88c0-22.091 17.909-40 40-40s40 17.909 40 40" fill="#415A77" />
                          </svg>
                        )
                      }
                    </div>
                    <label className="id-avatar-upload-btn">
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                      Đổi ảnh
                    </label>
                  </div>
                  <div className="id-profile-card__avatar-info">
                    <div className="id-profile-card__name">{profileForm.name}</div>
                    <div className="id-profile-card__title-text">{profileForm.title}</div>
                    <div className="id-profile-card__stats">
                      <span>{MOCK_INSTRUCTOR.totalStudents.toLocaleString()} học viên</span>
                      <span>·</span>
                      <span>{MOCK_INSTRUCTOR_COURSES.length} khóa học</span>
                      <span>·</span>
                      <span>{MOCK_INSTRUCTOR.avgRating} ★</span>
                    </div>
                    <div className="id-profile-card__expertise">
                      {MOCK_INSTRUCTOR.expertise.map(tag => (
                        <span key={tag} className="id-profile-tag">{tag}</span>
                      ))}
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