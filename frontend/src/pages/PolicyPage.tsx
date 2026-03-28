import React, { useState } from 'react';

interface PolicyPageProps {
  onNavigate: (page: string) => void;
}

// ── Data ────────────────────────────────────────────────────────────────
const POLICY_CARDS = [
  {
    id: 'data-collection',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
    iconBg: 'rgba(65, 90, 119, 0.25)',
    iconColor: '#778DA9',
    title: 'Thu thập thông tin',
    desc: 'Hệ thống thu thập một số thông tin cơ bản như họ tên, email, tiến độ học tập và dữ liệu thiết bị để đảm bảo nền tảng hoạt động ổn định.',
  },
  {
    id: 'data-usage',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07"/>
      </svg>
    ),
    iconBg: 'rgba(30, 90, 80, 0.25)',
    iconColor: '#3dbf8f',
    title: 'Sử dụng dữ liệu',
    desc: 'Thông tin được sử dụng để cung cấp dịch vụ học tập, cá nhân hóa nội dung và cải thiện trải nghiệm người dùng trên nền tảng.',
  },
  {
    id: 'privacy',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    iconBg: 'rgba(92, 60, 180, 0.2)',
    iconColor: '#9b7de8',
    title: 'Bảo mật thông tin',
    desc: 'Chúng tôi áp dụng các biện pháp kỹ thuật và quản lý nhằm bảo vệ dữ liệu cá nhân khỏi truy cập trái phép hoặc sử dụng sai mục đích.',
  },
  {
    id: 'account',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    iconBg: 'rgba(200, 100, 12, 0.18)',
    iconColor: '#d4943f',
    title: 'Tài khoản người dùng',
    desc: 'Người dùng có trách nhiệm bảo mật thông tin đăng nhập và chịu trách nhiệm cho mọi hoạt động được thực hiện trên tài khoản của mình.',
  },
  {
    id: 'community',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    iconBg: 'rgba(212, 85, 122, 0.18)',
    iconColor: '#e0728f',
    title: 'Quy tắc cộng đồng',
    desc: 'Người dùng cần tuân thủ quy định của nền tảng, không đăng tải nội dung vi phạm pháp luật, spam hoặc gây ảnh hưởng tiêu cực đến cộng đồng học tập.',
  },
  {
    id: 'ip',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    iconBg: 'rgba(60, 130, 200, 0.18)',
    iconColor: '#5b8dee',
    title: 'Quyền sở hữu nội dung',
    desc: 'Tất cả nội dung khóa học, tài liệu và tài nguyên trên nền tảng thuộc quyền sở hữu của hệ thống và chỉ được sử dụng cho mục đích học tập cá nhân.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Tôi có thể học trên thiết bị nào?',
    a: 'EnglishHub hoạt động trên tất cả các thiết bị có trình duyệt - máy tính, tablet và điện thoại.',
  },
  {
    q: 'Làm thế nào để nhận hoàn tiền?',
    a: 'Chúng tôi áp dụng chính sách hoàn tiền 100% trong vòng 7 ngày kể từ ngày mua nếu bạn chưa hoàn thành quá 20% khóa học. Liên hệ support@englishhub.vn để yêu cầu.',
  },
  {
    q: 'Giảng viên có hỗ trợ trực tiếp không?',
    a: 'Có. Mỗi khóa học có phần Hỏi & Đáp để tương tác với giảng viên.',
  },
];

// ── PolicyPage ──────────────────────────────────────────────────────────
const PolicyPage: React.FC<PolicyPageProps> = ({ onNavigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="pc-page">
      {/* Hero */}
      <div className="pc-hero">
        <div className="container">
          <h1 className="pc-hero__title">Chính sách &amp; Điều khoản</h1>
          <p className="pc-hero__sub">
            Chúng tôi cam kết minh bạch về cách chúng tôi bảo vệ dữ liệu và quyền lợi của bạn.
          </p>
        </div>
      </div>

      <div className="container">

        {/* ── Card grid ── */}
        <section className="pc-grid-section">
          <div className="pc-grid">
            {POLICY_CARDS.map(card => (
              <div key={card.id} className="pc-card">
                <div
                  className="pc-card__icon-wrap"
                  style={{ background: card.iconBg }}
                >
                  <span style={{ color: card.iconColor, display: 'flex' }}>
                    {card.icon}
                  </span>
                </div>
                <h3 className="pc-card__title">{card.title}</h3>
                <p className="pc-card__desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="pc-faq-section">
          <h2 className="pc-section-title">Câu hỏi thường gặp</h2>
          <div className="pc-faq">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`pc-faq__item${openFaq === i ? ' pc-faq__item--open' : ''}`}
              >
                <button
                  className="pc-faq__question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{item.q}</span>
                  <svg
                    className="pc-faq__chevron"
                    width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="pc-faq__answer">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PolicyPage;