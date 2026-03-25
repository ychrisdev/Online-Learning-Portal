import React, { useState, useEffect, useMemo } from 'react';
import { formatPrice } from '../utils/format';

interface CoursesPageProps {
  onNavigate: (page: string, courseId?: string, searchQuery?: string) => void;
  initialSearch?: string;
  onSearchChange?: (q: string) => void;
}

const API = 'http://127.0.0.1:8000';

const toList = (data: any): any[] =>
  Array.isArray(data) ? data : (data?.results ?? []);

const thumbSrc = (t: string | null) =>
  !t ? 'https://placehold.co/400x225?text=No+Image' : t.startsWith('http') ? t : `${API}${t}`;

const LEVELS = ['Tất cả', 'beginner', 'intermediate', 'advanced'] as const;
const LEVEL_LABEL: Record<string, string> = {
  beginner:     'Cơ bản',
  intermediate: 'Trung cấp',
  advanced:     'Nâng cao',
  'Tất cả':     'Tất cả',
};

const PRICES = [
  { label: 'Tất cả',   value: 'all'  },
  { label: 'Miễn phí', value: 'free' },
  { label: 'Có phí',   value: 'paid' },
] as const;

const SORTS = [
  { value: 'popular', label: 'Phổ biến'  },
  { value: 'rating',  label: 'Đánh giá'  },
  { value: 'newest',  label: 'Mới nhất'  },
] as const;

