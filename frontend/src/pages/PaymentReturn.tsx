import React, { useEffect } from "react";

const PaymentReturn: React.FC = () => {
  useEffect(() => {
    const params     = new URLSearchParams(window.location.search);
    const resultCode = params.get("resultCode") ?? "";
    const orderId    = params.get("orderId")    ?? "";
    const message    = params.get("message")    ?? "";
    const transId    = params.get("transId")    ?? "";

    const payload = { type: "MOMO_RESULT", resultCode, orderId, message, transId };

    // Nếu thất bại/hủy → gọi cancel API để backend đổi PENDING→FAILED và gửi email
    // postMessage về tab chính trước
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin);
    } else {
      localStorage.setItem("momo_pending_result", resultCode);
      localStorage.setItem("momo_pending_ref",    orderId);
    }

    // Nếu thất bại/hủy → gọi cancel API rồi mới đóng tab
    if (resultCode !== "0" && orderId) {
      fetch("http://127.0.0.1:8000/api/payments/momo/cancel/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, result_code: resultCode }),
      })
        .catch(() => {})
        .finally(() => {
          // Đóng tab SAU KHI fetch xong
          window.close();
          setTimeout(() => window.location.replace("about:blank"), 300);
        });
    } else {
      // Thành công → đóng tab ngay
      window.close();
      setTimeout(() => window.location.replace("about:blank"), 300);
    }
  }, []);

  return null; // không render gì
};

export default PaymentReturn;