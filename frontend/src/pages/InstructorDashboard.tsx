import React, { useState } from 'react';
import { MOCK_COURSES } from '../data/mockData';
import { formatPrice } from '../utils/format';

interface InstructorDashboardProps {
  onNavigate: (page: string, courseId?: string) => void;
}

type Tab = 'overview' | 'courses' | 'lessons' | 'quiz' | 'students';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Tổng quan' },
  { id: 'courses',   label: 'Khóa học' },
  { id: 'lessons',   label: 'Bài học' },
  { id: 'quiz',      label: 'Bài kiểm tra' },
  { id: 'students',  label: 'Học viên' },
];

const MOCK_INSTRUCTOR = {
  name: 'Ms. Emily Tran',
  email: 'emily@englishhub.vn',
  title: 'Giảng viên tiếng Anh · CELTA Cambridge',
  totalStudents: 32400,
  totalCourses: 3,
  totalRevenue: 12450000,
  avgRating: 4.9,
};

const MOCK_INSTRUCTOR_COURSES = MOCK_COURSES.slice(0, 3).map((c, i) => ({
  ...c,
  status: i === 2 ? 'draft' : 'published',
  revenue: [4200000, 5800000, 2450000][i],
  enrolledCount: [1840, 2150, 890][i],
}));

const MOCK_STUDENTS = [
  { id: 's1', name: 'Hoàng Minh',    email: 'hminh@gmail.com',   course: 'Tiếng Anh A1', progress: 72, joinedDate: '2024-10-12' },
  { id: 's2', name: 'Thu Hương',     email: 'thuhuong@gmail.com', course: 'Phát âm chuẩn', progress: 45, joinedDate: '2024-11-03' },
  { id: 's3', name: 'Quang Huy',     email: 'qhuy@gmail.com',    course: 'Tiếng Anh A1', progress: 100, joinedDate: '2024-09-20' },
  { id: 's4', name: 'Minh Châu',     email: 'mchau@gmail.com',   course: 'Phát âm chuẩn', progress: 88, joinedDate: '2024-10-30' },
  { id: 's5', name: 'Bảo Nguyên',    email: 'bnguyen@gmail.com', course: 'Tiếng Anh A1', progress: 23, joinedDate: '2024-11-15' },
];

const MOCK_QUIZ_LIST = [
  { id: 'q1', title: 'Kiểm tra phát âm — Chương 1', course: 'Tiếng Anh A1', questions: 10, attempts: 342 },
  { id: 'q2', title: 'Nguyên âm & Phụ âm', course: 'Phát âm chuẩn', questions: 15, attempts: 198 },
  { id: 'q3', title: 'Giao tiếp cơ bản', course: 'Tiếng Anh A1', questions: 8, attempts: 567 },
];

const InstructorDashboard: React.FC<InstructorDashboardProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', level: 'Beginner', price: '' });

  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', courseId: '', type: 'video', file: '' });

  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizForm, setQuizForm] = useState({ title: '', courseId: '', questions: [{ question: '', options: ['', '', '', ''], correct: 0 }] });

  const addQuestion = () => {
    setQuizForm(f => ({
      ...f,
      questions: [...f.questions, { question: '', options: ['', '', '', ''], correct: 0 }],
    }));
  };

  return (
    <div className="id-page">
      <div className="container id-layout">

        <aside className="id-sidebar">
          <div className="id-profile">
            <div className="id-profile__avatar">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="32" fill="#1B263B"/>
                <circle cx="32" cy="24" r="10" fill="#415A77"/>
                <path d="M8 56c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#415A77"/>
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
              </button>
            ))}
          </nav>

          <button className="id-nav__item id-nav__item--back" onClick={() => onNavigate('home')}>
            Về trang chủ
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
                <div className="id-stat-card">
                  <span className="id-stat-card__value">{MOCK_INSTRUCTOR.totalCourses}</span>
                  <span className="id-stat-card__label">Khóa học</span>
                </div>
                <div className="id-stat-card">
                  <span className="id-stat-card__value">{MOCK_INSTRUCTOR.totalStudents.toLocaleString()}</span>
                  <span className="id-stat-card__label">Học viên</span>
                </div>
                <div className="id-stat-card">
                  <span className="id-stat-card__value">{formatPrice(MOCK_INSTRUCTOR.totalRevenue, 'VND')}</span>
                  <span className="id-stat-card__label">Doanh thu</span>
                </div>
                <div className="id-stat-card">
                  <span className="id-stat-card__value">{MOCK_INSTRUCTOR.avgRating}</span>
                  <span className="id-stat-card__label">Đánh giá TB</span>
                </div>
              </div>

              <h2 className="id-section-title">Khóa học của tôi</h2>
              <div className="id-course-table-wrap">
                <table className="id-table">
                  <thead><tr><th>Khóa học</th><th>Học viên</th><th>Doanh thu</th><th>Trạng thái</th></tr></thead>
                  <tbody>
                    {MOCK_INSTRUCTOR_COURSES.map(c => (
                      <tr key={c.id}>
                        <td className="id-table__title">{c.title}</td>
                        <td>{c.enrolledCount.toLocaleString()}</td>
                        <td>{formatPrice(c.revenue, 'VND')}</td>
                        <td>
                          <span className={`id-badge id-badge--${c.status}`}>
                            {c.status === 'published' ? 'Đã đăng' : 'Nháp'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                      <textarea className="id-field__textarea" rows={3} placeholder="Mô tả ngắn gọn về khóa học..."
                        value={courseForm.description} onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))} />
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
                      <span className="id-course-row__meta">{c.enrolledCount.toLocaleString()} học viên · {formatPrice(c.revenue, 'VND')}</span>
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
                        {MOCK_INSTRUCTOR_COURSES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
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
                        value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="id-field id-field--full">
                      <label className="id-field__label">
                        {lessonForm.type === 'video' ? 'Upload video' : 'Upload tài liệu'}
                      </label>
                      <label className="id-upload-area">
                        <input type="file" style={{ display: 'none' }}
                          accept={lessonForm.type === 'video' ? 'video/*' : '.pdf,.doc,.docx'} />
                        <span className="id-upload-area__icon">↑</span>
                        <span className="id-upload-area__text">
                          Kéo thả hoặc bấm để chọn file
                        </span>
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
                        <span className="id-lesson-row__type">{lesson.type}</span>
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
                              <input
                                type="radio"
                                name={`correct-${qi}`}
                                checked={q.correct === oi}
                                onChange={() => setQuizForm(f => {
                                  const qs = [...f.questions];
                                  qs[qi] = { ...qs[qi], correct: oi };
                                  return { ...f, questions: qs };
                                })}
                              />
                              <input className="id-field__input" placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`}
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
                    <button className="id-btn-primary" onClick={() => setShowQuizForm(false)}>Lưu bài kiểm tra</button>
                  </div>
                </div>
              )}

              <div className="id-quiz-list">
                {MOCK_QUIZ_LIST.map(q => (
                  <div key={q.id} className="id-quiz-row">
                    <div className="id-quiz-row__info">
                      <span className="id-quiz-row__title">{q.title}</span>
                      <span className="id-quiz-row__meta">{q.course} · {q.questions} câu · {q.attempts} lượt làm</span>
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
                    <tr>
                      <th>Học viên</th>
                      <th>Khóa học</th>
                      <th>Tiến độ</th>
                      <th>Ngày đăng ký</th>
                    </tr>
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
                        <td className="id-table__muted">{s.joinedDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default InstructorDashboard;