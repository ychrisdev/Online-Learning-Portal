import React, { useState, useEffect } from "react";
import { formatPrice, formatDate } from "../utils/format";
import "../styles/pages/StudentDashboard.css";

interface StudentDashboardProps {
  onNavigate: (page: string, courseId?: string) => void;
  onLogout: () => void;
}

type Tab =
  | "overview"
  | "profile"
  | "courses"
  | "quizzes"
  | "payments"
  | "certificates"
  | "wallet";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "profile", label: "Thông tin cá nhân" },
  { id: "courses", label: "Khóa học của tôi" },
  { id: "quizzes", label: "Lịch sử kiểm tra" },
  { id: "payments", label: "Lịch sử thanh toán" },
  { id: "certificates", label: "Chứng chỉ" },
  { id: "wallet", label: "Ví tiền" },
];

const API = "http://127.0.0.1:8000";

// ── Interfaces ────────────────────────────────────────────────────────────────
interface EnrolledCourse {
  id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  course_thumbnail: string | null;
  instructor_name: string;
  progress: number;
  total_lessons: number;
  completed_lessons: number;
  status: string;
  amount?: number;
}

interface Payment {
  id: string;
  course_title: string;
  course_id: string;
  created_at: string;
  amount: number;
  status: "pending" | "success" | "failed" | "refunded" | "refund_requested";
  method: string;
  ref_code: string;
  refund_requested_once: boolean;
}

interface UserForm {
  full_name: string;
  email: string;
  bio: string;
}

