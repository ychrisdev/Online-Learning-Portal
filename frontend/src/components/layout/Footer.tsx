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
      { label: 'Chính sách bảo mật',   page: 'policy' },
      { label: 'Điều khoản sử dụng', page: 'policy' },
      { label: 'Câu hỏi thường gặp', page: 'policy' },
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

          {/* Sản phẩm */}
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

          {/* Hỗ trợ */}
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

        </div>{/* ← đóng footer__grid đúng chỗ */}

        {/* Bottom bar nằm ngoài grid */}
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