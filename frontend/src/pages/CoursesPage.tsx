import React, { useState, useMemo } from 'react';
import { MOCK_COURSES, MOCK_CATEGORIES } from '../data/mockData';
import { formatPrice } from '../utils/format';
import type { Course } from '../types';

interface CoursesPageProps {
  onNavigate: (page: string, courseId?: string, searchQuery?: string) => void;
  initialSearch?: string;
  onSearchChange?: (q: string) => void;
}

const LEVELS = ['Tất cả', 'Beginner', 'Intermediate', 'Advanced'] as const;
const PRICES = [
  { label: 'Tất cả',     value: 'all' },
  { label: 'Miễn phí',   value: 'free' },
  { label: 'Có phí',     value: 'paid' },
] as const;

const CoursesPage: React.FC<CoursesPageProps> = ({
  onNavigate,
  initialSearch = '',
  onSearchChange,
}) => {
  const [search, setSearch] = useState(initialSearch);

  React.useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedLv, setSelectedLv]   = useState('Tất cả');
  const [selectedPrice, setSelectedPrice] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy]           = useState<'popular' | 'rating' | 'newest'>('popular');

  const filtered = useMemo(() => {
    let list = [...MOCK_COURSES];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.shortDescription.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (selectedCat) list = list.filter(c => c.category === selectedCat);

    if (selectedLv !== 'Tất cả') list = list.filter(c => c.level === selectedLv);

    if (selectedPrice === 'free') list = list.filter(c => c.price === 0);
    if (selectedPrice === 'paid') list = list.filter(c => c.price > 0);

    list.sort((a, b) => {
      if (sortBy === 'rating')   return b.rating - a.rating;
      if (sortBy === 'newest')   return b.lastUpdated.localeCompare(a.lastUpdated);
      return b.studentCount - a.studentCount;
    });

    return list;
  }, [search, selectedCat, selectedLv, selectedPrice, sortBy]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    onSearchChange?.(val);
  };

  const clearFilters = () => {
    handleSearchChange('');
    setSelectedCat(''); setSelectedLv('Tất cả');
    setSelectedPrice('all'); setSortBy('popular');
  };

  const hasFilters = search || selectedCat || selectedLv !== 'Tất cả' || selectedPrice !== 'all';

  return (
    <div className="courses-page">

      <div className="courses-header">
        <div className="container">
          <span className="courses-header__eyebrow">Tất cả khóa học</span>
          <h1 className="courses-header__title">Tìm khóa học phù hợp với bạn</h1>
          <p className="courses-header__sub">
            {MOCK_COURSES.length} khóa học · từ A1 đến C2 · mọi kỹ năng tiếng Anh
            {search && <span className="courses-header__query"> · Kết quả cho "<strong>{search}</strong>"</span>}
          </p>
        </div>
      </div>

      <div className="container courses-body">

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
                  {lv}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-block">
            <h3 className="filter-block__title">Danh mục</h3>
            <div className="filter-categories">
              <button
                className={`filter-cat${!selectedCat ? ' filter-cat--active' : ''}`}
                onClick={() => setSelectedCat('')}>Tất cả
              </button>
              {MOCK_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`filter-cat${selectedCat === cat.name ? ' filter-cat--active' : ''}`}
                  onClick={() => setSelectedCat(selectedCat === cat.name ? '' : cat.name)}
                >
                  {cat.name}
                  <span className="filter-cat__count">{cat.courseCount}</span>
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

        <div className="courses-main">

          <div className="courses-toolbar">
            <p className="courses-toolbar__count">
              <strong>{filtered.length}</strong> khóa học
              {hasFilters && <span className="courses-toolbar__filtered"> (đang lọc)</span>}
            </p>
            <div className="courses-toolbar__sort">
              <span>Sắp xếp:</span>
              {(['popular', 'rating', 'newest'] as const).map(s => (
                <button
                  key={s}
                  className={`sort-btn${sortBy === s ? ' sort-btn--active' : ''}`}
                  onClick={() => setSortBy(s)}
                >
                  {s === 'popular' ? 'Phổ biến' : s === 'rating' ? 'Đánh giá' : 'Mới nhất'}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
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
                  onSelect={() => onNavigate('course-detail', course.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LEVEL_LABEL: Record<string, string> = {
  Beginner:     'Cơ bản',
  Intermediate: 'Trung cấp',
  Advanced:     'Nâng cao',
  'All Levels': 'Mọi cấp độ',
};

interface CardProps { course: Course; onSelect: () => void; }

const CourseListCard: React.FC<CardProps> = ({ course, onSelect }) => {
  const discount = course.originalPrice && course.originalPrice > course.price
    ? Math.round((1 - course.price / course.originalPrice) * 100)
    : 0;

  return (
    <button className="course-card" onClick={onSelect}>
      <div className="course-card__thumb">
        <img src={course.thumbnail} alt={course.title} />
        {course.isBestseller && <span className="course-card__badge course-card__badge--best">Bestseller</span>}
        {course.isNew       && <span className="course-card__badge course-card__badge--new">Mới</span>}
        {course.price === 0 && <span className="course-card__badge course-card__badge--free">Miễn phí</span>}
      </div>

      <div className="course-card__body">
        <div className="course-card__meta">
          <span className="course-card__cat">{course.category}</span>
          <span className="course-card__level">{LEVEL_LABEL[course.level] ?? course.level}</span>
        </div>

        <h3 className="course-card__title">{course.title}</h3>
        <p className="course-card__desc">{course.shortDescription}</p>

        <div className="course-card__instructor">
          <img src={course.instructor.avatar} alt={course.instructor.name} />
          <span>{course.instructor.name}</span>
        </div>

        <div className="course-card__stats">
          <span className="course-card__rating">
            ★ {course.rating.toFixed(1)}
            <span className="course-card__reviews">({course.reviewCount.toLocaleString()})</span>
          </span>
          <span className="course-card__dot">·</span>
          <span>{course.lessonCount} bài</span>
          <span className="course-card__dot">·</span>
          <span>{course.duration}</span>
        </div>

        <div className="course-card__footer">
          <div className="course-card__price-wrap">
            <span className="course-card__price">
              {formatPrice(course.price, course.currency)}
            </span>
            {discount > 0 && (
              <>
                <span className="course-card__original">
                  {formatPrice(course.originalPrice!, course.currency)}
                </span>
                <span className="course-card__discount">-{discount}%</span>
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