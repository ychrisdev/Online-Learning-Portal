import React from 'react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const currentYear = new Date().getFullYear();

  const links = {
    product: [
      { label: 'Trang chủ',       page: 'home' },
      { label: 'Tất cả khóa học', page: 'courses' },
      { label: 'Lộ trình học',    page: 'courses' },
    ],
    support: [
      { label: 'Trung tâm hỗ trợ',    page: 'home' },
      { label: 'Chính sách bảo mật',  page: 'home' },
      { label: 'Điều khoản sử dụng',  page: 'home' },
    ],
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">

          {/* Brand */}
          <div className="footer__brand">
            <div className="footer__logo">
              <div className="footer__logo-icon">E</div>
              <span className="footer__logo-text">EnglishHub</span>
            </div>
            <p className="footer__tagline">
              Nền tảng học tiếng Anh trực tuyến với các bài học được chọn lọc kĩ càng.
            </p>
          </div>

          {/* Product */}
          <div className="footer__col">
            <h4 className="footer__col-title">Sản phẩm</h4>
            <ul className="footer__links">
              {links.product.map(link => (
                <li key={link.label}>
                  <button className="footer__link" onClick={() => onNavigate(link.page)}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="footer__col">
            <h4 className="footer__col-title">Hỗ trợ</h4>
            <ul className="footer__links">
              {links.support.map(link => (
                <li key={link.label}>
                  <button className="footer__link" onClick={() => onNavigate(link.page)}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="footer__col">
            <h4 className="footer__col-title">Nhận thông báo</h4>
            <p className="footer__newsletter-text">
              Đăng ký để nhận tài liệu miễn phí và thông tin khóa học mới nhất mỗi tuần.
            </p>
            <form className="footer__newsletter-form" onSubmit={e => e.preventDefault()}>
              <input
                type="email"
                placeholder="email@example.com"
                className="footer__newsletter-input"
                aria-label="Email đăng ký nhận thông báo"
              />
              <button type="submit" className="footer__newsletter-btn" aria-label="Đăng ký">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7h12M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
            <p className="footer__newsletter-note">Hủy đăng ký bất cứ lúc nào.</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer__bottom">
          <p>© {currentYear} EnglishHub. All rights reserved.</p>
          <div className="footer__bottom-badges">
            <span className="footer__badge">Cambridge</span>
            <span className="footer__badge">English Official</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;