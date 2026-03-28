import React from "react";
import { MOCK_COURSES, MOCK_CATEGORIES, TESTIMONIALS } from "../data/mockData";

interface HomePageProps {
  onNavigate: (page: string, courseId?: string, searchQuery?: string) => void;
}

const LEVELS = [
  {
    code: "A1",
    name: "Mới bắt đầu",
    desc: "Làm quen với bảng chữ cái, phát âm và giao tiếp cơ bản nhất.",
    color: "#4CAF82",
    filter: "beginner",
  },
  {
    code: "A2",
    name: "Sơ cấp",
    desc: "Xây dựng vốn từ vựng và câu đơn giản trong cuộc sống hàng ngày.",
    color: "#5BA4CF",
    filter: "beginner",
  },
  {
    code: "B1",
    name: "Trung cấp",
    desc: "Giao tiếp tự tin hơn, hiểu nội dung quen thuộc và diễn đạt ý kiến.",
    color: "#778DA9",
    filter: "intermediate",
  },
  {
    code: "B2",
    name: "Trung cao",
    desc: "Thảo luận về nhiều chủ đề, đọc hiểu văn bản phức tạp.",
    color: "#415A77",
    filter: "intermediate",
  },
  {
    code: "C1",
    name: "Nâng cao",
    desc: "Sử dụng tiếng Anh linh hoạt, hiệu quả trong học thuật và công việc.",
    color: "#2E4A6B",
    filter: "advanced",
  },
  {
    code: "C2",
    name: "Thành thạo",
    desc: "Nắm vững tiếng Anh ở mức gần như người bản ngữ.",
    color: "#1B263B",
    filter: "advanced",
  },
];

const WHY_FEATURES = [
  {
    icon: "🎯",
    title: "Học theo cấp độ rõ ràng",
    desc: "Từ A1 đến C2 — lộ trình được thiết kế để bạn luôn biết mình đang ở đâu và cần đi đến đâu.",
  },
  {
    icon: "🔊",
    title: "Luyện phát âm chuẩn",
    desc: "Bài tập lặp lại và phản hồi âm thanh giúp bạn nói đúng từ đầu.",
  },
  {
    icon: "📖",
    title: "Từ vựng trong ngữ cảnh",
    desc: "Học từ mới qua câu chuyện, hội thoại thực tế — không chỉ là danh sách thuần tuý.",
  },
  {
    icon: "📱",
    title: "Ôn tập mỗi ngày",
    desc: "Bài ôn ngắn 5–10 phút mỗi ngày giúp bạn nhớ lâu và tiến bộ đều đặn.",
  },
];

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const featured = MOCK_COURSES.filter((c) => c.isFeatured);

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero__noise" aria-hidden="true" />
        <div className="hero__glow hero__glow--1" aria-hidden="true" />
        <div className="hero__glow hero__glow--2" aria-hidden="true" />

        <div className="container hero__inner">
          <div className="hero__content">
            <h1 className="hero__headline">
              Cải thiện tiếng Anh
              <span className="hero__headline-em"> từng bước.</span>
              <br />
              <span className="hero__headline-sub">
                Đúng cấp độ. Đúng lộ trình.
              </span>
            </h1>

            <p className="hero__desc">
              Học tiếng Anh từ A1 đến C2 qua các bài học ngắn, bài tập thực hành
              và lộ trình cá nhân hoá — phù hợp với mọi trình độ.
            </p>

            <div className="hero__cta-group">
              <button
                className="btn-hero-ghost"
                onClick={() => onNavigate("courses")}
              >
                Xem tất cả khóa học
              </button>
            </div>
          </div>

          <div className="hero__visual" aria-hidden="true">
            <div className="hero__img-frame">
              <img
                src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=700&q=85"
                alt="Học tiếng Anh"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="levels" className="section section--sm levels-section">
        <div className="container">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">Lộ trình học</span>
              <h2 className="section-title">
                Học từ đâu cũng được — miễn là đúng cấp
              </h2>
            </div>
          </div>

          <div className="levels-grid">
            {LEVELS.map((lv, i) => (
              <button
                key={lv.code}
                className="level-card"
                onClick={() =>
                  onNavigate("courses", undefined, `cat:${lv.code}`)
                }
                style={{ "--lv-color": lv.color } as React.CSSProperties}
              >
                <div className="level-card__header">
                  <span className="level-card__code">{lv.code}</span>
                  <span className="level-card__step">{i + 1} / 6</span>
                </div>
                <span className="level-card__name">{lv.name}</span>
                <p className="level-card__desc">{lv.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured courses ─────────────────────────────────── */}
      {/* <section className="section featured-section">
        <div className="container">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">Được quan tâm nhiều nhất</span>
              <h2 className="section-title">Các bài học nổi bật</h2>
            </div>
            <button className="link-btn" onClick={() => onNavigate('courses')}>
              Xem tất cả →
            </button>
          </div>

          <div className="grid-courses">
            {featured.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                onSelect={id => onNavigate('course-detail', id)}
              />
            ))}
          </div>
        </div>
      </section> */}

      <section className="section why-section">
        <div className="container">
          <div className="why-inner">
            <div className="why-visual">
              <div className="why-img-wrap">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=640&q=85"
                  alt="Học viên học cùng nhau"
                  className="why-img"
                />
              </div>
            </div>

            <div className="why-content">
              <span className="section-eyebrow">Tại sao chọn EnglishHub?</span>
              <h2 className="section-title">
                Học ít hơn,
                <br />
                nhớ lâu hơn.
              </h2>
              <p className="why-desc">
                Chúng tôi không cố nhồi nhét thật nhiều. Thay vào đó, mỗi bài
                học ngắn gọn, tập trung và được lặp lại đúng lúc — để kiến thức
                thật sự bám vào.
              </p>

              <div className="why-features">
                {WHY_FEATURES.map((f) => (
                  <div key={f.title} className="why-feature">
                    <div>
                      <h4 className="why-feature__title">{f.title}</h4>
                      <p className="why-feature__desc">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--sm testimonials-section">
        <div className="container">
          <div className="section-header-center">
            <span className="section-eyebrow">Học viên nói gì ?</span>
            <h2 className="section-title">
              Họ đã tiến bộ.<br></br>Bạn cũng vậy.
            </h2>
          </div>

          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.id}
                className={`testimonial-card${i === 1 ? " testimonial-card--featured" : ""}`}
              >
                <p className="testimonial-card__quote">"{t.quote}"</p>
                <div className="testimonial-card__author">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="testimonial-card__avatar"
                  />
                  <div>
                    <strong className="testimonial-card__name">{t.name}</strong>
                    <span className="testimonial-card__role">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-banner">
        <div className="cta-banner__bg-lines" aria-hidden="true" />
        <div className="container">
          <div className="cta-banner__inner">
            <div className="cta-banner__text">
              <h2 className="cta-banner__title">
                Bắt đầu học ngay hôm nay — miễn phí.
              </h2>
              <p className="cta-banner__sub">
                Không cần đăng ký ngay. Thử vài bài học đầu tiên, cảm nhận sự
                khác biệt.
              </p>
            </div>
            <div className="cta-banner__actions">
              <button
                className="btn-cta-outline"
                onClick={() =>
                  document
                    .getElementById("levels")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Xem lộ trình
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
