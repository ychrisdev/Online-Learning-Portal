import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatPrice } from "../utils/format";

interface InstructorDashboardProps {
  onNavigate: (page: string, courseId?: string) => void;
  onLogout: () => void;
}

type Tab =
  | "overview"
  | "revenue"
  | "courses"
  | "profile"
  | "sections"
  | "lessons"
  | "quizzes"
  | "payments"
  | "reviews"
  | "enrollments"
  | "wallet"
  | "refunds";
type ChartRange = "3m" | "6m" | "1y";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "profile", label: "Hồ sơ cá nhân" },
  { id: "revenue", label: "Doanh thu" },
  { id: "enrollments", label: "Học viên" },
  { id: "courses", label: "Khóa học" },
  { id: "sections", label: "Chương học" },
  { id: "lessons", label: "Bài học" },
  { id: "quizzes", label: "Bài kiểm tra" },
  { id: "payments", label: "Thanh toán" },
  { id: "reviews", label: "Đánh giá" },
  { id: "wallet", label: "Ví tiền" },
  { id: "refunds", label: "Hoàn tiền" },
];

const STATUS_LABEL: Record<string, string> = {
  success: "Thành công",
  pending: "Chờ xử lý",
  refund_requested: "Yêu cầu hoàn",
  refunded: "Đã hoàn",
  failed: "Thất bại",
};

interface Review {
  id: string;
  student_name: string;
  student_email: string;
  course_title: string;
  rating: number;
  comment: string;
  is_hidden: boolean;
  is_reported: boolean;
  report_reason?: string;
  reported_by_name?: string;
  created_at: string;
  edit_count: number;
  hidden_at?: string;
}

const API = "http://127.0.0.1:8000";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access")}`,
  "Content-Type": "application/json",
});

const toList = (data: any): any[] =>
  Array.isArray(data) ? data : (data?.results ?? []);

const thumbSrc = (t: string | null) =>
  !t ? null : t.startsWith("http") ? t : `${API}${t}`;


