import React, { useEffect, useState } from "react";
import { TESTIMONIALS } from "../data/mockData";
import CourseListCard from '../components/ui/CourseListCard';

// ── Types ──────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_pinned: boolean;
  pin_order: number;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  level: string;          // e.g. "A1", "B2"
  lesson_count?: number;
  enrolled_count?: number;
  rating?: number;
  is_featured?: boolean;
  category_slug?: string; 
}

interface HomePageProps {
  onNavigate: (page: string, courseId?: string, searchQuery?: string) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────
const LEVEL_COLORS = [
  "#4CAF82",
  "#5BA4CF",
  "#778DA9",
  "#415A77",
  "#2E4A6B",
  "#1B263B",
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

// ── HomePage Component ─────────────────────────────────────────────────────
const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [pinnedCategories, setPinnedCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Course[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState(false);

  // Fetch pinned categories
  useEffect(() => {
    fetch("/api/courses/categories/?pinned=true")
      .then((r) => r.json())
      .then((data) => {
        const list: Category[] = data.results ?? data;
        setPinnedCategories(list);
      })
      .catch((err) => console.error("fetch categories error:", err));
  }, []);

  // Fetch featured courses
  useEffect(() => {
    setFeaturedLoading(true);
    setFeaturedError(false);

    fetch("/api/courses/?is_featured=true")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const list: Course[] = data.results ?? data;
        setFeatured(list);
      })
      .catch((err) => {
        console.error("fetch featured courses error:", err);
        setFeaturedError(true);
      })
      .finally(() => setFeaturedLoading(false));
  }, []);

  return (
    <div className="home-page">

      {/* ── Hero ──────────────────────────────────────────────── */}
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
              Học tiếng Anh từ A1 đến C2 qua các bài học ngắn, bài tập thực
              hành và lộ trình cá nhân hoá — phù hợp với mọi trình độ.
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

      {/* ── Lộ trình ──────────────────────────────────────────── */}
      {pinnedCategories.length > 0 && (
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
              {pinnedCategories.map((cat, i) => (
                <button
                  key={cat.id}
                  className="level-card"
                  onClick={() =>
                    onNavigate("courses", undefined, `cat:${cat.slug}`)
                  }
                  style={
                    {
                      "--lv-color": LEVEL_COLORS[i] ?? "#415A77",
                    } as React.CSSProperties
                  }
                >
                  <div className="level-card__header">
                    <span className="level-card__code">
                      {cat.slug.toUpperCase()}
                    </span>
                    <span className="level-card__step">
                      {i + 1} / {pinnedCategories.length}
                    </span>
                  </div>
                  <span className="level-card__name">{cat.name}</span>
                  <p className="level-card__desc">{cat.description}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured courses ──────────────────────────────────── */}
      <section className="section featured-section">
        <div className="container">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">Được quan tâm nhiều nhất</span>
              <h2 className="section-title">Các bài học nổi bật</h2>
            </div>
            <button className="link-btn" onClick={() => onNavigate("courses")}>
              Xem tất cả →
            </button>
          </div>

          {/* Loading state */}
          {featuredLoading && (
            <div className="featured-skeleton">
              {[1, 2, 3].map((n) => (
                <div key={n} className="course-card course-card--skeleton" aria-hidden="true">
                  <div className="course-card__thumb skeleton-box" />
                  <div className="course-card__body">
                    <div className="skeleton-line skeleton-line--title" />
                    <div className="skeleton-line skeleton-line--desc" />
                    <div className="skeleton-line skeleton-line--meta" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!featuredLoading && featuredError && (
            <div className="featured-error">
              <p>Không thể tải khóa học. Vui lòng thử lại sau.</p>
              <button
                className="link-btn"
                onClick={() => {
                  setFeaturedLoading(true);
                  setFeaturedError(false);
                  fetch("/api/courses/?is_featured=true")
                    .then((r) => r.json())
                    .then((data) => setFeatured(data.results ?? data))
                    .catch(() => setFeaturedError(true))
                    .finally(() => setFeaturedLoading(false));
                }}
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Empty state */}
          {!featuredLoading && !featuredError && featured.length === 0 && (
            <div className="featured-empty">
              <p>Chưa có khóa học nổi bật nào.</p>
            </div>
          )}

          {/* Courses grid */}
          {!featuredLoading && !featuredError && featured.length > 0 && (
            <div className="grid-courses">
              {featured.map((course) => (
                // ✅ ĐÚNG
                <CourseListCard
                  key={course.id}
                  course={course}
                  onSelect={() => onNavigate("course-detail", course.slug ?? course.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Tại sao chọn EnglishHub ───────────────────────────── */}
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

      {/* ── Testimonials ──────────────────────────────────────── */}
      <section className="section section--sm testimonials-section">
        <div className="container">
          <div className="section-header-center">
            <span className="section-eyebrow">Học viên nói gì ?</span>
            <h2 className="section-title">
              Họ đã tiến bộ.<br />Bạn cũng vậy.
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

      {/* ── CTA Banner ────────────────────────────────────────── */}
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