import React, { useState, useEffect } from "react";
import "../styles/pages/CertificateModal.css";

interface CertificateModalProps {
  courseName: string;
  studentName: string;
  certificateCode?: string;
  onClose: () => void;
}

const Confetti: React.FC = () => {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.8}s`,
    duration: `${1.2 + Math.random() * 1}s`,
    color: ["#4f7ef7","#4caf82","#f5c842","#e05c5c","#b67efa","#fa9f42"][
      Math.floor(Math.random() * 6)
    ],
    size: `${6 + Math.random() * 8}px`,
    rotate: `${Math.random() * 360}deg`,
    round: Math.random() > 0.5,
  }));

  return (
    <div className="cert-confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="cert-confetti__piece"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            borderRadius: p.round ? "50%" : "2px",
            transform: `rotate(${p.rotate})`,
          }}
        />
      ))}
    </div>
  );
};

const CertificateModal: React.FC<CertificateModalProps> = ({
  courseName,
  studentName,
  certificateCode,
  onClose,
}) => {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleCopy = () => {
    if (!certificateCode) return;
    navigator.clipboard.writeText(certificateCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`cert-overlay${visible ? " cert-overlay--in" : ""}`}>
      <Confetti />
      <div className={`cert-modal${visible ? " cert-modal--in" : ""}`}>

        <button className="cert-close" onClick={handleClose} aria-label="Đóng">✕</button>

        <div className="cert-trophy">🏆</div>

        <div className="cert-stars" aria-hidden>
          <span>★</span><span>★</span><span>★</span>
        </div>

        <h2 className="cert-title">
          Chúc mừng <span>bạn!</span>
        </h2>
        <p className="cert-sub">Bạn đã hoàn thành khóa học</p>
        <p className="cert-course-name">"{courseName}"</p>

        {studentName && (
          <p className="cert-student">
            Xuất sắc lắm, <strong>{studentName}</strong>! 🎉
          </p>
        )}

        <div className="cert-card">
          <div className="cert-card__label">Mã hoàn thành khóa học</div>
          {certificateCode ? (
            <>
              <div className="cert-card__code">{certificateCode}</div>             
            </>
          ) : (
            <div className="cert-card__pending">
              Mã khóa học đang được xử lý. Bạn sẽ nhận được mã qua email.
            </div>
          )}
        </div>

        <p className="cert-note">Tiếp tục học hỏi và chinh phục những kiến thức mới! 🚀</p>

        <button className="cert-btn-ok" onClick={handleClose}>
          Tuyệt vời, tiếp tục!
        </button>

      </div>
    </div>
  );
};

export default CertificateModal;