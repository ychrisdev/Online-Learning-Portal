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

interface PaymentMethod {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "vnpay",
    label: "VNPay",
    icon: "🏦",
    description: "Thanh toán qua cổng VNPay (ATM, Visa, QR)",
  },
  { id: "momo", label: "MoMo", icon: "💜", description: "Ví điện tử MoMo" },
  {
    id: "stripe",
    label: "Thẻ tín dụng",
    icon: "💳",
    description: "Visa / Mastercard / JCB",
  },
  {
    id: "bank",
    label: "Chuyển khoản",
    icon: "🏧",
    description: "Chuyển khoản ngân hàng nội địa",
  },
];

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
  const [method, setMethod] = useState(PAYMENT_METHODS[0].id);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);

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

  const handlePay = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // ── Khóa học miễn phí: gọi enroll trực tiếp, không qua payment ──
      if (isFree) {
        const res = await fetch(`${API}/api/enrollments/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ course_id: course.id }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.detail ?? data.message ?? "Đăng ký thất bại.");
          setLoading(false);
          return;
        }
        setStep("success");
        setLoading(false);
        return;
      }

      // ── Khóa học có phí ──
      const res = await fetch(`${API}/api/payments/initiate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          course_id: course.id,
          method,
          re_enroll: true, // báo backend cho phép đăng ký lại nếu refunded
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(
          data.detail ?? data.message ?? "Khởi tạo thanh toán thất bại.",
        );
        setLoading(false);
        return;
      }
      setRefCode(data.ref_code);
      setStep("processing");
      setLoading(false);
      setTimeout(() => simulateCallback(data.ref_code), 2500);
    } catch {
      setErrorMsg("Lỗi kết nối. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  const simulateCallback = async (ref: string) => {
    try {
      const res = await fetch(`${API}/api/payments/callback/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref_code: ref,
          gateway_ref: `GW-${Date.now()}`,
          result: "success",
        }),
      });

      if (res.ok) {
        setStep("success");
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Callback failed:", err);
        setErrorMsg(err.detail ?? "Thanh toán thất bại từ server.");
        setStep("failed");
      }
    } catch (e) {
      console.error("Callback error:", e);
      setStep("failed");
    }
  };

  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === method)!;

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
              <div className="pm-course-card">
                {course.thumbnail ? (
                  <img
                    className="pm-course-thumb"
                    src={course.thumbnail}
                    alt={course.title}
                  />
                ) : (
                  <div className="pm-course-thumb-placeholder">📚</div>
                )}
                <div className="pm-course-info">
                  <div className="pm-course-title">{course.title}</div>
                  <div className="pm-course-instructor">
                    👤 {course.instructor_name}
                  </div>
                  <div className="pm-course-price-row">
                    <span className="pm-price-main">
                      {isFree ? "Miễn phí" : formatPrice(price, "VND")}
                    </span>
                    {!isFree && course.discount_percent > 0 && (
                      <>
                        <span className="pm-price-original">
                          {formatPrice(course.price, "VND")}
                        </span>
                        <span className="pm-price-badge">
                          -{course.discount_percent}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {!isFree && (
                <>
                  <p className="pm-section-label">Phương thức thanh toán</p>
                  <div className="pm-methods">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.id}
                        className={`pm-method${method === m.id ? " pm-method--active" : ""}`}
                        onClick={() => setMethod(m.id)}
                      >
                        <span className="pm-method__icon">{m.icon}</span>
                        <span className="pm-method__info">
                          <span className="pm-method__label">{m.label}</span>
                          <span className="pm-method__desc">
                            {m.description}
                          </span>
                        </span>
                        <span className="pm-method__radio">
                          <span className="pm-method__radio-dot" />
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

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
                disabled={loading}
              >
                {loading
                  ? "Đang xử lý…"
                  : isFree
                    ? "Đăng ký miễn phí"
                    : `Thanh toán ${formatPrice(price, "VND")}`}
              </button>

              <p className="pm-note">
                🔒 Thông tin thanh toán được mã hóa an toàn
              </p>
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
              {refCode && (
                <div className="pm-processing__ref">Mã GD: {refCode}</div>
              )}
              <div className="pm-processing__gateway">
                Đang chuyển đến <strong>{selectedMethod.label}</strong>{" "}
                {selectedMethod.icon}
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
              {refCode && (
                <div className="pm-processing__ref">Mã GD: {refCode}</div>
              )}
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