// ── Chart tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="id-chart-tooltip">
      <p className="id-chart-tooltip__label">{label}</p>
      {payload.map((p: any) => (
        <p
          key={p.dataKey}
          className="id-chart-tooltip__value"
          style={{ color: p.color }}
        >
          {p.name}:{" "}
          {p.dataKey === "revenue"
            ? formatPrice(p.value, "VND")
            : `${p.value} học viên`}
        </p>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  onNavigate,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [chartRange, setChartRange] = useState<ChartRange>("6m");

    
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Profile ───────────────────────────────────────────────────────────
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    facebook: "",
    linkedin: "",
    youtube: "",
    website: "",
    specializations: "",
    years_experience: "",
    certifications: "",
  });
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    newPw: "",
    confirm: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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

  // ── Course modal states ───────────────────────────────────────────────
  const [categories, setCategories] = useState<any[]>([]);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editCourseForm, setEditCourseForm] = useState({
    title: "",
    description: "",
    level: "beginner",
    price: "",
    discount_percent: "",
    category: "",
    requirements: "",
    what_you_learn: "",
    status: "draft",
    thumbnail: null as File | null,
  });
  const [editCourseLoading, setEditCourseLoading] = useState(false);
  const [editCourseError, setEditCourseError] = useState("");
  const [showCourseModal, setShowCourseModal] = useState(false);

  // ── Real data ─────────────────────────────────────────────────────────
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // ── Course filter states ──────────────────────────────────────────────
  const [courseSearch, setCourseSearch] = useState("");
  const [courseStatusFilter, setCourseStatusFilter] = useState<
    "all" | "draft" | "review" | "published" | "archived"
  >("all");

  // ── Section states ────────────────────────────────────────────────────
  const [sections, setSections] = useState<any[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [filterSectionCourse, setFilterSectionCourse] = useState("");
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState({
    title: "",
    description: "",
    order_index: "",
    course: "",
  });
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState("");

  // ── Lesson states ─────────────────────────────────────────────────────
  type LessonModalType = "add" | "edit" | "delete" | null;
  interface LessonForm {
    title: string;
    section: string;
    video_url: string;
    video_file: File | null;
    content: string;
    attachment: File | null;
    attachment_name: string;
    order_index: number | string;
    is_preview_video: boolean;
    is_preview_article: boolean;
    is_preview_resource: boolean;
    existing_video_url: string;
    existing_attachment: string;
  }
  const EMPTY_LESSON: LessonForm = {
    title: "",
    section: "",
    video_url: "",
    video_file: null,
    content: "",
    attachment: null,
    attachment_name: "",
    order_index: 0,
    is_preview_video: false,
    is_preview_article: false,
    is_preview_resource: false,
    existing_video_url: "",
    existing_attachment: "",
  };
  const [lessons, setLessons] = useState<any[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [lessonModal, setLessonModal] = useState<LessonModalType>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [lessonForm, setLessonForm] = useState<LessonForm>(EMPTY_LESSON);
  const [lessonError, setLessonError] = useState("");
  const [savingLesson, setSavingLesson] = useState(false);
  const [filterLessonSection, setFilterLessonSection] = useState("");
  const [filterLessonCourse, setFilterLessonCourse] = useState("");
  const [modalFilterCourse, setModalFilterCourse] = useState("");

  // ── Quiz states ───────────────────────────────────────────────────────
  type QuizModalType = "add" | "edit" | "delete" | null;
  interface QuizForm {
    lesson: string;
    title: string;
    description: string;
    pass_score: number | string;
    time_limit: number | string;
    max_attempts: number | string;
  }
  interface QuestionForm {
    content: string;
    question_type: string;
    points: number | string;
    explanation: string;
    order_index: number | string;
    answers: { content: string; is_correct: boolean; order_index: number }[];
  }
  const EMPTY_QUIZ: QuizForm = {
    lesson: "",
    title: "",
    description: "",
    pass_score: 70,
    time_limit: 0,
    max_attempts: 0,
  };
  const EMPTY_QUESTION: QuestionForm = {
    content: "",
    question_type: "single",
    points: 1,
    explanation: "",
    order_index: 0,
    answers: [
      { content: "", is_correct: false, order_index: 0 },
      { content: "", is_correct: false, order_index: 1 },
    ],
  };
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [quizModal, setQuizModal] = useState<QuizModalType>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [quizForm, setQuizForm] = useState<QuizForm>(EMPTY_QUIZ);
  const [quizError, setQuizError] = useState("");
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [filterQuizLesson, setFilterQuizLesson] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [questionModal, setQuestionModal] = useState<
    "add" | "edit" | "delete" | null
  >(null);
  const [selectedQ, setSelectedQ] = useState<any>(null);
  const [questionForm, setQuestionForm] =
    useState<QuestionForm>(EMPTY_QUESTION);
  const [questionError, setQuestionError] = useState("");
  const [savingQ, setSavingQ] = useState(false);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [attemptModal, setAttemptModal] = useState<"list" | "detail" | null>(
    null,
  );
  const [selectedQuizForAttempt, setSelectedQuizForAttempt] =
    useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [loadingAttemptDetail, setLoadingAttemptDetail] = useState(false);

  // ── Enrollment states ─────────────────────────────────────────────────────
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [searchEnrollment, setSearchEnrollment] = useState("");
  const [filterEnrollStatus, setFilterEnrollStatus] = useState("");

  const filteredEnrollments = useMemo(() => {
    const q = searchEnrollment.toLowerCase().trim();
    return enrollments.filter((e) => {
      const matchSearch =
        !q ||
        (e.student_name ?? "").toLowerCase().includes(q) ||
        (e.course_title ?? "").toLowerCase().includes(q);
      const matchStatus =
        !filterEnrollStatus || (e.status ?? "") === filterEnrollStatus;
      return matchSearch && matchStatus;
    });
  }, [enrollments, searchEnrollment, filterEnrollStatus]);

  // ── Payment states ────────────────────────────────────────────────────────
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [searchPayment, setSearchPayment] = useState("");
  const [filterPayStatus, setFilterPayStatus] = useState("");
  const [paymentDetail, setPaymentDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const filteredPayments = useMemo(
    () =>
      payments.filter((p) => {
        const q = searchPayment.toLowerCase().trim();
        const matchSearch =
          !q ||
          (p.student_name ?? "").toLowerCase().includes(q) ||
          (p.course_title ?? "").toLowerCase().includes(q);
        const matchStatus = !filterPayStatus || p.status === filterPayStatus;
        return matchSearch && matchStatus;
      }),
    [payments, searchPayment, filterPayStatus],
  );

  // ── Review states ──────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [searchReview, setSearchReview] = useState("");
  const [filterReviewRating, setFilterReviewRating] = useState("");
  const [filterReviewCourse, setFilterReviewCourse] = useState("");
  const [reviewModal, setReviewModal] = useState<"view" | "delete" | null>(
    null,
  );
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [togglingReview, setTogglingReview] = useState(false);

  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportingReview, setReportingReview] = useState<Review | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  const blockNegative = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
      e.preventDefault();
    }
  };

  const toPositiveInt = (val: string) => {
    const n = parseInt(val, 10);
    return isNaN(n) || n < 0 ? "" : String(n);
  };

  const filteredReviews = useMemo(
    () =>
      reviews.filter((r) => {
        const q = searchReview.toLowerCase().trim();
        const matchSearch =
          !q ||
          (r.student_name ?? "").toLowerCase().includes(q) ||
          (r.course_title ?? "").toLowerCase().includes(q) ||
          (r.comment ?? "").toLowerCase().includes(q);
        const matchRating =
          !filterReviewRating || String(r.rating) === filterReviewRating;
        const matchCourse =
          !filterReviewCourse ||
          (r.course_title ?? "")
            .toLowerCase()
            .includes(filterReviewCourse.toLowerCase());
        return matchSearch && matchRating && matchCourse;
      }),
    [reviews, searchReview, filterReviewRating, filterReviewCourse],
  );

  // ── State wallet ─────────────────────────────────────────────────────
  const [wallet, setWallet]               = useState<any>(null);
  const [walletTxs, setWalletTxs]         = useState<any[]>([]);
  const [withdrawals, setWithdrawals]     = useState<any[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [withdrawForm, setWithdrawForm]   = useState({
    amount: '', bank_name: '', bank_account: '', account_name: ''
  });
  const [withdrawing, setWithdrawing]     = useState(false);
  const [walletError, setWalletError]     = useState('');
  const [walletSuccess, setWalletSuccess] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing]       = useState(false);
  const [depositError, setDepositError]   = useState('');
  const [depositSuccess, setDepositSuccess] = useState('');
  const [refundRequests, setRefundRequests]     = useState<any[]>([]);
  const [loadingRefunds, setLoadingRefunds]     = useState(false);
  const [confirmingRefund, setConfirmingRefund] = useState<string | null>(null);
  const [refundShortage, setRefundShortage]     = useState<any>(null);
  const [walletPanel, setWalletPanel] = useState<'deposit' | 'withdraw' | null>(null);

  // ── Fetch profile ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/api/auth/me/`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        localStorage.clear();
        onNavigate("auth");
        return;
      }
      const data = await res.json();
      setUser(data);
      if (data.avatar) {
        setAvatarUrl(
          data.avatar.startsWith("http") ? data.avatar : `${API}${data.avatar}`,
        );
      }
      setProfileForm({
        name: data.full_name ?? "",
        title: data.instructor_profile?.title ?? "",
        email: data.email ?? "",
        phone: data.instructor_profile?.phone_number ?? "",
        location: data.location ?? "",
        bio: data.bio ?? "",
        facebook: data.social?.facebook ?? "",
        linkedin: data.instructor_profile?.linkedin_url ?? "",
        youtube: data.instructor_profile?.youtube_url ?? "",
        website: data.instructor_profile?.website_url ?? "",
        specializations: data.instructor_profile?.specializations ?? "",
        years_experience: String(
          data.instructor_profile?.years_experience ?? "",
        ),
        certifications: data.instructor_profile?.certifications ?? "",
      });
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingCourses(true);
      try {
        const res = await fetch(`${API}/api/courses/mine/`, {
          headers: authHeaders(),
        });
        if (res.ok) setCourses(toList(await res.json()));
      } catch (_) {}
      setLoadingCourses(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/courses/categories/`, {
          headers: authHeaders(),
        });
        if (res.ok) setCategories(toList(await res.json()));
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    if (courses.length === 0) return;
    (async () => {
      setLoadingStudents(true);
      try {
        const allResults = await Promise.all(
          courses.map((c) =>
            fetch(`${API}/api/enrollments/instructor/${c.id}/students/`, {
              headers: authHeaders(),
            })
              .then((r) => (r.ok ? r.json() : []))
              .then((data) =>
                toList(data).map((item: any) => ({ id: item.id })),
              ),
          ),
        );
        const merged = allResults.flat();
        const unique = merged.filter(
          (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i,
        );
        setStudents(unique);
      } catch (_) {}
      setLoadingStudents(false);
    })();
  }, [courses]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${API}/api/payments/analytics/revenue/monthly/`,
          { headers: authHeaders() },
        );
        if (res.ok) setMonthlyData(toList(await res.json()));
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    if (activeTab !== "sections") return;
    (async () => {
      setLoadingSections(true);
      try {
        const res = await fetch(`${API}/api/courses/mine/sections/`, {
          headers: authHeaders(),
        });
        if (res.ok) setSections(toList(await res.json()));
      } catch (_) {}
      setLoadingSections(false);
    })();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "lessons" && activeTab !== "quizzes") return;
    (async () => {
      setLoadingLessons(true);
      try {
        const url = filterLessonSection
          ? `${API}/api/courses/mine/lessons/?section=${filterLessonSection}`
          : `${API}/api/courses/mine/lessons/`;
        const res = await fetch(url, { headers: authHeaders() });
        if (res.ok) setLessons(toList(await res.json()));
      } catch (_) {}
      setLoadingLessons(false);
    })();
  }, [activeTab, filterLessonSection]);

  useEffect(() => {
    if (activeTab !== "quizzes") return;
    (async () => {
      setLoadingQuizzes(true);
      try {
        const res = await fetch(`${API}/api/quizzes/mine/`, {
          headers: authHeaders(),
        });
        if (res.ok) setQuizzes(toList(await res.json()));
      } catch (_) {}
      setLoadingQuizzes(false);
    })();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "enrollments") return;
    (async () => {
      setLoadingEnrollments(true);
      try {
        const res = await fetch(`${API}/api/enrollments/instructor/`, {
          headers: authHeaders(),
        });
        if (res.ok) setEnrollments(toList(await res.json()));
      } catch (_) {}
      setLoadingEnrollments(false);
    })();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "payments") return;
    (async () => {
      setLoadingPayments(true);
      try {
        const res = await fetch(`${API}/api/payments/instructor/`, {
          headers: authHeaders(),
        });
        if (res.ok) setPayments(toList(await res.json()));
      } catch (_) {}
      setLoadingPayments(false);
    })();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "reviews") return;
    (async () => {
      setLoadingReviews(true);
      try {
        const res = await fetch(`${API}/api/courses/reviews/mine/`, {
          headers: authHeaders(),
        });
        if (res.ok) setReviews(toList(await res.json()));
      } catch (_) {}
      setLoadingReviews(false);
    })();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "wallet") return;
    (async () => {
      setLoadingWallet(true);
      try {
        const [walletRes, txRes, wdRes] = await Promise.all([
          fetch(`${API}/api/wallet/`,              { headers: authHeaders() }),
          fetch(`${API}/api/wallet/transactions/`, { headers: authHeaders() }),
          fetch(`${API}/api/wallet/withdrawals/`,  { headers: authHeaders() }),
        ]);
        if (walletRes.ok) setWallet(await walletRes.json());
        if (txRes.ok)     setWalletTxs(toList(await txRes.json()));
        if (wdRes.ok)     setWithdrawals(toList(await wdRes.json()));
      } catch (_) {}
      setLoadingWallet(false);
    })();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "refunds") return;  // ← đổi thành "refunds"
    (async () => {
      setLoadingRefunds(true);
      try {
        const res = await fetch(`${API}/api/payments/instructor/`, { headers: authHeaders() });
        if (res.ok) {
          const list = toList(await res.json());
          setRefundRequests(list.filter((p: any) => p.status === 'refund_approved'));
        }
      } catch (_) {}
      setLoadingRefunds(false);
    })();
  }, [activeTab]);

  //=======
  const handleWithdraw = async () => {
    const amount = parseInt(withdrawForm.amount);
    if (!amount || amount < 50000)         { setWalletError('Số tiền rút tối thiểu 50,000đ'); return; }
    if (!withdrawForm.bank_name.trim())    { setWalletError('Vui lòng nhập tên ngân hàng'); return; }
    if (!withdrawForm.bank_account.trim()) { setWalletError('Vui lòng nhập số tài khoản'); return; }
    if (!withdrawForm.account_name.trim()) { setWalletError('Vui lòng nhập tên chủ tài khoản'); return; }
    setWithdrawing(true); setWalletError(''); setWalletSuccess('');
    try {
      const res = await fetch(`${API}/api/wallet/withdraw/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ...withdrawForm, amount }),
      });
      if (res.ok) {
        setWalletSuccess('Yêu cầu rút tiền đã được gửi!');
        setWithdrawForm({ amount: '', bank_name: '', bank_account: '', account_name: '' });
        // Refresh
        const [walletRes, txRes, wdRes] = await Promise.all([
          fetch(`${API}/api/wallet/`,              { headers: authHeaders() }),
          fetch(`${API}/api/wallet/transactions/`, { headers: authHeaders() }),
          fetch(`${API}/api/wallet/withdrawals/`,  { headers: authHeaders() }),
        ]);
        if (walletRes.ok) setWallet(await walletRes.json());
        if (txRes.ok)     setWalletTxs(toList(await txRes.json()));
        if (wdRes.ok)     setWithdrawals(toList(await wdRes.json()));
      } else {
        const err = await res.json();
        setWalletError(err.detail ?? 'Rút tiền thất bại.');
      }
    } catch (_) { setWalletError('Lỗi kết nối.'); }
    setWithdrawing(false);
  };

  const openViewReview = (r: any) => {
    setSelectedReview(r);
    setReviewModal("view");
  };
  const closeReviewModal = () => {
    setReviewModal(null);
    setSelectedReview(null);
  };

  // Mở modal báo cáo
  const openReportModal = (review: Review) => {
    setReportingReview(review);
    setReportReason("");
    setReportModal(true);
  };

  // Gửi báo cáo lên API
  const handleSubmitReport = async () => {
    if (!reportingReview) return;
    setSubmittingReport(true);
    try {
      const token = localStorage.getItem("access"); // hoặc tên key bạn đang dùng
      console.log("Token:", token);
      const res = await fetch(
        `${API}/api/courses/reviews/report/${reportingReview.id}/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: reportReason.trim() }),
        },
      );
      if (!res.ok) throw new Error("Failed");
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reportingReview.id ? { ...r, is_reported: true } : r,
        ),
      );
      setReportModal(false);
      setReportingReview(null);
    } catch {
      alert("Gửi báo cáo thất bại, thử lại sau.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleToggleHide = async (review: any) => {
    setTogglingReview(true);
    try {
      const res = await fetch(
        `${API}/api/courses/reviews/admin/${review.id}/toggle-hide/`,
        { method: "POST", headers: authHeaders() },
      );
      if (res.ok) {
        const updated = await res.json();
        setReviews((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
        if (selectedReview?.id === updated.id) setSelectedReview(updated);
      }
    } catch (_) {}
    setTogglingReview(false);
  };

  const openPaymentDetail = async (id: string) => {
    setShowPaymentModal(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API}/api/payments/instructor/${id}/`, {
        headers: authHeaders(),
      });
      if (res.ok) setPaymentDetail(await res.json());
      else setPaymentDetail(null);
    } catch (_) {
      setPaymentDetail(null);
    }
    setLoadingDetail(false);
  };

  const closePaymentDetail = () => {
    setShowPaymentModal(false);
    setPaymentDetail(null);
  };

  // ── Derived stats ─────────────────────────────────────────────────────
  const totalRevenue = courses.reduce((a, c) => {
    const price = Number(c.sale_price) || Number(c.price) || 0;
    const studs = Number(c.total_students) || 0;
    return a + price * studs;
  }, 0);

  const avgRating = user?.instructor_profile?.avg_rating
    ? Number(user.instructor_profile.avg_rating).toFixed(1)
    : "—";

  // ── Filtered courses ──────────────────────────────────────────────────
  const filteredCourses = useMemo(
    () =>
      courses.filter((c) => {
        const matchSearch = c.title
          .toLowerCase()
          .includes(courseSearch.toLowerCase());
        const matchStatus =
          courseStatusFilter === "all" || c.status === courseStatusFilter;
        return matchSearch && matchStatus;
      }),
    [courses, courseSearch, courseStatusFilter],
  );

  // ── Chart data ────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (monthlyData.length === 0) return [];
    if (chartRange === "3m") return monthlyData.slice(-3);
    if (chartRange === "6m") return monthlyData.slice(-6);
    return monthlyData;
  }, [monthlyData, chartRange]);

  const chartTotalRevenue = chartData.reduce(
    (a: number, b: any) => a + (b.revenue ?? 0),
    0,
  );
  const chartTotalEnrollments = chartData.reduce(
    (a: number, b: any) => a + (b.enrollments ?? 0),
    0,
  );

  // ── Thumb preview URL ─────────────────────────────────────────────────
  const thumbPreviewUrl = useMemo(
    () =>
      editCourseForm.thumbnail
        ? URL.createObjectURL(editCourseForm.thumbnail)
        : null,
    [editCourseForm.thumbnail],
  );

  // ── Preview sale price ────────────────────────────────────────────────
  const previewSalePrice = () => {
    const price = Number(editCourseForm.price) || 0;
    const discount = Number(editCourseForm.discount_percent) || 0;
    if (price === 0) return "Miễn phí";
    if (discount <= 0) return formatPrice(price, "VND");
    return formatPrice(Math.round(price * (1 - discount / 100)), "VND");
  };

  // ── Open edit modal ───────────────────────────────────────────────────
  const openEditCourse = async (c: any) => {
    setEditCourseError("");
    setEditingCourseId(c.id);
    setShowCourseModal(true);
    setEditCourseLoading(true);
    try {
      const res = await fetch(`${API}/api/courses/mine/${c.id}/`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const d = await res.json();
        setEditCourseForm({
          title: d.title ?? "",
          description: d.description ?? "",
          level: d.level ?? "beginner",
          price: String(d.price ?? ""),
          discount_percent: String(d.discount_percent ?? ""),
          category: String(
            typeof d.category === "object"
              ? (d.category?.id ?? "")
              : (d.category ?? ""),
          ),
          requirements: d.requirements ?? "",
          what_you_learn: d.what_you_learn ?? "",
          status: d.status ?? "draft",
          thumbnail: null,
        });
      }
    } catch (_) {}
    setEditCourseLoading(false);
  };

  // ── Save course ───────────────────────────────────────────────────────
  const handleSaveCourse = async () => {
    if (!editCourseForm.title.trim()) {
      setEditCourseError("Vui lòng nhập tên khóa học.");
      return;
    }
    setEditCourseLoading(true);
    setEditCourseError("");
    try {
      const hasNewThumb = Boolean(editCourseForm.thumbnail);
      let body: FormData | string;
      let headers: Record<string, string>;

      if (hasNewThumb) {
        const fd = new FormData();
        fd.append("title", editCourseForm.title.trim());
        fd.append("description", editCourseForm.description.trim());
        fd.append("price", String(Number(editCourseForm.price)));
        fd.append(
          "discount_percent",
          String(Number(editCourseForm.discount_percent)),
        );
        fd.append("level", editCourseForm.level);
        fd.append("status", editCourseForm.status);
        fd.append("requirements", editCourseForm.requirements.trim());
        fd.append("what_you_learn", editCourseForm.what_you_learn.trim());
        if (editCourseForm.category)
          fd.append("category", editCourseForm.category);
        if (editCourseForm.thumbnail)
          fd.append("thumbnail", editCourseForm.thumbnail);
        body = fd;
        headers = { Authorization: `Bearer ${localStorage.getItem("access")}` };
      } else {
        const payload: Record<string, any> = {
          title: editCourseForm.title.trim(),
          description: editCourseForm.description.trim(),
          price: Number(editCourseForm.price),
          discount_percent: Number(editCourseForm.discount_percent),
          level: editCourseForm.level,
          status: editCourseForm.status,
          requirements: editCourseForm.requirements.trim(),
          what_you_learn: editCourseForm.what_you_learn.trim(),
        };
        if (editCourseForm.category) payload.category = editCourseForm.category;
        body = JSON.stringify(payload);
        headers = authHeaders();
      }

      const isNew = !editingCourseId;
      const url = isNew
        ? `${API}/api/courses/mine/`
        : `${API}/api/courses/mine/${editingCourseId}/`;

      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers,
        body,
      });

      if (res.ok) {
        // Fetch lại course đầy đủ từ list serializer
        const refreshed = await fetch(`${API}/api/courses/mine/`, {
          headers: authHeaders(),
        });
        if (refreshed.ok) {
          const data = await refreshed.json();
          setCourses(data.results ?? data);
        }
        setEditingCourseId(null);
        setShowCourseModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setEditCourseError(
          err?.detail ??
            Object.values(err).flat().join(", ") ??
            "Lưu thất bại. Vui lòng thử lại.",
        );
      }
    } catch {
      setEditCourseError("Lỗi kết nối. Vui lòng thử lại.");
    }
    setEditCourseLoading(false);
  };

  const closeModal = () => {
    setEditingCourseId(null);
    setShowCourseModal(false);
    setEditCourseError("");
  };

  // ── Profile save ──────────────────────────────────────────────────────
  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      await fetch(`${API}/api/auth/me/`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          full_name: profileForm.name,
          bio: profileForm.bio,
          email: profileForm.email,
        }),
      });
      await fetch(`${API}/api/auth/profile/instructor/`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          title: profileForm.title,
          phone_number: profileForm.phone,
          linkedin_url: profileForm.linkedin,
          youtube_url: profileForm.youtube,
          website_url: profileForm.website,
          specializations: profileForm.specializations,
          years_experience: Number(profileForm.years_experience) || 0,
          certifications: profileForm.certifications,
        }),
      });
      setProfileEditing(false);
    } catch (_) {}
    setProfileSaving(false);
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess(false);
    if (!passwordForm.current) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (passwordForm.newPw.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (passwordForm.newPw !== passwordForm.confirm) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch(`${API}/api/auth/change-password/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          old_password: passwordForm.current,
          new_password: passwordForm.newPw,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPasswordError(
          err?.old_password?.[0] ??
            err?.new_password?.[0] ??
            err?.detail ??
            "Đổi mật khẩu thất bại.",
        );
      } else {
        setPasswordSuccess(true);
        setPasswordForm({ current: "", newPw: "", confirm: "" });
      }
    } catch (_) {
      setPasswordError("Lỗi kết nối. Vui lòng thử lại.");
    }
    setPasswordSaving(false);
  };

  //Section
  const openAddSection = () => {
    setEditingSectionId(null);
    setSectionForm({
      title: "",
      description: "",
      order_index: "",
      course: filterSectionCourse || "",
    });
    setSectionError("");
    setShowSectionModal(true);
  };

  const openEditSection = (s: any) => {
    setEditingSectionId(s.id);
    setSectionForm({
      title: s.title ?? "",
      description: s.description ?? "",
      order_index: String(s.order_index ?? ""),
      course: String(s.course?.id ?? s.course ?? ""),
    });
    setSectionError("");
    setShowSectionModal(true);
  };

  const handleSaveSection = async () => {
    if (!sectionForm.title.trim()) {
      setSectionError("Vui lòng nhập tên chương.");
      return;
    }
    if (!sectionForm.course) {
      setSectionError("Vui lòng chọn khóa học.");
      return;
    }
    setSectionLoading(true);
    setSectionError("");
    try {
      const payload = {
        title: sectionForm.title.trim(),
        description: sectionForm.description.trim(),
        order_index: Number(sectionForm.order_index) || 0,
        course: sectionForm.course,
      };
      const isNew = !editingSectionId;
      const method = isNew ? "POST" : "PATCH";
      const url = isNew
        ? `${API}/api/courses/mine/sections/`
        : `${API}/api/courses/mine/sections/${editingSectionId}/`;
      const res = await fetch(url, {
        method,
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        if (isNew) setSections((prev) => [...prev, saved]);
        else
          setSections((prev) =>
            prev.map((s) =>
              s.id === editingSectionId ? { ...s, ...saved } : s,
            ),
          );
        setShowSectionModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setSectionError(
          err?.detail ??
            Object.values(err).flat().join(", ") ??
            "Lưu thất bại.",
        );
      }
    } catch (_) {
      setSectionError("Lỗi kết nối.");
    }
    setSectionLoading(false);
  };

  const handleDeleteSection = async (s: any) => {
    if (!confirm(`Xóa chương "${s.title}"?`)) return;
    try {
      const res = await fetch(`${API}/api/courses/mine/sections/${s.id}/`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok || res.status === 204)
        setSections((prev) => prev.filter((x) => x.id !== s.id));
    } catch (_) {}
  };

  const openAddLesson = (sectionId = "") => {
    setLessonForm({ ...EMPTY_LESSON, section: sectionId });
    setLessonError("");
    setSelectedLesson(null);
    setModalFilterCourse("");
    setLessonModal("add");
  };

  const openEditLesson = (l: any) => {
    const sec = sections.find((s) => s.id === (l.section?.id ?? l.section));
    setModalFilterCourse(String(sec?.course?.id ?? sec?.course ?? ""));
    setLessonError("");
    setSelectedLesson(l);
    setLessonForm({
      title: l.title ?? "",
      section: String(l.section?.id ?? l.section ?? ""),
      video_url: l.video_url ?? "",
      video_file: null,
      content: l.content ?? "",
      attachment: null,
      attachment_name: l.attachment_name ?? "",
      order_index: l.order_index ?? 0,
      is_preview_video: Boolean(l.is_preview_video),
      is_preview_article: Boolean(l.is_preview_article),
      is_preview_resource: Boolean(l.is_preview_resource),
      existing_video_url: l.video_file ?? "",
      existing_attachment: l.attachment ?? "",
    });
    setLessonModal("edit");
  };

  const closeLessonModal = () => {
    setLessonModal(null);
    setSelectedLesson(null);
    setLessonError("");
    setModalFilterCourse("");
  };

  const handleSaveLesson = async () => {
    if (!String(lessonForm.title).trim()) {
      setLessonError("Tên bài học không được để trống.");
      return;
    }
    if (!lessonForm.section) {
      setLessonError("Vui lòng chọn chương.");
      return;
    }
    setSavingLesson(true);
    setLessonError("");
    try {
      const deletingVideo =
        lessonModal === "edit" &&
        !lessonForm.existing_video_url &&
        !lessonForm.video_file;
      const deletingAttachment =
        lessonModal === "edit" &&
        !lessonForm.existing_attachment &&
        !lessonForm.attachment;
      const hasFile =
        lessonForm.video_file ||
        lessonForm.attachment ||
        deletingVideo ||
        deletingAttachment;
      let body: FormData | string;
      let headers: Record<string, string>;
      if (hasFile) {
        const fd = new FormData();
        fd.append("title", String(lessonForm.title).trim());
        fd.append("section", lessonForm.section);
        fd.append("video_url", lessonForm.video_url);
        fd.append("content", lessonForm.content);
        fd.append("attachment_name", lessonForm.attachment_name);
        fd.append("order_index", String(Number(lessonForm.order_index)));
        fd.append(
          "is_preview_video",
          lessonForm.is_preview_video ? "True" : "False",
        );
        fd.append(
          "is_preview_article",
          lessonForm.is_preview_article ? "True" : "False",
        );
        fd.append(
          "is_preview_resource",
          lessonForm.is_preview_resource ? "True" : "False",
        );
        if (lessonForm.video_file)
          fd.append("video_file", lessonForm.video_file);
        else if (deletingVideo) fd.append("video_file", "");
        if (lessonForm.attachment)
          fd.append("attachment", lessonForm.attachment);
        else if (deletingAttachment) fd.append("attachment", "");
        body = fd;
        headers = { Authorization: `Bearer ${localStorage.getItem("access")}` };
      } else {
        body = JSON.stringify({
          title: String(lessonForm.title).trim(),
          section: lessonForm.section,
          video_url: lessonForm.video_url,
          content: lessonForm.content,
          attachment_name: lessonForm.attachment_name,
          order_index: Number(lessonForm.order_index),
          is_preview_video: lessonForm.is_preview_video,
          is_preview_article: lessonForm.is_preview_article,
          is_preview_resource: lessonForm.is_preview_resource,
        });
        headers = authHeaders();
      }
      const isNew = lessonModal === "add";
      const url = isNew
        ? `${API}/api/courses/mine/lessons/`
        : `${API}/api/courses/mine/lessons/${selectedLesson.id}/`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers,
        body,
      });
      if (res.ok) {
        // Refresh lessons
        const refreshUrl = filterLessonSection
          ? `${API}/api/courses/mine/lessons/?section=${filterLessonSection}`
          : `${API}/api/courses/mine/lessons/`;
        const r = await fetch(refreshUrl, { headers: authHeaders() });
        if (r.ok) setLessons(toList(await r.json()));
        closeLessonModal();
      } else {
        const err = await res.json().catch(() => ({}));
        setLessonError(
          err?.detail ?? err?.title?.[0] ?? `Lỗi HTTP ${res.status}`,
        );
      }
    } catch (_) {
      setLessonError("Lỗi kết nối.");
    }
    setSavingLesson(false);
  };

  const handleDeleteLesson = async () => {
    if (!selectedLesson) return;
    setSavingLesson(true);
    try {
      const res = await fetch(
        `${API}/api/courses/mine/lessons/${selectedLesson.id}/`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );
      if (res.ok || res.status === 204) {
        setLessons((prev) => prev.filter((l) => l.id !== selectedLesson.id));
        closeLessonModal();
      } else setLessonError("Xóa thất bại.");
    } catch (_) {
      setLessonError("Lỗi kết nối.");
    }
    setSavingLesson(false);
  };

  // ── Quiz fetch ────────────────────────────────────────────────────────
  const fetchQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      const res = await fetch(`${API}/api/quizzes/mine/`, {
        headers: authHeaders(),
      });
      if (res.ok) setQuizzes(toList(await res.json()));
    } catch (_) {}
    setLoadingQuizzes(false);
  };

  const fetchQuestions = async (quizId: string) => {
    setLoadingQ(true);
    try {
      const res = await fetch(`${API}/api/quizzes/${quizId}/questions/`, {
        headers: authHeaders(),
      });
      if (res.ok) setQuestions(toList(await res.json()));
    } catch (_) {}
    setLoadingQ(false);
  };

  const fetchAttempts = async (quizId: string) => {
    setLoadingAttempts(true);
    try {
      const res = await fetch(`${API}/api/quizzes/${quizId}/attempts/all/`, {
        headers: authHeaders(),
      });
      if (res.ok) setAttempts(toList(await res.json()));
      else setAttempts([]);
    } catch (_) {
      setAttempts([]);
    }
    setLoadingAttempts(false);
  };

  // ── Attempt ───────────────────────────────────────────────────────────
  const openAttemptList = (quiz: any) => {
    setSelectedQuizForAttempt(quiz);
    setAttempts([]);
    setSelectedAttempt(null);
    setAttemptModal("list");
    fetchAttempts(quiz.id);
  };

  const openAttemptDetail = async (attempt: any) => {
    setSelectedAttempt(attempt);
    setAttemptModal("detail");
    if (!attempt.questions) {
      setLoadingAttemptDetail(true);
      try {
        const res = await fetch(
          `${API}/api/quizzes/${selectedQuizForAttempt?.id ?? attempt.quiz_id}/questions/`,
          { headers: authHeaders() },
        );
        if (res.ok) {
          const qs = toList(await res.json());
          setSelectedAttempt((prev: any) => ({ ...prev, _questions: qs }));
        }
      } catch (_) {}
      setLoadingAttemptDetail(false);
    }
  };

  const closeAttemptModal = () => {
    setAttemptModal(null);
    setSelectedQuizForAttempt(null);
    setAttempts([]);
    setSelectedAttempt(null);
  };

  const backToAttemptList = () => {
    setSelectedAttempt(null);
    setAttemptModal("list");
  };

  // ── Quiz CRUD ─────────────────────────────────────────────────────────
  const openAddQuiz = () => {
    setQuizForm({ ...EMPTY_QUIZ });
    setQuizError("");
    setSelectedQuiz(null);
    setQuizModal("add");
  };
  const openEditQuiz = (q: any) => {
    setSelectedQuiz(q);
    setQuizForm({
      lesson: String(q.lesson?.id ?? q.lesson ?? ""),
      title: q.title ?? "",
      description: q.description ?? "",
      pass_score: q.pass_score ?? 70,
      time_limit: q.time_limit ?? 0,
      max_attempts: q.max_attempts ?? 0,
    });
    setQuizError("");
    setQuizModal("edit");
  };
  const openDeleteQuiz = (q: any) => {
    setSelectedQuiz(q);
    setQuizError("");
    setQuizModal("delete");
  };
  const closeQuizModal = () => {
    setQuizModal(null);
    setSelectedQuiz(null);
    setQuizError("");
  };

  const handleSaveQuiz = async () => {
    if (!quizForm.lesson) {
      setQuizError("Vui lòng chọn bài học.");
      return;
    }
    if (!String(quizForm.title).trim()) {
      setQuizError("Tên không được để trống.");
      return;
    }
    setSavingQuiz(true);
    setQuizError("");
    try {
      const payload = {
        lesson: quizForm.lesson,
        title: String(quizForm.title).trim(),
        description: String(quizForm.description).trim(),
        pass_score: Number(quizForm.pass_score),
        time_limit: Number(quizForm.time_limit),
        max_attempts: Number(quizForm.max_attempts),
      };
      const url =
        quizModal === "add"
          ? `${API}/api/quizzes/`
          : `${API}/api/quizzes/${selectedQuiz.id}/`;
      const method = quizModal === "add" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchQuizzes();
        closeQuizModal();
      } else {
        const err = await res.json().catch(() => ({}));
        setQuizError(err?.detail ?? `Lỗi HTTP ${res.status}`);
      }
    } catch (_) {
      setQuizError("Lỗi kết nối.");
    }
    setSavingQuiz(false);
  };

  const handleDeleteQuiz = async () => {
    if (!selectedQuiz) return;
    setSavingQuiz(true);
    try {
      const res = await fetch(`${API}/api/quizzes/mine/${selectedQuiz.id}/`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok || res.status === 204) {
        fetchQuizzes();
        closeQuizModal();
      } else setQuizError("Xóa thất bại.");
    } catch (_) {
      setQuizError("Lỗi kết nối.");
    }
    setSavingQuiz(false);
  };

  // ── Question CRUD ─────────────────────────────────────────────────────
  const openAddQuestion = (quizId: string) => {
    setQuestionForm({ ...EMPTY_QUESTION });
    setQuestionError("");
    setSelectedQ(null);
    setQuestionModal("add");
    setExpandedQuizId(quizId);
  };
  const openEditQuestion = (q: any) => {
    setSelectedQ(q);
    setQuestionForm({
      content: q.content ?? "",
      question_type: q.question_type ?? "single",
      points: q.points ?? 1,
      explanation: q.explanation ?? "",
      order_index: q.order_index ?? 0,
      answers:
        q.answers?.map((a: any) => ({
          content: a.content ?? "",
          is_correct: a.is_correct ?? false,
          order_index: a.order_index ?? 0,
        })) ?? [],
    });
    setQuestionError("");
    setQuestionModal("edit");
  };
  const openDeleteQuestion = (q: any) => {
    setSelectedQ(q);
    setQuestionError("");
    setQuestionModal("delete");
  };
  const closeQuestionModal = () => {
    setQuestionModal(null);
    setSelectedQ(null);
    setQuestionError("");
  };

  const handleSaveQuestion = async () => {
    if (!String(questionForm.content).trim()) {
      setQuestionError("Nội dung không được để trống.");
      return;
    }
    if (questionForm.answers.length < 2) {
      setQuestionError("Cần ít nhất 2 đáp án.");
      return;
    }
    if (!questionForm.answers.some((a) => a.is_correct)) {
      setQuestionError("Cần ít nhất 1 đáp án đúng.");
      return;
    }
    setSavingQ(true);
    setQuestionError("");
    try {
      const payload = {
        content: String(questionForm.content).trim(),
        question_type: questionForm.question_type,
        points: Number(questionForm.points),
        explanation: String(questionForm.explanation).trim(),
        order_index: Number(questionForm.order_index),
        answers: questionForm.answers.map((a, i) => ({ ...a, order_index: i })),
      };
      const url =
        questionModal === "add"
          ? `${API}/api/quizzes/${expandedQuizId}/questions/`
          : `${API}/api/quizzes/questions/${selectedQ.id}/`;
      const method = questionModal === "add" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (expandedQuizId) fetchQuestions(expandedQuizId);
        closeQuestionModal();
      } else {
        const err = await res.json().catch(() => ({}));
        setQuestionError(err?.detail ?? `Lỗi HTTP ${res.status}`);
      }
    } catch (_) {
      setQuestionError("Lỗi kết nối.");
    }
    setSavingQ(false);
  };

  const handleDeleteQuestion = async () => {
    if (!selectedQ) return;
    setSavingQ(true);
    try {
      const res = await fetch(`${API}/api/quizzes/questions/${selectedQ.id}/`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok || res.status === 204) {
        if (expandedQuizId) fetchQuestions(expandedQuizId);
        closeQuestionModal();
      } else setQuestionError("Xóa thất bại.");
    } catch (_) {
      setQuestionError("Lỗi kết nối.");
    }
    setSavingQ(false);
  };

  const handleDeposit = async () => {
    const amount = parseInt(depositAmount);
    if (!amount || amount < 10000) { setDepositError('Tối thiểu 10,000đ'); return; }
    setDepositing(true); setDepositError(''); setDepositSuccess('');
    try {
      const res = await fetch(`${API}/api/wallet/deposit/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setWallet((w: any) => ({ ...w, balance: data.balance }));
        setDepositAmount('');
        setDepositSuccess('Nạp tiền thành công!');
        const txRes = await fetch(`${API}/api/wallet/transactions/`, { headers: authHeaders() });
        if (txRes.ok) setWalletTxs(toList(await txRes.json()));
      } else {
        const err = await res.json();
        setDepositError(err.detail ?? 'Nạp tiền thất bại.');
      }
    } catch (_) { setDepositError('Lỗi kết nối.'); }
    setDepositing(false);
  };

  const handleConfirmRefund = async (id: string) => {
    setConfirmingRefund(id); setRefundShortage(null);
    try {
      const res = await fetch(`${API}/api/payments/instructor/${id}/confirm-refund/`, {
        method: 'POST', headers: authHeaders(),
      });
      if (res.ok) {
        setRefundRequests(prev => prev.filter(r => r.id !== id));
        setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'refunded' } : p));
        const walletRes = await fetch(`${API}/api/wallet/`, { headers: authHeaders() });
        if (walletRes.ok) setWallet(await walletRes.json());
        showToast('✓ Hoàn tiền thành công!', 'success');  // ← thêm
      } else {
        const err = await res.json();
        setRefundShortage({ id, ...err });
        showToast('⚠ ' + (err.detail ?? 'Hoàn tiền thất bại.'), 'error');  // ← thêm
      }
    } catch (_) {
      showToast('⚠ Lỗi kết nối, thử lại sau.', 'error');  // ← thêm
    }
    setConfirmingRefund(null);
  };

  const renderAttemptModal = () => {
    if (!attemptModal) return null;

    // ── Danh sách các lần làm bài ────────────────────────────────────────────
    if (attemptModal === "list") {
      return (
        <div
          className="cm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAttemptModal();
          }}
        >
          <div className="cm-box">
            <div className="cm-header">
              <h2 className="cm-title">Lịch sử làm bài</h2>
              <button className="cm-close" onClick={closeAttemptModal}>
                ✕
              </button>
            </div>

            <div className="cm-body cm-body--scroll">
              {loadingAttempts ? (
                <div className="cm-loading">
                  <span className="cm-loading__spinner" />
                  <span>Đang tải lịch sử…</span>
                </div>
              ) : attempts.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--color-text-secondary)",
                    padding: "2rem 0",
                  }}
                >
                  Chưa có học viên nào làm bài kiểm tra này.
                </p>
              ) : (
                <table className="ad-table" style={{ marginTop: 0 }}>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Học viên</th>
                      <th>Điểm</th>
                      <th>Kết quả</th>
                      <th>Bắt đầu</th>
                      <th>Nộp bài</th>
                      <th>Thời gian làm</th>
                      <th>Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a, idx) => {
                      const start = a.started_at
                        ? new Date(a.started_at)
                        : null;
                      const submit = a.submitted_at
                        ? new Date(a.submitted_at)
                        : null;
                      const duration =
                        start && submit
                          ? Math.round(
                              (submit.getTime() - start.getTime()) / 1000,
                            )
                          : null;
                      const mm =
                        duration !== null ? Math.floor(duration / 60) : null;
                      const ss = duration !== null ? duration % 60 : null;
                      return (
                        <tr key={a.id}>
                          <td
                            style={{
                              textAlign: "center",
                              color: "var(--color-text-secondary)",
                              fontSize: 12,
                            }}
                          >
                            {idx + 1}
                          </td>
                          <td>
                            <div className="ad-user-cell">
                              <span className="ad-user-cell__name">
                                {a.student_name ??
                                  a.student?.full_name ??
                                  a.student?.username ??
                                  "—"}
                              </span>
                              <span className="ad-user-cell__email">
                                {a.student_email ?? a.student?.email ?? ""}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              fontWeight: 600,
                              color: a.passed ? "#4caf82" : "#e07a5f",
                            }}
                          >
                            {(Number(a.score) / 10).toFixed(1)}
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: 12,
                                padding: "2px 8px",
                                borderRadius: 5,
                                background: a.passed
                                  ? "rgba(76,175,130,0.15)"
                                  : "rgba(224,122,95,0.15)",
                                color: a.passed ? "#4caf82" : "#e07a5f",
                                border: `0.5px solid ${a.passed ? "rgba(76,175,130,0.3)" : "rgba(224,122,95,0.3)"}`,
                              }}
                            >
                              {a.passed ? "Đạt" : "Chưa đạt"}
                            </span>
                          </td>
                          <td
                            className="ad-table__muted"
                            style={{ fontSize: 12 }}
                          >
                            {start ? start.toLocaleString("vi-VN") : "—"}
                          </td>
                          <td
                            className="ad-table__muted"
                            style={{ fontSize: 12 }}
                          >
                            {submit ? submit.toLocaleString("vi-VN") : "—"}
                          </td>
                          <td
                            className="ad-table__muted"
                            style={{ fontSize: 12 }}
                          >
                            {mm !== null && ss !== null
                              ? `${mm} phút ${ss} giây`
                              : "—"}
                          </td>
                          <td>
                            <button
                              className="ad-btn-sm ad-btn-sm--view"
                              onClick={() => openAttemptDetail(a)}
                            >
                              Xem
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="cm-footer">
              <button
                className="cm-btn cm-btn--cancel"
                onClick={closeAttemptModal}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── Chi tiết 1 lần làm bài ───────────────────────────────────────────────
    if (attemptModal === "detail" && selectedAttempt) {
      const start = selectedAttempt.started_at
        ? new Date(selectedAttempt.started_at)
        : null;
      const submit = selectedAttempt.submitted_at
        ? new Date(selectedAttempt.submitted_at)
        : null;
      const duration =
        start && submit
          ? Math.round((submit.getTime() - start.getTime()) / 1000)
          : null;
      const snapshot: Record<string, string[]> =
        selectedAttempt.answers_snapshot ?? {};

      // Dùng questions từ QuizAttemptResultSerializer (nếu có) hoặc fallback từ _questions
      const questions: any[] =
        selectedAttempt.questions ?? selectedAttempt._questions ?? [];

      return (
        <div
          className="cm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAttemptModal();
          }}
        >
          <div className="cm-box">
            <div className="cm-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={backToAttemptList}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-text-secondary)",
                    fontSize: 18,
                    lineHeight: 1,
                    padding: "0 4px",
                  }}
                  title="Quay lại danh sách"
                >
                  ←
                </button>
                <h2 className="cm-title" style={{ margin: 0 }}>
                  Chi tiết bài làm
                </h2>
              </div>
              <button className="cm-close" onClick={closeAttemptModal}>
                ✕
              </button>
            </div>

            <div className="cm-body cm-body--scroll">
              {/* ── Thông tin tổng quan ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {[
                  {
                    label: "Điểm số",
                    value: `${Number(selectedAttempt.score).toFixed(1)}%`,
                    color: selectedAttempt.passed ? "#4caf82" : "#e07a5f",
                  },
                  {
                    label: "Kết quả",
                    value: selectedAttempt.passed ? "Đạt" : "Chưa đạt",
                    color: selectedAttempt.passed ? "#4caf82" : "#e07a5f",
                  },
                  {
                    label: "Bắt đầu",
                    value: start ? start.toLocaleString("vi-VN") : "—",
                    color: undefined,
                  },
                  {
                    label: "Nộp bài",
                    value: submit ? submit.toLocaleString("vi-VN") : "—",
                    color: undefined,
                  },
                  {
                    label: "Thời gian",
                    value:
                      duration !== null
                        ? `${Math.floor(duration / 60)}p ${duration % 60}s`
                        : "—",
                    color: undefined,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "0.5px solid rgba(255,255,255,0.07)",
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-secondary)",
                        marginBottom: 4,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: item.color ?? "var(--color-text-primary)",
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Đáp án từng câu ── */}
              {loadingAttemptDetail ? (
                <div className="cm-loading">
                  <span className="cm-loading__spinner" />
                  <span>Đang tải chi tiết câu hỏi…</span>
                </div>
              ) : questions.length === 0 ? (
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      marginBottom: 12,
                    }}
                  >
                    Đáp án học viên đã chọn (theo ID):
                  </p>
                  {Object.entries(snapshot).length === 0 ? (
                    <p
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: 13,
                      }}
                    >
                      Không có dữ liệu đáp án.
                    </p>
                  ) : (
                    Object.entries(snapshot).map(([qId, aIds]) => (
                      <div key={qId} style={{ marginBottom: 8, fontSize: 13 }}>
                        <span style={{ color: "var(--color-text-secondary)" }}>
                          Câu {qId.slice(0, 8)}…:
                        </span>{" "}
                        <span style={{ color: "var(--color-text-primary)" }}>
                          {aIds.join(", ")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                      marginBottom: 12,
                    }}
                  >
                    {questions.length} câu hỏi — đáp án học viên chọn được tô
                    màu
                  </p>
                  {questions.map((q: any, idx: number) => {
                    const chosenIds: string[] = snapshot[q.id] ?? [];
                    return (
                      <div
                        key={q.id}
                        style={{
                          marginBottom: 14,
                          padding: "12px 14px",
                          background: "rgba(255,255,255,0.03)",
                          border: "0.5px solid rgba(255,255,255,0.07)",
                          borderRadius: 8,
                        }}
                      >
                        <div
                          style={{ display: "flex", gap: 8, marginBottom: 8 }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--color-text-secondary)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Câu {idx + 1} · {q.points} điểm
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 13,
                            color: "var(--color-text-primary)",
                            margin: "0 0 10px",
                          }}
                        >
                          {q.content}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          {q.answers?.map((ans: any) => {
                            const isChosen = chosenIds.includes(String(ans.id));
                            const isCorrect = ans.is_correct;
                            // màu: đúng+chọn=xanh, sai+chọn=đỏ, đúng+không chọn=viền xanh nhạt, còn lại=mờ
                            let bg = "rgba(255,255,255,0.02)";
                            let border = "0.5px solid rgba(255,255,255,0.06)";
                            let color = "rgba(224,225,221,0.45)";
                            let prefix = "";
                            if (isCorrect && isChosen) {
                              bg = "rgba(76,175,130,0.18)";
                              border = "0.5px solid rgba(76,175,130,0.4)";
                              color = "#4caf82";
                              prefix = "✓ ";
                            } else if (!isCorrect && isChosen) {
                              bg = "rgba(224,122,95,0.18)";
                              border = "0.5px solid rgba(224,122,95,0.4)";
                              color = "#e07a5f";
                              prefix = "✗ ";
                            } else if (isCorrect && !isChosen) {
                              border = "0.5px solid rgba(76,175,130,0.25)";
                              color = "rgba(76,175,130,0.6)";
                              prefix = "◎ ";
                            }
                            return (
                              <div
                                key={ans.id}
                                style={{
                                  fontSize: 13,
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  background: bg,
                                  border,
                                  color,
                                }}
                              >
                                {prefix}
                                {ans.content}
                              </div>
                            );
                          })}
                        </div>
                        {q.explanation && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "rgba(224,225,221,0.4)",
                              margin: "8px 0 0",
                              fontStyle: "italic",
                            }}
                          >
                            💡 {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="cm-footer">
              <button
                className="cm-btn cm-btn--cancel"
                onClick={backToAttemptList}
              >
                ← Quay lại
              </button>
              <button
                className="cm-btn cm-btn--cancel"
                onClick={closeAttemptModal}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="id-page">
      <div className="container id-layout">
        {/* ── Sidebar ── */}
        <aside className="id-sidebar">
          <div className="id-profile">
            <div className="id-profile__avatar">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <svg viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="32" fill="#1B263B" />
                  <circle cx="32" cy="24" r="10" fill="#415A77" />
                  <path
                    d="M8 56c0-13.255 10.745-24 24-24s24 10.745 24 24"
                    fill="#415A77"
                  />
                </svg>
              )}
            </div>
            <strong className="id-profile__name">
              {user?.full_name || "Instructor"}
            </strong>
            <span className="id-profile__title">
              {user?.title || user?.email || ""}
            </span>
          </div>

          <nav className="id-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`id-nav__item${activeTab === tab.id ? " id-nav__item--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <button
            className="id-nav__item id-nav__item--back"
            onClick={onLogout}
          >
            Đăng xuất
          </button>
        </aside>

        {/* ── Main ── */}
        <main className="id-main">
          {/* ════ OVERVIEW ════ */}
          {activeTab === "overview" && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">
                  Xin chào, {user?.full_name?.split(" ").pop() || "Instructor"}{" "}
                  👋
                </h1>
                <p className="id-page-sub">
                  Quản lý khóa học và theo dõi học viên của bạn.
                </p>
              </div>

              <div className="id-stats-grid">
                {[
                  {
                    value: loadingCourses ? "…" : courses.length.toString(),
                    label: "Khóa học",
                  },
                  {
                    value: loadingStudents
                      ? "…"
                      : students.length.toLocaleString(),
                    label: "Học viên",
                  },
                  {
                    value: loadingCourses
                      ? "…"
                      : formatPrice(totalRevenue, "VND"),
                    label: "Doanh thu",
                  },
                ].map((s, i) => (
                  <div key={i} className="id-stat-card">
                    <span className="id-stat-card__value">{s.value}</span>
                    <span className="id-stat-card__label">{s.label}</span>
                  </div>
                ))}
              </div>

              {chartData.length > 0 && (
                <div className="id-chart-card">
                  <div className="id-chart-card__header">
                    <div>
                      <div className="id-chart-card__title">
                        Doanh thu 6 tháng qua
                      </div>
                      <div className="id-chart-card__meta">
                        Tổng:{" "}
                        {formatPrice(
                          monthlyData
                            .slice(-6)
                            .reduce(
                              (a: number, b: any) => a + (b.revenue ?? 0),
                              0,
                            ),
                          "VND",
                        )}
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={monthlyData.slice(-6)}
                      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(119,141,169,0.1)"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "rgba(224,225,221,0.4)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "rgba(224,225,221,0.4)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) =>
                          `${(v / 1000000).toFixed(1)}M`
                        }
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="revenue"
                        name="Doanh thu"
                        fill="#5b8dee"
                        radius={[4, 4, 0, 0]}
                      >
                        {monthlyData.slice(-6).map((_: any, i: number) => (
                          <Cell key={i} fill="#5b8dee" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
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
                  Cập nhật thông tin hiển thị công khai của bạn
                </p>
              </div>

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
                      {profileForm.name || user?.full_name}
                    </div>
                    <div className="id-profile-card__title-text">
                      {profileForm.title || user?.title}
                    </div>
                    <div className="id-profile-card__stats">
                      <span>{students.length.toLocaleString()} học viên</span>
                      <span>·</span>
                      <span>{courses.length} khóa học</span>
                      <span>·</span>
                      <span>{avgRating} ★</span>
                    </div>
                  </div>
                </div>
              </div>

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
                  {!profileEditing ? (
                    <button
                      className="id-btn-sm"
                      onClick={() => setProfileEditing(true)}
                    >
                      Chỉnh sửa
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="id-btn-primary"
                        onClick={handleProfileSave}
                        disabled={profileSaving}
                      >
                        {profileSaving ? "Đang lưu…" : "Lưu"}
                      </button>
                      <button
                        className="id-btn-secondary"
                        onClick={() => setProfileEditing(false)}
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
                      disabled={!profileEditing}
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Chức danh</label>
                    <input
                      className="id-field__input"
                      disabled={!profileEditing}
                      placeholder="Ví dụ: Thạc sĩ ngôn ngữ Anh - 10 năm kinh nghiệm"
                      value={profileForm.title}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Email</label>
                    <input
                      className="id-field__input"
                      type="email"
                      disabled={!profileEditing}
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">Số điện thoại</label>
                    <input
                      className="id-field__input"
                      type="tel"
                      disabled={!profileEditing}
                      value={profileForm.phone}
                      onKeyDown={blockNegative}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          phone: toPositiveInt(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="id-field">
                    <label className="id-field__label">
                      Số năm kinh nghiệm
                    </label>
                    <input
                      className="id-field__input"
                      type="number"
                      min="0"
                      disabled={!profileEditing}
                      value={profileForm.years_experience}
                      onKeyDown={blockNegative}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          years_experience: toPositiveInt(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="id-field id-field--full">
                    <label className="id-field__label">Chuyên môn</label>
                    <input
                      className="id-field__input"
                      disabled={!profileEditing}
                      placeholder="Ví dụ: IELTS, Business English, Phonetics"
                      value={profileForm.specializations}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          specializations: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="id-field id-field--full">
                    <label className="id-field__label">
                      Chứng chỉ giảng dạy
                    </label>
                    <input
                      className="id-field__input"
                      disabled={!profileEditing}
                      placeholder="Ví dụ: CELTA, DELTA, TESOL, TEFL"
                      value={profileForm.certifications}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          certifications: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="id-field id-field--full">
                    <label className="id-field__label">
                      Giới thiệu bản thân
                    </label>
                    <textarea
                      className="id-field__textarea"
                      rows={4}
                      disabled={!profileEditing}
                      value={profileForm.bio}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, bio: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="id-form-card">
                <h3 className="id-form-card__title">Bảo mật tài khoản</h3>
                <div className="id-form-grid">
                  <div className="id-field id-field--full">
                    <label className="id-field__label">Mật khẩu hiện tại</label>
                    <input
                      className="id-field__input"
                      type="password"
                      placeholder="Nhập mật khẩu hiện tại"
                      value={passwordForm.current}
                      onChange={(e) =>
                        setPasswordForm((f) => ({
                          ...f,
                          current: e.target.value,
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
                      value={passwordForm.newPw}
                      onChange={(e) =>
                        setPasswordForm((f) => ({
                          ...f,
                          newPw: e.target.value,
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
                      value={passwordForm.confirm}
                      onChange={(e) =>
                        setPasswordForm((f) => ({
                          ...f,
                          confirm: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                {passwordError && (
                  <p
                    style={{
                      color: "#ff6b6b",
                      fontSize: 13,
                      margin: "4px 0 8px",
                    }}
                  >
                    ⚠ {passwordError}
                  </p>
                )}
                {passwordSuccess && (
                  <p
                    style={{
                      color: "#4caf82",
                      fontSize: 13,
                      margin: "4px 0 8px",
                    }}
                  >
                    ✓ Đổi mật khẩu thành công!
                  </p>
                )}
                <div className="id-form-actions">
                  <button
                    className="id-btn-primary"
                    onClick={handlePasswordChange}
                    disabled={passwordSaving}
                  >
                    {passwordSaving ? "Đang lưu…" : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════ REVENUE ════ */}
          {activeTab === "revenue" && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Doanh thu & Thống kê</h1>
                <p className="id-page-sub">
                  Tổng quan tài chính và lượt đăng ký
                </p>
              </div>

              <div className="id-stats-grid">
                {[
                  {
                    value: formatPrice(chartTotalRevenue, "VND"),
                    label: `Doanh thu (${chartRange === "3m" ? "3T" : chartRange === "6m" ? "6T" : "1N"})`,
                  },
                  {
                    value: chartTotalEnrollments.toLocaleString(),
                    label: "Lượt đăng ký",
                  },
                  {
                    value:
                      chartTotalEnrollments > 0
                        ? formatPrice(
                            Math.round(
                              chartTotalRevenue / chartTotalEnrollments,
                            ),
                            "VND",
                          )
                        : "—",
                    label: "DT / học viên",
                  },
                ].map((s, i) => (
                  <div key={i} className="id-stat-card">
                    <span className="id-stat-card__value id-stat-card__value--sm">
                      {s.value}
                    </span>
                    <span className="id-stat-card__label">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="id-chart-card">
                <div className="id-chart-card__header">
                  <div className="id-chart-card__title">
                    Doanh thu theo tháng
                  </div>
                  <div className="id-chart-filters">
                    {(["3m", "6m", "1y"] as ChartRange[]).map((r) => (
                      <button
                        key={r}
                        className={`id-chart-filter-btn${chartRange === r ? " id-chart-filter-btn--active" : ""}`}
                        onClick={() => setChartRange(r)}
                      >
                        {r === "3m"
                          ? "3 tháng"
                          : r === "6m"
                            ? "6 tháng"
                            : "1 năm"}
                      </button>
                    ))}
                  </div>
                </div>
                {chartData.length === 0 ? (
                  <p className="id-muted">Chưa có dữ liệu doanh thu.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(119,141,169,0.1)"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "rgba(224,225,221,0.4)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "rgba(224,225,221,0.4)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) =>
                          `${(v / 1000000).toFixed(1)}M`
                        }
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{
                          fontSize: 12,
                          color: "rgba(224,225,221,0.5)",
                          paddingTop: 8,
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        name="Doanh thu"
                        fill="#5b8dee"
                        radius={[4, 4, 0, 0]}
                      >
                        {chartData.map((_: any, i: number) => (
                          <Cell key={i} fill="#5b8dee" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {chartData.length > 0 && (
                <div className="id-chart-card">
                  <div className="id-chart-card__header">
                    <div className="id-chart-card__title">
                      Lượt đăng ký theo tháng
                    </div>
                    <div className="id-chart-card__meta">
                      Tổng: {chartTotalEnrollments} học viên
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(119,141,169,0.1)"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "rgba(224,225,221,0.4)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "rgba(224,225,221,0.4)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="enrollments"
                        name="Lượt đăng ký"
                        fill="#5b8dee"
                        radius={[4, 4, 0, 0]}
                      >
                        {chartData.map((_: any, i: number) => (
                          <Cell key={i} fill="#5b8dee" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {!loadingCourses &&
                courses.length > 0 &&
                (() => {
                  const avgCompletion =
                    courses.reduce(
                      (sum, c) =>
                        sum +
                        (Number(c.completion_rate) ||
                          Number(c.completionRate) ||
                          0),
                      0,
                    ) / courses.length;

                  return (
                    <div className="id-chart-card">
                      <div className="id-chart-card__header">
                        <div className="id-chart-card__title">
                          Doanh thu theo khóa học
                        </div>
                      </div>
                      <div className="id-table-wrap" style={{ border: "none" }}>
                        <table className="id-table">
                          <thead>
                            <tr>
                              <th>Khóa học</th>
                              <th>Học viên</th>
                              <th>Tiến độ TB</th>
                              <th>Doanh thu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {courses.map((c) => {
                              const enrolled = Number(c.total_students) || 0;
                              const price =
                                c.sale_price != null
                                  ? Number(c.sale_price)
                                  : (Number(c.price) ?? 0);
                              const revenue = price * enrolled;
                              const completionRate =
                                Number(c.completion_rate) ||
                                Number(c.completionRate) ||
                                0;
                              return (
                                <tr key={c.id}>
                                  <td className="id-table__title">{c.title}</td>
                                  <td>{enrolled.toLocaleString()}</td>
                                  <td>
                                    <div className="id-progress-cell">
                                      <div className="id-progress-bar">
                                        <div
                                          className="id-progress-fill"
                                          style={{
                                            width: `${completionRate}%`,
                                          }}
                                        />
                                      </div>
                                      <span>{completionRate}%</span>
                                    </div>
                                  </td>
                                  <td className="id-table__positive">
                                    {formatPrice(revenue, "VND")}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}

          {/* ════ COURSES ════ */}
          {activeTab === "courses" && (
            <div className="id-content">
              <div className="id-page-header id-page-header--row">
                <div>
                  <h1 className="id-page-title">Quản lý khóa học</h1>
                  <p className="id-page-sub">
                    {loadingCourses
                      ? "…"
                      : `${filteredCourses.length} / ${courses.length} khóa học`}
                  </p>
                </div>
              </div>

              {/* ── Search + filter bar ── */}
              <div className="ad-filters">
                <input
                  className="ad-search"
                  type="search"
                  placeholder="Tìm kiếm khóa học..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                />
                <select
                  className="ad-select"
                  value={courseStatusFilter}
                  onChange={(e) => setCourseStatusFilter(e.target.value as any)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="draft">Nháp</option>
                  <option value="review">Chờ duyệt</option>
                  <option value="published">Đã đăng</option>
                  <option value="archived">Đã ẩn</option>
                </select>
                {(courseSearch || courseStatusFilter !== "all") && (
                  <button
                    className="filter-clear"
                    onClick={() => {
                      setCourseSearch("");
                      setCourseStatusFilter("all");
                    }}
                  >
                    ✕ Xoá lọc
                  </button>
                )}
                <button
                  className="id-btn-primary"
                  style={{ marginLeft: "auto" }}
                  onClick={() => {
                    setEditingCourseId(null);
                    setEditCourseForm({
                      title: "",
                      description: "",
                      level: "beginner",
                      price: "",
                      discount_percent: "",
                      category: "",
                      requirements: "",
                      what_you_learn: "",
                      status: "draft",
                      thumbnail: null,
                    });
                    setEditCourseError("");
                    setShowCourseModal(true);
                  }}
                >
                  + Tạo khóa học
                </button>
              </div>

              {loadingCourses ? (
                <p className="id-muted">Đang tải…</p>
              ) : filteredCourses.length === 0 ? (
                <p className="id-muted">
                  {courses.length === 0
                    ? "Chưa có khóa học nào."
                    : "Không tìm thấy kết quả phù hợp."}
                </p>
              ) : (
                <div className="id-table-wrap" style={{ border: "none" }}>
                  <table className="id-table">
                    <thead>
                      <tr>
                        <th>Khóa học</th>
                        <th>Học viên</th>
                        <th>Học phí</th>
                        <th>Trạng thái</th>
                        <th>thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourses.map((c) => {
                        const price =
                          c.sale_price != null
                            ? Number(c.sale_price)
                            : (Number(c.price) ?? 0);
                        const studs = Number(c.total_students) || 0;
                        const statusLabel: Record<string, string> = {
                          draft: "Nháp",
                          review: "Chờ duyệt",
                          published: "Đã đăng",
                          archived: "Đã ẩn",
                        };
                        const statusColor: Record<string, string> = {
                          draft: "draft",
                          review: "review",
                          published: "published",
                          archived: "archived",
                        };
                        return (
                          <tr key={c.id}>
                            <td className="id-table__title">
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                {thumbSrc(c.thumbnail) && (
                                  <img
                                    src={thumbSrc(c.thumbnail)!}
                                    alt={c.title}
                                    className="id-course-row__thumb"
                                    style={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: 6,
                                      objectFit: "cover",
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                {c.title}
                              </div>
                            </td>
                            <td>{studs.toLocaleString()}</td>
                            <td>
                              {price > 0
                                ? formatPrice(price, "VND")
                                : "Miễn phí"}
                            </td>
                            <td>
                              <select
                                className={`id-badge id-badge--${statusColor[c.status] ?? "draft"} id-badge--select`}
                                value={c.status}
                                disabled={
                                  c.status === "published" ||
                                  c.status === "archived"
                                }
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  if (
                                    c.status === "draft" &&
                                    newStatus === "review"
                                  ) {
                                    try {
                                      const res = await fetch(
                                        `${API}/api/courses/mine/${c.id}/submit/`,
                                        {
                                          method: "POST",
                                          headers: authHeaders(),
                                        },
                                      );
                                      if (res.ok)
                                        setCourses((prev) =>
                                          prev.map((x) =>
                                            x.id === c.id
                                              ? { ...x, status: "review" }
                                              : x,
                                          ),
                                        );
                                    } catch (_) {}
                                    return;
                                  }
                                  alert(
                                    `Không thể tự chuyển trạng thái. Vui lòng liên hệ admin.`,
                                  );
                                }}
                              >
                                <option value="draft">Nháp</option>
                                <option value="review">Chờ duyệt</option>
                                <option value="published" disabled>
                                  Đã đăng
                                </option>
                                <option value="archived" disabled>
                                  Đã ẩn
                                </option>
                              </select>
                            </td>
                            <td>
                              <div className="id-course-row__actions">
                                <button
                                  className="id-btn-sm"
                                  onClick={() => openEditCourse(c)}
                                >
                                  Sửa
                                </button>

                                {c.status === "published" &&
                                  Number(c.total_students) === 0 && (
                                    <button
                                      className="id-btn-sm id-btn-sm--warning"
                                      onClick={async () => {
                                        if (!confirm(`Lưu trữ "${c.title}"?`))
                                          return;
                                        try {
                                          const res = await fetch(
                                            `${API}/api/courses/mine/${c.id}/archive/`,
                                            {
                                              method: "POST",
                                              headers: authHeaders(),
                                            },
                                          );
                                          if (res.ok) {
                                            const refreshed = await fetch(
                                              `${API}/api/courses/mine/`,
                                              { headers: authHeaders() },
                                            );
                                            if (refreshed.ok)
                                              setCourses(
                                                (await refreshed.json())
                                                  .results ?? [],
                                              );
                                          } else {
                                            const err = await res
                                              .json()
                                              .catch(() => ({}));
                                            alert(
                                              err?.detail ||
                                                "Không thể lưu trữ.",
                                            );
                                          }
                                        } catch (_) {
                                          alert("Lỗi kết nối.");
                                        }
                                      }}
                                    >
                                      Lưu trữ
                                    </button>
                                  )}

                                {c.status === "archived" && c.published_at && (
                                  <button
                                    className="id-btn-sm id-btn-sm--success"
                                    onClick={async () => {
                                      if (!confirm(`Đăng lại "${c.title}"?`))
                                        return;
                                      try {
                                        const res = await fetch(
                                          `${API}/api/courses/mine/${c.id}/unarchive/`,
                                          {
                                            method: "POST",
                                            headers: authHeaders(),
                                          },
                                        );
                                        if (res.ok) {
                                          const refreshed = await fetch(
                                            `${API}/api/courses/mine/`,
                                            { headers: authHeaders() },
                                          );
                                          if (refreshed.ok)
                                            setCourses(
                                              (await refreshed.json())
                                                .results ?? [],
                                            );
                                        } else {
                                          const err = await res
                                            .json()
                                            .catch(() => ({}));
                                          alert(
                                            err?.detail ||
                                              "Không thể đăng lại.",
                                          );
                                        }
                                      } catch (_) {
                                        alert("Lỗi kết nối.");
                                      }
                                    }}
                                  >
                                    Đăng lại
                                  </button>
                                )}

                                {(c.status === "draft" ||
                                  c.status === "review") && (
                                  <button
                                    className="id-btn-sm id-btn-sm--danger"
                                    onClick={async () => {
                                      if (!confirm(`Xóa "${c.title}"?`)) return;
                                      try {
                                        const res = await fetch(
                                          `${API}/api/courses/mine/${c.id}/`,
                                          {
                                            method: "DELETE",
                                            headers: authHeaders(),
                                          },
                                        );
                                        if (res.ok || res.status === 204)
                                          setCourses((prev) =>
                                            prev.filter((x) => x.id !== c.id),
                                          );
                                      } catch (_) {}
                                    }}
                                  >
                                    Xóa
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════ SECTIONS ════ */}
          {activeTab === "sections" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý chương học</h1>
                <p className="ad-page-sub">
                  {loadingSections
                    ? "Đang tải…"
                    : `${sections.filter((s) => !filterSectionCourse || String(s.course?.id ?? s.course) === filterSectionCourse).length} chương`}
                </p>
              </div>
              <div className="ad-toolbar">
                <div className="ad-filters">
                  <select
                    className="ad-select"
                    value={filterSectionCourse}
                    onChange={(e) => setFilterSectionCourse(e.target.value)}
                  >
                    <option value="">Tất cả khóa học</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  {filterSectionCourse && (
                    <button
                      className="filter-clear"
                      onClick={() => setFilterSectionCourse("")}
                    >
                      ✕ Xoá lọc
                    </button>
                  )}
                </div>
                <button className="ad-btn-add-course" onClick={openAddSection}>
                  ＋ Thêm chương
                </button>
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Tên chương</th>
                      <th>Khóa học</th>
                      <th>Mô tả</th>
                      <th>thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingSections ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center" }}>
                          ⏳ Đang tải…
                        </td>
                      </tr>
                    ) : sections
                        .filter(
                          (s) =>
                            !filterSectionCourse ||
                            String(s.course?.id ?? s.course) ===
                              filterSectionCourse,
                        )
                        .sort(
                          (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
                        ).length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          🔍 Không có chương nào.
                        </td>
                      </tr>
                    ) : (
                      sections
                        .filter(
                          (s) =>
                            !filterSectionCourse ||
                            String(s.course?.id ?? s.course) ===
                              filterSectionCourse,
                        )
                        .sort(
                          (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
                        )
                        .map((s) => (
                          <tr key={s.id}>
                            <td style={{ textAlign: "center" }}>
                              {s.order_index ?? "—"}
                            </td>
                            <td>
                              <span className="ad-table__title">{s.title}</span>
                            </td>
                            <td>
                              {courses.find(
                                (c) => c.id === (s.course?.id ?? s.course),
                              )?.title ?? "—"}
                            </td>
                            <td className="ad-table__muted">
                              {s.description || "—"}
                            </td>
                            <td>
                              <div className="ad-actions">
                                <button
                                  className="ad-btn-sm ad-btn-sm--edit"
                                  onClick={() => openEditSection(s)}
                                >
                                  Sửa
                                </button>
                                <button
                                  className="ad-btn-sm ad-btn-sm--approve"
                                  onClick={() => {
                                    setFilterLessonSection(s.id);
                                    setActiveTab("lessons" as Tab);
                                  }}
                                >
                                  Bài học
                                </button>
                                <button
                                  className="ad-btn-sm ad-btn-sm--delete"
                                  onClick={() => handleDeleteSection(s)}
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal */}
              {showSectionModal && (
                <div
                  className="cm-overlay"
                  onClick={(e) => {
                    if (e.target === e.currentTarget)
                      setShowSectionModal(false);
                  }}
                >
                  <div className="cm-box">
                    <div className="cm-header">
                      <h2 className="cm-title">
                        {editingSectionId ? "✏️ Sửa chương" : "➕ Thêm chương"}
                      </h2>
                      <button
                        className="cm-close"
                        onClick={() => setShowSectionModal(false)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="cm-body cm-body--scroll">
                      <div className="cm-field">
                        <label className="cm-label">
                          Khóa học <span className="cm-required">*</span>
                        </label>
                        <select
                          className="cm-select"
                          value={sectionForm.course}
                          onChange={(e) =>
                            setSectionForm((f) => ({
                              ...f,
                              course: e.target.value,
                            }))
                          }
                        >
                          <option value="">-- Chọn khóa học --</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="cm-field">
                        <label className="cm-label">
                          Tên chương <span className="cm-required">*</span>
                        </label>
                        <input
                          className="cm-input"
                          placeholder="Ví dụ: Giới thiệu khóa học"
                          value={sectionForm.title}
                          onChange={(e) =>
                            setSectionForm((f) => ({
                              ...f,
                              title: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="cm-field">
                        <label className="cm-label">Mô tả</label>
                        <textarea
                          className="cm-textarea"
                          rows={3}
                          value={sectionForm.description}
                          onChange={(e) =>
                            setSectionForm((f) => ({
                              ...f,
                              description: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="cm-field">
                        <label className="cm-label">Thứ tự</label>
                        <input
                          className="cm-input"
                          type="number"
                          min={0}
                          value={sectionForm.order_index}
                          onKeyDown={blockNegative}
                          onChange={(e) =>
                            setSectionForm((f) => ({
                              ...f,
                              order_index: toPositiveInt(e.target.value),
                            }))
                          }
                        />
                      </div>
                      {sectionError && (
                        <p className="cm-error">{sectionError}</p>
                      )}
                    </div>
                    <div className="cm-footer">
                      <button
                        className="cm-btn cm-btn--save"
                        onClick={handleSaveSection}
                        disabled={sectionLoading}
                      >
                        {sectionLoading
                          ? "⏳ Đang lưu…"
                          : editingSectionId
                            ? "Lưu thay đổi"
                            : "Thêm chương"}
                      </button>
                      <button
                        className="cm-btn cm-btn--cancel"
                        onClick={() => setShowSectionModal(false)}
                        disabled={sectionLoading}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ LESSONS ════ */}
          {activeTab === "lessons" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý bài học</h1>
                <p className="ad-page-sub">
                  {loadingLessons ? "Đang tải…" : `${lessons.length} bài học`}
                </p>
              </div>
              <div className="ad-toolbar">
                <div className="ad-filters">
                  <select
                    className="ad-select"
                    value={filterLessonCourse}
                    onChange={(e) => {
                      setFilterLessonCourse(e.target.value);
                      setFilterLessonSection("");
                    }}
                  >
                    <option value="">Tất cả khóa học</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <select
                    className="ad-select"
                    value={filterLessonSection}
                    onChange={(e) => setFilterLessonSection(e.target.value)}
                  >
                    <option value="">Tất cả chương</option>
                    {sections
                      .filter(
                        (s) =>
                          !filterLessonCourse ||
                          String(s.course?.id ?? s.course) ===
                            filterLessonCourse,
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                  </select>
                  {(filterLessonCourse || filterLessonSection) && (
                    <button
                      className="filter-clear"
                      onClick={() => {
                        setFilterLessonCourse("");
                        setFilterLessonSection("");
                      }}
                    >
                      ✕ Xoá lọc
                    </button>
                  )}
                </div>
                <button
                  className="ad-btn-add-course"
                  onClick={() => openAddLesson()}
                >
                  ＋ Thêm bài học
                </button>
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Tên bài học</th>
                      <th>Chương</th>
                      <th>Xem thử</th>
                      <th>thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLessons ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center" }}>
                          ⏳ Đang tải…
                        </td>
                      </tr>
                    ) : lessons.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          🔍 Không có bài học nào.
                        </td>
                      </tr>
                    ) : (
                      lessons.map((l) => (
                        <tr key={l.id}>
                          <td style={{ textAlign: "center" }}>
                            {l.order_index ?? "—"}
                          </td>
                          <td>
                            <span className="ad-table__title">{l.title}</span>
                          </td>
                          <td>
                            {sections.find(
                              (s) => s.id === (l.section?.id ?? l.section),
                            )?.title ?? "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {l.is_preview_video ? "🎬" : ""}
                            {l.is_preview_article ? "📝" : ""}
                            {l.is_preview_resource ? "📎" : ""}
                            {!l.is_preview_video &&
                            !l.is_preview_article &&
                            !l.is_preview_resource
                              ? "—"
                              : ""}
                          </td>
                          <td>
                            <div className="ad-actions">
                              <button
                                className="ad-btn-sm ad-btn-sm--edit"
                                onClick={() => openEditLesson(l)}
                              >
                                Sửa
                              </button>
                              <button
                                className="ad-btn-sm ad-btn-sm--delete"
                                onClick={() => {
                                  setSelectedLesson(l);
                                  setLessonError("");
                                  setLessonModal("delete");
                                }}
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal */}
              {lessonModal &&
                (() => {
                  if (lessonModal === "delete")
                    return (
                      <div
                        className="cm-overlay"
                        onClick={(e) => {
                          if (e.target === e.currentTarget) closeLessonModal();
                        }}
                      >
                        <div className="cm-box cm-box--sm">
                          <div className="cm-header">
                            <h2 className="cm-title">
                              <span className="cm-title-icon cm-title-icon--del">
                                🗑
                              </span>
                              Xác nhận xóa
                            </h2>
                            <button
                              className="cm-close"
                              onClick={closeLessonModal}
                            >
                              ✕
                            </button>
                          </div>
                          <div className="cm-body">
                            <p className="cm-delete-desc">
                              Bạn có chắc muốn xóa bài học:
                            </p>
                            <p className="cm-delete-name">
                              "{selectedLesson?.title}"
                            </p>
                            <p className="cm-delete-warn">
                              ⚠ Hành động này không thể hoàn tác.
                            </p>
                            {lessonError && (
                              <p className="cm-error">{lessonError}</p>
                            )}
                          </div>
                          <div className="cm-footer">
                            <button
                              className="cm-btn cm-btn--danger"
                              onClick={handleDeleteLesson}
                              disabled={savingLesson}
                            >
                              {savingLesson ? "⏳ Đang xóa…" : "Xóa bài học"}
                            </button>
                            <button
                              className="cm-btn cm-btn--cancel"
                              onClick={closeLessonModal}
                              disabled={savingLesson}
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      </div>
                    );

                  const isEdit = lessonModal === "edit";
                  const filteredSectionsForModal = modalFilterCourse
                    ? sections.filter(
                        (s) =>
                          String(s.course?.id ?? s.course) ===
                          modalFilterCourse,
                      )
                    : sections;
                  const hasVideo =
                    !!lessonForm.video_url.trim() ||
                    !!lessonForm.video_file ||
                    !!lessonForm.existing_video_url;
                  const hasAttachment =
                    !!lessonForm.attachment ||
                    !!lessonForm.attachment_name.trim() ||
                    !!lessonForm.existing_attachment;

                  return (
                    <div
                      className="cm-overlay"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) closeLessonModal();
                      }}
                    >
                      <div className="cm-box">
                        <div className="cm-header">
                          <h2 className="cm-title">
                            <span
                              className={`cm-title-icon cm-title-icon--${isEdit ? "edit" : "add"}`}
                            >
                              {isEdit ? "✏" : "＋"}
                            </span>
                            {isEdit ? "Chỉnh sửa bài học" : "Thêm bài học mới"}
                          </h2>
                          <button
                            className="cm-close"
                            onClick={closeLessonModal}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="cm-body cm-body--scroll">
                          <div className="cm-row">
                            <div className="cm-field">
                              <label className="cm-label">Khóa học</label>
                              <select
                                className="cm-select"
                                value={modalFilterCourse}
                                onChange={(e) => {
                                  setModalFilterCourse(e.target.value);
                                  setLessonForm((f) => ({ ...f, section: "" }));
                                }}
                              >
                                <option value="">-- Tất cả --</option>
                                {courses.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="cm-field">
                              <label className="cm-label">
                                Chương <span className="cm-required">*</span>
                              </label>
                              <select
                                className="cm-select"
                                value={lessonForm.section}
                                onChange={(e) =>
                                  setLessonForm((f) => ({
                                    ...f,
                                    section: e.target.value,
                                  }))
                                }
                              >
                                <option value="">-- Chọn chương --</option>
                                {filteredSectionsForModal.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="cm-row">
                            <div className="cm-field">
                              <label className="cm-label">
                                Tên bài học{" "}
                                <span className="cm-required">*</span>
                              </label>
                              <input
                                className="cm-input"
                                type="text"
                                placeholder="Ví dụ: Bài 1 – Giới thiệu"
                                value={lessonForm.title}
                                onChange={(e) =>
                                  setLessonForm((f) => ({
                                    ...f,
                                    title: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="cm-field">
                              <label className="cm-label">Thứ tự</label>
                              <input
                                className="cm-input"
                                type="number"
                                min={0}
                                value={lessonForm.order_index}
                                onKeyDown={blockNegative}
                                onChange={(e) =>
                                  setLessonForm((f) => ({
                                    ...f,
                                    order_index: toPositiveInt(e.target.value),
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="cm-section-block">
                            <div className="cm-section-block__header">
                              <span>🎬 Video</span>
                              <label className="cm-checkbox-label">
                                <input
                                  type="checkbox"
                                  className="cm-checkbox"
                                  checked={lessonForm.is_preview_video}
                                  disabled={!hasVideo}
                                  onChange={(e) =>
                                    setLessonForm((f) => ({
                                      ...f,
                                      is_preview_video: e.target.checked,
                                    }))
                                  }
                                />
                                <span>Cho xem thử</span>
                              </label>
                            </div>
                            <div className="cm-field">
                              <label className="cm-label">URL Video</label>
                              <input
                                className="cm-input"
                                type="url"
                                placeholder="https://..."
                                value={lessonForm.video_url}
                                onChange={(e) =>
                                  setLessonForm((f) => ({
                                    ...f,
                                    video_url: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="cm-field">
                              <label className="cm-label">
                                Hoặc upload file video
                              </label>
                              <input
                                className="cm-input cm-input--file"
                                type="file"
                                accept="video/*"
                                onChange={(e) =>
                                  setLessonForm((f) => ({
                                    ...f,
                                    video_file: e.target.files?.[0] ?? null,
                                  }))
                                }
                              />
                              {lessonForm.video_file && (
                                <span className="cm-hint">
                                  📎 {lessonForm.video_file.name}
                                </span>
                              )}
                              {isEdit &&
                                !lessonForm.video_file &&
                                lessonForm.existing_video_url && (
                                  <div className="cm-existing-file">
                                    <span>File hiện tại:</span>
                                    <a
                                      href={lessonForm.existing_video_url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {lessonForm.existing_video_url
                                        .split("/")
                                        .pop()}
                                    </a>
                                    <button
                                      type="button"
                                      className="cm-existing-file__delete"
                                      onClick={() =>
                                        setLessonForm((f) => ({
                                          ...f,
                                          existing_video_url: "",
                                          is_preview_video: false,
                                        }))
                                      }
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                )}
                            </div>
                          </div>
                          <div className="cm-section-block">
                            <div className="cm-section-block__header">
                              <span>📝 Bài viết (Markdown)</span>
                              <label className="cm-checkbox-label">
                                <input
                                  type="checkbox"
                                  className="cm-checkbox"
                                  checked={lessonForm.is_preview_article}
                                  disabled={!lessonForm.content.trim()}
                                  onChange={(e) =>
                                    setLessonForm((f) => ({
                                      ...f,
                                      is_preview_article: e.target.checked,
                                    }))
                                  }
                                />
                                <span>Cho xem thử</span>
                              </label>
                            </div>
                            <textarea
                              className="cm-textarea"
                              rows={5}
                              placeholder="# Tiêu đề&#10;Nội dung Markdown..."
                              value={lessonForm.content}
                              onChange={(e) =>
                                setLessonForm((f) => ({
                                  ...f,
                                  content: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="cm-section-block">
                            <div className="cm-section-block__header">
                              <span>📎 Tài liệu đính kèm</span>
                              <label className="cm-checkbox-label">
                                <input
                                  type="checkbox"
                                  className="cm-checkbox"
                                  checked={lessonForm.is_preview_resource}
                                  disabled={!hasAttachment}
                                  onChange={(e) =>
                                    setLessonForm((f) => ({
                                      ...f,
                                      is_preview_resource: e.target.checked,
                                    }))
                                  }
                                />
                                <span>Cho xem thử</span>
                              </label>
                            </div>
                            <div className="cm-row">
                              <div className="cm-field">
                                <label className="cm-label">Tên tài liệu</label>
                                <input
                                  className="cm-input"
                                  type="text"
                                  placeholder="Ví dụ: Slide bài 1.pdf"
                                  value={lessonForm.attachment_name}
                                  onChange={(e) =>
                                    setLessonForm((f) => ({
                                      ...f,
                                      attachment_name: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="cm-field">
                                <label className="cm-label">Upload file</label>
                                <input
                                  className="cm-input cm-input--file"
                                  type="file"
                                  onChange={(e) =>
                                    setLessonForm((f) => ({
                                      ...f,
                                      attachment: e.target.files?.[0] ?? null,
                                    }))
                                  }
                                />
                                {lessonForm.attachment && (
                                  <span className="cm-hint">
                                    📎 {lessonForm.attachment.name}
                                  </span>
                                )}
                                {isEdit &&
                                  !lessonForm.attachment &&
                                  lessonForm.existing_attachment && (
                                    <div className="cm-existing-file">
                                      <span>File hiện tại:</span>
                                      <a
                                        href={lessonForm.existing_attachment}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {lessonForm.attachment_name ||
                                          lessonForm.existing_attachment
                                            .split("/")
                                            .pop()}
                                      </a>
                                      <button
                                        type="button"
                                        className="cm-existing-file__delete"
                                        onClick={() =>
                                          setLessonForm((f) => ({
                                            ...f,
                                            existing_attachment: "",
                                            attachment_name: "",
                                            is_preview_resource: false,
                                          }))
                                        }
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                          {lessonError && (
                            <p className="cm-error">{lessonError}</p>
                          )}
                        </div>
                        <div className="cm-footer">
                          <button
                            className="cm-btn cm-btn--save"
                            onClick={handleSaveLesson}
                            disabled={savingLesson}
                          >
                            {savingLesson
                              ? "⏳ Đang lưu…"
                              : isEdit
                                ? "Lưu thay đổi"
                                : "Tạo bài học"}
                          </button>
                          <button
                            className="cm-btn cm-btn--cancel"
                            onClick={closeLessonModal}
                            disabled={savingLesson}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}

          {/* ════ QUIZZES ════ */}
          {activeTab === "quizzes" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý bài kiểm tra</h1>
                <p className="ad-page-sub">
                  {loadingQuizzes
                    ? "Đang tải…"
                    : `${quizzes.length} bài kiểm tra`}
                </p>
              </div>
              <div className="ad-toolbar">
                <div className="ad-filters">
                  <select
                    className="ad-select"
                    value={filterQuizLesson}
                    onChange={(e) => setFilterQuizLesson(e.target.value)}
                  >
                    <option value="">Tất cả bài học</option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                  {filterQuizLesson && (
                    <button
                      className="filter-clear"
                      onClick={() => setFilterQuizLesson("")}
                    >
                      ✕ Xoá lọc
                    </button>
                  )}
                </div>
                <button className="ad-btn-add-course" onClick={openAddQuiz}>
                  ＋ Thêm bài kiểm tra
                </button>
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Tên bài kiểm tra</th>
                      <th>Bài học</th>
                      <th>Điểm đạt</th>
                      <th>Thời gian</th>
                      <th>Câu hỏi</th>
                      <th>thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingQuizzes ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center" }}>
                          ⏳ Đang tải…
                        </td>
                      </tr>
                    ) : quizzes.filter(
                        (q) =>
                          !filterQuizLesson ||
                          String(q.lesson?.id ?? q.lesson) === filterQuizLesson,
                      ).length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          🔍 Không có bài kiểm tra nào.
                        </td>
                      </tr>
                    ) : (
                      quizzes
                        .filter(
                          (q) =>
                            !filterQuizLesson ||
                            String(q.lesson?.id ?? q.lesson) ===
                              filterQuizLesson,
                        )
                        .map((q) => {
                          const lesson = lessons.find(
                            (l) => l.id === (q.lesson?.id ?? q.lesson),
                          );
                          const isExpanded = expandedQuizId === q.id;
                          return (
                            <React.Fragment key={q.id}>
                              <tr>
                                <td>
                                  <span className="ad-table__title">
                                    {q.title}
                                  </span>
                                </td>
                                <td className="ad-table__muted">
                                  {lesson?.title ?? "—"}
                                </td>
                                <td>{q.pass_score}%</td>
                                <td>
                                  {q.time_limit > 0
                                    ? `${q.time_limit} phút`
                                    : "Không giới hạn"}
                                </td>
                                <td>
                                  <button
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#5ba4de",
                                      cursor: "pointer",
                                      fontSize: 13,
                                    }}
                                    onClick={() => {
                                      if (isExpanded) {
                                        setExpandedQuizId(null);
                                      } else {
                                        setExpandedQuizId(q.id);
                                        fetchQuestions(q.id);
                                      }
                                    }}
                                  >
                                    {isExpanded ? "▾ Ẩn" : "▸ Xem câu hỏi"}
                                  </button>
                                </td>
                                <td>
                                  <div className="ad-actions">
                                    <button
                                      className="ad-btn-sm ad-btn-sm--edit"
                                      onClick={() => openEditQuiz(q)}
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      className="ad-btn-sm"
                                      style={{
                                        color: "#5ba4de",
                                        borderColor: "rgba(91,164,222,0.3)",
                                      }}
                                      onClick={() => openAttemptList(q)}
                                    >
                                      Lịch sử
                                    </button>
                                    <button
                                      className="ad-btn-sm ad-btn-sm--approve"
                                      onClick={() => {
                                        setExpandedQuizId(
                                          isExpanded ? null : q.id,
                                        );
                                        if (!isExpanded) fetchQuestions(q.id);
                                      }}
                                    >
                                      {isExpanded
                                        ? "▾ Ẩn câu hỏi"
                                        : "▸ Câu hỏi"}
                                    </button>
                                    <button
                                      className="ad-btn-sm ad-btn-sm--delete"
                                      onClick={() => openDeleteQuiz(q)}
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={6} style={{ padding: 0 }}>
                                    <div
                                      style={{
                                        background: "rgba(27,38,59,0.6)",
                                        padding: "12px 20px",
                                        borderTop:
                                          "1px solid rgba(119,141,169,0.1)",
                                      }}
                                    >
                                      {loadingQ ? (
                                        <p className="ad-empty">
                                          Đang tải câu hỏi…
                                        </p>
                                      ) : questions.length === 0 ? (
                                        <p className="ad-empty">
                                          Chưa có câu hỏi nào.
                                        </p>
                                      ) : (
                                        questions.map((ques, idx) => (
                                          <div
                                            key={ques.id}
                                            style={{
                                              marginBottom: 10,
                                              padding: "10px 12px",
                                              background:
                                                "rgba(255,255,255,0.03)",
                                              borderRadius: 8,
                                              border:
                                                "0.5px solid rgba(255,255,255,0.07)",
                                            }}
                                          >
                                            <div
                                              style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                gap: 12,
                                              }}
                                            >
                                              <div style={{ flex: 1 }}>
                                                <span
                                                  style={{
                                                    fontSize: 12,
                                                    color:
                                                      "rgba(224,225,221,0.4)",
                                                  }}
                                                >
                                                  Câu {idx + 1} ·{" "}
                                                  {
                                                    (
                                                      {
                                                        single: "Chọn 1",
                                                        multiple: "Chọn nhiều",
                                                        true_false: "Đúng/Sai",
                                                      } as Record<
                                                        string,
                                                        string
                                                      >
                                                    )[ques.question_type]
                                                  }{" "}
                                                  · {ques.points} điểm
                                                </span>
                                                <p
                                                  style={{
                                                    fontSize: 13,
                                                    color: "#e0e1dd",
                                                    margin: "4px 0 6px",
                                                  }}
                                                >
                                                  {ques.content}
                                                </p>
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: 6,
                                                  }}
                                                >
                                                  {ques.answers?.map(
                                                    (a: any) => (
                                                      <span
                                                        key={a.id}
                                                        style={{
                                                          fontSize: 12,
                                                          padding: "2px 8px",
                                                          borderRadius: 5,
                                                          background:
                                                            a.is_correct
                                                              ? "rgba(76,175,130,0.15)"
                                                              : "rgba(255,255,255,0.04)",
                                                          color: a.is_correct
                                                            ? "#4caf82"
                                                            : "rgba(224,225,221,0.5)",
                                                          border: `0.5px solid ${a.is_correct ? "rgba(76,175,130,0.3)" : "rgba(255,255,255,0.08)"}`,
                                                        }}
                                                      >
                                                        {a.is_correct
                                                          ? "✓ "
                                                          : ""}
                                                        {a.content}
                                                      </span>
                                                    ),
                                                  )}
                                                </div>
                                              </div>
                                              <div className="ad-actions">
                                                <button
                                                  className="ad-btn-sm ad-btn-sm--edit"
                                                  onClick={() =>
                                                    openEditQuestion(ques)
                                                  }
                                                >
                                                  Sửa
                                                </button>
                                                <button
                                                  className="ad-btn-sm ad-btn-sm--delete"
                                                  onClick={() =>
                                                    openDeleteQuestion(ques)
                                                  }
                                                >
                                                  Xóa
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ))
                                      )}
                                      <button
                                        className="ad-btn-sm ad-btn-sm--approve"
                                        style={{ marginTop: 4 }}
                                        onClick={() => openAddQuestion(q.id)}
                                      >
                                        ＋ Thêm câu hỏi
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Quiz Modal */}
              {quizModal &&
                (() => {
                  if (quizModal === "delete")
                    return (
                      <div
                        className="cm-overlay"
                        onClick={(e) => {
                          if (e.target === e.currentTarget) closeQuizModal();
                        }}
                      >
                        <div className="cm-box cm-box--sm">
                          <div className="cm-header">
                            <h2 className="cm-title">
                              <span className="cm-title-icon cm-title-icon--del">
                                🗑
                              </span>
                              Xác nhận xóa
                            </h2>
                            <button
                              className="cm-close"
                              onClick={closeQuizModal}
                            >
                              ✕
                            </button>
                          </div>
                          <div className="cm-body">
                            <p className="cm-delete-desc">
                              Bạn có chắc muốn xóa:
                            </p>
                            <p className="cm-delete-name">
                              "{selectedQuiz?.title}"
                            </p>
                            <p className="cm-delete-warn">
                              ⚠ Tất cả câu hỏi và lịch sử làm bài sẽ bị xóa.
                            </p>
                            {quizError && (
                              <p className="cm-error">{quizError}</p>
                            )}
                          </div>
                          <div className="cm-footer">
                            <button
                              className="cm-btn cm-btn--danger"
                              onClick={handleDeleteQuiz}
                              disabled={savingQuiz}
                            >
                              {savingQuiz ? "⏳…" : "Xóa"}
                            </button>
                            <button
                              className="cm-btn cm-btn--cancel"
                              onClick={closeQuizModal}
                              disabled={savingQuiz}
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  const isEdit = quizModal === "edit";
                  return (
                    <div
                      className="cm-overlay"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) closeQuizModal();
                      }}
                    >
                      <div className="cm-box">
                        <div className="cm-header">
                          <h2 className="cm-title">
                            <span
                              className={`cm-title-icon cm-title-icon--${isEdit ? "edit" : "add"}`}
                            >
                              {isEdit ? "✏" : "＋"}
                            </span>
                            {isEdit
                              ? "Chỉnh sửa bài kiểm tra"
                              : "Tạo bài kiểm tra"}
                          </h2>
                          <button className="cm-close" onClick={closeQuizModal}>
                            ✕
                          </button>
                        </div>
                        <div className="cm-body cm-body--scroll">
                          <div className="cm-field">
                            <label className="cm-label">
                              Bài học <span className="cm-required">*</span>
                            </label>
                            <select
                              className="cm-select"
                              value={quizForm.lesson}
                              onKeyDown={blockNegative}
                              onChange={(e) =>
                                setQuizForm((f) => ({
                                  ...f,
                                  lesson: toPositiveInt(e.target.value),
                                }))
                              }
                            >
                              <option value="">-- Chọn bài học --</option>
                              {lessons.map((l) => {
                                const sec = sections.find(
                                  (s) => s.id === (l.section?.id ?? l.section),
                                );
                                const course = courses.find(
                                  (c) =>
                                    c.id === (sec?.course?.id ?? sec?.course),
                                );
                                return (
                                  <option key={l.id} value={l.id}>
                                    {course?.title ? `[${course.title}] ` : ""}
                                    {sec?.title ? `${sec.title} / ` : ""}
                                    {l.title}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <div className="cm-field">
                            <label className="cm-label">
                              Tên bài kiểm tra{" "}
                              <span className="cm-required">*</span>
                            </label>
                            <input
                              className="cm-input"
                              type="text"
                              placeholder="Ví dụ: Kiểm tra chương 1"
                              value={quizForm.title}
                              onChange={(e) =>
                                setQuizForm((f) => ({
                                  ...f,
                                  title: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="cm-field">
                            <label className="cm-label">Hướng dẫn</label>
                            <textarea
                              className="cm-textarea"
                              rows={2}
                              value={quizForm.description}
                              onChange={(e) =>
                                setQuizForm((f) => ({
                                  ...f,
                                  description: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="cm-row">
                            <div className="cm-field">
                              <label className="cm-label">Điểm đạt (%)</label>
                              <input
                                className="cm-input"
                                type="number"
                                min={0}
                                max={100}
                                value={quizForm.pass_score}
                                onKeyDown={blockNegative}
                                onChange={(e) => setQuizForm((f) => ({ ...f, pass_score: toPositiveInt(e.target.value) }))}
                              />
                            </div>
                            <div className="cm-field">
                              <label className="cm-label">
                                Thời gian (phút){" "}
                                <span className="cm-hint">
                                  — 0 = không giới hạn
                                </span>
                              </label>
                              <input
                                className="cm-input"
                                type="number"
                                min={0}
                                value={quizForm.time_limit}
                                onKeyDown={blockNegative}
                                onChange={(e) =>
                                  setQuizForm((f) => ({
                                    ...f,
                                    time_limit: toPositiveInt(e.target.value),
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="cm-field">
                            <label className="cm-label">
                              Số lần làm tối đa{" "}
                              <span className="cm-hint">
                                — 0 = không giới hạn
                              </span>
                            </label>
                            <input
                              className="cm-input"
                              type="number"
                              min={0}
                              value={quizForm.max_attempts}
                              onKeyDown={blockNegative}
                              onChange={(e) =>
                                setQuizForm((f) => ({
                                  ...f,
                                  max_attempts: toPositiveInt(e.target.value),
                                }))
                              }
                            />
                          </div>
                          {quizError && <p className="cm-error">{quizError}</p>}
                        </div>
                        <div className="cm-footer">
                          <button
                            className="cm-btn cm-btn--save"
                            onClick={handleSaveQuiz}
                            disabled={savingQuiz}
                          >
                            {savingQuiz
                              ? "⏳…"
                              : isEdit
                                ? "Lưu thay đổi"
                                : "Tạo bài kiểm tra"}
                          </button>
                          <button
                            className="cm-btn cm-btn--cancel"
                            onClick={closeQuizModal}
                            disabled={savingQuiz}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* Question Modal */}
              {questionModal &&
                (() => {
                  if (questionModal === "delete")
                    return (
                      <div
                        className="cm-overlay"
                        onClick={(e) => {
                          if (e.target === e.currentTarget)
                            closeQuestionModal();
                        }}
                      >
                        <div className="cm-box cm-box--sm">
                          <div className="cm-header">
                            <h2 className="cm-title">
                              <span className="cm-title-icon cm-title-icon--del">
                                🗑
                              </span>
                              Xóa câu hỏi
                            </h2>
                            <button
                              className="cm-close"
                              onClick={closeQuestionModal}
                            >
                              ✕
                            </button>
                          </div>
                          <div className="cm-body">
                            <p className="cm-delete-desc">Xóa câu hỏi:</p>
                            <p className="cm-delete-name">
                              "{selectedQ?.content?.slice(0, 80)}"
                            </p>
                            {questionError && (
                              <p className="cm-error">{questionError}</p>
                            )}
                          </div>
                          <div className="cm-footer">
                            <button
                              className="cm-btn cm-btn--danger"
                              onClick={handleDeleteQuestion}
                              disabled={savingQ}
                            >
                              {savingQ ? "⏳…" : "Xóa"}
                            </button>
                            <button
                              className="cm-btn cm-btn--cancel"
                              onClick={closeQuestionModal}
                              disabled={savingQ}
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  const isEdit = questionModal === "edit";
                  return (
                    <div
                      className="cm-overlay"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) closeQuestionModal();
                      }}
                    >
                      <div className="cm-box">
                        <div className="cm-header">
                          <h2 className="cm-title">
                            <span
                              className={`cm-title-icon cm-title-icon--${isEdit ? "edit" : "add"}`}
                            >
                              {isEdit ? "✏" : "＋"}
                            </span>
                            {isEdit ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi"}
                          </h2>
                          <button
                            className="cm-close"
                            onClick={closeQuestionModal}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="cm-body cm-body--scroll">
                          <div className="cm-row">
                            <div className="cm-field">
                              <label className="cm-label">Loại câu hỏi</label>
                              <select
                                className="cm-select"
                                value={questionForm.question_type}
                                onChange={(e) =>
                                  setQuestionForm((f) => ({
                                    ...f,
                                    question_type: e.target.value,
                                  }))
                                }
                              >
                                <option value="single">Chọn 1 đáp án</option>
                                <option value="multiple">
                                  Chọn nhiều đáp án
                                </option>
                                <option value="true_false">Đúng / Sai</option>
                              </select>
                            </div>
                            <div className="cm-field">
                              <label className="cm-label">Điểm</label>
                              <input
                                className="cm-input"
                                type="number"
                                min={1}
                                value={questionForm.points}
                                onChange={(e) =>
                                  setQuestionForm((f) => ({
                                    ...f,
                                    points: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="cm-field">
                              <label className="cm-label">Thứ tự</label>
                              <input
                                className="cm-input"
                                type="number"
                                min={1}
                                value={questionForm.order_index}
                                onKeyDown={blockNegative}
                                onChange={(e) =>
                                  setQuestionForm((f) => ({
                                    ...f,
                                    order_index: toPositiveInt(e.target.value),
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="cm-field">
                            <label className="cm-label">
                              Nội dung câu hỏi{" "}
                              <span className="cm-required">*</span>
                            </label>
                            <textarea
                              className="cm-textarea"
                              rows={3}
                              value={questionForm.content}
                              onChange={(e) =>
                                setQuestionForm((f) => ({
                                  ...f,
                                  content: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="cm-field">
                            <label className="cm-label">
                              Giải thích đáp án
                            </label>
                            <textarea
                              className="cm-textarea"
                              rows={2}
                              value={questionForm.explanation}
                              onChange={(e) =>
                                setQuestionForm((f) => ({
                                  ...f,
                                  explanation: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="cm-field">
                            <label className="cm-label">
                              Đáp án <span className="cm-required">*</span>
                            </label>
                            {questionForm.answers.map((ans, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  marginBottom: 8,
                                }}
                              >
                                <input
                                  type={
                                    questionForm.question_type === "multiple"
                                      ? "checkbox"
                                      : "radio"
                                  }
                                  checked={ans.is_correct}
                                  onChange={(e) => {
                                    const next = [...questionForm.answers];
                                    if (
                                      questionForm.question_type !== "multiple"
                                    )
                                      next.forEach((a, i) => {
                                        next[i] = { ...a, is_correct: false };
                                      });
                                    next[idx] = {
                                      ...next[idx],
                                      is_correct: e.target.checked,
                                    };
                                    setQuestionForm((f) => ({
                                      ...f,
                                      answers: next,
                                    }));
                                  }}
                                  style={{
                                    flexShrink: 0,
                                    accentColor: "#4caf82",
                                  }}
                                />
                                <input
                                  className="cm-input"
                                  type="text"
                                  placeholder={`Đáp án ${idx + 1}`}
                                  value={ans.content}
                                  onChange={(e) => {
                                    const next = [...questionForm.answers];
                                    next[idx] = {
                                      ...next[idx],
                                      content: e.target.value,
                                    };
                                    setQuestionForm((f) => ({
                                      ...f,
                                      answers: next,
                                    }));
                                  }}
                                  style={{ flex: 1 }}
                                />
                                {questionForm.answers.length > 2 && (
                                  <button
                                    onClick={() =>
                                      setQuestionForm((f) => ({
                                        ...f,
                                        answers: f.answers.filter(
                                          (_, i) => i !== idx,
                                        ),
                                      }))
                                    }
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#e07a5f",
                                      cursor: "pointer",
                                      fontSize: 16,
                                      padding: "0 4px",
                                    }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() =>
                                setQuestionForm((f) => ({
                                  ...f,
                                  answers: [
                                    ...f.answers,
                                    {
                                      content: "",
                                      is_correct: false,
                                      order_index: f.answers.length,
                                    },
                                  ],
                                }))
                              }
                              style={{
                                fontSize: 12,
                                color: "#5ba4de",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px 0",
                              }}
                            >
                              ＋ Thêm đáp án
                            </button>
                          </div>
                          {questionError && (
                            <p className="cm-error">{questionError}</p>
                          )}
                        </div>
                        <div className="cm-footer">
                          <button
                            className="cm-btn cm-btn--save"
                            onClick={handleSaveQuestion}
                            disabled={savingQ}
                          >
                            {savingQ
                              ? "⏳…"
                              : isEdit
                                ? "Lưu thay đổi"
                                : "Thêm câu hỏi"}
                          </button>
                          <button
                            className="cm-btn cm-btn--cancel"
                            onClick={closeQuestionModal}
                            disabled={savingQ}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {renderAttemptModal()}
            </div>
          )}

          {/* ════ ENROLLMENTS ════ */}
          {activeTab === "enrollments" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Đăng ký học</h1>
                <p className="ad-page-sub">
                  {loadingEnrollments
                    ? "Đang tải…"
                    : `${filteredEnrollments.length} / ${enrollments.length} lượt đăng ký`}
                </p>
              </div>
              <div className="ad-filters">
                <input
                  className="ad-search"
                  type="search"
                  placeholder="Tìm theo tên học viên, khóa học..."
                  value={searchEnrollment}
                  onChange={(e) => setSearchEnrollment(e.target.value)}
                />
                <select
                  className="ad-select"
                  value={filterEnrollStatus}
                  onChange={(e) => setFilterEnrollStatus(e.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="active">Đang học</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã huỷ</option>
                </select>
                {(searchEnrollment || filterEnrollStatus) && (
                  <button
                    className="filter-clear"
                    onClick={() => {
                      setSearchEnrollment("");
                      setFilterEnrollStatus("");
                    }}
                  >
                    ✕ Xoá lọc
                  </button>
                )}
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Khóa học</th>
                      <th>Ngày đăng ký</th>
                      <th>Tiến độ</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingEnrollments ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center" }}>
                          ⏳ Đang tải…
                        </td>
                      </tr>
                    ) : filteredEnrollments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          🔍 Không tìm thấy lượt đăng ký phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredEnrollments.map((e) => {
                        const status = e.status ?? "active";
                        const progress =
                          e.progress_pct ?? e.progress_percent ?? null;
                        const ENROLL_STATUS: Record<string, string> = {
                          active: "Đang học",
                          completed: "Hoàn thành",
                          cancelled: "Đã huỷ",
                          refunded: "Đã hoàn tiền",
                        };
                        const ENROLL_BADGE: Record<string, string> = {
                          active: "ad-badge--status-active",
                          completed: "ad-badge--pay-success",
                          cancelled: "ad-badge--status-banned",
                          refunded: "ad-badge--pay-refunded",
                        };
                        return (
                          <tr key={e.id}>
                            <td>
                              <div className="ad-user-cell">
                                <span className="ad-user-cell__name">
                                  {e.student_name ??
                                    e.student?.full_name ??
                                    "—"}
                                </span>
                                <span className="ad-user-cell__email">
                                  {e.student_email ?? e.student?.email ?? ""}
                                </span>
                              </div>
                            </td>
                            <td className="ad-table__title">
                              {e.course_title ?? e.course?.title ?? "—"}
                            </td>
                            <td className="ad-table__muted">
                              {e.enrolled_at
                                ? new Date(e.enrolled_at).toLocaleDateString(
                                    "vi-VN",
                                  )
                                : "—"}
                            </td>
                            <td>
                              {progress !== null ? (
                                <div className="ad-progress">
                                  <div className="ad-progress__bar">
                                    <div
                                      className="ad-progress__fill"
                                      style={{
                                        width: `${Math.min(100, Math.round(progress))}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="ad-progress__label">
                                    {Math.round(progress)}%
                                  </span>
                                </div>
                              ) : (
                                <span
                                  style={{
                                    color: "var(--color-text-secondary)",
                                    fontSize: 12,
                                  }}
                                >
                                  —
                                </span>
                              )}
                            </td>
                            <td>
                              <span
                                className={`ad-badge ${ENROLL_BADGE[status] ?? ""}`}
                              >
                                {ENROLL_STATUS[status] ?? status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════ PAYMENTS ════ */}
          {activeTab === "payments" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Thanh toán</h1>
                <p className="ad-page-sub">
                  {loadingPayments
                    ? "Đang tải…"
                    : `${filteredPayments.length} / ${payments.length} giao dịch`}
                </p>
              </div>
              <div className="ad-filters">
                <input
                  className="ad-search"
                  type="search"
                  placeholder="Tìm theo học viên, khóa học..."
                  value={searchPayment}
                  onChange={(e) => setSearchPayment(e.target.value)}
                />
                <select
                  className="ad-select"
                  value={filterPayStatus}
                  onChange={(e) => setFilterPayStatus(e.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="success">Thành công</option>
                  <option value="pending">Chờ xử lý</option>
                  <option value="refund_requested">Yêu cầu hoàn</option>
                  <option value="refunded">Đã hoàn tiền</option>
                  <option value="failed">Thất bại</option>
                </select>
                {(searchPayment || filterPayStatus) && (
                  <button
                    className="filter-clear"
                    onClick={() => {
                      setSearchPayment("");
                      setFilterPayStatus("");
                    }}
                  >
                    ✕ Xoá lọc
                  </button>
                )}
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Học viên</th>
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
                        <td colSpan={6} style={{ textAlign: "center" }}>
                          Đang tải…
                        </td>
                      </tr>
                    ) : filteredPayments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          🔍 Không có giao dịch nào.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((p) => {
                        const status = p.status ?? "pending";
                        return (
                          <tr key={p.id}>
                            <td>
                              <div className="ad-user-cell">
                                <span className="ad-user-cell__name">
                                  {p.student_name ?? "—"}
                                </span>
                                <span className="ad-user-cell__email">
                                  {p.student_email ?? ""}
                                </span>
                              </div>
                            </td>
                            <td className="ad-table__title">
                              {p.course_title ?? "—"}
                            </td>
                            <td style={{ color: "#4caf82", fontWeight: 600 }}>
                              {formatPrice(p.amount ?? p.price ?? 0, "VND")}
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
                                {STATUS_LABEL[status] ?? status}
                              </span>
                            </td>
                            <td>
                              <button
                                className="ad-btn-sm ad-btn-sm--view"
                                onClick={() => openPaymentDetail(p.id)}
                              >
                                Xem
                              </button>
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
                      {loadingDetail ? (
                        <div className="cm-loading">
                          <span className="cm-loading__spinner" />
                          <span>Đang tải…</span>
                        </div>
                      ) : !paymentDetail ? (
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
                              label: "Học viên",
                              value: paymentDetail.student_name ?? "—",
                            },
                            {
                              label: "Email",
                              value: paymentDetail.student_email ?? "—",
                            },
                            {
                              label: "Khóa học",
                              value: paymentDetail.course_title ?? "—",
                            },
                            {
                              label: "Số tiền",
                              value: formatPrice(
                                paymentDetail.amount ?? 0,
                                "VND",
                              ),
                            },
                            {
                              label: "Trạng thái",
                              value:
                                STATUS_LABEL[paymentDetail.status] ??
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
                              label: "Mã GD",
                              value:
                                paymentDetail.transaction_code ??
                                paymentDetail.id ??
                                "—",
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                padding: "8px 0",
                                borderBottom:
                                  "0.5px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
                                  color: "var(--color-text-secondary)",
                                }}
                              >
                                {item.label}
                              </span>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: "var(--color-text-primary)",
                                  textAlign: "right",
                                }}
                              >
                                {item.value}
                              </span>
                            </div>
                          ))}
                          {/* LÝ DO HOÀN TIỀN — thêm sau phần .map(item => ...) */}
                          {(paymentDetail.status === "refund_requested" ||
                          paymentDetail.status === "refund_approved" ||
                          paymentDetail.status === "refunded") && (
                            <div
                              style={{
                                marginTop: 4,
                                padding: "10px 12px",
                                borderRadius: 8,
                                background: "rgba(255, 193, 7, 0.07)",
                                border: "1px solid rgba(255, 193, 7, 0.22)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                              }}
                            >
                              <span>Lý do hoàn tiền</span>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 13,
                                  color: "var(--color-text-primary)",
                                  lineHeight: 1.6,
                                }}
                              >
                                {paymentDetail.refund_reason?.trim() ? (
                                  paymentDetail.refund_reason
                                ) : (
                                  <em
                                    style={{
                                      color: "var(--color-text-secondary)",
                                    }}
                                  >
                                    Học viên không để lại lý do.
                                  </em>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="cm-footer">
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

              {/* Yêu cầu hoàn tiền cần xác nhận */}
              {refundRequests.length > 0 && (
                <div className="id-form-card" style={{ marginTop: 20 }}>
                  <h3 className="id-form-card__title" style={{ color: '#f5a623' }}>
                    Yêu cầu hoàn tiền cần xác nhận ({refundRequests.length})
                  </h3>
                  <div className="ad-table-wrap" style={{ border: 'none', marginTop: 12 }}>
                    <table className="ad-table">
                      <thead>
                        <tr>
                          <th>Học viên</th><th>Khóa học</th><th>Số tiền hoàn</th><th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {refundRequests.map(r => (
                          <React.Fragment key={r.id}>
                            <tr>
                              <td><div className="ad-user-cell">
                                <span className="ad-user-cell__name">{r.student_name ?? '—'}</span>
                                <span className="ad-user-cell__email">{r.student_email ?? ''}</span>
                              </div></td>
                              <td className="ad-table__title">{r.course_title ?? '—'}</td>
                              <td style={{ color: '#e05c5c', fontWeight: 600 }}>
                                {formatPrice(r.amount ?? 0, 'VND')}
                              </td>
                              <td>
                                <button
                                  className="id-btn-primary"
                                  style={{ fontSize: 12, padding: '4px 12px' }}
                                  onClick={() => handleConfirmRefund(r.id)}
                                  disabled={confirmingRefund === r.id}
                                >
                                  {confirmingRefund === r.id ? 'Đang xử lý…' : 'Xác nhận hoàn tiền'}
                                </button>
                              </td>
                            </tr>
                            {/* Cảnh báo thiếu tiền */}
                            {refundShortage?.id === r.id && (
                              <tr>
                                <td colSpan={4}>
                                  <div style={{
                                    padding: '10px 14px', borderRadius: 8, margin: '4px 0',
                                    background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)',
                                  }}>
                                    <p style={{ color: '#e05c5c', fontSize: 13, margin: 0 }}>
                                      ⚠ {refundShortage.detail}
                                    </p>
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, margin: '4px 0 0' }}>
                                      Hạn chót: {refundShortage.deadline
                                        ? new Date(refundShortage.deadline).toLocaleString('vi-VN')
                                        : '2 ngày kể từ hôm nay'}
                                    </p>
                                    <button
                                      className="id-btn-sm"
                                      style={{ marginTop: 8 }}
                                      onClick={() => setActiveTab("wallet" as Tab)}
                                    >
                                      Nạp tiền ngay →
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          

          {/* ════ REVIEWS ════ */}
          {activeTab === "reviews" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Đánh giá khóa học</h1>
                <p className="ad-page-sub">
                  {loadingReviews
                    ? "Đang tải…"
                    : `${filteredReviews.length} / ${reviews.length} đánh giá`}
                </p>
              </div>
              <div className="ad-filters">
                <input
                  className="ad-search"
                  type="search"
                  placeholder="Tìm theo học viên, khóa học, nội dung..."
                  value={searchReview}
                  onChange={(e) => setSearchReview(e.target.value)}
                />
                <select
                  className="ad-select"
                  value={filterReviewRating}
                  onChange={(e) => setFilterReviewRating(e.target.value)}
                >
                  <option value="">Tất cả số sao</option>
                  {[5, 4, 3, 2, 1].map((s) => (
                    <option key={s} value={String(s)}>
                      {s} sao
                    </option>
                  ))}
                </select>
                <select
                  className="ad-select"
                  value={filterReviewCourse}
                  onChange={(e) => setFilterReviewCourse(e.target.value)}
                >
                  <option value="">Tất cả khóa học</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.title}>
                      {c.title}
                    </option>
                  ))}
                </select>
                {(searchReview || filterReviewRating || filterReviewCourse) && (
                  <button
                    className="filter-clear"
                    onClick={() => {
                      setSearchReview("");
                      setFilterReviewRating("");
                      setFilterReviewCourse("");
                    }}
                  >
                    ✕ Xoá lọc
                  </button>
                )}
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Khóa học</th>
                      <th>Số sao</th>
                      <th>Nhận xét</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingReviews ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center" }}>
                          ⏳ Đang tải…
                        </td>
                      </tr>
                    ) : filteredReviews.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          🔍 Không tìm thấy đánh giá nào.
                        </td>
                      </tr>
                    ) : (
                      filteredReviews.map((r) => (
                        <tr
                          key={r.id}
                          style={{ opacity: r.is_hidden ? 0.5 : 1 }}
                        >
                          <td>
                            <div className="ad-user-cell">
                              <span className="ad-user-cell__name">
                                {r.student_name ?? "—"}
                              </span>
                              <span className="ad-user-cell__email">
                                {r.student_email ?? ""}
                              </span>
                            </div>
                          </td>
                          <td className="ad-table__title">
                            {r.course_title ?? "—"}
                          </td>
                          <td>
                            <span style={{ color: "#f5a623" }}>
                              {"★".repeat(r.rating)}
                            </span>
                            <span style={{ color: "rgba(255,255,255,0.2)" }}>
                              {"☆".repeat(5 - r.rating)}
                            </span>
                          </td>
                          <td className="ad-table__muted" title={r.comment}>
                            {r.comment || <em>Không có nhận xét</em>}
                          </td>
                          <td>
                            {r.is_hidden ? (
                              <span className="ad-badge ad-review-badge--hidden">
                                Đã ẩn
                              </span>
                            ) : r.is_reported ? (
                              <span className="ad-badge ad-review-badge--reported">
                                🚩 Đã báo cáo
                              </span>
                            ) : (
                              <span className="ad-badge ad-review-badge--visible">
                                Hiển thị
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="ad-actions">
                              <button
                                className="ad-btn-sm"
                                onClick={() => openViewReview(r)}
                              >
                                Xem
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal xem chi tiết */}
              {reviewModal === "view" && selectedReview && (
                <div className="ad-modal-overlay" onClick={closeReviewModal}>
                  <div
                    className="ad-modal"
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxWidth: 500 }}
                  >
                    <h2 className="ad-modal__title">Chi tiết đánh giá</h2>
                    <div className="ad-modal__body">
                      {[
                        {
                          label: "Học viên",
                          value: `${selectedReview.student_name ?? "—"} ${selectedReview.student_email ? `(${selectedReview.student_email})` : ""}`,
                        },
                        {
                          label: "Khóa học",
                          value: selectedReview.course_title ?? "—",
                        },
                        {
                          label: "Ngày đánh giá",
                          value: selectedReview.created_at
                            ? new Date(
                                selectedReview.created_at,
                              ).toLocaleString("vi-VN")
                            : "—",
                        },
                      ].map((item) => (
                        <div key={item.label} className="ad-modal__field">
                          <span className="ad-modal__field-label">
                            {item.label}
                          </span>
                          <span className="ad-modal__field-value">
                            {item.value}
                          </span>
                        </div>
                      ))}
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Số sao</span>
                        <span>
                          <span style={{ color: "#f5a623" }}>
                            {"★".repeat(selectedReview.rating)}
                          </span>
                          <span style={{ color: "rgba(255,255,255,0.2)" }}>
                            {"☆".repeat(5 - selectedReview.rating)}
                          </span>
                        </span>
                      </div>
                      <div
                        className="ad-modal__field"
                        style={{ alignItems: "flex-start" }}
                      >
                        <span className="ad-modal__field-label">Nhận xét</span>
                        {selectedReview.comment ? (
                          <p
                            className="ad-modal__field-value--comment"
                            style={{ margin: 0, textAlign: "right" }}
                          >
                            {selectedReview.comment}
                          </p>
                        ) : (
                          <span className="ad-modal__field-value--empty">
                            Không có nhận xét
                          </span>
                        )}
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Trạng thái
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          {selectedReview.is_hidden ? (
                            <span className="ad-badge ad-review-badge--hidden">
                              Đang ẩn
                            </span>
                          ) : (
                            <span className="ad-badge ad-review-badge--visible">
                              Đang hiển thị
                            </span>
                          )}
                          {!selectedReview.is_hidden && (
                            <button
                              className="ad-btn-sm ad-btn-sm--refund"
                              onClick={() => {
                                if (
                                  selectedReview.is_reported ||
                                  selectedReview.report_dismissed
                                ) {
                                  alert(
                                    "Đánh giá này đã đạt giới hạn báo cáo, không thể báo cáo thêm.",
                                  );
                                  return;
                                }
                                closeReviewModal();
                                openReportModal(selectedReview);
                              }}
                            >
                              Báo cáo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ad-modal__footer">
                      <button
                        className="ad-modal__cancel"
                        onClick={closeReviewModal}
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal báo cáo đánh giá */}
              {reportModal && reportingReview && (
                <div
                  className="ad-modal-overlay"
                  onClick={() => !submittingReport && setReportModal(false)}
                >
                  <div
                    className="ad-modal"
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxWidth: 440 }}
                  >
                    <h2 className="ad-modal__title">Báo cáo đánh giá</h2>
                    <div className="ad-modal__body">
                      {/* Tóm tắt review bị báo cáo */}
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 8,
                          marginBottom: 12,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-secondary)",
                            marginBottom: 4,
                          }}
                        >
                          {reportingReview.student_name ?? "—"} ·{" "}
                          {reportingReview.course_title ?? "—"}
                        </div>
                        <div>
                          <span style={{ color: "#f5a623" }}>
                            {"★".repeat(reportingReview.rating)}
                          </span>
                          <span style={{ color: "rgba(255,255,255,0.15)" }}>
                            {"☆".repeat(5 - reportingReview.rating)}
                          </span>
                        </div>
                        {reportingReview.comment && (
                          <p
                            style={{
                              margin: "6px 0 0",
                              fontSize: 13,
                              color: "var(--color-text-primary)",
                              lineHeight: 1.5,
                            }}
                          >
                            "{reportingReview.comment}"
                          </p>
                        )}
                      </div>

                      {/* Ô nhập lý do */}
                      <label
                        style={{
                          fontSize: 13,
                          color: "var(--color-text-secondary)",
                          display: "block",
                          marginBottom: 6,
                        }}
                      >
                        Lý do báo cáo{" "}
                        <span style={{ color: "#f5a623" }}>*</span>
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Mô tả lý do bạn cho rằng đánh giá này vi phạm..."
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "var(--color-text-primary)",
                          fontSize: 13,
                          lineHeight: 1.6,
                          resize: "vertical",
                          outline: "none",
                        }}
                      />
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        Admin sẽ xem xét và quyết định có ẩn hoặc xóa đánh giá
                        này.
                      </p>
                    </div>
                    <div className="ad-modal__footer">
                      <button
                        className="ad-btn-sm ad-btn-sm--refund"
                        onClick={handleSubmitReport}
                        disabled={submittingReport || !reportReason.trim()}
                      >
                        {submittingReport ? "Đang gửi…" : "🚩 Gửi báo cáo"}
                      </button>
                      <button
                        className="ad-modal__cancel"
                        onClick={() => setReportModal(false)}
                        disabled={submittingReport}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ COURSE MODAL (cm-* styles, giống Admin) ════ */}
          {showCourseModal && (
            <div
              className="cm-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeModal();
              }}
            >
              <div className="cm-box">
                {/* Header */}
                <div className="cm-header">
                  <h2 className="cm-title">                    
                    {editingCourseId
                      ? "Chỉnh sửa khóa học"
                      : "Tạo khóa học mới"}
                  </h2>
                  <button className="cm-close" onClick={closeModal}>
                    ✕
                  </button>
                </div>

                {/* Body */}
                <div className="cm-body cm-body--scroll">
                  {editCourseLoading && !editCourseForm.title ? (
                    <div className="cm-loading">
                      <div className="cm-loading__spinner" />
                      Đang tải…
                    </div>
                  ) : (
                    <>
                      {/* Tên khóa học */}
                      <div className="cm-field">
                        <label className="cm-label">
                          Tên khóa học <span className="cm-required">*</span>
                        </label>
                        <input
                          className="cm-input"
                          placeholder="Ví dụ: Tiếng Anh giao tiếp cơ bản"
                          value={editCourseForm.title}
                          onChange={(e) =>
                            setEditCourseForm((f) => ({
                              ...f,
                              title: e.target.value,
                            }))
                          }
                        />
                      </div>

                      {/* Mô tả */}
                      <div className="cm-field">
                        <label className="cm-label">Mô tả chi tiết</label>
                        <textarea
                          className="cm-textarea"
                          rows={3}
                          placeholder="Mô tả nội dung, mục tiêu khóa học…"
                          value={editCourseForm.description}
                          onChange={(e) =>
                            setEditCourseForm((f) => ({
                              ...f,
                              description: e.target.value,
                            }))
                          }
                        />
                      </div>

                      {/* Ảnh bìa */}
                      <div className="cm-field">
                        <label className="cm-label">Ảnh bìa (thumbnail)</label>
                        {editingCourseId &&
                          !editCourseForm.thumbnail &&
                          (() => {
                            const src = thumbSrc(
                              courses.find((c) => c.id === editingCourseId)
                                ?.thumbnail ?? null,
                            );
                            return src ? (
                              <div className="cm-thumb-preview">
                                <img
                                  src={src}
                                  alt="Ảnh bìa hiện tại"
                                  className="cm-thumb-img"
                                />
                                <span className="cm-thumb-hint">
                                  Chọn file mới để thay thế
                                </span>
                              </div>
                            ) : null;
                          })()}
                        <input
                          className="cm-input cm-input--file"
                          type="file"
                          accept="image/*"
                          key={editingCourseId ?? "new"}
                          onChange={(e) =>
                            setEditCourseForm((f) => ({
                              ...f,
                              thumbnail: e.target.files?.[0] ?? null,
                            }))
                          }
                        />
                        {thumbPreviewUrl && (
                          <div className="cm-thumb-preview">
                            <img
                              src={thumbPreviewUrl}
                              alt="Xem trước"
                              className="cm-thumb-img"
                            />
                            <button
                              className="cm-thumb-remove"
                              onClick={() =>
                                setEditCourseForm((f) => ({
                                  ...f,
                                  thumbnail: null,
                                }))
                              }
                            >
                              ✕ Bỏ chọn
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Học phí + Giảm giá */}
                      <div className="cm-row">
                        <div className="cm-field">
                          <label className="cm-label">Học phí gốc (VNĐ)</label>
                          <input
                            className="cm-input"
                            type="number"
                            min={0}
                            value={editCourseForm.price}
                            onKeyDown={blockNegative}
                            onChange={(e) =>
                              setEditCourseForm((f) => ({
                                ...f,
                                price: toPositiveInt(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="cm-field">
                          <label className="cm-label">Giảm giá (%)</label>
                          <input
                            className="cm-input"
                            type="number"
                            min={0}
                            max={100}
                            value={editCourseForm.discount_percent}
                            onKeyDown={blockNegative}
                            onChange={(e) =>
                              setEditCourseForm((f) => ({
                                ...f,
                                discount_percent: toPositiveInt(e.target.value),
                              }))
                            }
                          />
                        </div>
                      </div>
                      <p className="cm-preview-price">
                        Giá bán: <strong>{previewSalePrice()}</strong>
                      </p>

                      {/* Trình độ + Trạng thái */}
                      <div className="cm-row">
                        <div className="cm-field">
                          <label className="cm-label">Trình độ</label>
                          <select
                            className="cm-select"
                            value={editCourseForm.level}
                            onKeyDown={blockNegative}
                            onChange={(e) =>
                              setEditCourseForm((f) => ({
                                ...f,
                                level: e.target.value,
                              }))
                            }
                          >
                            <option value="beginner">Cơ bản</option>
                            <option value="intermediate">Trung cấp</option>
                            <option value="advanced">Nâng cao</option>
                          </select>
                        </div>
                        <div className="cm-field">
                          <label className="cm-label">Trạng thái</label>
                          <select
                            className="cm-select"
                            value={editCourseForm.status}
                            onChange={(e) =>
                              setEditCourseForm((f) => ({
                                ...f,
                                status: e.target.value,
                              }))
                            }
                          >
                            <option value="draft">Nháp</option>
                            <option value="review">Chờ duyệt</option>
                          </select>
                        </div>
                      </div>

                      {/* Danh mục */}
                      <div className="cm-field">
                        <label className="cm-label">Danh mục</label>
                        <select
                          className="cm-select"
                          value={editCourseForm.category}
                          onChange={(e) =>
                            setEditCourseForm((f) => ({
                              ...f,
                              category: e.target.value,
                            }))
                          }
                        >
                          <option value="">-- Không có --</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={String(cat.id)}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Yêu cầu đầu vào */}
                      <div className="cm-field">
                        <label className="cm-label">Yêu cầu đầu vào</label>
                        <textarea
                          className="cm-textarea"
                          rows={2}
                          placeholder="Ví dụ: Biết đọc bảng chữ cái tiếng Anh…"
                          value={editCourseForm.requirements}
                          onChange={(e) =>
                            setEditCourseForm((f) => ({
                              ...f,
                              requirements: e.target.value,
                            }))
                          }
                        />
                      </div>

                      {/* Học được gì */}
                      <div className="cm-field">
                        <label className="cm-label">Học được gì</label>
                        <textarea
                          className="cm-textarea"
                          rows={2}
                          placeholder="Ví dụ: Giao tiếp tự tin trong các tình huống hàng ngày…"
                          value={editCourseForm.what_you_learn}
                          onChange={(e) =>
                            setEditCourseForm((f) => ({
                              ...f,
                              what_you_learn: e.target.value,
                            }))
                          }
                        />
                      </div>

                      {editCourseError && (
                        <p className="cm-error">{editCourseError}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="cm-footer">
                  <button
                    className="cm-btn cm-btn--save"
                    onClick={handleSaveCourse}
                    disabled={editCourseLoading}
                  >
                    {editCourseLoading
                      ? "⏳ Đang lưu…"
                      : editingCourseId
                        ? "Lưu thay đổi"
                        : "Tạo khóa học"}
                  </button>
                  <button
                    className="cm-btn cm-btn--cancel"
                    onClick={closeModal}
                    disabled={editCourseLoading}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════ WALLET ════ */}
          {activeTab === "wallet" && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Ví tiền</h1>
                <p className="id-page-sub">Doanh thu và yêu cầu rút tiền</p>
              </div>

              {loadingWallet ? (
                <p className="id-muted">Đang tải…</p>
              ) : (
                <>
                  {/* Số dư + nút toggle */}
                  <div className="id-form-card" style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Số dư hiện tại</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#4caf82', marginBottom: 12 }}>
                      {formatPrice(wallet?.balance ?? 0, 'VND')}
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className={walletPanel === 'deposit' ? 'id-btn-primary' : 'id-btn-secondary'}
                        onClick={() => setWalletPanel(p => p === 'deposit' ? null : 'deposit')}
                      >
                        💳 Nạp tiền
                      </button>
                      <button
                        className={walletPanel === 'withdraw' ? 'id-btn-primary' : 'id-btn-secondary'}
                        onClick={() => setWalletPanel(p => p === 'withdraw' ? null : 'withdraw')}
                      >
                        🏦 Rút tiền
                      </button>
                    </div>
                  </div>

                  {/* Panel Nạp tiền */}
                  {walletPanel === 'deposit' && (
                    <div className="id-form-card" style={{ marginBottom: 16 }}>
                      <h3 className="id-form-card__title">Nạp tiền (mock)</h3>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="id-field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                          <label className="id-field__label">Số tiền (VNĐ)</label>
                          <input className="id-field__input" type="number" min={10000}
                            placeholder="Tối thiểu 10,000đ"
                            value={depositAmount}
                            onChange={e => { setDepositAmount(e.target.value); setDepositError(''); setDepositSuccess(''); }}
                          />
                        </div>
                        <button className="id-btn-primary" onClick={handleDeposit} disabled={depositing}>
                          {depositing ? 'Đang nạp…' : 'Nạp tiền'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        {[50000, 100000, 200000, 500000].map(v => (
                          <button key={v} className="id-btn-sm"
                            onClick={() => { setDepositAmount(String(v)); setDepositError(''); setDepositSuccess(''); }}>
                            {formatPrice(v, 'VND')}
                          </button>
                        ))}
                      </div>
                      {depositError   && <p style={{ color: '#e05c5c', fontSize: 13, marginTop: 8 }}>⚠ {depositError}</p>}
                      {depositSuccess && <p style={{ color: '#4caf82', fontSize: 13, marginTop: 8 }}>✓ {depositSuccess}</p>}
                    </div>
                  )}

                  {/* Panel Rút tiền */}
                  {walletPanel === 'withdraw' && (
                    <div className="id-form-card" style={{ marginBottom: 16 }}>
                      <h3 className="id-form-card__title">Yêu cầu rút tiền</h3>
                      <div className="id-form-grid">
                        <div className="id-field">
                          <label className="id-field__label">Số tiền rút (VNĐ)</label>
                          <input className="id-field__input" type="number" min={50000}
                            placeholder="Tối thiểu 50,000đ"
                            value={withdrawForm.amount}
                            onChange={e => { setWithdrawForm(f => ({ ...f, amount: e.target.value })); setWalletError(''); setWalletSuccess(''); }}
                          />
                        </div>
                        <div className="id-field">
                          <label className="id-field__label">Tên ngân hàng</label>
                          <input className="id-field__input" placeholder="VD: Vietcombank"
                            value={withdrawForm.bank_name}
                            onChange={e => setWithdrawForm(f => ({ ...f, bank_name: e.target.value }))}
                          />
                        </div>
                        <div className="id-field">
                          <label className="id-field__label">Số tài khoản</label>
                          <input className="id-field__input" placeholder="0123456789"
                            value={withdrawForm.bank_account}
                            onChange={e => setWithdrawForm(f => ({ ...f, bank_account: e.target.value }))}
                          />
                        </div>
                        <div className="id-field">
                          <label className="id-field__label">Tên chủ tài khoản</label>
                          <input className="id-field__input" placeholder="NGUYEN VAN A"
                            value={withdrawForm.account_name}
                            onChange={e => setWithdrawForm(f => ({ ...f, account_name: e.target.value }))}
                          />
                        </div>
                      </div>
                      {walletError   && <p style={{ color: '#e05c5c', fontSize: 13, marginTop: 8 }}>⚠ {walletError}</p>}
                      {walletSuccess && <p style={{ color: '#4caf82', fontSize: 13, marginTop: 8 }}>✓ {walletSuccess}</p>}
                      <div className="id-form-actions">
                        <button className="id-btn-primary" onClick={handleWithdraw} disabled={withdrawing}>
                          {withdrawing ? 'Đang gửi…' : 'Gửi yêu cầu rút tiền'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lịch sử giao dịch (gộp ví + thanh toán) */}
                  <div className="id-form-card">
                    <h3 className="id-form-card__title">Lịch sử giao dịch</h3>
                    {walletTxs.length === 0 ? (
                      <p className="id-muted">Chưa có giao dịch nào.</p>
                    ) : (
                      <div className="id-table-wrap" style={{ border: 'none', marginTop: 12 }}>
                        <table className="id-table">
                          <thead>
                            <tr>
                              <th>Loại</th><th>Khóa học / Ghi chú</th><th>Số tiền</th><th>Số dư sau</th><th>Ngày</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Giao dịch ví */}
                            {walletTxs.map(tx => (
                              <tr key={`tx-${tx.id}`}>
                                <td>
                                  <span style={{
                                    fontSize: 12, padding: '2px 8px', borderRadius: 5,
                                    background: tx.amount > 0 ? 'rgba(76,175,130,0.15)' : 'rgba(224,92,92,0.15)',
                                    color: tx.amount > 0 ? '#4caf82' : '#e05c5c',
                                  }}>
                                    {tx.tx_type_display ?? tx.tx_type}
                                  </span>
                                </td>
                                <td className="ad-table__muted">{tx.note || '—'}</td>
                                <td style={{ fontWeight: 600, color: tx.amount > 0 ? '#4caf82' : '#e05c5c' }}>
                                  {tx.amount > 0 ? '+' : ''}{formatPrice(tx.amount, 'VND')}
                                </td>
                                <td>{formatPrice(tx.balance_after, 'VND')}</td>
                                <td className="ad-table__muted">
                                  {tx.created_at ? new Date(tx.created_at).toLocaleDateString('vi-VN') : '—'}
                                </td>
                              </tr>
                            ))}
                            {/* Lịch sử thanh toán khóa học */}
                            {payments.map(p => (
                              <tr key={`pay-${p.id}`}>
                                <td>
                                  <span style={{
                                    fontSize: 12, padding: '2px 8px', borderRadius: 5,
                                    background: 'rgba(91,141,238,0.15)',
                                    color: '#5b8dee',
                                  }}>
                                    Thanh toán
                                  </span>
                                </td>
                                <td className="ad-table__muted">{p.course_title ?? '—'} · {p.student_name ?? ''}</td>
                                <td style={{ fontWeight: 600, color: '#4caf82' }}>
                                  +{formatPrice(p.amount ?? 0, 'VND')}
                                </td>
                                <td className="ad-table__muted">—</td>
                                <td className="ad-table__muted">
                                  {p.created_at ? new Date(p.created_at).toLocaleDateString('vi-VN') : '—'}
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

          {/* ════ REFUNDS ════ */}
          {activeTab === "refunds" && (
            <div className="id-content">
              <div className="id-page-header">
                <h1 className="id-page-title">Hoàn tiền</h1>
                <p className="id-page-sub">
                  {loadingRefunds ? 'Đang tải…' : `${refundRequests.length} yêu cầu cần xác nhận`}
                </p>
              </div>
              {loadingRefunds ? (
                <p className="id-muted">Đang tải…</p>
              ) : refundRequests.length === 0 ? (
                <div className="id-form-card" style={{ textAlign: 'center', padding: '3rem 0' }}>
                  <p className="id-muted">Không có yêu cầu hoàn tiền nào cần xác nhận.</p>
                </div>
              ) : (
                <div className="id-form-card">
                  <h3 className="id-form-card__title" style={{ color: '#f5a623' }}>
                    Yêu cầu cần xác nhận ({refundRequests.length})
                  </h3>
                  <div className="id-table-wrap" style={{ border: 'none', marginTop: 12 }}>
                    <table className="id-table">
                      <thead>
                        <tr>
                          <th>Học viên</th>
                          <th>Khóa học</th>
                          <th>Số tiền gốc</th>
                          <th>Số tiền hoàn (70%)</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {refundRequests.map(r => (
                          <React.Fragment key={r.id}>
                            <tr>
                              <td>
                                <div className="ad-user-cell">
                                  <span className="ad-user-cell__name">{r.student_name ?? '—'}</span>
                                  <span className="ad-user-cell__email">{r.student_email ?? ''}</span>
                                </div>
                              </td>
                              <td>{r.course_title ?? '—'}</td>
                              <td style={{ color: 'var(--color-text-secondary)' }}>
                                {formatPrice(r.amount ?? 0, 'VND')}
                              </td>
                              <td style={{ color: '#e05c5c', fontWeight: 600 }}>
                                {formatPrice(Math.round((r.amount ?? 0) * 0.7), 'VND')}
                              </td>
                              <td>
                                <button
                                  className="id-btn-primary"
                                  style={{ fontSize: 12, padding: '4px 12px' }}
                                  onClick={() => handleConfirmRefund(r.id)}
                                  disabled={confirmingRefund === r.id}
                                >
                                  {confirmingRefund === r.id ? 'Đang xử lý…' : 'Xác nhận hoàn tiền'}
                                </button>
                              </td>
                            </tr>
                            {/* Cảnh báo thiếu tiền */}
                            {refundShortage?.id === r.id && (
                              <tr>
                                <td colSpan={5}>
                                  <div style={{
                                    padding: '10px 14px', borderRadius: 8, margin: '4px 0',
                                    background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)',
                                  }}>                                    
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, margin: '4px 0 0' }}>
                                      Hạn chót: {refundShortage.deadline
                                        ? new Date(refundShortage.deadline).toLocaleString('vi-VN')
                                        : '2 ngày kể từ hôm nay'}
                                    </p>
                                    <button
                                      className="id-btn-sm"
                                      style={{ marginTop: 8 }}
                                      onClick={() => setActiveTab("wallet" as Tab)}
                                    >
                                      Nạp tiền ngay →
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Toast ── */}
          {toast && (
            <div style={{
              position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
              padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              background: toast.type === 'success' ? 'rgba(76,175,130,0.95)' : 'rgba(224,92,92,0.95)',
              color: '#fff',
              animation: 'fadeInUp 0.2s ease',
            }}>
              {toast.msg}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default InstructorDashboard;
