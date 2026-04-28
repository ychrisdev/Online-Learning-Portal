import React from 'react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const currentYear = new Date().getFullYear();

  const links: {
    product: { label: string; page: string; hash?: string }[];
    support: { label: string; page: string; hash?: string }[];
  } = {
    product: [
      { label: 'Trang chủ',       page: 'home' },
      { label: 'Tất cả khóa học', page: 'courses' },
      { label: 'Lộ trình học',    page: 'home',  hash: 'levels' },
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
                  <button className="footer__link" onClick={() => {
                    onNavigate(link.page);
                    if (link.hash) {
                      setTimeout(() => {
                        const el = document.getElementById(link.hash!);
                        if (el) {
                          const navbarHeight = 72; // chỉnh số này khớp với chiều cao navbar của bạn
                          const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight;
                          window.scrollTo({ top, behavior: 'smooth' });
                        }
                      }, 100);
                    }
                  }}>
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
          {/* Vị trí */}
        <div className="footer__col">
          <h4 className="footer__col-title">Vị trí</h4>
          <div className="footer__map">
            <iframe
              title="EnglishHub location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.2503062018536!2d106.7293476750495!3d10.792131258903838!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317527d6a28f0641%3A0x9f730fe7bfad29fd!2zVHLGsOG7nW5nIMSQ4bqhaSBo4buNYyBHaWFvIHRow7RuZyB24bqtbiB04bqjaSBUUCBIQ00gVVRIIGPGoSBz4bufIDI!5e0!3m2!1svi!2s!4v1777385292280!5m2!1svi!2s"
              width="100%"
              height="160"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
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