// ── Component ──────────────────────────────────────────────────────────────────
const CoursesPage: React.FC<CoursesPageProps> = ({
  onNavigate,
  initialSearch = '',
  onSearchChange,
}) => {
  const [search, setSearch] = useState(initialSearch);

  // Real data
  const [courses,    setCourses]    = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Filters
  const [selectedCat,   setSelectedCat]   = useState('');
  const [selectedLv,    setSelectedLv]    = useState<typeof LEVELS[number]>('Tất cả');
  const [selectedPrice, setSelectedPrice] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy,        setSortBy]        = useState<'popular' | 'rating' | 'newest'>('popular');

  // Sync search từ navbar hoặc navigation
  useEffect(() => {
    if (initialSearch.startsWith('cat:')) {
      setSelectedCat(initialSearch.replace('cat:', ''));
      setSearch('');
    } else if (initialSearch.startsWith('level:')) {
      const lv = initialSearch.replace('level:', '') as typeof LEVELS[number];
      setSelectedLv(lv);
      setSearch('');
    } else {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  // ── Fetch courses ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/courses/`);
        if (res.ok) setCourses(toList(await res.json()));
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  // ── Fetch categories ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/courses/categories/`);
        if (res.ok) setCategories(toList(await res.json()));
      } catch (_) {}
    })();
  }, []);

  // ── Filter + sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...courses];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.instructor_name?.toLowerCase().includes(q) ||
        c.category_name?.toLowerCase().includes(q)
      );
    }

    if (selectedCat)              list = list.filter(c => c.category_name === selectedCat);
    if (selectedLv !== 'Tất cả')  list = list.filter(c => c.level === selectedLv);
    if (selectedPrice === 'free') list = list.filter(c => (c.sale_price ?? c.price) === 0);
    if (selectedPrice === 'paid') list = list.filter(c => (c.sale_price ?? c.price) > 0);

    list.sort((a, b) => {
      if (sortBy === 'rating')  return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
      if (sortBy === 'newest')  return (b.id > a.id ? 1 : -1); // UUID sort gần đúng
      return (b.total_students ?? 0) - (a.total_students ?? 0);
    });

    return list;
  }, [courses, search, selectedCat, selectedLv, selectedPrice, sortBy]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    onSearchChange?.(val);
  };

  const clearFilters = () => {
    handleSearchChange('');
    setSelectedCat('');
    setSelectedLv('Tất cả');
    setSelectedPrice('all');
    setSortBy('popular');
  };

  const hasFilters = !!(search || selectedCat || selectedLv !== 'Tất cả' || selectedPrice !== 'all');

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="courses-page">

      {/* Header */}
      <div className="courses-header">
        <div className="container">
          <span className="courses-header__eyebrow">Tất cả khóa học</span>
          <h1 className="courses-header__title">Tìm khóa học phù hợp với bạn</h1>
          <p className="courses-header__sub">
            {loading ? 'Đang tải…' : `${courses.length} khóa học · từ cơ bản đến nâng cao`}
            {search && (
              <span className="courses-header__query">
                {' '}· Kết quả cho "<strong>{search}</strong>"
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="container courses-body">

        {/* Sidebar filters */}
        <aside className="courses-sidebar">

          <div className="filter-block">
            <h3 className="filter-block__title">Cấp độ</h3>
            <div className="filter-pills">
              {LEVELS.map(lv => (
                <button
                  key={lv}
                  className={`filter-pill${selectedLv === lv ? ' filter-pill--active' : ''}`}
                  onClick={() => setSelectedLv(lv)}
                >
                  {LEVEL_LABEL[lv]}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-block">
            <h3 className="filter-block__title">Danh mục</h3>
            <div className="filter-categories">
              <button
                className={`filter-cat${!selectedCat ? ' filter-cat--active' : ''}`}
                onClick={() => setSelectedCat('')}
              >
                Tất cả
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`filter-cat${selectedCat === cat.name ? ' filter-cat--active' : ''}`}
                  onClick={() => setSelectedCat(selectedCat === cat.name ? '' : cat.name)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-block">
            <h3 className="filter-block__title">Học phí</h3>
            <div className="filter-pills">
              {PRICES.map(p => (
                <button
                  key={p.value}
                  className={`filter-pill${selectedPrice === p.value ? ' filter-pill--active' : ''}`}
                  onClick={() => setSelectedPrice(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <button className="filter-clear" onClick={clearFilters}>
              ✕ Xoá bộ lọc
            </button>
          )}
        </aside>

        {/* Main */}
        <div className="courses-main">

          {/* Toolbar */}
          <div className="courses-toolbar">
            <p className="courses-toolbar__count">
              <strong>{loading ? '…' : filtered.length}</strong> khóa học
              {hasFilters && <span className="courses-toolbar__filtered"> (đang lọc)</span>}
            </p>
            <div className="courses-toolbar__sort">
              <span>Sắp xếp:</span>
              {SORTS.map(s => (
                <button
                  key={s.value}
                  className={`sort-btn${sortBy === s.value ? ' sort-btn--active' : ''}`}
                  onClick={() => setSortBy(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="courses-loading">
              <p className="courses-empty__icon">⏳</p>
              <p>Đang tải khóa học…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="courses-empty">
              <span className="courses-empty__icon">🔍</span>
              <p>Không tìm thấy khóa học phù hợp.</p>
              <button className="filter-clear" onClick={clearFilters}>Xoá bộ lọc</button>
            </div>
          ) : (
            <div className="courses-grid">
              {filtered.map(course => (
                <CourseListCard
                  key={course.id}
                  course={course}
                  onSelect={() => onNavigate('course-detail', course.slug ?? course.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Card ───────────────────────────────────────────────────────────────────────
interface CardProps {
  course: any;
  onSelect: () => void;
}

const CourseListCard: React.FC<CardProps> = ({ course, onSelect }) => {
  const price        = Number(course.sale_price ?? course.price ?? 0);
  const originalPrice = Number(course.price ?? 0);
  const discount     = course.discount_percent ?? 0;
  const isFree       = price === 0;

  return (
    <button className="course-card" onClick={onSelect}>
      <div className="course-card__thumb">
        <img src={thumbSrc(course.thumbnail)} alt={course.title} />
        {course.is_featured && (
          <span className="course-card__badge course-card__badge--best">Nổi bật</span>
        )}
        {isFree && (
          <span className="course-card__badge course-card__badge--free">Miễn phí</span>
        )}
        {discount > 0 && !isFree && (
          <span className="course-card__badge course-card__badge--sale">-{discount}%</span>
        )}
      </div>

      <div className="course-card__body">
        <div className="course-card__meta">
          {course.category_name && (
            <span className="course-card__cat">{course.category_name}</span>
          )}
          <span className="course-card__level">
            {LEVEL_LABEL[course.level] ?? course.level}
          </span>
        </div>

        <h3 className="course-card__title">{course.title}</h3>

        {course.instructor_name && (
          <div className="course-card__instructor">
            <span>{course.instructor_name}</span>
          </div>
        )}

        <div className="course-card__stats">
          {course.avg_rating > 0 && (
            <>
              <span className="course-card__rating">
                ★ {Number(course.avg_rating).toFixed(1)}
              </span>
              <span className="course-card__dot">·</span>
            </>
          )}
          <span>{(course.total_students ?? 0).toLocaleString()} học viên</span>
        </div>

        <div className="course-card__footer">
          <div className="course-card__price-wrap">
            {isFree ? (
              <span className="course-card__price">Miễn phí</span>
            ) : (
              <>
                <span className="course-card__price">{formatPrice(price, 'VND')}</span>
                {discount > 0 && (
                  <span className="course-card__original">
                    {formatPrice(originalPrice, 'VND')}
                  </span>
                )}
              </>
            )}
          </div>
          <span className="course-card__cta">Xem ngay →</span>
        </div>
      </div>
    </button>
  );
};

export default CoursesPage;