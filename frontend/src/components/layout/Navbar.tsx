import React, { useState, useEffect } from 'react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string, courseId?: string, searchQuery?: string) => void;
  isLoggedIn?: boolean;
  onAuthOpen?: (mode: 'login' | 'register') => void;
  onSearch?: (query: string) => void;   // callback khi search ở trang courses
  searchValue?: string;                  // sync giá trị từ CoursesPage
}

const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  isLoggedIn = false,
  onAuthOpen,
  onSearch,
  searchValue,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { id: 'home',    label: 'Trang chủ' },
    { id: 'courses', label: 'Khóa học' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (currentPage === 'courses') {
      // Đang ở courses → update trực tiếp, kể cả khi rỗng để clear
      onSearch?.(q);
    } else {
      // Trang khác → chỉ navigate khi có từ khóa
      if (q) onNavigate('courses', undefined, q);
    }
  };

  // Sync input khi searchValue prop thay đổi từ bên ngoài
  React.useEffect(() => {
    if (searchValue !== undefined) setSearchQuery(searchValue);
  }, [searchValue]);

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container">
      <div className="navbar__inner">

        {/* Left: Logo + Nav */}
        <div className="navbar__left">
          <button
            className="navbar__logo"
            onClick={() => onNavigate('home')}
            aria-label="Về trang chủ"
          >
            <div className="navbar__logo-icon">E</div>
            <span className="navbar__logo-text">EnglishHub</span>
          </button>
          <nav className="navbar__nav" aria-label="Điều hướng chính">
            {navLinks.map(link => (
              <button
                key={link.id}
                className={`navbar__link ${currentPage === link.id ? 'navbar__link--active' : ''}`}
                onClick={() => onNavigate(link.id)}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Center: Search */}
        <div className="navbar__center">
          <form className="navbar__search" onSubmit={handleSearch}>
            <svg className="navbar__search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="search"
              placeholder="Tìm khóa học..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="navbar__search-input"
              aria-label="Tìm kiếm khóa học"
            />
          </form>
        </div>

        {/* Right: Auth */}
        <div className="navbar__right">
        <div className="navbar__auth">
          {isLoggedIn ? (
            <button
              className="navbar__avatar-btn"
              onClick={() => onNavigate('dashboard')}
              aria-label="Dashboard"
            >
              <img
                src="https://i.pravatar.cc/40?img=32"
                alt="Avatar"
                className="navbar__avatar"
              />
              <span className="navbar__avatar-name">Học của tôi</span>
            </button>
          ) : (
            <>
              <button className="navbar__btn-ghost" onClick={() => onAuthOpen?.('login')}>
                Đăng nhập
              </button>
              <button className="navbar__btn-primary" onClick={() => onAuthOpen?.('register')}>
                Đăng ký
              </button>
            </>
          )}
        </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`navbar__hamburger ${menuOpen ? 'navbar__hamburger--open' : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar__mobile-menu">
          {navLinks.map(link => (
            <button
              key={link.id}
              className={`navbar__mobile-link ${currentPage === link.id ? 'navbar__mobile-link--active' : ''}`}
              onClick={() => { onNavigate(link.id); setMenuOpen(false); }}
            >
              {link.label}
            </button>
          ))}
          <hr className="navbar__mobile-divider" />
          {isLoggedIn ? (
            <button
              className="navbar__mobile-link"
              onClick={() => { onNavigate('dashboard'); setMenuOpen(false); }}
            >
              Học của tôi
            </button>
          ) : (
            <div className="navbar__mobile-auth">
              <button
                className="navbar__mobile-btn-outline"
                onClick={() => { onAuthOpen?.('login'); setMenuOpen(false); }}
              >
                Đăng nhập
              </button>
              <button
                className="navbar__mobile-btn-primary"
                onClick={() => { onAuthOpen?.('register'); setMenuOpen(false); }}
              >
                Đăng ký miễn phí
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;