import React, { useState } from "react";
import { MOCK_COURSES, MOCK_REVIEWS } from '../data/mockData';
import { formatPrice } from "../utils/format";

interface CourseDetailProps {
  courseId: string;
  onNavigate: (page: string, courseId?: string) => void;
  isLoggedIn: boolean;
}

const MOCK_QUIZ = [
  {
    id: "q1",
    question: "Which sentence uses the Present Perfect correctly?",
    options: [
      "I have seen that movie yesterday.",
      "I have seen that movie before.",
      "I saw that movie since last week.",
      "I did see that movie already.",
    ],
    correct: 1,
    explanation:
      '"Have seen" + "before" là cách dùng Present Perfect đúng để nói về kinh nghiệm trong quá khứ không xác định thời điểm.',
  },
  {
    id: "q2",
    question: 'Choose the correct form: "She ___ to the gym every morning."',
    options: ["go", "goes", "is going", "has gone"],
    correct: 1,
    explanation:
      'Với chủ ngữ "She" (ngôi thứ 3 số ít) và thói quen hàng ngày, ta dùng thì hiện tại đơn: goes.',
  },
  {
    id: "q3",
    question: 'What does "eloquent" mean?',
    options: [
      "Rude and aggressive",
      "Fluent and persuasive in speaking",
      "Quiet and reserved",
      "Confused and unclear",
    ],
    correct: 1,
    explanation:
      '"Eloquent" nghĩa là ăn nói lưu loát, có sức thuyết phục. Ví dụ: "She gave an eloquent speech."',
  },
  {
    id: "q4",
    question: 'Which is the correct pronunciation of "though"?',
    options: ["/θɒɡ/", "/ðoʊ/", "/θʌf/", "/θruː/"],
    correct: 1,
    explanation:
      '"Though" phát âm là /ðoʊ/ — âm "th" hữu thanh, vần "-ough" đọc như "oh".',
  },
];

const MOCK_LESSON_CONTENT = {
  l1: {
    title: "Bảng chữ cái tiếng Anh",
    duration: "8:20",
    content: `
## Bảng chữ cái tiếng Anh (The Alphabet)

Tiếng Anh có **26 chữ cái**, chia thành **5 nguyên âm** và **21 phụ âm**.

### Nguyên âm (Vowels)
| Chữ cái | Phát âm | Ví dụ |
|---------|---------|-------|
| A a | /eɪ/ | **A**pple, **A**nt |
| E e | /iː/ | **E**gg, **E**lephant |
| I i | /aɪ/ | **I**ce, **I**nk |
| O o | /oʊ/ | **O**range, **O**x |
| U u | /juː/ | **U**mbrella, **U**p |

### Phụ âm thường gặp
- **B** /biː/ — **B**ook, **B**all
- **C** /siː/ — **C**at, **C**ar
- **D** /diː/ — **D**og, **D**oor
- **F** /ɛf/ — **F**ish, **F**ood

### Mẹo nhớ
> Học bảng chữ cái theo **nhóm âm** sẽ dễ nhớ hơn học từng chữ riêng lẻ.
> Nhóm /eɪ/: A, H, J, K
> Nhóm /iː/: B, C, D, E, G, P, T, V

### Luyện tập
Đọc to bảng chữ cái mỗi ngày trong 1 tuần. Sau đó thử viết ra từng chữ mà không nhìn.
    `,
  },
  l2: {
    title: "44 âm vị — Bảng IPA cơ bản",
    duration: "15:00",
    content: `
## Hệ thống âm vị tiếng Anh (Phonemes)

Tiếng Anh có **44 âm vị** (phonemes) — nhiều hơn số chữ cái vì một chữ cái có thể đọc nhiều cách khác nhau.

### Nguyên âm đơn (Monophthongs)
| IPA | Từ ví dụ | Ghi chú |
|-----|----------|---------|
| /ɪ/ | s**i**t, k**i**t | Ngắn, miệng hơi mở |
| /iː/ | s**ee**, t**ea** | Dài, miệng dẹt |
| /ʊ/ | b**oo**k, p**u**t | Ngắn, môi tròn nhẹ |
| /uː/ | f**oo**d, bl**ue** | Dài, môi tròn |
| /e/ | b**e**d, r**e**d | Miệng mở vừa |
| /æ/ | c**a**t, b**a**d | Miệng mở rộng |
| /ʌ/ | c**u**p, b**u**t | Âm giữa, ngắn |
| /ɑː/ | c**ar**, f**ar** | Dài, miệng mở |
| /ɒ/ | d**o**g, h**o**t | Ngắn, môi hơi tròn |
| /ɔː/ | d**oor**, m**ore** | Dài, môi tròn |
| /ə/ | **a**bout, sist**er** | Âm trung tính (schwa) |
| /ɜː/ | b**ir**d, h**er** | Dài, không tròn môi |

### Nguyên âm đôi (Diphthongs)
| IPA | Từ ví dụ |
|-----|----------|
| /eɪ/ | d**ay**, m**a**ke |
| /aɪ/ | my, l**i**ke |
| /ɔɪ/ | b**oy**, n**oi**se |
| /aʊ/ | n**ow**, h**ou**se |
| /əʊ/ | g**o**, kn**ow** |

### Lưu ý quan trọng
> Âm **schwa /ə/** là âm phổ biến nhất trong tiếng Anh. Hầu hết các nguyên âm không được nhấn mạnh đều phát âm thành /ə/.
> Ví dụ: **a**gain → /əˈɡen/, sist**er** → /ˈsɪst**ə**/
    `,
  },
};

type Tab = "overview" | "curriculum" | "lesson" | "quiz" | "reviews";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "curriculum", label: "Chương trình" },
  { id: "lesson", label: "Bài học" },
  { id: "quiz", label: "Luyện tập" },
  { id: "reviews", label: "Đánh giá" },
];

const CourseDetail: React.FC<CourseDetailProps> = ({
  courseId,
  onNavigate,
  isLoggedIn,
}) => {
  const course = MOCK_COURSES.find((c) => c.id === courseId) ?? MOCK_COURSES[0];
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("s1");
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const activeLesson = activeLessonId
    ? MOCK_LESSON_CONTENT[activeLessonId as keyof typeof MOCK_LESSON_CONTENT]
    : null;

  const handleSelectAnswer = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === MOCK_QUIZ[currentQ].correct) setScore((s) => s + 1);
  };

  const handleNextQuestion = () => {
    if (currentQ + 1 < MOCK_QUIZ.length) {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setQuizDone(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQ(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setQuizDone(false);
    setQuizStarted(true);
  };

  const discount =
    course.originalPrice && course.originalPrice > course.price
      ? Math.round((1 - course.price / course.originalPrice) * 100)
      : 0;

  return (
    <div className="cd-page">
      <div className="container cd-layout">
        <div className="cd-main">
          <button className="cd-back" onClick={() => onNavigate("courses")}>
            ← Quay lại
          </button>

          <h1 className="cd-hero__title">{course.title}</h1>
          <p className="cd-hero__desc">{course.shortDescription}</p>

          <div className="cd-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`cd-tab${activeTab === tab.id ? " cd-tab--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="cd-tab-content">
              <section className="cd-section">
                <h2 className="cd-section__title">Bạn sẽ học được gì?</h2>
                <ul className="cd-learn-list">
                  {course.whatYouLearn.map((item, i) => (
                    <li key={i} className="cd-learn-item">
                      <span className="cd-learn-item__icon">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="cd-section">
                <h2 className="cd-section__title">Mô tả khóa học</h2>
                <p className="cd-description">{course.description}</p>
              </section>
            </div>
          )}

          {activeTab === "curriculum" && (
            <div className="cd-tab-content cd-curriculum">
              <p className="cd-curriculum__summary">
                {course.curriculum.reduce((a, s) => a + s.lessons.length, 0)}{" "}
                bài học · {course.curriculum.length} chương
              </p>
              {course.curriculum.map((section) => (
                <div key={section.id} className="cd-chapter">
                  <button
                    className="cd-chapter__header"
                    onClick={() =>
                      setExpandedSection(
                        expandedSection === section.id ? null : section.id,
                      )
                    }
                  >
                    <span className="cd-chapter__icon">
                      {expandedSection === section.id ? "▾" : "▸"}
                    </span>
                    <span className="cd-chapter__title">{section.title}</span>
                    <span className="cd-chapter__count">
                      {section.lessons.length} bài
                    </span>
                  </button>
                  {expandedSection === section.id && (
                    <div className="cd-chapter__lessons">
                      {section.lessons.map((lesson, idx) => (
                        <button
                          key={lesson.id}
                          className={`cd-lesson-row${activeLessonId === lesson.id ? " cd-lesson-row--active" : ""}`}
                          onClick={() => {
                            setActiveLessonId(lesson.id);
                            setActiveTab("lesson");
                          }}
                        >
                          <span className="cd-lesson-row__num">{idx + 1}</span>
                          <span className="cd-lesson-row__title">
                            {lesson.title}
                          </span>
                          <span className="cd-lesson-row__duration">
                            {lesson.duration}
                          </span>
                          {lesson.isPreview && (
                            <span className="cd-lesson-row__preview">
                              Xem thử
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "lesson" && (
            <div className="cd-tab-content cd-lesson">
              {!activeLessonId || !activeLesson ? (
                <div className="cd-lesson__pick">
                  <h3>Chọn bài học để bắt đầu</h3>
                  <p>Chọn một bài từ danh sách chương trình.</p>
                  <button
                    className="cd-btn-secondary"
                    onClick={() => setActiveTab("curriculum")}
                  >
                    Xem chương trình học
                  </button>
                </div>
              ) : (
                <div className="cd-lesson__content">
                  <div className="cd-lesson__header">
                    <button
                      className="cd-back-sm"
                      onClick={() => setActiveTab("curriculum")}
                    >
                      Danh sách bài
                    </button>
                    <h2 className="cd-lesson__title">{activeLesson.title}</h2>
                    <span className="cd-lesson__duration">
                      {activeLesson.duration}
                    </span>
                  </div>
                  <div className="cd-lesson__body">
                    {activeLesson.content
                      .trim()
                      .split("\n")
                      .map((line, i) => {
                        if (line.startsWith("## "))
                          return (
                            <h2 key={i} className="cd-md-h2">
                              {line.slice(3)}
                            </h2>
                          );
                        if (line.startsWith("### "))
                          return (
                            <h3 key={i} className="cd-md-h3">
                              {line.slice(4)}
                            </h3>
                          );
                        if (line.startsWith("> "))
                          return (
                            <blockquote key={i} className="cd-md-quote">
                              {line.slice(2)}
                            </blockquote>
                          );
                        if (line.startsWith("- "))
                          return (
                            <li key={i} className="cd-md-li">
                              {line.slice(2)}
                            </li>
                          );
                        if (line.startsWith("| "))
                          return (
                            <div key={i} className="cd-md-table-row">
                              {line}
                            </div>
                          );
                        if (line.trim() === "")
                          return <div key={i} className="cd-md-spacer" />;
                        const bold = line.replace(
                          /\*\*(.*?)\*\*/g,
                          "<strong>$1</strong>",
                        );
                        return (
                          <p
                            key={i}
                            className="cd-md-p"
                            dangerouslySetInnerHTML={{ __html: bold }}
                          />
                        );
                      })}
                  </div>
                  <div className="cd-lesson__footer">
                    <button
                      className="cd-btn-enroll"
                      onClick={() => setActiveTab("quiz")}
                    >
                      Làm bài kiểm tra ngay
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "quiz" && (
            <div className="cd-tab-content cd-quiz">
              {!quizStarted && !quizDone ? (
                <div className="cd-quiz__intro">
                  <h2 className="cd-quiz__intro-title">Bài kiểm tra ôn tập</h2>
                  <p className="cd-quiz__intro-sub">
                    {MOCK_QUIZ.length} câu hỏi · Không giới hạn thời gian
                  </p>
                  <ul className="cd-quiz__intro-info">
                    <li>Mỗi câu có 4 lựa chọn</li>
                    <li>Giải thích đáp án sau mỗi câu</li>
                    <li>Có thể làm lại nhiều lần</li>
                  </ul>
                  <button
                    className="cd-btn-enroll"
                    onClick={() => setQuizStarted(true)}
                  >
                    Bắt đầu làm bài
                  </button>
                </div>
              ) : quizDone ? (
                <div className="cd-quiz__result">
                  <div
                    className={`cd-quiz__result-circle ${score >= MOCK_QUIZ.length * 0.7 ? "cd-quiz__result-circle--pass" : "cd-quiz__result-circle--fail"}`}
                  >
                    <span className="cd-quiz__result-score">
                      {score}/{MOCK_QUIZ.length}
                    </span>
                    <span className="cd-quiz__result-label">
                      {score >= MOCK_QUIZ.length * 0.7
                        ? "Xuất sắc!"
                        : "Cần ôn thêm"}
                    </span>
                  </div>
                  <p className="cd-quiz__result-msg">
                    {score >= MOCK_QUIZ.length * 0.7
                      ? "Bạn đã nắm vững nội dung bài học. Tiếp tục bài tiếp theo!"
                      : "Hãy xem lại bài học và thử lại nhé!"}
                  </p>
                  <div className="cd-quiz__result-actions">
                    <button
                      className="cd-btn-enroll"
                      onClick={handleRestartQuiz}
                    >
                      Làm lại
                    </button>
                    <button
                      className="cd-btn-secondary"
                      onClick={() => setActiveTab("lesson")}
                    >
                      Xem lại bài
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cd-quiz__question">
                  <div className="cd-quiz__progress">
                    <div className="cd-quiz__progress-bar">
                      <div
                        className="cd-quiz__progress-fill"
                        style={{
                          width: `${(currentQ / MOCK_QUIZ.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="cd-quiz__progress-text">
                      Câu {currentQ + 1} / {MOCK_QUIZ.length}
                    </span>
                  </div>
                  <h3 className="cd-quiz__q-text">
                    {MOCK_QUIZ[currentQ].question}
                  </h3>
                  <div className="cd-quiz__options">
                    {MOCK_QUIZ[currentQ].options.map((opt, idx) => {
                      let cls = "cd-quiz__option";
                      if (answered) {
                        if (idx === MOCK_QUIZ[currentQ].correct)
                          cls += " cd-quiz__option--correct";
                        else if (idx === selected)
                          cls += " cd-quiz__option--wrong";
                      } else if (idx === selected) {
                        cls += " cd-quiz__option--selected";
                      }
                      return (
                        <button
                          key={idx}
                          className={cls}
                          onClick={() => handleSelectAnswer(idx)}
                        >
                          <span className="cd-quiz__option-letter">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {answered && (
                    <div className="cd-quiz__explanation">
                      <strong
                        className={
                          selected === MOCK_QUIZ[currentQ].correct
                            ? "cd-quiz__correct-text"
                            : "cd-quiz__wrong-text"
                        }
                      >
                        {selected === MOCK_QUIZ[currentQ].correct
                          ? "Chính xác!"
                          : "Chưa đúng."}
                      </strong>
                      <p>{MOCK_QUIZ[currentQ].explanation}</p>
                    </div>
                  )}
                  {answered && (
                    <button
                      className="cd-btn-enroll cd-quiz__next-btn"
                      onClick={handleNextQuestion}
                    >
                      {currentQ + 1 < MOCK_QUIZ.length
                        ? "Câu tiếp theo"
                        : "Xem kết quả"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {activeTab === "reviews" && (
            <div className="cd-tab-content cd-reviews">
              <div className="cd-rv-summary">
                <div className="cd-rv-big-score">
                  <span className="cd-rv-big-num">
                    {course.rating.toFixed(1)}
                  </span>
                  <div className="cd-rv-big-stars">
                    {"★".repeat(Math.round(course.rating))}
                    {"☆".repeat(5 - Math.round(course.rating))}
                  </div>
                  <span className="cd-rv-big-sub">
                    {course.reviewCount.toLocaleString()} đánh giá
                  </span>
                </div>
                <div className="cd-rv-bars">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const fakeWeights = [78, 14, 5, 2, 1];
                    const pct = fakeWeights[5 - star];
                    return (
                      <div key={star} className="cd-rv-bar-row">
                        <span className="cd-rv-bar-label">{star} ★</span>
                        <div className="cd-rv-bar-track">
                          <div
                            className="cd-rv-bar-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="cd-rv-bar-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="cd-rv-list">
                {MOCK_REVIEWS.filter((r) => r.courseId === course.id).map(
                  (r) => (
                    <div key={r.id} className="cd-rv-card">
                      <div className="cd-rv-card-top">
                        <img
                          className="cd-rv-avatar"
                          src={r.user.avatar}
                          alt={r.user.name}
                        />
                        <div>
                          <div className="cd-rv-name">{r.user.name}</div>
                          <div className="cd-rv-date">{r.date}</div>
                        </div>
                        <div className="cd-rv-stars">
                          {"★".repeat(r.rating)}
                          {"☆".repeat(5 - r.rating)}
                        </div>
                      </div>
                      <p className="cd-rv-comment">{r.comment}</p>
                    </div>
                  ),
                )}
              </div>

              <div className="cd-rv-form">
                <h3 className="cd-rv-form-title">Viết đánh giá của bạn</h3>
                {reviewSent ? (
                  <div className="cd-rv-success">
                    ✓ Cảm ơn bạn đã đánh giá! Đánh giá sẽ được hiển thị sau khi
                    được duyệt.
                  </div>
                ) : (
                  <>
                    <div className="cd-rv-star-input">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button
                          key={i}
                          className={`cd-rv-star-btn${i <= (hoverRating || reviewRating) ? " cd-rv-star-btn--active" : ""}`}
                          onClick={() => setReviewRating(i)}
                          onMouseEnter={() => setHoverRating(i)}
                          onMouseLeave={() => setHoverRating(0)}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="cd-rv-textarea"
                      rows={3}
                      placeholder="Chia sẻ trải nghiệm học của bạn..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                    />
                    <button
                      className="cd-btn-enroll cd-rv-submit"
                      disabled={!reviewRating || !reviewText.trim()}
                      onClick={() => {
                        if (!isLoggedIn) {
                          onNavigate("auth");
                          return;
                        }
                        setReviewSent(true);
                      }}
                    >
                      {isLoggedIn ? "Gửi đánh giá" : "Đăng nhập để đánh giá"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="cd-sidebar">
          <div className="cd-price-card">
            <div className="cd-price-card__instructor">
              <img
                src={course.instructor.avatar}
                alt={course.instructor.name}
              />
              <div>
                <strong>{course.instructor.name}</strong>
                <span>{course.instructor.title}</span>
              </div>
            </div>
            <div className="cd-price-card__instructor-stats">
              <span>{course.instructor.rating} đánh giá</span>
              <span>{course.instructor.totalCourses} khóa học</span>
              <span>
                {course.instructor.totalStudents.toLocaleString()} học viên
              </span>
            </div>
            <div className="cd-price-card__price-row">
              <span className="cd-price-card__price">
                {formatPrice(course.price, course.currency)}
              </span>
              {discount > 0 && (
                <>
                  <span className="cd-price-card__original">
                    {formatPrice(course.originalPrice!, course.currency)}
                  </span>
                  <span className="cd-price-card__discount">-{discount}%</span>
                </>
              )}
            </div>
            <button
              className="cd-btn-enroll"
              onClick={() =>
                isLoggedIn ? setActiveTab("lesson") : onNavigate("auth")
              }
            >
              {isLoggedIn ? "Bắt đầu học ngay" : "Đăng nhập để học"}
            </button>
            <div className="cd-price-card__tags">
              {course.tags.map((tag) => (
                <span key={tag} className="cd-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
