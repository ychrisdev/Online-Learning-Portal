import React, { useState } from 'react';

interface PolicyPageProps {
  onNavigate: (page: string) => void;
}

type PolicyTab = 'privacy' | 'terms' | 'support';

const TABS: { id: PolicyTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'privacy',
    label: 'Chính sách bảo mật',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    id: 'terms',
    label: 'Điều khoản sử dụng',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    id: 'support',
    label: 'Trung tâm hỗ trợ',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
];

const FAQ_ITEMS = [
  {
    q: 'Tôi có thể học trên thiết bị nào?',
    a: 'EnglishHub hoạt động trên tất cả các thiết bị có trình duyệt web hiện đại — máy tính, tablet và điện thoại. Chúng tôi cũng có ứng dụng di động cho iOS và Android.',
  },
  {
    q: 'Làm thế nào để nhận hoàn tiền?',
    a: 'Chúng tôi áp dụng chính sách hoàn tiền 100% trong vòng 7 ngày kể từ ngày mua nếu bạn chưa hoàn thành quá 20% khóa học. Liên hệ support@englishhub.vn để yêu cầu.',
  },
  {
    q: 'Chứng chỉ có giá trị không?',
    a: 'Chứng chỉ hoàn thành của EnglishHub được các đối tác tuyển dụng và doanh nghiệp công nhận. Với các khóa IELTS, chứng chỉ có thể dùng kèm hồ sơ đăng ký trường đại học.',
  },
  {
    q: 'Tôi có thể học offline không?',
    a: 'Học viên gói Premium có thể tải xuống bài giảng để học offline trên ứng dụng di động. Tài liệu PDF và bài tập cũng có thể tải xuống từ mọi gói học.',
  },
  {
    q: 'Giảng viên có hỗ trợ trực tiếp không?',
    a: 'Có. Mỗi khóa học có phần Hỏi & Đáp để tương tác trực tiếp với giảng viên. Học viên gói Premium còn được đặt lịch buổi 1:1 với giảng viên mỗi tháng.',
  },
];

