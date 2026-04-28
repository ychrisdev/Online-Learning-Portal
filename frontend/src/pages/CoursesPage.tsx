import React, { useState, useEffect, useMemo, useRef } from 'react';
import CourseListCard, { LEVEL_LABEL } from '../components/ui/CourseListCard';

const API = 'http://127.0.0.1:8000';

interface CoursesPageProps {
  onNavigate: (page: string, courseId?: string, searchQuery?: string) => void;
  initialSearch?: string;
  onSearchChange?: (q: string) => void;
}


const toList = (data: any): any[] =>
  Array.isArray(data) ? data : (data?.results ?? []);


const LEVELS = ['Tất cả', 'beginner', 'intermediate', 'advanced'] as const;

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

const normalizeText = (str: string) => {
  return str
    .toLowerCase()
    .normalize('NFD') // tách dấu
    .replace(/[\u0300-\u036f]/g, '') // xóa dấu
    .replace(/\s+/g, '') // ❗ bỏ luôn khoảng trắng
    .trim();
};

// ── Component ──────────────────────────────────────────────────────────────────
const CoursesPage: React.FC<CoursesPageProps> = ({
  onNavigate,
  initialSearch = '',
  onSearchChange,
}) => {
  const [search, setSearch] = useState(initialSearch);
  const gridRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  // Real data
  const [courses,    setCourses]    = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Filters
  const [selectedCat, setSelectedCat] = useState(() =>
    initialSearch.startsWith('cat:') ? initialSearch.replace('cat:', '') : ''
  );
  const [selectedLv, setSelectedLv] = useState<typeof LEVELS[number]>(() =>
    initialSearch.startsWith('level:')
      ? initialSearch.replace('level:', '') as typeof LEVELS[number]
      : 'Tất cả'
  );
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

  const scrollToGrid = () => {
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  // ── Filter + sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...courses];

    if (search.trim()) {
      const q = normalizeText(search);

      list = list.filter(c => {
        const title = normalizeText(c.title || '');
        const instructor = normalizeText(c.instructor_name || '');
        const category = normalizeText(c.category_name || '');

        return (
          title.includes(q) ||
          instructor.includes(q) ||
          category.includes(q)
        );
      });
    }

    if (selectedCat)              list = list.filter(c => c.category_slug === selectedCat);
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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleSearchChange = (val: string) => {
    setSearch(val);
    onSearchChange?.(val);
    setPage(1);
  };

  const clearFilters = () => {
    handleSearchChange('');
    setSelectedCat('');
    setSelectedLv('Tất cả');
    setSelectedPrice('all');
    setSortBy('popular');
    setPage(1);
  };

  const hasFilters = !!(search || selectedCat || selectedLv !== 'Tất cả' || selectedPrice !== 'all');

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="courses-page">

      {/* Header */}
      <div className="courses-header"  ref={gridRef}>
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
                  onClick={() => { setSelectedLv(lv); handleSearchChange('');setPage(1); scrollToGrid(); }}
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
                onClick={() => { setSelectedCat(''); handleSearchChange(''); setPage(1); scrollToGrid(); }}
              >
                Tất cả
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`filter-cat${selectedCat === cat.slug ? ' filter-cat--active' : ''}`}
                  onClick={() => { setSelectedCat(selectedCat === cat.slug ? '' : cat.slug); handleSearchChange('');setPage(1); scrollToGrid(); }}
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
                  onClick={() => { setSelectedPrice(p.value); handleSearchChange('');setPage(1); scrollToGrid(); }}
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
                  onClick={() => { setSortBy(s.value); handleSearchChange(''); scrollToGrid()}}
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
            </div>
          ) : (
            <>
              <div className="courses-grid">
                {paginated.map(course => (
                  <CourseListCard
                    key={course.id}
                    course={course}
                    onSelect={() => onNavigate('course-detail', course.slug ?? course.id)}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="courses-pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => {setPage(p => Math.max(1, p - 1));scrollToGrid(); }}
                    disabled={page === 1}
                  >
                    ← Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      className={`pagination-btn${page === p ? ' pagination-btn--active' : ''}`}
                      onClick={() => {setPage(p);scrollToGrid(); }}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    onClick={() => {setPage(p => Math.min(totalPages, p + 1));scrollToGrid(); }}
                    disabled={page === totalPages}
                  >
                    Tiếp →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursesPage;