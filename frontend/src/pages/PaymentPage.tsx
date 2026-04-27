/**
 * components/payment/PaymentModal.tsx
 *
 * Import vào CourseDetail:
 *   import PaymentModal from "../components/payment/PaymentModal";
 */

import React, { useState, useEffect } from "react";
import { formatPrice } from "../utils/format";
import "../styles/pages/PaymentPage.css";

const API = "http://127.0.0.1:8000";
const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem("access");
  return token ? { Authorization: `Bearer ${token}` } : {};
};



type Step = "select" | "processing" | "success" | "failed";

interface PaymentModalProps {
  course: any;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  course,
  onClose,
  onSuccess,
}) => {
  console.log("course:", course); // thêm dòng này
  console.log("price:", course.price, "sale_price:", course.sale_price);
  const [step, setStep] = useState<Step>("select");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingWallet, setLoadingWallet]  = useState(true);

  const price =
    course.sale_price !== undefined &&
    course.sale_price !== null &&
    course.sale_price < course.price
      ? course.sale_price
      : (course.price ?? 0);
  const isFree = price === 0;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  useEffect(() => {
    const fetchWallet = async () => {
      setLoadingWallet(true);
      try {
        const res = await fetch(`${API}/api/wallet/`, {
          headers: authHeader(),
        });
        if (res.ok) {
          const data = await res.json();
          setWalletBalance(Number(data.balance));
        } else {
          setWalletBalance(0);
        }
      } catch {
        setWalletBalance(0);
      } finally {
        setLoadingWallet(false);
      }
    };
    fetchWallet();
  }, []);

  const handlePay = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Khoá học miễn phí
      if (isFree) {
        const res = await fetch(`${API}/api/enrollments/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ course_id: course.id }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.detail ?? data.message ?? "Đăng ký thất bại.");
          return;
        }
        setStep("success");
        return;
      }

      // Bước 1: initiate với method=wallet
      const initiateRes = await fetch(`${API}/api/payments/initiate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ course_id: course.id, method: "wallet" }),
      });
      const initiateData = await initiateRes.json();
      console.log("initiate status:", initiateRes.status);
      console.log("initiate response:", initiateData);
      if (!initiateRes.ok) {
        setErrorMsg(initiateData.detail ?? "Không thể khởi tạo thanh toán.");
        return;
      }

      // Bước 2: trừ ví
      const ref_code = initiateData.ref_code ?? initiateData.transaction?.ref_code;
      setStep("processing");

      const walletRes = await fetch(`${API}/api/payments/wallet-pay/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ ref_code }),
      });
      const walletData = await walletRes.json();
      if (!walletRes.ok) {
        setErrorMsg(walletData.detail ?? "Thanh toán ví thất bại.");
        setStep("failed");
        return;
      }

      setStep("success");
    } catch {
      setErrorMsg("Lỗi kết nối. Vui lòng thử lại.");
      setStep("failed");
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Step, string> = {
    select: "Đăng ký khóa học",
    processing: "Đang xử lý thanh toán",
    success: "Thanh toán thành công",
    failed: "Thanh toán thất bại",
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal modal--md">
        <div className="modal__header">
          <h2 className="modal__title">{titles[step]}</h2>
          <button className="modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal__body">
          {/* ── SELECT ── */}
          {step === "select" && (
            <>
              {/* Thông tin khoá học */}
              <div className="pm-course-card">
                {course.thumbnail ? (
                  <img className="pm-course-thumb" src={course.thumbnail} alt={course.title} />
                ) : (
                  <div className="pm-course-thumb-placeholder">📚</div>
                )}
                <div className="pm-course-info">
                  <div className="pm-course-title">{course.title}</div>
                  <div className="pm-course-instructor">👤 {course.instructor_name}</div>
                  <div className="pm-course-price-row">
                    <span className="pm-price-main">
                      {isFree ? "Miễn phí" : formatPrice(price, "VND")}
                    </span>
                    {!isFree && course.discount_percent > 0 && (
                      <>
                        <span className="pm-price-original">{formatPrice(course.price, "VND")}</span>
                        <span className="pm-price-badge">-{course.discount_percent}%</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Số dư ví */}
              {!isFree && (
                <div className="pm-wallet-box">
                  <div className="pm-wallet-box__header">
                    <span className="pm-wallet-box__icon">💳</span>
                    <span className="pm-wallet-box__label">Thanh toán bằng ví</span>
                  </div>
                  {loadingWallet ? (
                    <div className="pm-wallet-box__loading">Đang tải số dư…</div>
                  ) : (
                    <div className="pm-wallet-box__balance-row">
                      <span>Số dư hiện tại</span>
                      <span className={
                        walletBalance !== null && walletBalance < price
                          ? "pm-wallet-box__balance pm-wallet-box__balance--low"
                          : "pm-wallet-box__balance"
                      }>
                        {formatPrice(walletBalance ?? 0, "VND")}
                      </span>
                    </div>
                  )}
                  {walletBalance !== null && walletBalance < price && !loadingWallet && (
                    <div className="pm-wallet-box__insufficient">
                      ⚠ Số dư không đủ — cần nạp thêm{" "}
                      <strong>{formatPrice(price - walletBalance, "VND")}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Tổng */}
              <div className="pm-total">
                <span className="pm-total__label">Tổng thanh toán</span>
                <span className="pm-total__amount">
                  {isFree ? "Miễn phí" : formatPrice(price, "VND")}
                </span>
              </div>

              {errorMsg && <div className="pm-error">⚠️ {errorMsg}</div>}

              <button
                className="pm-btn-pay"
                onClick={handlePay}
                disabled={
                  loading ||
                  loadingWallet ||
                  (!isFree && walletBalance !== null && walletBalance < price)
                }
              >
                {loading
                  ? "Đang xử lý…"
                  : isFree
                    ? "Đăng ký miễn phí"
                    : `Thanh toán ${formatPrice(price, "VND")}`}
              </button>
              <p className="pm-note">🔒 Thông tin thanh toán được mã hóa an toàn</p>
            </>
          )}

          {/* ── PROCESSING ── */}
          {step === "processing" && (
            <div className="pm-processing">
              <div className="pm-spinner" />
              <div className="pm-processing__title">
                Đang kết nối cổng thanh toán
              </div>
              <div className="pm-processing__sub">
                Vui lòng không đóng cửa sổ này…
              </div>              
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === "success" && (
            <div className="pm-result">
              <div className="pm-result__icon pm-result__icon--success">✅</div>
              <div className="pm-result__title">Đăng ký thành công!</div>
              <div className="pm-result__sub">
                Bạn đã có quyền truy cập vào khóa học
                <br />
                <strong>{course.title}</strong>
              </div>
              <div className="pm-result__actions">
                <button className="pm-btn-success" onClick={onSuccess}>
                  ▶ Bắt đầu học ngay
                </button>
              </div>
            </div>
          )}

          {/* ── FAILED ── */}
          {step === "failed" && (
            <div className="pm-result">
              <div className="pm-result__icon pm-result__icon--failed">❌</div>
              <div className="pm-result__title">Thanh toán thất bại</div>
              <div className="pm-result__sub">
                Giao dịch chưa được xử lý.
                <br />
                Vui lòng thử lại hoặc chọn phương thức khác.
              </div>
              <div className="pm-result__actions">
                <button
                  className="pm-btn-secondary"
                  onClick={() => {
                    setStep("select");
                    setErrorMsg(null);
                  }}
                >
                  Thử lại
                </button>
                <button className="pm-btn-secondary" onClick={onClose}>
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
