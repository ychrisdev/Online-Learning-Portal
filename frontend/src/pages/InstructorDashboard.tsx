import React, { useState, useEffect } from 'react';
import { formatPrice } from '../utils/format';

interface InstructorDashboardProps {
  onNavigate: (page: string, courseId?: string) => void;
  onLogout: () => void;
}

type Tab = 'overview' | 'courses' | 'lessons' | 'quiz' | 'students';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'courses',  label: 'Khóa học' },
  { id: 'lessons',  label: 'Bài học' },
  { id: 'quiz',     label: 'Bài kiểm tra' },
  { id: 'students', label: 'Học viên' },
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

const InstructorDashboard: React.FC<InstructorDashboardProps> = ({ onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // ── Profile ────────────────────────────────────────────────────────────────
  const [user, setUser]           = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // ── Real data ──────────────────────────────────────────────────────────────
  const [courses,  setCourses]  = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [loadingCourses,  setLoadingCourses]  = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // ── Form states ────────────────────────────────────────────────────────────
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', level: 'Beginner', price: '' });

  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', courseId: '', type: 'video' });

  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizForm, setQuizForm] = useState({
    title: '', courseId: '',
    questions: [{ question: '', options: ['', '', '', ''], correct: 0 }],
  });

  // ── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/api/auth/profile/`, { headers: authHeaders() });
      if (!res.ok) { localStorage.clear(); onNavigate('auth'); return; }
      const data = await res.json();
      setUser(data);
      if (data.avatar) {
        setAvatarUrl(data.avatar.startsWith('http') ? data.avatar : `${API}${data.avatar}`);
      }
    })();
  }, []);

  // ── Fetch courses — GET /api/courses/mine/ ────────────────────────────────
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

  // ── Fetch students — GET /api/enrollments/instructor/<course_id>/students/
  // Gọi song song cho tất cả courses rồi gộp lại
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
              })))
          )
        );
        // Gộp + loại trùng theo id
        const merged = allResults.flat();
        const unique = merged.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
        setStudents(unique);
      } catch (_) {}
      setLoadingStudents(false);
    })();
  }, [courses]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalRevenue = courses.reduce((a, c) => {
    const price    = Number(c.sale_price) || Number(c.price) || 0;
    const students = Number(c.total_students) || 0;
    return a + price * students;
  }, 0);
  const avgRating    = courses.length > 0
    ? (courses.reduce((a, c) => a + (Number(c.rating) || 0), 0) / courses.length).toFixed(1)
    : '—';

  // Quiz list: lấy từ curriculum của courses nếu có
  const quizList = courses.flatMap(c =>
    (c.curriculum ?? c.sections ?? []).flatMap((s: any) =>
      (s.lessons ?? [])
        .filter((l: any) => l.quiz || l.has_quiz)
        .map((l: any) => ({
          id:        l.id,
          title:     l.quiz?.title          ?? l.title,
          course:    c.title,
          questions: l.quiz?.questions_count ?? 0,
          attempts:  l.quiz?.attempts_count  ?? 0,
        }))
    )
  );

  const addQuestion = () => setQuizForm(f => ({
    ...f,
    questions: [...f.questions, { question: '', options: ['', '', '', ''], correct: 0 }],
  }));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="id-page">
      <div className="container id-layout">

        {/* ── Sidebar ── */}
        <aside className="id-sidebar">
          <div className="id-profile">
            <div className="id-profile__avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="db-profile__avatar" />
              ) : (
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
                  style={{ width: 64, height: 64, display: 'block' }}>
                  <circle cx="32" cy="32" r="32" fill="#1B263B"/>
                  <circle cx="32" cy="24" r="10" fill="#415A77"/>
                  <path d="M8 56c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#415A77"/>
                </svg>
              )}
            </div>
            <strong className="id-profile__name">{user?.full_name || 'Instructor'}</strong>
            <span className="id-profile__title">{user?.email || ''}</span>
          </div>

          <nav className="id-nav">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`id-nav__item${activeTab === tab.id ? ' id-nav__item--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
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
                <div className="id-stat-card">
                  <span className="id-stat-card__value">{loadingCourses ? '…' : courses.length}</span>
                  <span className="id-stat-card__label">Khóa học</span>
                </div>
                <div className="id-stat-card">
                  <span className="id-stat-card__value">{loadingStudents ? '…' : students.length.toLocaleString()}</span>
                  <span className="id-stat-card__label">Học viên</span>
                </div>
                <div className="id-stat-card">
                  <span className="id-stat-card__value">{loadingCourses ? '…' : formatPrice(totalRevenue, 'VND')}</span>
                  <span className="id-stat-card__label">Doanh thu</span>
                </div>
                <div className="id-stat-card">
                  <span className="id-stat-card__value">{loadingCourses ? '…' : avgRating}</span>
                  <span className="id-stat-card__label">Đánh giá TB</span>
                </div>
              </div>

              <h2 className="id-section-title">Khóa học của tôi</h2>
              <div className="id-course-table-wrap">
                {loadingCourses ? (
                  <p className="id-muted">Đang tải…</p>
                ) : courses.length === 0 ? (
                  <p className="id-muted">Chưa có khóa học nào.</p>
                ) : (
                  <table className="id-table">
                    <thead>
                      <tr>
                        <th>Khóa học</th>
                        <th>Học viên</th>
                        <th>Doanh thu</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map(c => (
                        <tr key={c.id}>
                          <td className="id-table__title">{c.title}</td>
                          <td>{(c.total_students ?? 0).toLocaleString()}</td>
                          <td>{formatPrice((Number(c.sale_price) || Number(c.price) || 0) * (Number(c.total_students) || 0), 'VND')}</td>
                          <td>
                            <span className={`id-badge id-badge--${c.status}`}>
                              {c.status === 'published' ? 'Đã đăng' : 'Nháp'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ════ COURSES ════ */}
          {activeTab === 'courses' && (
            <div className="id-content">
              <div className="id-page-header id-page-header--row">
                <div>
                  <h1 className="id-page-title">Quản lý khóa học</h1>
                  <p className="id-page-sub">{loadingCourses ? '…' : `${courses.length} khóa học`}</p>
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
                      <textarea className="id-field__textarea" rows={3} placeholder="Mô tả ngắn gọn về khóa học..."
                        value={courseForm.description}
                        onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="id-field">
                      <label className="id-field__label">Cấp độ</label>
                      <select className="id-field__input" value={courseForm.level}
                        onChange={e => setCourseForm(f => ({ ...f, level: e.target.value }))}>
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
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
                  {courses.map(c => (
                    <div key={c.id} className="id-course-row">
                      {thumbSrc(c.thumbnail) && (
                        <img src={thumbSrc(c.thumbnail)!} alt={c.title} className="id-course-row__thumb" />
                      )}
                      <div className="id-course-row__info">
                        <span className="id-course-row__title">{c.title}</span>
                        <span className="id-course-row__meta">
                          {(c.total_students ?? 0).toLocaleString()} học viên · {formatPrice(Number(c.sale_price) || Number(c.price) || 0, 'VND')}
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
              )}
            </div>
          )}

          {/* ════ LESSONS ════ */}
          {activeTab === 'lessons' && (
            <div className="id-content">
              <div className="id-page-header id-page-header--row">
                <div>
                  <h1 className="id-page-title">Quản lý bài học</h1>
                  <p className="id-page-sub">Thêm bài học, video và tài liệu</p>
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
                        <option value="video">Video</option>
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
                        {lessonForm.type === 'video' ? 'Upload video' : 'Upload tài liệu'}
                      </label>
                      <label className="id-upload-area">
                        <input type="file" style={{ display: 'none' }}
                          accept={lessonForm.type === 'video' ? 'video/*' : '.pdf,.doc,.docx'} />
                        <span className="id-upload-area__icon">↑</span>
                        <span className="id-upload-area__text">Kéo thả hoặc bấm để chọn file</span>
                        <span className="id-upload-area__hint">
                          {lessonForm.type === 'video' ? 'MP4, MOV · Tối đa 500MB' : 'PDF, DOC · Tối đa 50MB'}
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
                              <span className="id-lesson-row__type">{lesson.type ?? lesson.lesson_type}</span>
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
                  <p className="id-page-sub">Tạo và quản lý bài kiểm tra theo khóa học</p>
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
                        </div>
                        <input className="id-field__input" placeholder="Nội dung câu hỏi..."
                          value={q.question}
                          onChange={e => setQuizForm(f => {
                            const qs = [...f.questions];
                            qs[qi] = { ...qs[qi], question: e.target.value };
                            return { ...f, questions: qs };
                          })} />
                        <div className="id-quiz-options">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="id-quiz-option">
                              <input type="radio" name={`correct-${qi}`} checked={q.correct === oi}
                                onChange={() => setQuizForm(f => {
                                  const qs = [...f.questions];
                                  qs[qi] = { ...qs[qi], correct: oi };
                                  return { ...f, questions: qs };
                                })} />
                              <input className="id-field__input"
                                placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`}
                                value={opt}
                                onChange={e => setQuizForm(f => {
                                  const qs = [...f.questions];
                                  const opts = [...qs[qi].options];
                                  opts[oi] = e.target.value;
                                  qs[qi] = { ...qs[qi], options: opts };
                                  return { ...f, questions: qs };
                                })} />
                            </div>
                          ))}
                        </div>
                        <span className="id-quiz-question__hint">Chọn radio để đánh dấu đáp án đúng</span>
                      </div>
                    ))}
                    <button className="id-btn-secondary" onClick={addQuestion}>+ Thêm câu hỏi</button>
                  </div>
                  <div className="id-form-actions">
                    <button className="id-btn-primary" onClick={() => setShowQuizForm(false)}>
                      Lưu bài kiểm tra
                    </button>
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
                        <th>Học viên</th>
                        <th>Khóa học</th>
                        <th>Tiến độ</th>
                        <th>Ngày đăng ký</th>
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
                          <td className="id-table__muted">{s.joinedDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default InstructorDashboard;