const PolicyPage: React.FC<PolicyPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<PolicyTab>('privacy');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setSubmitted(true);
  };

  return (
    <div className="policy-page">
      {/* Hero */}
      <div className="policy-hero">
        <div className="container">
          <div className="policy-hero__inner">
            <div className="policy-hero__badge">Pháp lý & Hỗ trợ</div>
            <h1 className="policy-hero__title">Chính sách & Điều khoản</h1>
            <p className="policy-hero__sub">
              Chúng tôi cam kết minh bạch về cách chúng tôi bảo vệ dữ liệu và quyền lợi của bạn.
            </p>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="policy-layout">

          {/* Sidebar tabs */}
          <aside className="policy-sidebar">
            <nav className="policy-tabs">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`policy-tab${activeTab === tab.id ? ' policy-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="policy-tab__icon">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="policy-sidebar__contact-card">
              <div className="policy-sidebar__contact-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div className="policy-sidebar__contact-text">
                Cần hỗ trợ ngay?
              </div>
              <a href="mailto:support@englishhub.vn" className="policy-sidebar__contact-email">
                support@englishhub.vn
              </a>
            </div>
          </aside>

          {/* Content */}
          <main className="policy-content">

            {/* ── PRIVACY ── */}
            {activeTab === 'privacy' && (
              <div className="policy-doc">
                <div className="policy-doc__header">
                  <h2 className="policy-doc__title">Chính sách Bảo mật</h2>
                  <span className="policy-doc__updated">Cập nhật: 01/01/2025</span>
                </div>

                <div className="policy-section">
                  <h3 className="policy-section__title">1. Thông tin chúng tôi thu thập</h3>
                  <p className="policy-section__text">
                    Khi bạn sử dụng EnglishHub, chúng tôi thu thập các loại thông tin sau để cung cấp và cải thiện dịch vụ:
                  </p>
                  <ul className="policy-list">
                    <li><strong>Thông tin tài khoản:</strong> Họ tên, địa chỉ email, mật khẩu đã mã hóa khi đăng ký.</li>
                    <li><strong>Dữ liệu học tập:</strong> Tiến độ hoàn thành, điểm bài kiểm tra, thời gian học, lịch sử xem video.</li>
                    <li><strong>Thông tin thanh toán:</strong> Dữ liệu giao dịch được mã hóa. Chúng tôi không lưu số thẻ trực tiếp.</li>
                    <li><strong>Dữ liệu thiết bị:</strong> Địa chỉ IP, loại trình duyệt, hệ điều hành, múi giờ.</li>
                    <li><strong>Cookies & Analytics:</strong> Dữ liệu phiên truy cập để cải thiện trải nghiệm người dùng.</li>
                  </ul>
                </div>

                <div className="policy-section">
                  <h3 className="policy-section__title">2. Mục đích sử dụng dữ liệu</h3>
                  <p className="policy-section__text">
                    Thông tin thu thập được sử dụng để:
                  </p>
                  <ul className="policy-list">
                    <li>Cung cấp, vận hành và duy trì nền tảng học tập.</li>
                    <li>Cá nhân hóa lộ trình học và đề xuất khóa học phù hợp.</li>
                    <li>Xử lý thanh toán và gửi xác nhận đơn hàng.</li>
                    <li>Gửi thông báo về cập nhật khóa học, tài liệu mới (có thể hủy đăng ký).</li>
                    <li>Phân tích hành vi sử dụng để cải thiện nền tảng.</li>
                    <li>Tuân thủ các nghĩa vụ pháp lý.</li>
                  </ul>
                </div>

                <div className="policy-section">
                  <h3 className="policy-section__title">3. Chia sẻ thông tin</h3>
                  <p className="policy-section__text">
                    Chúng tôi <strong>không bán</strong> dữ liệu cá nhân của bạn cho bên thứ ba. Dữ liệu chỉ được chia sẻ với:
                  </p>
                  <ul className="policy-list">
                    <li><strong>Nhà cung cấp dịch vụ:</strong> Đối tác thanh toán (VNPay, MoMo), hosting, email marketing — chỉ ở mức cần thiết.</li>
                    <li><strong>Giảng viên:</strong> Tên và tiến độ học tập của học viên trong khóa học giảng viên đó quản lý.</li>
                    <li><strong>Cơ quan pháp luật:</strong> Khi được yêu cầu theo quy định pháp luật hiện hành của Việt Nam.</li>
                  </ul>
                </div>

                <div className="policy-section">
                  <h3 className="policy-section__title">4. Quyền của bạn</h3>
                  <p className="policy-section__text">Bạn có các quyền sau đối với dữ liệu cá nhân:</p>
                  <div className="policy-rights-grid">
                    {[
                      { icon: '👁', title: 'Truy cập', desc: 'Xem toàn bộ dữ liệu chúng tôi lưu trữ về bạn.' },
                      { icon: '✏️', title: 'Chỉnh sửa', desc: 'Cập nhật thông tin không chính xác bất cứ lúc nào.' },
                      { icon: '🗑', title: 'Xóa', desc: 'Yêu cầu xóa tài khoản và toàn bộ dữ liệu liên quan.' },
                      { icon: '📦', title: 'Xuất dữ liệu', desc: 'Tải xuống bản sao dữ liệu của bạn ở định dạng CSV/JSON.' },
                    ].map(r => (
                      <div key={r.title} className="policy-right-card">
                        <div className="policy-right-card__icon">{r.icon}</div>
                        <div className="policy-right-card__title">{r.title}</div>
                        <div className="policy-right-card__desc">{r.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="policy-section">
                  <h3 className="policy-section__title">5. Bảo mật dữ liệu</h3>
                  <p className="policy-section__text">
                    Chúng tôi áp dụng các biện pháp bảo mật cấp enterprise: mã hóa TLS 1.3 cho dữ liệu truyền tải, AES-256 cho dữ liệu lưu trữ, xác thực 2 yếu tố (2FA), và kiểm tra bảo mật định kỳ. Máy chủ đặt tại Việt Nam và Singapore, tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
                  </p>
                </div>

                <div className="policy-section">
                  <h3 className="policy-section__title">6. Cookies</h3>
                  <p className="policy-section__text">
                    Chúng tôi sử dụng cookies cần thiết (phiên đăng nhập), cookies phân tích (Google Analytics — ẩn danh hóa IP) và cookies tùy chỉnh (lưu giao diện, ngôn ngữ). Bạn có thể tắt cookies không cần thiết trong cài đặt trình duyệt; tuy nhiên một số tính năng có thể bị ảnh hưởng.
                  </p>
                </div>

                <div className="policy-highlight">
                  <div className="policy-highlight__icon">📧</div>
                  <div>
                    <div className="policy-highlight__title">Liên hệ về quyền riêng tư</div>
                    <div className="policy-highlight__text">
                      Gửi yêu cầu liên quan đến dữ liệu cá nhân đến <strong>privacy@englishhub.vn</strong> — chúng tôi phản hồi trong vòng 72 giờ làm việc.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TERMS ── */}
            {activeTab === 'terms' && (
              <div className="policy-doc">
                <div className="policy-doc__header">
                  <h2 className="policy-doc__title">Điều khoản Sử dụng</h2>
                  <span className="policy-doc__updated">Cập nhật: 01/01/2025</span>
                </div>

                <div className="policy-section">
                  <h3 className="policy-section__title">1. Chấp nhận điều khoản</h3>
                  <p className="policy-section__text">
                    Bằng việc tạo tài khoản hoặc sử dụng bất kỳ tính năng nào của EnglishHub, bạn đồng ý bị ràng buộc bởi các điều khoản này. Nếu bạn không đồng ý, vui lòng không sử dụng dịch vụ.
                  </p>
                </div>

                <div className="policy-section">
                  <h3 className="policy-section__title">2. Tài khoản người dùng</h3>
                  <ul className="policy-list">
                    <li>Mỗi người chỉ được tạo một tài khoản. Tài khoản không được chuyển nhượng cho người khác.</li>
                    <li>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động diễn ra dưới tài khoản.</li>
                    <li>Phải thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép.</li>
                    <li>Người dùng dưới 13 tuổi cần có sự đồng ý của phụ huynh hoặc người giám hộ.</li>
                  </ul>
                </div>

                <div className="policy-section">
                  <h3 className="policy-section__title">3. Quy tắc cộng đồng</h3>
                  <p className="policy-section__text">Người dùng <strong>không được phép</strong>:</p>
                  <ul className="policy-list">
                    <li>Đăng tải nội dung xúc phạm, phân biệt đối xử, bạo lực hoặc vi phạm pháp luật.</li>
                    <li>Spam, phishing hoặc quảng cáo không được phép trong khu vực cộng đồng.</li>
                    <li>Chia sẻ tài khoản Premium hoặc bán lại quyền truy cập nội dung.</li>
                    <li>Sao chép, tải xuống, phân phối lại tài liệu giảng dạy mà không có sự cho phép bằng văn bản.</li>
                    <li>Sử dụng bot, script tự động để truy cập hoặc scrape nội dung.</li>
                  </ul>
                </div>

                <div className="policy-section">
                  <h3 className="policy-section__title">4. Thanh toán & Hoàn tiền</h3>
                  <div className="policy-table-wrap">
                    <table className="policy-table">
                      <thead>
                        <tr><th>Tình huống</th><th>Chính sách</th></tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Hoàn tiền trong 7 ngày</td>
                          <td>100% nếu hoàn thành &lt;20% khóa học</td>
                        </tr>
                        <tr>
                          <td>Khóa học bị gỡ xuống</td>
                          <td>Hoàn tiền toàn bộ hoặc đổi sang khóa khác</td>
                        </tr>
                        <tr>
                          <td>Lỗi kỹ thuật từ phía chúng tôi</td>
                          <td>Gia hạn truy cập hoặc hoàn tiền theo yêu cầu</td>
                        </tr>
                        <tr>
                          <td>Sau 7 ngày hoặc &gt;20% hoàn thành</td>
                          <td>Không áp dụng hoàn tiền</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="policy-section">
                  <h3 className="policy-section__title">5. Sở hữu trí tuệ</h3>
                  <p className="policy-section__text">
                    Toàn bộ nội dung trên EnglishHub — bao gồm video bài giảng, tài liệu PDF, hình ảnh, logo, mã nguồn — là tài sản của EnglishHub hoặc các giảng viên liên kết và được bảo hộ theo Luật Sở hữu Trí tuệ Việt Nam. Việc mua khóa học chỉ cấp phép truy cập cho cá nhân, không cấp quyền sở hữu hay phân phối lại.
                  </p>
                </div>

                <div className="policy-section">
                  <h3 className="policy-section__title">6. Giới hạn trách nhiệm</h3>
                  <p className="policy-section__text">
                    EnglishHub không chịu trách nhiệm về thiệt hại gián tiếp, đặc biệt hoặc hậu quả phát sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ. Trách nhiệm tối đa của chúng tôi giới hạn ở số tiền bạn đã thanh toán trong 12 tháng gần nhất.
                  </p>
                </div>

                <div className="policy-section">
                  <h3 className="policy-section__title">7. Thay đổi điều khoản</h3>
                  <p className="policy-section__text">
                    Chúng tôi có thể cập nhật điều khoản này và sẽ thông báo qua email ít nhất 30 ngày trước khi thay đổi có hiệu lực. Việc tiếp tục sử dụng dịch vụ sau thời điểm đó đồng nghĩa với việc bạn chấp nhận điều khoản mới.
                  </p>
                </div>

                <div className="policy-highlight">
                  <div className="policy-highlight__icon">⚖️</div>
                  <div>
                    <div className="policy-highlight__title">Luật áp dụng</div>
                    <div className="policy-highlight__text">
                      Các điều khoản này được điều chỉnh bởi pháp luật Cộng hòa Xã hội Chủ nghĩa Việt Nam. Mọi tranh chấp sẽ được giải quyết tại Tòa án nhân dân TP. Hà Nội.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUPPORT ── */}
            {activeTab === 'support' && (
              <div className="policy-doc">
                <div className="policy-doc__header">
                  <h2 className="policy-doc__title">Trung tâm Hỗ trợ</h2>
                  <span className="policy-doc__updated">Thường trực 8:00 – 22:00</span>
                </div>

                {/* Contact channels */}
                <div className="support-channels">
                  {[
                    {
                      icon: '📧',
                      title: 'Email',
                      value: 'support@englishhub.vn',
                      desc: 'Phản hồi trong 24h làm việc',
                      href: 'mailto:support@englishhub.vn',
                    },
                    {
                      icon: '💬',
                      title: 'Live Chat',
                      value: 'Chat trực tuyến',
                      desc: 'T2–T6 · 8:00–18:00',
                      href: '#',
                    },
                    {
                      icon: '📞',
                      title: 'Hotline',
                      value: '1800 1234',
                      desc: 'Miễn phí · T2–T6 · 8:00–17:00',
                      href: 'tel:18001234',
                    },
                  ].map(c => (
                    <a key={c.title} href={c.href} className="support-channel-card">
                      <div className="support-channel-card__icon">{c.icon}</div>
                      <div className="support-channel-card__title">{c.title}</div>
                      <div className="support-channel-card__value">{c.value}</div>
                      <div className="support-channel-card__desc">{c.desc}</div>
                    </a>
                  ))}
                </div>

                {/* FAQ */}
                <div className="policy-section">
                  <h3 className="policy-section__title">Câu hỏi thường gặp</h3>
                  <div className="faq-list">
                    {FAQ_ITEMS.map((item, i) => (
                      <div
                        key={i}
                        className={`faq-item${openFaq === i ? ' faq-item--open' : ''}`}
                      >
                        <button
                          className="faq-item__question"
                          onClick={() => setOpenFaq(openFaq === i ? null : i)}
                          aria-expanded={openFaq === i}
                        >
                          <span>{item.q}</span>
                          <svg
                            className="faq-item__chevron"
                            width="16" height="16" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        {openFaq === i && (
                          <div className="faq-item__answer">{item.a}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact form */}
                <div className="policy-section">
                  <h3 className="policy-section__title">Gửi yêu cầu hỗ trợ</h3>
                  {submitted ? (
                    <div className="support-submitted">
                      <div className="support-submitted__icon">✅</div>
                      <div className="support-submitted__title">Đã nhận yêu cầu của bạn!</div>
                      <div className="support-submitted__text">
                        Chúng tôi sẽ phản hồi qua email trong vòng 24 giờ làm việc.
                      </div>
                      <button
                        className="support-submitted__btn"
                        onClick={() => { setSubmitted(false); setContactForm({ name: '', email: '', message: '' }); }}
                      >
                        Gửi yêu cầu khác
                      </button>
                    </div>
                  ) : (
                    <form className="support-form" onSubmit={handleContact}>
                      <div className="support-form__grid">
                        <div className="support-form__field">
                          <label className="support-form__label">Họ và tên</label>
                          <input
                            className="support-form__input"
                            type="text"
                            placeholder="Nguyễn Văn A"
                            value={contactForm.name}
                            onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="support-form__field">
                          <label className="support-form__label">Email</label>
                          <input
                            className="support-form__input"
                            type="email"
                            placeholder="email@example.com"
                            value={contactForm.email}
                            onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="support-form__field support-form__field--full">
                          <label className="support-form__label">Nội dung</label>
                          <textarea
                            className="support-form__textarea"
                            rows={5}
                            placeholder="Mô tả vấn đề bạn gặp phải hoặc câu hỏi cần hỗ trợ..."
                            value={contactForm.message}
                            onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <button type="submit" className="support-form__submit">
                        Gửi yêu cầu
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
};

export default PolicyPage;