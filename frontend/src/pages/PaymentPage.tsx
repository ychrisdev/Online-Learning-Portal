/**
 * frontend/src/components/payment/PaymentModal.tsx
 *
 * Luồng MoMo:
 *  1. handleMomoPay() → gọi API → nhận pay_url
 *  2. Mở pay_url trong TAB MỚI (window.open)
 *  3. Tab cũ chuyển sang step "momo_waiting" (màn hình chờ)
 *  4. Lắng nghe postMessage từ PaymentReturn.tsx (tab mới)
 *     HOẶC localStorage event (fallback khi opener bị block)
 *  5. Nhận kết quả → chuyển sang "success" hoặc "failed"
 *
 * Luồng Ví:
 *  1. handlePay() → initiate → wallet-pay → success/failed
 */
import React, { useState, useEffect, useRef } from "react";
import { formatPrice } from "../utils/format";
import "../styles/pages/PaymentPage.css";

const API = "http://127.0.0.1:8000";

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem("access");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type Step =
  | "select"
  | "processing" // thanh toán ví đang xử lý
  | "momo_waiting" // đã mở tab MoMo, đang chờ kết quả
  | "success"
  | "failed";

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
  const [step, setStep] = useState<Step>("select");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [method, setMethod] = useState<"wallet" | "momo">("wallet");
  const [momoRef, setMomoRef] = useState<string>("");

  // Refs để cleanup
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const momoTabRef = useRef<Window | null>(null);

  // Tính giá
  const price =
    course.sale_price !== undefined &&
    course.sale_price !== null &&
    course.sale_price < course.price
      ? course.sale_price
      : (course.price ?? 0);
  const isFree = price === 0;

  // ── Khóa scroll khi modal mở ──────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ── Đóng bằng Esc ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // ── Lấy số dư ví ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingWallet(true);
      try {
        const res = await fetch(`${API}/api/wallet/`, {
          headers: authHeader(),
        });
        const data = res.ok ? await res.json() : { balance: 0 };
        setWalletBalance(Number(data.balance));
      } catch {
        setWalletBalance(0);
      } finally {
        setLoadingWallet(false);
      }
    })();
  }, []);

  // ── Cleanup polling khi unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // ── Lắng nghe postMessage từ PaymentReturn (tab mới) ──────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      // Chỉ nhận từ cùng origin
      if (e.origin !== window.location.origin) return;
      if (!e.data || e.data.type !== "MOMO_RESULT") return;

      const { resultCode } = e.data as {
        type: string;
        resultCode: string;
        orderId: string;
        message: string;
        transId: string;
      };

      // Dừng polling
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (resultCode === "0") {
        setStep("success");
      } else {
        setErrorMsg(
          resultCode === "1006"
            ? "Giao dịch đã bị hủy."
            : `Thanh toán thất bại (mã lỗi: ${resultCode}).`,
        );
        setStep("failed");
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ── Fallback: lắng nghe localStorage storage event ────────────────────────
  // (khi opener bị block hoặc cross-tab trong một số browser)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== "momo_pending_result") return;
      const val = e.newValue;
      if (!val || val === "waiting") return;

      localStorage.removeItem("momo_pending_result");
      localStorage.removeItem("momo_pending_ref");

      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (val === "0") {
        setStep("success");
      } else {
        setErrorMsg(
          val === "1006"
            ? "Giao dịch đã bị hủy."
            : `Thanh toán thất bại (mã lỗi: ${val}).`,
        );
        setStep("failed");
      }
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // ── Polling API trạng thái MoMo ───────────────────────────────────────────
  const startPolling = (refCode: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/payments/momo/status/${refCode}/`, {
          headers: authHeader(),
        });
        if (!r.ok) return;
        const s = await r.json();

        if (s.status === "success") {
          clearInterval(pollingRef.current!);
          clearTimeout(timeoutRef.current!);
          setStep("success");
        } else if (s.status === "failed") {
          clearInterval(pollingRef.current!);
          clearTimeout(timeoutRef.current!);
          setErrorMsg("Thanh toán thất bại.");
          setStep("failed");
        }
      } catch {
        // bỏ qua lỗi mạng tạm thời
      }
    }, 3000);

    // Timeout 10 phút
    timeoutRef.current = setTimeout(
      () => {
        clearInterval(pollingRef.current!);
        setErrorMsg("Hết thời gian chờ. Vui lòng kiểm tra lại hoặc thử lại.");
        setStep("failed");
      },
      10 * 60 * 1000,
    );
  };

  // ── Thanh toán MoMo ───────────────────────────────────────────────────────
  const handleMomoPay = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API}/api/payments/momo/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ course_id: course.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.detail ?? "Lỗi tạo thanh toán MoMo.");
        return;
      }

      const { pay_url, ref_code } = data as {
        pay_url: string;
        ref_code: string;
        qr_code_url?: string;
        deep_link?: string;
      };

      setMomoRef(ref_code);

      // Mở tab mới — KHÔNG redirect tab hiện tại
      const newTab = window.open(pay_url, "_blank");
      momoTabRef.current = newTab;

      if (!newTab) {
        // Popup bị chặn → redirect tab hiện tại (fallback)
        localStorage.setItem("momo_pending_course", course.id);
        localStorage.setItem("momo_pending_ref", ref_code);
        localStorage.setItem("momo_pending_result", "waiting");
        window.location.href = pay_url;
        return;
      }

      // Chuyển sang màn hình chờ
      setStep("momo_waiting");
      // Bắt đầu polling trạng thái API (backup nếu postMessage không đến)
      startPolling(ref_code);

      // Phát hiện user tắt tab MoMo đột ngột
      const tabCheckInterval = setInterval(() => {
        if (momoTabRef.current && momoTabRef.current.closed) {
          clearInterval(tabCheckInterval);
          // Tab đã đóng nhưng chưa nhận được postMessage → coi là hủy/thất bại
          // Chờ 1.5s phòng trường hợp postMessage đang trên đường đến
          setTimeout(() => {
            setStep((currentStep) => {
              // Chỉ xử lý nếu vẫn đang ở trạng thái chờ
              if (currentStep === "momo_waiting") {
                if (pollingRef.current) clearInterval(pollingRef.current);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                setErrorMsg("Giao dịch đã bị hủy hoặc tab thanh toán bị đóng.");
                return "failed";
              }
              return currentStep;
            });
          }, 500);
        }
      }, 500); // kiểm tra mỗi 1 giây
    } finally {
      setLoading(false);
    }
  };

  // ── Thanh toán Ví ─────────────────────────────────────────────────────────
  const handleWalletPay = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
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

      let ref_code: string | null = null;

      // Bước 1: initiate
      const initiateRes = await fetch(`${API}/api/payments/initiate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ course_id: course.id, method: "wallet" }),
      });
      const initiateData = await initiateRes.json();
      if (!initiateRes.ok) {
        if (
          initiateData.detail?.includes("đang chờ xử lý") ||
          initiateData.detail?.includes("pending")
        ) {
          const directRes = await fetch(`${API}/api/payments/wallet-pay/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: JSON.stringify({ course_id: course.id }),
          });
          const directData = await directRes.json();
          if (!directRes.ok) {
            setErrorMsg(directData.detail ?? "Thanh toán ví thất bại.");
            setStep("failed");
            return;
          }
          setStep("success");
          return;
        }
        setErrorMsg(initiateData.detail ?? "Không thể khởi tạo thanh toán.");
        return;
      }

      ref_code = initiateData.ref_code ?? initiateData.transaction?.ref_code;
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

  const handlePay = () => {
    if (method === "momo") return handleMomoPay();
    return handleWalletPay();
  };

  const handleRetry = () => {
    setStep("select");
    setErrorMsg(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Đóng tab MoMo nếu vẫn còn mở
    if (momoTabRef.current && !momoTabRef.current.closed) {
      momoTabRef.current.close();
      momoTabRef.current = null;
    }
  };

  const titles: Record<Step, string> = {
    select: "Đăng ký khóa học",
    processing: "Đang xử lý",
    momo_waiting: "Đang chờ thanh toán MoMo",
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
        {/* Header */}
        <div className="modal__header">
          <h2 className="modal__title">{titles[step]}</h2>
          <button
            className="modal__close"
            onClick={() => {
              if (momoTabRef.current && !momoTabRef.current.closed) {
                momoTabRef.current.close();
              }
              onClose();
            }}
          >
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
                    {course.instructor_name}
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

              {/* Số dư ví */}
              {!isFree && (
                <div className="pm-wallet-box">
                  <div className="pm-wallet-box__header">
                    <span className="pm-wallet-box__label">
                      Thanh toán bằng ví
                    </span>
                  </div>
                  {loadingWallet ? (
                    <div className="pm-wallet-box__loading">
                      Đang tải số dư…
                    </div>
                  ) : (
                    <div className="pm-wallet-box__balance-row">
                      <span>Số dư hiện tại</span>
                      <span
                        className={
                          walletBalance !== null && walletBalance < price
                            ? "pm-wallet-box__balance pm-wallet-box__balance--low"
                            : "pm-wallet-box__balance"
                        }
                      >
                        {formatPrice(walletBalance ?? 0, "VND")}
                      </span>
                    </div>
                  )}
                  {walletBalance !== null &&
                    walletBalance < price &&
                    !loadingWallet && (
                      <div className="pm-wallet-box__insufficient">
                        ⚠ Số dư không đủ — cần nạp thêm{" "}
                        <strong>
                          {formatPrice(price - walletBalance, "VND")}
                        </strong>
                      </div>
                    )}
                </div>
              )}

              {/* Chọn phương thức */}
              {!isFree && (
                <div className="pm-methods">
                  <button
                    className={`pm-method ${method === "wallet" ? "pm-method--active" : ""}`}
                    onClick={() => setMethod("wallet")}
                    disabled={walletBalance !== null && walletBalance < price}
                  >
                    <div className="pm-method__info">
                      <span className="pm-method__label">Ví EnglishHub</span>
                      <span className="pm-method__desc">
                        Thanh toán bằng số dư ví
                      </span>
                    </div>
                    <div className="pm-method__radio">
                      <div className="pm-method__radio-dot" />
                    </div>
                  </button>
                  <button
                    className={`pm-method ${method === "momo" ? "pm-method--active" : ""}`}
                    onClick={() => setMethod("momo")}
                  >
                    <div className="pm-method__info">
                      <span className="pm-method__label">MoMo</span>
                      <span className="pm-method__desc">
                        Thanh toán qua ví MoMo
                      </span>
                    </div>
                    <div className="pm-method__radio">
                      <div className="pm-method__radio-dot" />
                    </div>
                  </button>
                </div>
              )}

              {/* Tổng */}
              <div className="pm-total">
                <span className="pm-total__label">Tổng thanh toán</span>
                <span className="pm-total__amount">
                  {isFree ? "Miễn phí" : formatPrice(price, "VND")}
                </span>
              </div>

              {errorMsg && <div className="pm-error">{errorMsg}</div>}

              <button
                className="pm-btn-pay"
                onClick={handlePay}
                disabled={
                  loading ||
                  loadingWallet ||
                  (!isFree &&
                    method === "wallet" &&
                    walletBalance !== null &&
                    walletBalance < price)
                }
              >
                {loading
                  ? "Đang xử lý…"
                  : isFree
                    ? "Đăng ký miễn phí"
                    : `Thanh toán ${formatPrice(price, "VND")}`}
              </button>
              <p className="pm-note">
                Thông tin thanh toán được mã hóa an toàn
              </p>
            </>
          )}

          {/* ── PROCESSING (ví) ── */}
          {step === "processing" && (
            <div className="pm-processing">
              <div className="pm-spinner" />
              <div className="pm-processing__title">Đang xử lý thanh toán</div>
              <div className="pm-processing__sub">
                Vui lòng không đóng cửa sổ này…
              </div>
            </div>
          )}

          {/* ── MOMO WAITING ── */}
          {step === "momo_waiting" && (
            <div className="pm-processing">
              <div className="pm-spinner" />
              <div className="pm-processing__title">
                Đang chờ xác nhận từ MoMo
              </div>
              <div className="pm-processing__sub">
                Vui lòng hoàn tất thanh toán trên tab MoMo vừa mở.
                <br />
                Tab này sẽ tự cập nhật khi thanh toán xong.
              </div>
              {momoRef && (
                <div style={{ marginTop: 16, fontSize: 13, color: "#888" }}>
                  Mã tham chiếu: <strong>{momoRef}</strong>
                </div>
              )}
              <button
                className="pm-btn-secondary"
                style={{ marginTop: 24 }}
                onClick={handleRetry}
              >
                Hủy và thử lại
              </button>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === "success" && (
            <div className="pm-result">
              <div className="pm-result__icon pm-result__icon--success">✅</div>
              <div className="pm-result__title">Đăng ký thành công!</div>
              <div className="pm-result__sub">
                Bạn đã có quyền truy cập vào khoá học
                <br />
                <strong>{course.title}</strong>
              </div>
              <div className="pm-result__actions">
                <button className="pm-btn-success" onClick={onSuccess}>
                  Bắt đầu học ngay
                </button>
              </div>
            </div>
          )}

          {/* ── FAILED ── */}
          {step === "failed" && (
            <div className="pm-result">
              <div className="pm-result__icon pm-result__icon--failed" />
              <div className="pm-result__title">Thanh toán thất bại</div>
              <div className="pm-result__sub">
                {errorMsg || "Giao dịch chưa được xử lý."}
                <br />
                Vui lòng thử lại hoặc chọn phương thức khác.
              </div>
              <div className="pm-result__actions">
                <button className="pm-btn-secondary" onClick={handleRetry}>
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