interface StudentForm {
  phone_number: string;
  date_of_birth: string;
  gender: string;
  country: string;
  city: string;
  current_level: string;
  learning_goal: string;
  target_exam: string;
  study_hours_per_week: number;
  occupation: string;
  education: string;
  facebook_url: string;
  linkedin_url: string;
  receive_email_notifications: boolean;
  receive_sms_notifications: boolean;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const authHeaders = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${localStorage.getItem("access")}`,
  ...extra,
});

const toList = (data: any): any[] =>
  Array.isArray(data) ? data : (data?.results ?? []);

const DefaultAvatar = () => (
  <svg
    viewBox="0 0 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="db-profile__avatar-svg"
  >
    <circle cx="36" cy="36" r="36" fill="#1B263B" />
    <circle cx="36" cy="28" r="11" fill="#415A77" />
    <path d="M12 60c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#415A77" />
  </svg>
);

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  success: "Thành công",
  pending: "Đang xử lý",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
  refund_requested: "Chờ hoàn tiền",
};

// ── Component ─────────────────────────────────────────────────────────────────
const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onNavigate,
  onLogout,
}) => {
  const [quizSortCourse, setQuizSortCourse] = useState<string>("all");
  const [quizSortResult, setQuizSortResult] = useState<
    "all" | "passed" | "failed"
  >("all");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [userForm, setUserForm] = useState<UserForm>({
    full_name: "",
    email: "",
    bio: "",
  });
  const [studentForm, setStudentForm] = useState<StudentForm>({
    phone_number: "",
    date_of_birth: "",
    gender: "",
    country: "Vietnam",
    city: "",
    current_level: "beginner",
    learning_goal: "communication",
    target_exam: "",
    study_hours_per_week: 0,
    occupation: "",
    education: "",
    facebook_url: "",
    linkedin_url: "",
    receive_email_notifications: true,
    receive_sms_notifications: false,
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const [certificates, setCertificates] = useState<any[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [loadingQuizAttempts, setLoadingQuizAttempts] = useState(false);

  const [profileEditing, setProfileEditing] = useState(false);
  const [studentEditing, setStudentEditing] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetail, setPaymentDetail] = useState<Payment | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  //state wallet
  const [wallet, setWallet] = useState<any>(null);
  const [walletTxs, setWalletTxs] = useState<any[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    bank_name: "",
    bank_account: "",
    account_name: "",
  });
  const [withdrawing, setWithdrawing] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [walletSuccess, setWalletSuccess] = useState("");

  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [walletPanel, setWalletPanel] = useState<"deposit" | "withdraw" | null>(
    null,
  );

  // ── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/api/auth/profile/`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        localStorage.clear();
        onNavigate("auth");
        return;
      }
      const data = await res.json();
      setUser(data);
      setUserForm({
        full_name: data.full_name || "",
        email: data.email || "",
        bio: data.bio || "",
      });
      if (data.avatar)
        setAvatarUrl(
          data.avatar.startsWith("http") ? data.avatar : `${API}${data.avatar}`,
        );
      if (data.role === "student" && data.student_profile) {
        const sp = data.student_profile;
        setStudentForm({
          phone_number: sp.phone_number ?? "",
          date_of_birth: sp.date_of_birth ?? "",
          gender: sp.gender ?? "",
          country: sp.country ?? "Vietnam",
          city: sp.city ?? "",
          current_level: sp.current_level ?? "beginner",
          learning_goal: sp.learning_goal ?? "communication",
          target_exam: sp.target_exam ?? "",
          study_hours_per_week: sp.study_hours_per_week ?? 0,
          occupation: sp.occupation ?? "",
          education: sp.education ?? "",
          facebook_url: sp.facebook_url ?? "",
          linkedin_url: sp.linkedin_url ?? "",
          receive_email_notifications: sp.receive_email_notifications ?? true,
          receive_sms_notifications: sp.receive_sms_notifications ?? false,
        });
      }
    })();
  }, []);

  // ── Fetch enrolled courses + payments ────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingCourses(true);
      setLoadingPayments(true);
      try {
        const [enrollRes, payRes] = await Promise.all([
          fetch(`${API}/api/enrollments/`, { headers: authHeaders() }),
          fetch(`${API}/api/payments/history/`, { headers: authHeaders() }),
        ]);
        const payList = payRes.ok ? toList(await payRes.json()) : [];
        const mappedPayments: Payment[] = payList.map((item: any) => ({
          id: item.id,
          course_id: item.course ?? "",
          course_title: item.course_title ?? "",
          created_at: item.created_at ?? "",
          amount: Number(item.amount) ?? 0,
          status: item.status ?? "success",
          method: item.method ?? "",
          ref_code: item.ref_code ?? "",
          refund_requested_once: item.refund_requested_once ?? false,
        }));
        setPayments(mappedPayments);
        const enrollList = enrollRes.ok ? toList(await enrollRes.json()) : [];
        const mappedCourses: EnrolledCourse[] = enrollList.map((item: any) => {
          const courseId = item.course ?? item.course_id ?? item.id;
          const p = mappedPayments.find(
            (p) => p.course_id === courseId && p.status === "success",
          );
          return {
            id: item.id,
            course_id: courseId,
            course_title: item.course_title ?? item.title ?? "",
            course_slug: item.course_slug ?? item.slug ?? "",
            course_thumbnail: item.course_thumbnail ?? item.thumbnail ?? null,
            instructor_name: item.instructor_name ?? "",
            progress: item.progress_pct ?? item.progress ?? 0,
            total_lessons: item.total_lessons ?? 0,
            completed_lessons: item.completed_lessons ?? 0,
            status: item.status ?? "active",
            amount: p ? p.amount : undefined,
          };
        });
        setEnrolledCourses(mappedCourses);
      } catch (_) {}
      setLoadingCourses(false);
      setLoadingPayments(false);
    })();
  }, []);

  useEffect(() => {
    if (activeTab !== "certificates") return;
    (async () => {
      setLoadingCerts(true);
      try {
        const res = await fetch(`${API}/api/enrollments/certificates/`, {
          headers: authHeaders(),
        });
        if (res.ok) setCertificates(toList(await res.json()));
      } catch (_) {}
      setLoadingCerts(false);
    })();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "quizzes") return;
    (async () => {
      setLoadingQuizAttempts(true);
      try {
        const res = await fetch(`${API}/api/quizzes/attempts/mine/`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.results ?? []);
          setQuizAttempts(list);
        }
      } catch (_) {}
      setLoadingQuizAttempts(false);
    })();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "wallet") return;
    (async () => {
      setLoadingWallet(true);
      try {
        const [walletRes, txRes] = await Promise.all([
          fetch(`${API}/api/wallet/`, { headers: authHeaders() }),
          fetch(`${API}/api/wallet/transactions/`, { headers: authHeaders() }),
        ]);
        if (walletRes.ok) setWallet(await walletRes.json());
        if (txRes.ok) setWalletTxs(toList(await txRes.json()));
      } catch (_) {}
      setLoadingWallet(false);
    })();
  }, [activeTab]);

  // ── Avatar ────────────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      await fetch(`${API}/api/auth/me/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("access")}` },
        body: formData,
      });
    } catch (_) {}
  };

  // ── Save handlers ─────────────────────────────────────────────────────────
  const saveUserForm = async () => {
    setSaving(true);
    const res = await fetch(`${API}/api/auth/profile/`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        full_name: userForm.full_name,
        email: userForm.email,
        bio: userForm.bio,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      showToast("Lưu thất bại", false);
      return;
    }
    const data = await res.json();
    setUser((prev: any) => ({ ...prev, ...data }));
    showToast("Đã lưu thông tin cơ bản");
  };

  const saveStudentForm = async () => {
    setSaving(true);
    const res = await fetch(`${API}/api/auth/profile/student/`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        ...studentForm,
        date_of_birth: studentForm.date_of_birth || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      showToast("Lưu thất bại", false);
      return;
    }
    showToast("Đã lưu hồ sơ học viên");
  };

  const savePassword = async () => {
    const errs: Record<string, string> = {};
    if (!passwordForm.currentPassword)
      errs.currentPassword = "Nhập mật khẩu hiện tại";
    if (!passwordForm.newPassword) errs.newPassword = "Nhập mật khẩu mới";
    if (passwordForm.newPassword !== passwordForm.confirmPassword)
      errs.confirmPassword = "Mật khẩu xác nhận không khớp";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    const res = await fetch(`${API}/api/auth/change-password/`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        old_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      showToast(data?.old_password?.[0] || "Đổi mật khẩu thất bại", false);
      return;
    }
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    showToast("Đổi mật khẩu thành công");
  };

  const openRefundModal = (target: Payment) => {
    if (target.refund_requested_once) {
      alert(
        "Bạn đã từng yêu cầu hoàn tiền cho giao dịch này rồi, không thể yêu cầu nữa.",
      );
      return;
    }
    setRefundTarget(target);
    setRefundReason("");
  };

  const requestRefund = async () => {
    if (!refundTarget || !refundReason.trim()) return;
    setRefundLoading(true);
    const res = await fetch(
      `${API}/api/payments/${refundTarget.id}/request-refund/`,
      {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ reason: refundReason }),
      },
    );
    setRefundLoading(false);
    if (!res.ok) {
      const err = await res.json();
      showToast(err?.detail || "Yêu cầu thất bại", false);
      return;
    }
    setPayments((prev) =>
      prev.map((p) =>
        p.id === refundTarget.id
          ? {
              ...p,
              status: "refund_requested" as any,
              refund_requested_once: true,
            }
          : p,
      ),
    );
    setRefundTarget(null);
    setRefundReason("");
    showToast("Đã gửi yêu cầu hoàn tiền");
  };

  const openAttemptDetail = async (attemptId: string) => {
    setLoadingDetail(true);
    setAttemptDetail(null);
    try {
      const res = await fetch(`${API}/api/quizzes/attempts/${attemptId}/`, {
        headers: authHeaders(),
      });
      if (res.ok) setAttemptDetail(await res.json());
    } catch (_) {}
    setLoadingDetail(false);
  };

  const openPaymentDetail = (id: string) => {
    const p = payments.find((p) => p.id === id) ?? null;
    setPaymentDetail(p);
    setShowPaymentModal(true);
  };

  const closePaymentDetail = () => {
    setShowPaymentModal(false);
    setPaymentDetail(null);
  };

  //nạp tiền
  const handleDeposit = async () => {
    const amount = parseInt(depositAmount);
    if (!amount || amount < 10000) {
      setWalletError("Số tiền tối thiểu 10,000đ");
      return;
    }
    setDepositing(true);
    setWalletError("");
    setWalletSuccess("");
    try {
      const res = await fetch(`${API}/api/wallet/deposit/`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setWallet((w: any) => ({ ...w, balance: data.balance }));
        setDepositAmount("");
        setWalletSuccess("Nạp tiền thành công!");
        // Refresh transactions
        const txRes = await fetch(`${API}/api/wallet/transactions/`, {
          headers: authHeaders(),
        });
        if (txRes.ok) setWalletTxs(toList(await txRes.json()));
      } else {
        const err = await res.json();
        setWalletError(err.detail ?? "Nạp tiền thất bại.");
      }
    } catch (_) {
      setWalletError("Lỗi kết nối.");
    }
    setDepositing(false);
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawForm.amount);
    if (!amount || amount < 50000) {
      setWithdrawError("Tối thiểu 50,000đ");
      return;
    }
    if (!withdrawForm.bank_name.trim()) {
      setWithdrawError("Nhập tên ngân hàng");
      return;
    }
    if (!withdrawForm.bank_account.trim()) {
      setWithdrawError("Nhập số tài khoản");
      return;
    }
    if (!withdrawForm.account_name.trim()) {
      setWithdrawError("Nhập tên chủ tài khoản");
      return;
    }
    setWithdrawing(true);
    setWithdrawError("");
    setWithdrawSuccess("");
    try {
      const res = await fetch(`${API}/api/wallet/withdraw/`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...withdrawForm, amount }),
      });
      if (res.ok) {
        setWithdrawSuccess("Yêu cầu rút tiền đã được gửi!");
        setWithdrawForm({
          amount: "",
          bank_name: "",
          bank_account: "",
          account_name: "",
        });
        const [walletRes, txRes] = await Promise.all([
          fetch(`${API}/api/wallet/`, { headers: authHeaders() }),
          fetch(`${API}/api/wallet/transactions/`, { headers: authHeaders() }),
        ]);
        if (walletRes.ok) setWallet(await walletRes.json());
        if (txRes.ok) setWalletTxs(toList(await txRes.json()));
      } else {
        const err = await res.json();
        setWithdrawError(err.detail ?? "Rút tiền thất bại.");
      }
    } catch (_) {
      setWithdrawError("Lỗi kết nối.");
    }
    setWithdrawing(false);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const activeCourses = enrolledCourses.filter(
    (c) => c.status === "active" || c.status === "completed",
  );
  const inProgressCourses = activeCourses.filter(
    (c) => c.progress > 0 && c.progress < 100,
  );
  const completedCount = activeCourses.filter((c) => c.progress === 100).length;
  const avgProgress =
    activeCourses.length > 0
      ? Math.round(
          activeCourses.reduce((a, c) => a + c.progress, 0) /
            activeCourses.length,
        )
      : 0;
  const totalSpent = payments
    .filter((p) => p.status === "success")
    .reduce((a, p) => a + p.amount, 0);

  const thumbnailSrc = (t: string | null) =>
    !t ? null : t.startsWith("http") ? t : `${API}${t}`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="db-page">
      {/* Toast */}
      {toast && (
        <div
          className={`db-toast ${toast.ok ? "db-toast--ok" : "db-toast--err"}`}
        >
          {toast.msg}
        </div>
      )}

      <div className="container db-layout">
        {/* ══ Sidebar ══════════════════════════════════════════════ */}
        <aside className="db-sidebar">
          <div className="db-profile">
            <div className="db-profile__avatar-wrap">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userForm.full_name}
                  className="db-profile__avatar"
                />
              ) : (
                <DefaultAvatar />
              )}
              <span className="db-profile__level">
                {user?.role === "student" ? "Học viên" : user?.role}
              </span>
            </div>
            <strong className="db-profile__name">{userForm.full_name}</strong>
            <span className="db-profile__email">{userForm.email}</span>
            <span className="db-profile__joined">
              {user?.date_joined
                ? `Tham gia ${formatDate(user.date_joined)}`
                : ""}
            </span>
          </div>
          <nav className="db-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`db-nav__item${activeTab === tab.id ? " db-nav__item--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <button
            className="db-nav__item db-nav__item--danger"
            onClick={onLogout}
          >
            Đăng xuất
          </button>
        </aside>

        {/* ══ Main ═════════════════════════════════════════════════ */}
        <main className="db-main">
          {/* ════ OVERVIEW ════ */}
          {activeTab === "overview" && (
            <div className="db-content">
              <div className="db-page-header">
                <h1 className="db-page-title">
                  Xin chào, {userForm.full_name.split(" ").pop()}
                </h1>
                <p className="db-page-sub">
                  Tiếp tục hành trình học tiếng Anh của bạn.
                </p>
              </div>

              {/* Stats */}
              <div className="db-stats-grid">
                <div className="db-stat-card">
                  <span className="db-stat-card__value">
                    {loadingCourses ? "…" : activeCourses.length}
                  </span>
                  <span className="db-stat-card__label">Khóa đã đăng ký</span>
                </div>
                <div className="db-stat-card">
                  <span className="db-stat-card__value">
                    {loadingCourses ? "…" : `${avgProgress}%`}
                  </span>
                  <span className="db-stat-card__label">
                    Tiến độ trung bình
                  </span>
                </div>
                <div className="db-stat-card">
                  <span className="db-stat-card__value">
                    {loadingCourses ? "…" : completedCount}
                  </span>
                  <span className="db-stat-card__label">Khóa hoàn thành</span>
                </div>
                <div className="db-stat-card">
                  <span className="db-stat-card__value">
                    {loadingPayments ? "…" : formatPrice(totalSpent)}
                  </span>
                  <span className="db-stat-card__label">
                    Tổng đã thanh toán
                  </span>
                </div>
              </div>

              {/* Khóa học đang học */}
              {!loadingCourses && inProgressCourses.length > 0 && (
                <div className="id-form-card" style={{ marginTop: 20 }}>
                  <h3 className="id-form-card__title">
                    Đang học ({inProgressCourses.length})
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      marginTop: 12,
                    }}
                  >
                    {inProgressCourses.slice(0, 3).map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 0",
                          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "var(--color-text-primary)",
                              marginBottom: 4,
                            }}
                          >
                            {c.course_title}
                          </div>
                          {c.instructor_name && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              {c.instructor_name}
                            </div>
                          )}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginTop: 6,
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                height: 4,
                                borderRadius: 2,
                                background: "rgba(255,255,255,0.1)",
                              }}
                            >
                              <div
                                style={{
                                  width: `${c.progress}%`,
                                  height: "100%",
                                  borderRadius: 2,
                                  background: "#4caf82",
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: 12,
                                color: "#4caf82",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c.progress}%
                            </span>
                          </div>
                        </div>
                        <button
                          className="ad-btn-sm ad-btn-sm--view"
                          onClick={() =>
                            onNavigate("course-detail", c.course_slug)
                          }
                        >
                          Tiếp tục
                        </button>
                      </div>
                    ))}
                    {inProgressCourses.length > 3 && (
                      <button
                        className="id-btn-secondary"
                        style={{ alignSelf: "flex-start", fontSize: 13 }}
                        onClick={() => setActiveTab("courses")}
                      >
                        Xem tất cả {inProgressCourses.length} khóa →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Thanh toán gần đây */}
              {!loadingPayments &&
                payments.filter((p) => p.status === "success").length > 0 && (
                  <div className="id-form-card" style={{ marginTop: 16 }}>
                    <h3 className="id-form-card__title">Giao dịch gần đây</h3>
                    <div style={{ marginTop: 12 }}>
                      {payments
                        .filter((p) => p.status === "success")
                        .slice(0, 3)
                        .map((p) => (
                          <div
                            key={p.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "8px 0",
                              borderBottom:
                                "0.5px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: "var(--color-text-primary)",
                                }}
                              >
                                {p.course_title}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--color-text-secondary)",
                                }}
                              >
                                {p.created_at
                                  ? new Date(p.created_at).toLocaleDateString(
                                      "vi-VN",
                                    )
                                  : "—"}
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#4caf82",
                              }}
                            >
                              {formatPrice(p.amount, "VND")}
                            </span>
                          </div>
                        ))}
                      <button
                        className="id-btn-secondary"
                        style={{ marginTop: 10, fontSize: 13 }}
                        onClick={() => setActiveTab("payments")}
                      >
                        Xem tất cả →
                      </button>
                    </div>
                  </div>
                )}

              {/* Không có khóa học */}
              {!loadingCourses && activeCourses.length === 0 && (
                <div
                  className="id-form-card"
                  style={{
                    marginTop: 20,
                    textAlign: "center",
                    padding: "2rem",
                  }}
                >
                  <p
                    style={{
                      color: "var(--color-text-secondary)",
                      marginBottom: 12,
                    }}
                  >
                    Bạn chưa đăng ký khóa học nào.
                  </p>
                  <button
                    className="id-btn-primary"
                    onClick={() => onNavigate("courses")}
                  >
                    Khám phá khóa học
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════ COURSES ════ */}
          {activeTab === "courses" && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Khóa học của tôi</h1>
                <p className="id-page-sub">
                  {loadingCourses
                    ? "Đang tải…"
                    : `${activeCourses.length} khóa học`}
                </p>
              </div>
              {loadingCourses ? (
                <div className="id-form-card">
                  <p
                    style={{
                      textAlign: "center",
                      color: "var(--color-text-secondary)",
                      padding: "2rem",
                    }}
                  >
                    ⏳ Đang tải…
                  </p>
                </div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Khóa học</th>
                        <th>Học phí</th>
                        <th>Tiến độ</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCourses.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="ad-table__empty-cell">
                            <span className="ad-table__empty-text">
                              🔍 Bạn chưa đăng ký khóa học nào.
                            </span>
                          </td>
                        </tr>
                      ) : (
                        activeCourses.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <div
                                className="ad-user-cell"
                                style={{ display: "flex", gap: 12 }}
                              >
                                <div>
                                  <span className="ad-user-cell__name">
                                    {c.course_title}
                                  </span>
                                  {c.instructor_name && (
                                    <span className="ad-user-cell__email">
                                      {c.instructor_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="db-table__price">
                              {c.amount !== undefined
                                ? formatPrice(c.amount, "VND")
                                : "Miễn phí"}
                            </td>
                            <td className="db-courses__progress-cell">
                              <div className="db-courses__progress-wrap">
                                <div className="db-progress-bar">
                                  <div
                                    className="db-progress-bar__fill"
                                    style={{ width: `${c.progress ?? 0}%` }}
                                  />
                                </div>
                                <span className="db-muted">
                                  {c.progress ?? 0}%
                                  {c.total_lessons > 0 &&
                                    ` · ${c.completed_lessons}/${c.total_lessons} bài`}
                                </span>
                              </div>
                            </td>
                            <td>
                              <button
                                className="ad-btn-sm ad-btn-sm--view"
                                onClick={() =>
                                  onNavigate("course-detail", c.course_slug)
                                }
                              >
                                Xem
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════ PAYMENTS ════ */}
          {activeTab === "payments" && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Lịch sử thanh toán</h1>
                <p className="id-page-sub">
                  {loadingPayments
                    ? "Đang tải…"
                    : `${payments.length} giao dịch`}
                </p>
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Khóa học</th>
                      <th>Số tiền</th>
                      <th>Ngày</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPayments ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center" }}>
                          Đang tải…
                        </td>
                      </tr>
                    ) : payments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          🔍 Chưa có giao dịch nào.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => {
                        const status = p.status ?? "pending";
                        return (
                          <tr key={p.id}>
                            <td className="ad-table__title">
                              {p.course_title || "—"}
                            </td>
                            <td className="db-table__price">
                              {formatPrice(p.amount, "VND")}
                            </td>
                            <td className="ad-table__muted">
                              {p.created_at
                                ? new Date(p.created_at).toLocaleDateString(
                                    "vi-VN",
                                  )
                                : "—"}
                            </td>
                            <td>
                              <span
                                className={`ad-badge ad-badge--pay-${status}`}
                              >
                                {PAYMENT_STATUS_LABEL[status] ?? status}
                              </span>
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  alignItems: "center",
                                }}
                              >
                                <button
                                  className="ad-btn-sm ad-btn-sm--view"
                                  onClick={() => openPaymentDetail(p.id)}
                                >
                                  Xem
                                </button>
                                {status === "success" &&
                                  !p.refund_requested_once && (
                                    <button
                                      className="ad-btn-sm"
                                      style={{
                                        color: "#e07a5f",
                                        border:
                                          "1px solid rgba(224,122,95,0.3)",
                                      }}
                                      onClick={() => openRefundModal(p)}
                                    >
                                      Hoàn tiền
                                    </button>
                                  )}
                                {status === "success" &&
                                  p.refund_requested_once && (
                                    <span className="db-muted">
                                      Từ chối hoàn tiền
                                    </span>
                                  )}
                                {status === "refund_requested" && (
                                  <span className="db-muted">
                                    Đang chờ xử lý
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Payment Detail Modal */}
              {showPaymentModal && (
                <div
                  className="cm-overlay"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) closePaymentDetail();
                  }}
                >
                  <div className="cm-box cm-box--sm">
                    <div className="cm-header">
                      <h2 className="cm-title">Chi tiết giao dịch</h2>
                      <button className="cm-close" onClick={closePaymentDetail}>
                        ✕
                      </button>
                    </div>
                    <div className="cm-body">
                      {!paymentDetail ? (
                        <p style={{ color: "var(--color-text-secondary)" }}>
                          Không tìm thấy giao dịch.
                        </p>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}
                        >
                          {[
                            {
                              label: "Khóa học",
                              value: paymentDetail.course_title ?? "—",
                            },
                            {
                              label: "Số tiền",
                              value: formatPrice(paymentDetail.amount, "VND"),
                            },
                            {
                              label: "Trạng thái",
                              value:
                                PAYMENT_STATUS_LABEL[paymentDetail.status] ??
                                paymentDetail.status ??
                                "—",
                            },
                            {
                              label: "Ngày",
                              value: paymentDetail.created_at
                                ? new Date(
                                    paymentDetail.created_at,
                                  ).toLocaleString("vi-VN")
                                : "—",
                            },
                            {
                              label: "Phương thức",
                              value: paymentDetail.method || "—",
                            },
                            {
                              label: "Mã GD",
                              value:
                                paymentDetail.ref_code ||
                                paymentDetail.id ||
                                "—",
                            },
                          ].map((item) => (
                            <div key={item.label} className="cm-detail-row">
                              <span className="cm-detail-row__label">
                                {item.label}
                              </span>
                              <span className="cm-detail-row__value">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="cm-footer">
                      {paymentDetail?.status === "success" &&
                        !paymentDetail?.refund_requested_once && (
                          <button
                            className="cm-btn"
                            style={{ color: "#e07a5f", marginRight: "auto" }}
                            onClick={() => {
                              closePaymentDetail();
                              openRefundModal(paymentDetail);
                            }}
                          >
                            Yêu cầu hoàn tiền
                          </button>
                        )}
                      {paymentDetail?.status === "success" &&
                        paymentDetail?.refund_requested_once && (
                          <span
                            style={{
                              color: "var(--color-text-secondary)",
                              fontSize: 13,
                              marginRight: "auto",
                            }}
                          >
                            Đã dùng quyền hoàn tiền
                          </span>
                        )}
                      <button
                        className="cm-btn cm-btn--cancel"
                        onClick={closePaymentDetail}
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ PROFILE ════ */}
          {activeTab === "profile" && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Hồ sơ cá nhân</h1>
                <p className="id-page-sub">
                  Cập nhật thông tin cá nhân của bạn
                </p>
              </div>

              {/* Avatar card */}
              <div className="id-profile-card">
                <div className="id-profile-card__avatar-section">
                  <div className="id-profile-card__avatar-col">
                    <div className="id-profile-card__avatar-wrap">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="avatar"
                          className="id-profile-card__avatar-img"
                        />
                      ) : (
                        <svg
                          viewBox="0 0 100 100"
                          fill="none"
                          width="100"
                          height="100"
                        >
                          <circle cx="50" cy="50" r="50" fill="#1B263B" />
                          <circle cx="50" cy="38" r="16" fill="#415A77" />
                          <path
                            d="M10 88c0-22.091 17.909-40 40-40s40 17.909 40 40"
                            fill="#415A77"
                          />
                        </svg>
                      )}
                    </div>
                    <label className="id-avatar-upload-btn">
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleAvatarChange}
                      />
                      Đổi ảnh
                    </label>
                  </div>
                  <div className="id-profile-card__avatar-info">
                    <div className="id-profile-card__name">
                      {userForm.full_name || user?.full_name}
                    </div>
                    <div className="id-profile-card__title-text">
                      {studentForm.occupation || "Học viên"}
                    </div>
                    <div className="id-profile-card__stats">
                      <span>{studentForm.city || "—"}</span>
                      <span>·</span>
                      <span>{studentForm.occupation || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin cơ bản */}
              <div className="id-form-card">
                <div
                  className="id-form-card__title-row"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3 className="id-form-card__title">Thông tin cơ bản</h3>
                  {!studentEditing ? (
                    <button
                      className="id-btn-sm"
                      onClick={() => setStudentEditing(true)}
                    >
                      Chỉnh sửa
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="id-btn-primary"
                        onClick={async () => {
                          await saveUserForm();
                          await saveStudentForm();
                          setStudentEditing(false);
                        }}
                        disabled={saving}
                      >
                        {saving ? "Đang lưu…" : "Lưu"}
                      </button>
                      <button
                        className="id-btn-secondary"
                        onClick={() => setStudentEditing(false)}
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </div>
                <div className="id-form-grid">
                  <div className="id-field">
                    <label className="id-field__label">Họ và tên</label>
                    <input
                      className="id-field__input"
                      disabled={!studentEditing}
                      value={userForm.full_name}
                      onChange={(e) =>
                        setUserForm((f) => ({
                          ...f,
                          full_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Email</label>
                    <input
                      className="id-field__input"
                      type="email"
                      disabled={!studentEditing}
                      value={userForm.email}
                      onChange={(e) =>
                        setUserForm((f) => ({ ...f, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Số điện thoại</label>
                    <input
                      className="id-field__input"
                      type="tel"
                      disabled={!studentEditing}
                      placeholder="0901 234 567"
                      value={studentForm.phone_number}
                      onChange={(e) =>
                        setStudentForm((f) => ({
                          ...f,
                          phone_number: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Ngày sinh</label>
                    <input
                      className="id-field__input"
                      type="date"
                      disabled={!studentEditing}
                      value={studentForm.date_of_birth}
                      onChange={(e) =>
                        setStudentForm((f) => ({
                          ...f,
                          date_of_birth: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Giới tính</label>
                    <select
                      className="id-field__input"
                      disabled={!studentEditing}
                      value={studentForm.gender}
                      onChange={(e) =>
                        setStudentForm((f) => ({
                          ...f,
                          gender: e.target.value,
                        }))
                      }
                    >
                      <option value="">— Chọn —</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Quốc gia</label>
                    <input
                      className="id-field__input"
                      disabled={!studentEditing}
                      value={studentForm.country}
                      onChange={(e) =>
                        setStudentForm((f) => ({
                          ...f,
                          country: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Thành phố / Tỉnh</label>
                    <input
                      className="id-field__input"
                      disabled={!studentEditing}
                      placeholder="Hồ Chí Minh"
                      value={studentForm.city}
                      onChange={(e) =>
                        setStudentForm((f) => ({ ...f, city: e.target.value }))
                      }
                    />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Nghề nghiệp</label>
                    <input
                      className="id-field__input"
                      disabled={!studentEditing}
                      placeholder="Sinh viên, Nhân viên văn phòng…"
                      value={studentForm.occupation}
                      onChange={(e) =>
                        setStudentForm((f) => ({
                          ...f,
                          occupation: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Trình độ học vấn</label>
                    <select
                      className="id-field__input"
                      disabled={!studentEditing}
                      value={studentForm.education}
                      onChange={(e) =>
                        setStudentForm((f) => ({
                          ...f,
                          education: e.target.value,
                        }))
                      }
                    >
                      <option value="">— Chọn —</option>
                      <option value="high_school">THPT</option>
                      <option value="college">Cao đẳng</option>
                      <option value="bachelor">Đại học</option>
                      <option value="master">Thạc sĩ</option>
                      <option value="doctor">Tiến sĩ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div className="id-field id-field--full">
                    <label className="id-field__label">
                      Giới thiệu bản thân
                    </label>
                    <textarea
                      className="id-field__textarea"
                      rows={4}
                      disabled={!studentEditing}
                      placeholder="Viết vài dòng về bản thân…"
                      value={userForm.bio}
                      onChange={(e) =>
                        setUserForm((f) => ({ ...f, bio: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Bảo mật tài khoản */}
              <div className="id-form-card">
                <h3 className="id-form-card__title">Bảo mật tài khoản</h3>
                <div className="id-form-grid">
                  <div className="id-field id-field--full">
                    <label className="id-field__label">Mật khẩu hiện tại</label>
                    <input
                      className="id-field__input"
                      type="password"
                      placeholder="Nhập mật khẩu hiện tại"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((f) => ({
                          ...f,
                          currentPassword: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Mật khẩu mới</label>
                    <input
                      className="id-field__input"
                      type="password"
                      placeholder="Tối thiểu 6 ký tự"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((f) => ({
                          ...f,
                          newPassword: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      className="id-field__input"
                      type="password"
                      placeholder="Nhập lại mật khẩu mới"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((f) => ({
                          ...f,
                          confirmPassword: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                {errors.currentPassword && (
                  <p
                    style={{
                      color: "#ff6b6b",
                      fontSize: 13,
                      margin: "4px 0 8px",
                    }}
                  >
                    ⚠ {errors.currentPassword}
                  </p>
                )}
                {errors.newPassword && (
                  <p
                    style={{
                      color: "#ff6b6b",
                      fontSize: 13,
                      margin: "4px 0 8px",
                    }}
                  >
                    ⚠ {errors.newPassword}
                  </p>
                )}
                {errors.confirmPassword && (
                  <p
                    style={{
                      color: "#ff6b6b",
                      fontSize: 13,
                      margin: "4px 0 8px",
                    }}
                  >
                    ⚠ {errors.confirmPassword}
                  </p>
                )}
                <div className="id-form-actions">
                  <button
                    className="id-btn-primary"
                    onClick={savePassword}
                    disabled={saving}
                  >
                    {saving ? "Đang lưu…" : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════ QUIZZES ════ */}
          {activeTab === "quizzes" && (
            <div className="db-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Lịch sử kiểm tra</h1>
                <p className="id-page-sub">
                  {loadingQuizAttempts
                    ? "Đang tải…"
                    : `${quizAttempts.length} lần kiểm tra`}
                </p>
              </div>
              {!loadingQuizAttempts && quizAttempts.length > 0 && (
                <div className="quizzes-container">
                  <select
                    className="id-field__input"
                    value={quizSortCourse}
                    onChange={(e) => setQuizSortCourse(e.target.value)}
                  >
                    <option value="all">Tất cả khóa học</option>
                    {[
                      ...new Map(
                        quizAttempts.map((a) => [
                          a.course_title,
                          a.course_title,
                        ]),
                      ).values(),
                    ]
                      .filter(Boolean)
                      .map((title) => (
                        <option key={title} value={title}>
                          {title}
                        </option>
                      ))}
                  </select>
                  <select
                    className="id-field__input"
                    value={quizSortResult}
                    onChange={(e) => setQuizSortResult(e.target.value as any)}
                  >
                    <option value="all">Tất cả kết quả</option>
                    <option value="passed">Đạt</option>
                    <option value="failed">Chưa đạt</option>
                  </select>
                </div>
              )}
              {loadingQuizAttempts ? (
                <p className="db-muted">Đang tải…</p>
              ) : (
                (() => {
                  const filtered = quizAttempts.filter((a) => {
                    if (
                      quizSortCourse !== "all" &&
                      a.course_title !== quizSortCourse
                    )
                      return false;
                    if (quizSortResult === "passed" && !a.passed) return false;
                    if (quizSortResult === "failed" && a.passed) return false;
                    return true;
                  });
                  return (
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <thead>
                          <tr>
                            <th>Bài kiểm tra</th>
                            <th>Khóa học</th>
                            <th>Điểm</th>
                            <th>Kết quả</th>
                            <th>Thời gian làm</th>
                            <th>Ngày nộp</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                style={{
                                  textAlign: "center",
                                  padding: "2rem",
                                  color: "var(--color-text-secondary)",
                                }}
                              >
                                {quizAttempts.length === 0
                                  ? "🔍 Chưa có lần kiểm tra nào."
                                  : "Không có kết quả phù hợp."}
                              </td>
                            </tr>
                          ) : (
                            filtered.map((a) => {
                              const start = a.started_at
                                ? new Date(a.started_at)
                                : null;
                              const submit = a.submitted_at
                                ? new Date(a.submitted_at)
                                : null;
                              const duration =
                                start && submit
                                  ? Math.round(
                                      (submit.getTime() - start.getTime()) /
                                        1000,
                                    )
                                  : null;
                              return (
                                <tr key={a.id}>
                                  <td>
                                    <span className="ad-table__title">
                                      {a.quiz_title ?? "—"}
                                    </span>
                                  </td>
                                  <td className="ad-table__muted">
                                    {a.course_title ?? "—"}
                                  </td>
                                  <td
                                    className={
                                      a.passed
                                        ? "db-quiz__score db-quiz__score--passed"
                                        : "db-quiz__score db-quiz__score--failed"
                                    }
                                  >
                                    {(() => {
                                      const score10 = Number(a.score) / 10;
                                      return `${Number.isInteger(score10) ? score10 : score10.toFixed(1)}`;
                                    })()}
                                  </td>
                                  <td>
                                    <span
                                      className={
                                        a.passed
                                          ? "db-quiz__badge db-quiz__badge--passed"
                                          : "db-quiz__badge db-quiz__badge--failed"
                                      }
                                    >
                                      {a.passed ? "Đạt" : "Chưa đạt"}
                                    </span>
                                  </td>
                                  <td className="ad-table__muted">
                                    {duration !== null
                                      ? `${Math.floor(duration / 60)} phút ${duration % 60} giây`
                                      : "—"}
                                  </td>
                                  <td className="ad-table__muted">
                                    {submit
                                      ? submit.toLocaleString("vi-VN")
                                      : "—"}
                                  </td>
                                  <td>
                                    <button
                                      className="ad-btn-sm ad-btn-sm--view"
                                      onClick={() => openAttemptDetail(a.id)}
                                    >
                                      Xem lại
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}

              {(attemptDetail || loadingDetail) && (
                <div
                  className="qad-overlay"
                  onClick={() => {
                    setAttemptDetail(null);
                    setLoadingDetail(false);
                  }}
                >
                  <div
                    className="qad-modal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="qad-header">
                      <div>
                        <h2 className="qad-title">
                          {attemptDetail?.quiz_title ?? "Chi tiết bài làm"}
                        </h2>
                        <p className="qad-subtitle">
                          {attemptDetail
                            ? (() => {
                                const score10 =
                                  Number(attemptDetail.score) / 10;
                                return `Điểm: ${Number.isInteger(score10) ? score10 : score10.toFixed(1)}/10 · ${attemptDetail.passed ? "Đạt" : "Chưa đạt"}`;
                              })()
                            : "Đang tải..."}
                        </p>
                      </div>
                      <button
                        className="qad-close"
                        onClick={() => {
                          setAttemptDetail(null);
                          setLoadingDetail(false);
                        }}
                      >
                        ×
                      </button>
                    </div>
                    {loadingDetail && !attemptDetail && (
                      <p className="qad-loading">Đang tải…</p>
                    )}
                    {attemptDetail?.questions?.map((q: any, qi: number) => {
                      const snapshot: Record<string, string[]> =
                        attemptDetail.answers_snapshot ?? {};
                      const chosenIds: string[] = snapshot[q.id] ?? [];
                      return (
                        <div key={q.id} className="qad-question">
                          <p className="qad-question__text">
                            <span className="qad-question__index">
                              Question {qi + 1}:
                            </span>
                            {q.content}
                          </p>
                          <div className="qad-answers">
                            {q.answers.map((ans: any) => {
                              const isChosen = chosenIds.includes(ans.id);
                              const isCorrect = ans.is_correct;
                              let ansClass = "qad-answer qad-answer--default";
                              let badgeEl = null;
                              if (isCorrect && isChosen) {
                                ansClass =
                                  "qad-answer qad-answer--correct-chosen";
                                badgeEl = (
                                  <span className="qad-badge qad-badge--correct">
                                    True
                                  </span>
                                );
                              } else if (isChosen && !isCorrect) {
                                ansClass =
                                  "qad-answer qad-answer--wrong-chosen";
                                badgeEl = (
                                  <span className="qad-badge qad-badge--wrong">
                                    False
                                  </span>
                                );
                              } else if (!isChosen && isCorrect) {
                                ansClass =
                                  "qad-answer qad-answer--correct-missed";
                                badgeEl = (
                                  <span className="qad-badge qad-badge--missed">
                                    Correct answer
                                  </span>
                                );
                              }
                              return (
                                <div key={ans.id} className={ansClass}>
                                  <span className="qad-answer__text">
                                    {ans.content}
                                  </span>
                                  {badgeEl}
                                </div>
                              );
                            })}
                          </div>
                          <p className="qad-explanation">
                            Explain: {q.explanation ? q.explanation : ""}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ CERTIFICATES ════ */}
          {activeTab === "certificates" && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Chứng chỉ của tôi</h1>
                <p className="id-page-sub">
                  {loadingCerts
                    ? "Đang tải…"
                    : `${certificates.length} chứng chỉ`}
                </p>
              </div>
              {loadingCerts ? (
                <div className="id-form-card">
                  <p
                    style={{
                      textAlign: "center",
                      color: "var(--color-text-secondary)",
                      padding: "2rem",
                    }}
                  >
                    ⏳ Đang tải…
                  </p>
                </div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Khóa học</th>
                        <th>Mã chứng chỉ</th>
                        <th>Ngày cấp</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certificates.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="ad-table__empty-cell">
                            <span className="ad-table__empty-text">
                              🔍 Bạn chưa có chứng chỉ nào.
                            </span>
                          </td>
                        </tr>
                      ) : (
                        certificates.map((cert) => (
                          <tr key={cert.id}>
                            <td>
                              <span style={{ fontWeight: 600 }}>
                                {cert.course_title}
                              </span>
                            </td>
                            <td>
                              <strong>{cert.cert_number}</strong>
                            </td>
                            <td>
                              {cert.issued_at
                                ? new Date(cert.issued_at).toLocaleDateString(
                                    "vi-VN",
                                  )
                                : "—"}
                            </td>
                            <td>
                              <span className="db-cert__badge">
                                ✓ Hoàn thành
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════ WALLET ════ */}
          {activeTab === "wallet" && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Ví tiền</h1>
                <p className="id-page-sub">
                  Quản lý số dư và lịch sử giao dịch
                </p>
              </div>

              {loadingWallet ? (
                <p className="db-muted">Đang tải…</p>
              ) : (
                <>
                  {/* Số dư + nút toggle */}
                  <div className="id-form-card" style={{ marginBottom: 16 }}>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                        marginBottom: 4,
                      }}
                    >
                      Số dư hiện tại
                    </p>
                    <p
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: "#4caf82",
                        marginBottom: 12,
                      }}
                    >
                      {formatPrice(wallet?.balance ?? 0, "VND")}
                    </p>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        className={
                          walletPanel === "deposit"
                            ? "id-btn-primary"
                            : "id-btn-secondary"
                        }
                        onClick={() =>
                          setWalletPanel((p) =>
                            p === "deposit" ? null : "deposit",
                          )
                        }
                      >
                        💳 Nạp tiền
                      </button>
                      <button
                        className={
                          walletPanel === "withdraw"
                            ? "id-btn-primary"
                            : "id-btn-secondary"
                        }
                        onClick={() =>
                          setWalletPanel((p) =>
                            p === "withdraw" ? null : "withdraw",
                          )
                        }
                      >
                        🏦 Rút tiền
                      </button>
                    </div>
                  </div>

                  {/* Panel Nạp tiền */}
                  {walletPanel === "deposit" && (
                    <div className="id-form-card" style={{ marginBottom: 16 }}>
                      <h3 className="id-form-card__title">Nạp tiền (mock)</h3>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-end",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          className="id-field"
                          style={{ flex: 1, minWidth: 200, marginBottom: 0 }}
                        >
                          <label className="id-field__label">
                            Số tiền (VNĐ)
                          </label>
                          <input
                            className="id-field__input"
                            type="number"
                            min={10000}
                            placeholder="Tối thiểu 10,000đ"
                            value={depositAmount}
                            onChange={(e) => {
                              setDepositAmount(e.target.value);
                              setWalletError("");
                              setWalletSuccess("");
                            }}
                          />
                        </div>
                        <button
                          className="id-btn-primary"
                          onClick={handleDeposit}
                          disabled={depositing}
                        >
                          {depositing ? "Đang nạp…" : "Nạp tiền"}
                        </button>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        {[50000, 100000, 200000, 500000].map((v) => (
                          <button
                            key={v}
                            className="id-btn-sm"
                            onClick={() => {
                              setDepositAmount(String(v));
                              setWalletError("");
                              setWalletSuccess("");
                            }}
                          >
                            {formatPrice(v, "VND")}
                          </button>
                        ))}
                      </div>
                      {walletError && (
                        <p
                          style={{
                            color: "#e05c5c",
                            fontSize: 13,
                            marginTop: 8,
                          }}
                        >
                          ⚠ {walletError}
                        </p>
                      )}
                      {walletSuccess && (
                        <p
                          style={{
                            color: "#4caf82",
                            fontSize: 13,
                            marginTop: 8,
                          }}
                        >
                          ✓ {walletSuccess}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Panel Rút tiền */}
                  {walletPanel === "withdraw" && (
                    <div className="id-form-card" style={{ marginBottom: 16 }}>
                      <h3 className="id-form-card__title">Rút tiền</h3>
                      <div className="id-form-grid">
                        <div className="id-field">
                          <label className="id-field__label">
                            Số tiền (VNĐ)
                          </label>
                          <input
                            className="id-field__input"
                            type="number"
                            min={50000}
                            placeholder="Tối thiểu 50,000đ"
                            value={withdrawForm.amount}
                            onChange={(e) => {
                              setWithdrawForm((f) => ({
                                ...f,
                                amount: e.target.value,
                              }));
                              setWithdrawError("");
                              setWithdrawSuccess("");
                            }}
                          />
                        </div>
                        <div className="id-field">
                          <label className="id-field__label">
                            Tên ngân hàng
                          </label>
                          <input
                            className="id-field__input"
                            placeholder="VD: Vietcombank"
                            value={withdrawForm.bank_name}
                            onChange={(e) =>
                              setWithdrawForm((f) => ({
                                ...f,
                                bank_name: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="id-field">
                          <label className="id-field__label">
                            Số tài khoản
                          </label>
                          <input
                            className="id-field__input"
                            placeholder="0123456789"
                            value={withdrawForm.bank_account}
                            onChange={(e) =>
                              setWithdrawForm((f) => ({
                                ...f,
                                bank_account: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="id-field">
                          <label className="id-field__label">
                            Tên chủ tài khoản
                          </label>
                          <input
                            className="id-field__input"
                            placeholder="NGUYEN VAN A"
                            value={withdrawForm.account_name}
                            onChange={(e) =>
                              setWithdrawForm((f) => ({
                                ...f,
                                account_name: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      {withdrawError && (
                        <p
                          style={{
                            color: "#e05c5c",
                            fontSize: 13,
                            marginTop: 8,
                          }}
                        >
                          ⚠ {withdrawError}
                        </p>
                      )}
                      {withdrawSuccess && (
                        <p
                          style={{
                            color: "#4caf82",
                            fontSize: 13,
                            marginTop: 8,
                          }}
                        >
                          ✓ {withdrawSuccess}
                        </p>
                      )}
                      <div className="id-form-actions">
                        <button
                          className="id-btn-primary"
                          onClick={handleWithdraw}
                          disabled={withdrawing}
                        >
                          {withdrawing ? "Đang gửi…" : "Gửi yêu cầu rút tiền"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lịch sử giao dịch */}
                  <div className="id-form-card">
                    <h3 className="id-form-card__title">Lịch sử giao dịch</h3>
                    {walletTxs.length === 0 ? (
                      <p className="db-muted">Chưa có giao dịch nào.</p>
                    ) : (
                      <div
                        className="ad-table-wrap"
                        style={{ border: "none", marginTop: 12 }}
                      >
                        <table className="ad-table">
                          <thead>
                            <tr>
                              <th>Loại</th>
                              <th>Số tiền</th>
                              <th>Số dư sau</th>
                              <th>Ghi chú</th>
                              <th>Ngày</th>
                            </tr>
                          </thead>
                          <tbody>
                            {walletTxs.map((tx) => (
                              <tr key={tx.id}>
                                <td>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      padding: "2px 8px",
                                      borderRadius: 5,
                                      background:
                                        tx.amount > 0
                                          ? "rgba(76,175,130,0.15)"
                                          : "rgba(224,92,92,0.15)",
                                      color:
                                        tx.amount > 0 ? "#4caf82" : "#e05c5c",
                                      border: `0.5px solid ${tx.amount > 0 ? "rgba(76,175,130,0.3)" : "rgba(224,92,92,0.3)"}`,
                                    }}
                                  >
                                    {tx.tx_type_display ?? tx.tx_type}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    fontWeight: 600,
                                    color:
                                      tx.amount > 0 ? "#4caf82" : "#e05c5c",
                                  }}
                                >
                                  {tx.amount > 0 ? "+" : ""}
                                  {formatPrice(tx.amount, "VND")}
                                </td>
                                <td>{formatPrice(tx.balance_after, "VND")}</td>
                                <td className="ad-table__muted">
                                  {tx.note || "—"}
                                </td>
                                <td className="ad-table__muted">
                                  {tx.created_at
                                    ? new Date(
                                        tx.created_at,
                                      ).toLocaleDateString("vi-VN")
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Refund Modal ── */}
      {refundTarget && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRefundTarget(null);
          }}
        >
          <div className="modal modal--md">
            <div className="modal__header">
              <h2 className="modal__title">Yêu cầu hoàn tiền</h2>
              <button
                className="modal__close"
                onClick={() => setRefundTarget(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal__body">
              <p style={{ marginBottom: "0.5rem" }}>
                Khóa học: <strong>{refundTarget.course_title}</strong>
              </p>
              <p style={{ marginBottom: "1rem" }}>
                Giá: <strong>{formatPrice(refundTarget.amount)}</strong>
              </p>
              <p style={{ marginBottom: "1rem" }}>
                Số tiền được hoàn:{" "}
                <strong>
                  {formatPrice(Math.round((refundTarget.amount ?? 0) * 0.7))}
                </strong>
              </p>
              <label className="db-field__label">Lý do hoàn tiền *</label>
              <textarea
                className="db-input db-input--textarea"
                rows={4}
                placeholder="Mô tả lý do bạn muốn hoàn tiền…"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                style={{ marginTop: "0.4rem", marginBottom: "1rem" }}
              />
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className="btn btn--ghost"
                  onClick={() => setRefundTarget(null)}
                >
                  Hủy
                </button>
                <button
                  className="btn btn--primary"
                  onClick={requestRefund}
                  disabled={refundLoading || !refundReason.trim()}
                >
                  {refundLoading ? "Đang gửi…" : "Gửi yêu cầu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Field wrapper ─────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  error?: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, error, fullWidth, children }) => (
  <div className={`db-field${fullWidth ? " db-field--full" : ""}`}>
    <label className="db-field__label">{label}</label>
    <div className="db-field__control">{children}</div>
    {error && <span className="db-field__error">{error}</span>}
  </div>
);

export default StudentDashboard;
