import React, { useState, useEffect, useCallback } from "react";
import { formatPrice } from "../utils/format";

interface AdminDashboardProps {
  onNavigate: (page: string, courseId?: string) => void;
  onLogout: () => void;
}

const API = "http://127.0.0.1:8000";

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem("access");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const jsonH = (): Record<string, string> => ({
  "Content-Type": "application/json",
  ...authHeader(),
});

const toList = (data: any): any[] =>
  Array.isArray(data) ? data : (data?.results ?? []);

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab =
  | "overview"
  | "users"
  | "courses"
  | "sections"
  | "lessons"
  | "quizzes"
  | "enrollments"
  | "categories"
  | "reviews"
  | "payments";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "users", label: "Người dùng" },
  { id: "courses", label: "Khóa học" },
  { id: "sections", label: "Chương học" },
  { id: "lessons", label: "Bài học" },
  { id: "quizzes", label: "Bài kiểm tra" },
  { id: "enrollments", label: "Đăng ký học" },
  { id: "categories", label: "Danh mục" },
  { id: "reviews", label: "Đánh giá" },
  { id: "payments", label: "Thanh toán" },
];

const ROLE_LABEL: Record<string, string> = {
  student: "Học viên",
  instructor: "Giảng viên",
  admin: "Admin",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Hoạt động",
  banned: "Bị khóa",
  inactive: "Không HĐ",
  draft: "Nháp",
  review: "Chờ duyệt",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  success: "Thành công",
  pending: "Chờ xử lý",
  refunded: "Đã hoàn tiền",
  failed: "Thất bại",
  refund_approved: "Đã duyệt hoàn",
  refund_requested: "Yêu cầu hoàn",
};

// ── Course modal ──────────────────────────────────────────────────────────────
type CourseModalType = "add" | "edit" | "delete" | null;

interface CourseForm {
  title: string;
  description: string;
  price: number | string;
  discount_percent: number | string;
  level: string;
  status: string;
  category: string;
  instructor: string;
  requirements: string;
  what_you_learn: string;
  is_featured: boolean;
  thumbnail: File | null;
  published_at: string;
}

const EMPTY_FORM: CourseForm = {
  title: "",
  description: "",
  price: 0,
  discount_percent: 0,
  level: "beginner",
  status: "draft",
  category: "",
  instructor: "",
  requirements: "",
  what_you_learn: "",
  is_featured: false,
  thumbnail: null,
  published_at: "",
};

// ─────────────────────────────────────────────────────────────────────────────
const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // ── Data ────────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [revenueStats, setRevenueStats] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // ── Enrollment state ─────────────────────────────────────────────────────────
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [searchEnrollment, setSearchEnrollment] = useState("");
  const [filterEnrollStatus, setFilterEnrollStatus] = useState("");
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [searchUser, setSearchUser] = useState("");
  const [searchCourse, setSearchCourse] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortPrice, setSortPrice] = useState("");
  const [searchPayment, setSearchPayment] = useState("");
  const [filterPayStatus, setFilterPayStatus] = useState("");
  const [filterReported, setFilterReported] = useState("");

  // ── Course modal state ───────────────────────────────────────────────────────
  const [courseModal, setCourseModal] = useState<CourseModalType>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courseForm, setCourseForm] = useState<CourseForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [modalFilterCourse, setModalFilterCourse] = useState("");

  // ── Section state ────────────────────────────────────────────────────────────
  type SectionModalType = "add" | "edit" | "delete" | null;
  interface SectionForm {
    title: string;
    description: string;
    order_index: number | string;
    course: string;
  }
  const EMPTY_SECTION: SectionForm = {
    title: "",
    description: "",
    order_index: 0,
    course: "",
  };

  const [sections, setSections] = useState<any[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [sectionModal, setSectionModal] = useState<SectionModalType>(null);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [sectionForm, setSectionForm] = useState<SectionForm>(EMPTY_SECTION);
  const [sectionError, setSectionError] = useState("");
  const [savingSection, setSavingSection] = useState(false);
  const [filterSectionCourse, setFilterSectionCourse] = useState("");

  // ── Lesson state ──────────────────────────────────────────────────────────────
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

  // ── Quiz state ────────────────────────────────────────────────────────────────
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

  // Câu hỏi trong quiz đang chọn
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

  // ── Quiz Attempt (lịch sử làm bài) state ─────────────────────────────────────
  const [attemptModal, setAttemptModal] = useState<"list" | "detail" | null>(
    null,
  );
  const [selectedQuizForAttempt, setSelectedQuizForAttempt] =
    useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [loadingAttemptDetail, setLoadingAttemptDetail] = useState(false);

  // ── Category state ────────────────────────────────────────────────────────────
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [searchCategory, setSearchCategory] = useState("");
  const [categoryModal, setCategoryModal] = useState<
    "add" | "edit" | "delete" | null
  >(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    is_pinned: false,
    pin_order: 0,
  });
  const [categoryError, setCategoryError] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // ── Review state ──────────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [searchReview, setSearchReview] = useState("");
  const [filterReviewRating, setFilterReviewRating] = useState("");
  const [filterReviewCourse, setFilterReviewCourse] = useState("");
  const [reviewModal, setReviewModal] = useState<"view" | "delete" | null>(
    null,
  );
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [deletingReview, setDeletingReview] = useState(false);
  const [togglingReview, setTogglingReview] = useState(false);

  // Payment
  const [paymentDetail, setPaymentDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const openPaymentDetail = async (id: string) => {
    setShowPaymentModal(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API}/api/payments/admin/${id}/`, {
        headers: authHeader(),
      });
      if (res.ok) {
        setPaymentDetail(await res.json());
      } else {
        setPaymentDetail(null);
      }
    } catch {
      setPaymentDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closePaymentDetail = () => {
    setShowPaymentModal(false);
    setPaymentDetail(null);
  };

  // ── User view modal state
  const [userViewModal, setUserViewModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    full_name: "",
    email: "",
    username: "",
    password: "",
    role: "student",
  });
  const [addUserError, setAddUserError] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [courseEditAlerts, setCourseEditAlerts] = useState<any[]>([]);
  const getUserId = () => localStorage.getItem("user_id") ?? "unknown";
  const DISMISS_KEY = `admin_edit_alert_dismissed_${getUserId()}`;
  const [sessionDismissed, setSessionDismissed] = useState<Set<string>>(
    new Set(),
  );
  const [confirmModal, setConfirmModal] = useState<{
    type: "approve-refund" | "reject-refund";
    paymentId: string;
    studentName: string;
    courseName: string;
    amount: number;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [alertExpanded, setAlertExpanded] = useState(false);
  const PREVIEW_COUNT = 3;

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getDismissedMap = (): Record<string, string> => {
    try {
      return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
    } catch {
      return {};
    }
  };

  const dismissCourse = (courseId: string) => {
    setSessionDismissed((prev) => new Set([...prev, courseId]));
    setCourseEditAlerts((prev) => prev.filter((c) => c.id !== courseId));
  };

  const dismissAll = () => {
    const ids = new Set(courseEditAlerts.map((c) => c.id));
    setSessionDismissed((prev) => new Set([...prev, ...ids]));
    setCourseEditAlerts([]);
  };

  const openViewUser = (u: any) => {
    setSelectedUser(u);
    setUserViewModal(true);
  };
  const closeViewUser = () => {
    setUserViewModal(false);
    setSelectedUser(null);
  };

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API}/api/auth/users/`, {
        headers: authHeader(),
      });
      if (res.ok) setUsers(toList(await res.json()));
    } catch {}
    setLoadingUsers(false);
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const res = await fetch(`${API}/api/courses/admin/`, {
        headers: authHeader(),
      });
      if (res.ok) setCourses(toList(await res.json()));
    } catch {}
    setLoadingCourses(false);
  }, []);

  const fetchQuizzes = useCallback(async () => {
    setLoadingQuizzes(true);
    try {
      const res = await fetch(`${API}/api/quizzes/`, { headers: authHeader() });
      if (res.ok) setQuizzes(toList(await res.json()));
    } catch {}
    setLoadingQuizzes(false);
  }, []);

  const fetchQuestions = useCallback(async (quizId: string) => {
    setLoadingQ(true);
    try {
      const res = await fetch(`${API}/api/quizzes/${quizId}/questions/`, {
        headers: authHeader(),
      });
      if (res.ok) setQuestions(toList(await res.json()));
    } catch {}
    setLoadingQ(false);
  }, []);

  const fetchAttempts = useCallback(async (quizId: string) => {
    setLoadingAttempts(true);
    try {
      // Gọi với token admin — backend lọc theo student của request.user
      // Nếu backend có endpoint admin riêng thì đổi URL ở đây
      const res = await fetch(`${API}/api/quizzes/${quizId}/attempts/all/`, {
        headers: authHeader(),
      });
      if (res.ok) setAttempts(toList(await res.json()));
      else setAttempts([]);
    } catch {
      setAttempts([]);
    }
    setLoadingAttempts(false);
  }, []);

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
    // Nếu attempt chưa có questions thì gọi thêm — dùng lại QuizAttemptResultSerializer
    if (!attempt.questions) {
      setLoadingAttemptDetail(true);
      try {
        // Endpoint submit trả về result — ta dùng endpoint riêng nếu có,
        // hoặc lấy questions từ quiz hiện tại để map với answers_snapshot
        const res = await fetch(
          `${API}/api/quizzes/${selectedQuizForAttempt?.id ?? attempt.quiz_id}/questions/`,
          { headers: authHeader() },
        );
        if (res.ok) {
          const qs = toList(await res.json());
          setSelectedAttempt((prev: any) => ({ ...prev, _questions: qs }));
        }
      } catch {}
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

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${API}/api/payments/admin/stats/`, {
        headers: authHeader(),
      });
      if (res.ok) setRevenueStats(await res.json());
    } catch {}
    setLoadingStats(false);
  }, []);

  const fetchEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);
    try {
      const res = await fetch(`${API}/api/enrollments/admin/`, {
        headers: authHeader(),
      });
      if (res.ok) setEnrollments(toList(await res.json()));
    } catch {}
    setLoadingEnrollments(false);
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch(`${API}/api/payments/admin/`, {
        headers: authHeader(),
      });
      if (res.ok) setPayments(toList(await res.json()));
    } catch {}
    setLoadingPayments(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch(`${API}/api/courses/categories/`, {
        headers: authHeader(),
      });
      if (res.ok) setCategories(toList(await res.json()));
    } catch {}
    setLoadingCategories(false);
  }, []);

  const fetchInstructors = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/auth/users/?role=instructor`, {
        headers: authHeader(),
      });
      if (res.ok) setInstructors(toList(await res.json()));
    } catch {}
  }, []);

  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`${API}/api/courses/reviews/admin/`, {
        headers: authHeader(),
      });
      if (res.ok) setReviews(toList(await res.json()));
    } catch {}
    setLoadingReviews(false);
  }, []);

  const openViewReview = (r: any) => {
    setSelectedReview(r);
    setReviewModal("view");
  };
  const openDeleteReview = (r: any) => {
    setSelectedReview(r);
    setReviewModal("delete");
  };
  const closeReviewModal = () => {
    setReviewModal(null);
    setSelectedReview(null);
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;
    setDeletingReview(true);
    try {
      const res = await fetch(
        `${API}/api/courses/reviews/admin/${selectedReview.id}/`,
        {
          method: "DELETE",
          headers: authHeader(),
        },
      );
      if (res.ok || res.status === 204) {
        fetchReviews();
        closeReviewModal();
      }
    } catch {}
    setDeletingReview(false);
  };

  const handleToggleHide = async (review: any) => {
    setTogglingReview(true);
    try {
      const res = await fetch(
        `${API}/api/courses/reviews/admin/${review.id}/toggle-hide/`,
        { method: "POST", headers: authHeader() },
      );
      if (res.ok) {
        const updated = await res.json();
        setReviews((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
        if (selectedReview?.id === updated.id) setSelectedReview(updated);
      }
    } catch {}
    setTogglingReview(false);
  };

  const openAddCategory = () => {
    setCategoryForm({
      name: "",
      description: "",
      is_pinned: false,
      pin_order: 0,
    });
    setCategoryError("");
    setSelectedCategory(null);
    setCategoryModal("add");
  };
  const openEditCategory = (cat: any) => {
    setCategoryForm({
      name: cat.name ?? "",
      description: cat.description ?? "",
      is_pinned: cat.is_pinned ?? false,
      pin_order: cat.pin_order ?? 0,
    });
    setCategoryError("");
    setSelectedCategory(cat);
    setCategoryModal("edit");
  };
  const openDeleteCategory = (cat: any) => {
    setSelectedCategory(cat);
    setCategoryError("");
    setCategoryModal("delete");
  };
  const closeCategoryModal = () => {
    setCategoryModal(null);
    setSelectedCategory(null);
    setCategoryError("");
  };
  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      setCategoryError("Tên danh mục không được để trống.");
      return;
    }
    setSavingCategory(true);
    setCategoryError("");
    try {
      const url =
        categoryModal === "add"
          ? `${API}/api/courses/categories/`
          : `${API}/api/courses/categories/${selectedCategory.id}/`;
      const method = categoryModal === "add" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: jsonH(),
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim(),
          is_pinned: categoryForm.is_pinned,
          pin_order: Number(categoryForm.pin_order),
        }),
      });
      if (res.ok) {
        fetchCategories();
        closeCategoryModal();
      } else {
        const err = await res.json().catch(() => ({}));
        setCategoryError(
          err?.detail ?? err?.name?.[0] ?? `Lỗi HTTP ${res.status}`,
        );
      }
    } catch {
      setCategoryError("Lỗi kết nối. Vui lòng thử lại.");
    }
    setSavingCategory(false);
  };
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    setSavingCategory(true);
    try {
      const res = await fetch(
        `${API}/api/courses/categories/${selectedCategory.id}/`,
        {
          method: "DELETE",
          headers: authHeader(),
        },
      );
      if (res.ok || res.status === 204) {
        fetchCategories();
        closeCategoryModal();
      } else setCategoryError("Xóa thất bại. Danh mục có thể đang được dùng.");
    } catch {
      setCategoryError("Lỗi kết nối.");
    }
    setSavingCategory(false);
  };

  const fetchSections = useCallback(async () => {
    setLoadingSections(true);
    try {
      const res = await fetch(`${API}/api/courses/sections/`, {
        headers: authHeader(),
      });
      if (res.ok) setSections(toList(await res.json()));
    } catch {}
    setLoadingSections(false);
  }, []);

  const fetchLessons = useCallback(async () => {
    setLoadingLessons(true);
    try {
      const url = filterLessonSection
        ? `${API}/api/courses/lessons/admin/?section=${filterLessonSection}`
        : `${API}/api/courses/lessons/admin/`;
      const res = await fetch(url, { headers: authHeader() });
      if (res.ok) setLessons(toList(await res.json()));
    } catch {}
    setLoadingLessons(false);
  }, [filterLessonSection]);

  useEffect(() => {
    fetchLessons();
  }, [filterLessonSection]);

  useEffect(() => {
    fetchUsers();
    fetchCourses();
    fetchStats();
    fetchPayments();
    fetchCategories();
    fetchInstructors();
    fetchSections();
    fetchLessons();
    fetchQuizzes();
    fetchEnrollments();
    fetchReviews();
  }, []);

  // ── User actions ──────────────────────────────────────────────────────────
  const toggleUserStatus = async (user: any) => {
    const isBanned = user.is_active === false || user.status === "banned";
    try {
      await fetch(`${API}/api/auth/users/${user.id}/`, {
        method: "PATCH",
        headers: jsonH(),
        body: JSON.stringify({ is_active: isBanned }),
      });
      fetchUsers();
    } catch {}
  };

  const changeUserRole = async (user: any, newRole: string) => {
    if (user.role === newRole) return;
    try {
      await fetch(`${API}/api/auth/users/${user.id}/`, {
        method: "PATCH",
        headers: jsonH(),
        body: JSON.stringify({ role: newRole }),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)),
      );
      showToast(
        `Đã đổi vai trò "${user.full_name ?? user.username}" thành "${ROLE_LABEL[newRole]}"`,
      );
    } catch {
      showToast("Đổi vai trò thất bại", "error");
    }
  };

  const handleAddUser = async () => {
    if (
      !addUserForm.email.trim() ||
      !addUserForm.username.trim() ||
      !addUserForm.password.trim()
    ) {
      setAddUserError("Vui lòng điền đầy đủ thông tin bắt buộc.");
      return;
    }
    setSavingUser(true);
    setAddUserError("");
    try {
      const res = await fetch(`${API}/api/auth/users/`, {
        method: "POST",
        headers: jsonH(),
        body: JSON.stringify({
          full_name: addUserForm.full_name.trim(),
          email: addUserForm.email.trim(),
          username: addUserForm.username.trim(),
          password: addUserForm.password,
          role: addUserForm.role,
        }),
      });
      if (res.ok) {
        fetchUsers();
        setShowAddUserModal(false);
        setAddUserForm({
          full_name: "",
          email: "",
          username: "",
          password: "",
          role: "student",
        });
        showToast("Tạo người dùng thành công");
      } else {
        const err = await res.json().catch(() => ({}));
        setAddUserError(
          err?.detail ??
            err?.email?.[0] ??
            err?.username?.[0] ??
            `Lỗi HTTP ${res.status}`,
        );
      }
    } catch {
      setAddUserError("Lỗi kết nối.");
    }
    setSavingUser(false);
  };

  // ── Course status actions ─────────────────────────────────────────────────
  const approveCourse = async (id: string) => {
    try {
      await fetch(`${API}/api/courses/admin/${id}/approve/`, {
        method: "PATCH",
        headers: authHeader(),
      });
      fetchCourses();
    } catch {}
  };

  const rejectCourse = async (id: string) => {
    try {
      await fetch(`${API}/api/courses/admin/${id}/reject/`, {
        method: "PATCH",
        headers: authHeader(),
      });
      fetchCourses();
    } catch {}
  };

  const archiveCourse = async (id: string) => {
    try {
      await fetch(`${API}/api/courses/admin/${id}/archive/`, {
        method: "PATCH",
        headers: authHeader(),
      });
      fetchCourses();
    } catch {}
  };

  const unarchiveCourse = async (id: string) => {
    try {
      await fetch(`${API}/api/courses/admin/${id}/unarchive/`, {
        method: "PATCH",
        headers: authHeader(),
      });
      fetchCourses();
    } catch {}
  };

  // ── Course CRUD helpers ───────────────────────────────────────────────────
  const openAdd = () => {
    setCourseForm({ ...EMPTY_FORM });
    setFormError("");
    setSelectedCourse(null);
    setCourseModal("add");
  };

  const openEdit = async (c: any) => {
    setFormError("");
    setSelectedCourse(c);
    setCourseForm({ ...EMPTY_FORM, title: c.title ?? "" });
    setCourseModal("edit");
    setEditLoading(true);

    try {
      const res = await fetch(`${API}/api/courses/admin/${c.id}/`, {
        headers: authHeader(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();

      const categoryId =
        typeof d.category === "object" && d.category !== null
          ? (d.category.id ?? "")
          : (d.category ?? "");

      const instructorId =
        typeof d.instructor === "object" && d.instructor !== null
          ? (d.instructor.id ?? "")
          : (d.instructor ?? "");

      setCourseForm({
        title: d.title ?? "",
        description: d.description ?? "",
        price: d.price ?? 0,
        discount_percent: d.discount_percent ?? 0,
        level: d.level ?? "beginner",
        status: d.status ?? "draft",
        category: String(categoryId),
        instructor: String(instructorId),
        requirements: d.requirements ?? "",
        what_you_learn: d.what_you_learn ?? "",
        thumbnail: null,
        is_featured: Boolean(d.is_featured),
        published_at: d.published_at
          ? new Date(d.published_at).toISOString().slice(0, 16)
          : "",
      });
      setSelectedCourse(d);
    } catch (e: any) {
      setFormError(`Không thể tải thông tin khóa học: ${e.message}`);
    }
    setEditLoading(false);
  };

  const openDelete = (c: any) => {
    setSelectedCourse(c);
    setFormError("");
    setCourseModal("delete");
  };

  const closeModal = () => {
    setCourseModal(null);
    setSelectedCourse(null);
    setFormError("");
    setCourseForm((f) => ({ ...f, thumbnail: null }));
  };

  const validate = (): boolean => {
    if (!String(courseForm.title).trim()) {
      setFormError("Tên khóa học không được để trống.");
      return false;
    }
    if (Number(courseForm.price) < 0) {
      setFormError("Học phí không hợp lệ.");
      return false;
    }
    if (
      Number(courseForm.discount_percent) < 0 ||
      Number(courseForm.discount_percent) > 100
    ) {
      setFormError("Phần trăm giảm giá phải từ 0 đến 100.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormError("");
    try {
      const hasNewThumb = Boolean(courseForm.thumbnail);
      let body: FormData | string;
      let headers: Record<string, string>;

      if (hasNewThumb) {
        const fd = new FormData();
        fd.append("title", String(courseForm.title).trim());
        fd.append("description", String(courseForm.description).trim());
        fd.append("price", String(Number(courseForm.price)));
        fd.append(
          "discount_percent",
          String(Number(courseForm.discount_percent)),
        );
        fd.append("level", courseForm.level);
        fd.append("status", courseForm.status);
        fd.append("requirements", String(courseForm.requirements).trim());
        fd.append("what_you_learn", String(courseForm.what_you_learn).trim());
        fd.append("is_featured", courseForm.is_featured ? "True" : "False");
        if (courseForm.category) fd.append("category", courseForm.category);
        if (courseForm.instructor)
          fd.append("instructor", courseForm.instructor);
        if (courseForm.thumbnail) fd.append("thumbnail", courseForm.thumbnail);
        if (courseForm.published_at) {
          fd.append(
            "published_at",
            new Date(courseForm.published_at).toISOString(),
          );
        }
        body = fd;
        headers = authHeader();
      } else {
        const payload: Record<string, any> = {
          title: String(courseForm.title).trim(),
          description: String(courseForm.description).trim(),
          price: Number(courseForm.price),
          discount_percent: Number(courseForm.discount_percent),
          level: courseForm.level,
          status: courseForm.status,
          requirements: String(courseForm.requirements).trim(),
          what_you_learn: String(courseForm.what_you_learn).trim(),
          is_featured: courseForm.is_featured,
        };
        if (courseForm.category) payload.category = courseForm.category;
        if (courseForm.instructor) payload.instructor = courseForm.instructor;
        if (courseForm.published_at) {
          payload.published_at = new Date(
            courseForm.published_at,
          ).toISOString();
        } else {
          if (courseModal === "edit") payload.published_at = null;
        }
        body = JSON.stringify(payload);
        headers = jsonH();
      }

      const url =
        courseModal === "add"
          ? `${API}/api/courses/admin/`
          : `${API}/api/courses/admin/${selectedCourse.id}/`;

      const res = await fetch(url, {
        method: courseModal === "add" ? "POST" : "PATCH",
        headers,
        body,
      });

      if (res.ok) {
        fetchCourses();
        closeModal();
      } else {
        const err = await res.json().catch(() => ({}));
        const firstMsg = (obj: any): string => {
          if (!obj || typeof obj !== "object") return "";
          if (typeof obj === "string") return obj;
          for (const val of Object.values(obj)) {
            if (typeof val === "string") return val;
            if (Array.isArray(val) && val.length) return String(val[0]);
          }
          return "";
        };
        setFormError(
          err?.detail ??
            firstMsg(err) ??
            `Lưu thất bại (HTTP ${res.status}). Vui lòng thử lại.`,
        );
      }
    } catch {
      setFormError("Lỗi kết nối. Vui lòng thử lại.");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedCourse) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API}/api/courses/admin/${selectedCourse.id}/`,
        {
          method: "DELETE",
          headers: authHeader(),
        },
      );
      if (res.ok || res.status === 204) {
        fetchCourses();
        closeModal();
      } else {
        setFormError("Xóa thất bại. Vui lòng thử lại.");
      }
    } catch {
      setFormError("Lỗi kết nối. Vui lòng thử lại.");
    }
    setSaving(false);
  };

  // ── Section CRUD ──────────────────────────────────────────────────────────────
  const openAddSection = () => {
    setSectionForm({ ...EMPTY_SECTION, course: filterSectionCourse });
    setSectionError("");
    setSelectedSection(null);
    setSectionModal("add");
  };
  const openEditSection = (s: any) => {
    setSectionError("");
    setSelectedSection(s);
    setSectionForm({
      title: s.title ?? "",
      description: s.description ?? "",
      order_index: s.order_index ?? 0,
      course: String(s.course?.id ?? s.course ?? ""),
    });
    setSectionModal("edit");
  };
  const openDeleteSection = (s: any) => {
    setSelectedSection(s);
    setSectionError("");
    setSectionModal("delete");
  };
  const closeSectionModal = () => {
    setSectionModal(null);
    setSelectedSection(null);
    setSectionError("");
  };
  const handleSaveSection = async () => {
    if (!String(sectionForm.title).trim()) {
      setSectionError("Tên chương không được để trống.");
      return;
    }
    if (!sectionForm.course) {
      setSectionError("Vui lòng chọn khóa học.");
      return;
    }
    setSavingSection(true);
    setSectionError("");
    try {
      const payload = {
        title: String(sectionForm.title).trim(),
        description: String(sectionForm.description).trim(),
        order_index: Number(sectionForm.order_index),
        course: sectionForm.course,
      };
      const url =
        sectionModal === "add"
          ? `${API}/api/courses/sections/`
          : `${API}/api/courses/sections/${selectedSection.id}/`;
      const method = sectionModal === "add" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: jsonH(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchSections();
        closeSectionModal();
      } else {
        const err = await res.json().catch(() => ({}));
        setSectionError(
          err?.detail ?? err?.title?.[0] ?? `Lỗi HTTP ${res.status}`,
        );
      }
    } catch {
      setSectionError("Lỗi kết nối. Vui lòng thử lại.");
    }
    setSavingSection(false);
  };
  const handleDeleteSection = async () => {
    if (!selectedSection) return;
    setSavingSection(true);
    try {
      const res = await fetch(
        `${API}/api/courses/sections/${selectedSection.id}/`,
        {
          method: "DELETE",
          headers: authHeader(),
        },
      );
      if (res.ok || res.status === 204) {
        fetchSections();
        closeSectionModal();
      } else setSectionError("Xóa thất bại. Vui lòng thử lại.");
    } catch {
      setSectionError("Lỗi kết nối.");
    }
    setSavingSection(false);
  };

  // ── Lesson CRUD ───────────────────────────────────────────────────────────────
  const openAddLesson = (sectionId = "") => {
    setLessonForm({ ...EMPTY_LESSON, section: sectionId });
    setLessonError("");
    setSelectedLesson(null);
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
      existing_video_url: l.video_file ?? "", // ← URL video đã upload
      existing_attachment: l.attachment ?? "", // ← URL file đính kèm cũ
    });
    setLessonModal("edit");
  };
  const openDeleteLesson = (l: any) => {
    setSelectedLesson(l);
    setLessonError("");
    setLessonModal("delete");
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
        fd.append("section", lessonForm.section);
        fd.append("video_url", lessonForm.video_url);
        fd.append("content", lessonForm.content);
        fd.append("attachment_name", lessonForm.attachment_name);
        fd.append("order_index", String(Number(lessonForm.order_index)));
        if (lessonForm.video_file)
          fd.append("video_file", lessonForm.video_file);
        else if (deletingVideo) fd.append("video_file", "");
        if (lessonForm.attachment)
          fd.append("attachment", lessonForm.attachment);
        else if (deletingAttachment) fd.append("attachment", "");
        body = fd;
        headers = authHeader();
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
        headers = jsonH();
      }
      const url =
        lessonModal === "add"
          ? `${API}/api/courses/lessons/admin/`
          : `${API}/api/courses/lessons/admin/${selectedLesson.id}/`;
      const method = lessonModal === "add" ? "POST" : "PATCH";
      const res = await fetch(url, { method, headers, body });
      if (res.ok) {
        fetchLessons();
        closeLessonModal();
      } else {
        const err = await res.json().catch(() => ({}));
        setLessonError(
          err?.detail ?? err?.title?.[0] ?? `Lỗi HTTP ${res.status}`,
        );
      }
    } catch {
      setLessonError("Lỗi kết nối. Vui lòng thử lại.");
    }
    setSavingLesson(false);
  };
  const handleDeleteLesson = async () => {
    if (!selectedLesson) return;
    setSavingLesson(true);
    try {
      const res = await fetch(
        `${API}/api/courses/lessons/admin/${selectedLesson.id}/`,
        {
          method: "DELETE",
          headers: authHeader(),
        },
      );
      if (res.ok || res.status === 204) {
        fetchLessons();
        closeLessonModal();
      } else setLessonError("Xóa thất bại.");
    } catch {
      setLessonError("Lỗi kết nối.");
    }
    setSavingLesson(false);
  };

  // ── Quizze CRUD ───────────────────────────────────────────────────────────────
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
      setQuizError("Tên bài kiểm tra không được để trống.");
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
        headers: jsonH(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchQuizzes();
        closeQuizModal();
      } else {
        const err = await res.json().catch(() => ({}));
        setQuizError(
          err?.detail ?? err?.lesson?.[0] ?? `Lỗi HTTP ${res.status}`,
        );
      }
    } catch {
      setQuizError("Lỗi kết nối.");
    }
    setSavingQuiz(false);
  };
  const handleDeleteQuiz = async () => {
    if (!selectedQuiz) return;
    setSavingQuiz(true);
    try {
      const res = await fetch(`${API}/api/quizzes/${selectedQuiz.id}/`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (res.ok || res.status === 204) {
        fetchQuizzes();
        closeQuizModal();
      } else setQuizError("Xóa thất bại.");
    } catch {
      setQuizError("Lỗi kết nối.");
    }
    setSavingQuiz(false);
  };

  // ── Question CRUD ──
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
      setQuestionError("Nội dung câu hỏi không được để trống.");
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
        headers: jsonH(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (expandedQuizId) fetchQuestions(expandedQuizId);
        closeQuestionModal();
      } else {
        const err = await res.json().catch(() => ({}));
        setQuestionError(err?.detail ?? `Lỗi HTTP ${res.status}`);
      }
    } catch {
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
        headers: authHeader(),
      });
      if (res.ok || res.status === 204) {
        if (expandedQuizId) fetchQuestions(expandedQuizId);
        closeQuestionModal();
      } else setQuestionError("Xóa thất bại.");
    } catch {
      setQuestionError("Lỗi kết nối.");
    }
    setSavingQ(false);
  };

  // XÓA hai hàm cũ và thay bằng:

  const openApproveRefund = (p: any) => {
    setConfirmModal({
      type: "approve-refund",
      paymentId: p.id,
      studentName: p.student_name ?? "—",
      courseName: p.course_title ?? "—",
      amount: p.amount ?? 0,
    });
  };

  const openRejectRefund = (p: any) => {
    setConfirmModal({
      type: "reject-refund",
      paymentId: p.id,
      studentName: p.student_name ?? "—",
      courseName: p.course_title ?? "—",
      amount: p.amount ?? 0,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    setConfirmLoading(true);
    try {
      const endpoint =
        confirmModal.type === "approve-refund"
          ? `${API}/api/payments/admin/${confirmModal.paymentId}/approve-refund/`
          : `${API}/api/payments/admin/${confirmModal.paymentId}/reject-refund/`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: authHeader(),
      });
      if (res.ok) {
        showToast(
          confirmModal.type === "approve-refund"
            ? "✓ Đã duyệt hoàn tiền thành công"
            : "✓ Đã từ chối yêu cầu hoàn tiền",
          "success",
        );
        fetchPayments();
        fetchStats();
      } else {
        showToast(
          confirmModal.type === "approve-refund"
            ? "Duyệt hoàn tiền thất bại"
            : "Từ chối thất bại",
          "error",
        );
      }
    } catch {
      showToast("Lỗi kết nối. Vui lòng thử lại.", "error");
    }
    setConfirmLoading(false);
    setConfirmModal(null);
  };

  const handleDismissReport = async (review: any) => {
    try {
      const res = await fetch(
        `${API}/api/courses/reviews/admin/${review.id}/dismiss-report/`,
        { method: "POST", headers: authHeader() },
      );
      if (res.ok) {
        const updated = await res.json();
        setReviews((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
        setSelectedReview(updated); // cập nhật modal
      }
    } catch {}
  };

  // ── Derived / helpers ─────────────────────────────────────────────────────
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "");

  const filteredUsers = users.filter((u) => {
    const q = normalize(searchUser);
    return (
      normalize(u.full_name ?? u.name ?? u.username ?? "").includes(q) ||
      normalize(u.email ?? "").includes(q)
    );
  });

  const filteredCourses = courses
    .filter((c) => {
      const q = normalize(searchCourse);
      const matchSearch =
        !q ||
        normalize(c.title ?? "").includes(q) ||
        normalize(c.instructor_name ?? "").includes(q);
      const matchStatus = !filterStatus || c.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (!sortPrice) return 0;
      const pa = a.sale_price ?? a.price ?? 0;
      const pb = b.sale_price ?? b.price ?? 0;
      return sortPrice === "asc" ? pa - pb : pb - pa;
    });

  const filteredCategories = categories.filter((cat) => {
    const q = normalize(searchCategory);
    return !q || normalize(cat.name ?? "").includes(q);
  });

  const filteredEnrollments = enrollments.filter((e) => {
    const q = normalize(searchEnrollment);
    const matchSearch =
      !q ||
      normalize(
        e.student_name ?? e.user?.full_name ?? e.user?.username ?? "",
      ).includes(q) ||
      normalize(e.course_title ?? e.course?.title ?? "").includes(q);
    const matchStatus =
      !filterEnrollStatus || (e.status ?? "") === filterEnrollStatus;
    return matchSearch && matchStatus;
  });

  const filteredPayments = payments.filter((p) => {
    const q = normalize(searchPayment);
    const matchSearch =
      !q ||
      normalize(p.user_name ?? p.user?.name ?? p.user?.email ?? "").includes(
        q,
      ) ||
      normalize(p.course_title ?? p.course?.title ?? "").includes(q);
    const matchStatus = !filterPayStatus || p.status === filterPayStatus;
    return matchSearch && matchStatus;
  });

  const filteredReviews = reviews.filter((r) => {
    const q = normalize(searchReview);
    const matchSearch =
      !q ||
      normalize(
        r.student_name ?? r.student?.full_name ?? r.student?.username ?? "",
      ).includes(q) ||
      normalize(r.course_title ?? r.course?.title ?? "").includes(q) ||
      normalize(r.comment ?? "").includes(q);
    const matchRating =
      !filterReviewRating || String(r.rating) === filterReviewRating;
    const matchCourse =
      !filterReviewCourse ||
      normalize(r.course_title ?? r.course?.title ?? "").includes(
        normalize(filterReviewCourse),
      ) ||
      (r.course ?? "") === filterReviewCourse;
    const matchReported =
      !filterReported ||
      (filterReported === "reported" && r.is_reported) ||
      (filterReported === "hidden" && r.is_hidden) ||
      (filterReported === "visible" && !r.is_hidden && !r.is_reported);
    return matchSearch && matchRating && matchCourse && matchReported;
  });

  const pendingCourses = courses.filter((c) => c.status === "review");
  const approvedCourses = courses.filter((c) => c.status === "published");
  const totalRevenue =
    revenueStats?.total_revenue ?? revenueStats?.revenue ?? 0;
  const activeToday = revenueStats?.active_today ?? 0;

  const getUserStatus = (u: any) => {
    if (u.status) return u.status;
    return u.is_active === false ? "banned" : "active";
  };

  const catRevenueMap: Record<string, number> = {};
  courses.forEach((c) => {
    const price = c.sale_price ?? c.price ?? 0;
    if (price <= 0) return;
    const cat = c.category_name ?? "Khác";
    const refunded = c.refunded_count ?? 0;
    const students = Math.max((c.total_students ?? 0) - refunded, 0);
    const revenue = c.revenue ?? c.total_revenue ?? price * students;
    catRevenueMap[cat] = (catRevenueMap[cat] ?? 0) + revenue;
  });
  const catRevenueEntries = Object.entries(catRevenueMap).sort(
    (a, b) => b[1] - a[1],
  );
  const maxCatRevenue = catRevenueEntries[0]?.[1] ?? 1;

  const CAT_COLORS: Record<string, string> = {
    A1: "#4CAF82",
    A2: "#5BA4CF",
    B1: "#778DA9",
    B2: "#415A77",
    C1: "#2E4A6B",
    C2: "#1B263B",
  };

  const previewSalePrice = () => {
    const p = Number(courseForm.price) || 0;
    const d = Number(courseForm.discount_percent) || 0;
    if (p === 0) return "Miễn phí";
    if (d === 0) return formatPrice(p, "VND");
    return formatPrice(Math.round(p * (1 - d / 100)), "VND");
  };

  const [thumbPreviewUrl, setThumbPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!courseForm.thumbnail) {
      setThumbPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(courseForm.thumbnail);
    setThumbPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [courseForm.thumbnail]);

  useEffect(() => {
    if (!selectedUser || selectedUser.role !== "student") {
      setCertificates([]);
      return;
    }
    setLoadingCerts(true);
    fetch(
      `${API}/api/enrollments/admin/users/${selectedUser.id}/certificates/`,
      {
        headers: authHeader(),
      },
    )
      .then((r) => r.json())
      .then((data) =>
        setCertificates(Array.isArray(data) ? data : (data.results ?? [])),
      )
      .catch(() => setCertificates([]))
      .finally(() => setLoadingCerts(false));
  }, [selectedUser]);

  useEffect(() => {
    if (courses.length === 0) return;

    // Lấy thời điểm login của session TRƯỚC (lưu trước khi ghi đè)
    const prevLoginAt = localStorage.getItem("prev_login_at");

    const edited = courses.filter((c) => {
      if (c.status !== "published") return false;
      if (!c.updated_at || !c.published_at) return false;

      // Chỉ tính là "đã sửa" nếu updated_at > published_at + 5 giây
      const diff =
        new Date(c.updated_at).getTime() - new Date(c.published_at).getTime();
      if (diff <= 5000) return false;

      // Đã dismiss trong session này rồi → không hiện
      if (sessionDismissed.has(c.id)) return false;

      // Nếu có prev_login_at: chỉ hiện nếu updated_at xảy ra SAU lần login trước
      // (tức là người kia sửa trong lúc mình không đăng nhập)
      if (prevLoginAt) {
        const prevTime = new Date(prevLoginAt).getTime();
        const updatedTime = new Date(c.updated_at).getTime();
        if (updatedTime <= prevTime) return false;
      }

      return true;
    });

    setCourseEditAlerts(edited);
  }, [courses, sessionDismissed]);

  // Khi login thành công, trước khi ghi login_at mới:
  const currentLoginAt = localStorage.getItem("login_at");
  if (currentLoginAt) {
    localStorage.setItem("prev_login_at", currentLoginAt);
  }
  localStorage.setItem("login_at", new Date().toISOString());

  const renderModal = () => {
    if (!courseModal) return null;

    if (courseModal === "delete") {
      return (
        <div
          className="cm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="cm-box cm-box--sm">
            <div className="cm-header">
              <h2 className="cm-title">
                <span className="cm-title-icon cm-title-icon--del">🗑</span>
                Xác nhận xóa khóa học
              </h2>
              <button className="cm-close" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="cm-body">
              <p className="cm-delete-desc">Bạn có chắc muốn xóa khóa học:</p>
              <p className="cm-delete-name">"{selectedCourse?.title}"</p>
              <p className="cm-delete-warn">
                Hành động này không thể hoàn tác. Tất cả bài học và dữ liệu liên
                quan sẽ bị xóa vĩnh viễn.
              </p>
              {formError && <p className="cm-error">{formError}</p>}
            </div>
            <div className="cm-footer">
              <button
                className="cm-btn cm-btn--danger"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? " Đang xóa…" : "Xóa khóa học"}
              </button>
              <button
                className="cm-btn cm-btn--cancel"
                onClick={closeModal}
                disabled={saving}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      );
    }

    const isEdit = courseModal === "edit";

    return (
      <div
        className="cm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
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
              {isEdit ? "Chỉnh sửa khóa học" : "Thêm khóa học mới"}
            </h2>
            <button className="cm-close" onClick={closeModal}>
              ✕
            </button>
          </div>

          <div className="cm-body cm-body--scroll">
            {editLoading && (
              <div className="cm-loading">
                <span className="cm-loading__spinner" />
                <span>Đang tải thông tin khóa học…</span>
              </div>
            )}

            {!editLoading && (
              <>
                {/* ── Tên khóa học ── */}
                <div className="cm-field">
                  <label className="cm-label">
                    Tên khóa học <span className="cm-required">*</span>
                  </label>
                  <input
                    className="cm-input"
                    type="text"
                    placeholder="Ví dụ: Tiếng Anh giao tiếp cơ bản"
                    value={courseForm.title}
                    onChange={(e) =>
                      setCourseForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </div>

                {/* ── Mô tả ── */}
                <div className="cm-field">
                  <label className="cm-label">Mô tả chi tiết</label>
                  <textarea
                    className="cm-textarea"
                    rows={3}
                    placeholder="Mô tả nội dung, mục tiêu khóa học…"
                    value={courseForm.description}
                    onChange={(e) =>
                      setCourseForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* ── Ảnh bìa ── */}
                <div className="cm-field">
                  <label className="cm-label">Ảnh bìa (thumbnail)</label>
                  {isEdit &&
                    selectedCourse?.thumbnail &&
                    !courseForm.thumbnail && (
                      <div className="cm-thumb-preview">
                        <img
                          src={selectedCourse.thumbnail}
                          alt="Ảnh bìa hiện tại"
                          className="cm-thumb-img"
                        />
                        <span className="cm-thumb-hint">
                          Chọn file mới để thay thế
                        </span>
                      </div>
                    )}
                  <input
                    className="cm-input cm-input--file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setCourseForm((f) => ({ ...f, thumbnail: file }));
                    }}
                  />
                  {thumbPreviewUrl && (
                    <div className="cm-thumb-preview">
                      <img
                        src={thumbPreviewUrl}
                        alt="Xem trước ảnh mới"
                        className="cm-thumb-img"
                      />
                      <button
                        className="cm-thumb-remove"
                        onClick={() =>
                          setCourseForm((f) => ({ ...f, thumbnail: null }))
                        }
                      >
                        ✕ Bỏ chọn
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Học phí + Giảm giá ── */}
                <div className="cm-row">
                  <div className="cm-field">
                    <label className="cm-label">Học phí gốc (VNĐ)</label>
                    <input
                      className="cm-input"
                      type="number"
                      min={0}
                      value={courseForm.price}
                      onChange={(e) =>
                        setCourseForm((f) => ({ ...f, price: e.target.value }))
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
                      value={courseForm.discount_percent}
                      onChange={(e) =>
                        setCourseForm((f) => ({
                          ...f,
                          discount_percent: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <p className="cm-preview-price">
                  Giá bán: <strong>{previewSalePrice()}</strong>
                </p>

                {/* ── Trình độ + Trạng thái ── */}
                <div className="cm-row">
                  <div className="cm-field">
                    <label className="cm-label">Trình độ</label>
                    <select
                      className="cm-select"
                      value={courseForm.level}
                      onChange={(e) =>
                        setCourseForm((f) => ({ ...f, level: e.target.value }))
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
                      value={courseForm.status}
                      onChange={(e) =>
                        setCourseForm((f) => ({ ...f, status: e.target.value }))
                      }
                    >
                      <option value="draft">Nháp</option>
                      <option value="review">Chờ duyệt</option>
                      <option value="published">Đã xuất bản</option>
                      <option value="archived">Đã lưu trữ</option>
                    </select>
                  </div>
                </div>

                {/* ── Danh mục + Giảng viên ── */}
                <div className="cm-row">
                  <div className="cm-field">
                    <label className="cm-label">Danh mục</label>
                    <select
                      className="cm-select"
                      value={courseForm.category}
                      onChange={(e) =>
                        setCourseForm((f) => ({
                          ...f,
                          category: e.target.value,
                        }))
                      }
                    >
                      <option value="">-- Không có --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cm-field">
                    <label className="cm-label">Giảng viên</label>
                    <select
                      className="cm-select"
                      value={courseForm.instructor}
                      onChange={(e) =>
                        setCourseForm((f) => ({
                          ...f,
                          instructor: e.target.value,
                        }))
                      }
                    >
                      <option value="">-- Chọn giảng viên --</option>
                      {instructors.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.full_name ?? ins.username}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── Ngày xuất bản ── */}
                <div className="cm-field">
                  <label className="cm-label">
                    Ngày xuất bản
                    <span className="cm-hint">
                      {" "}
                      — để trống nếu chưa lên lịch
                    </span>
                  </label>
                  <input
                    className="cm-input"
                    type="datetime-local"
                    value={courseForm.published_at}
                    onChange={(e) =>
                      setCourseForm((f) => ({
                        ...f,
                        published_at: e.target.value,
                      }))
                    }
                  />
                  {courseForm.published_at && (
                    <button
                      className="cm-clear-date"
                      onClick={() =>
                        setCourseForm((f) => ({ ...f, published_at: "" }))
                      }
                    >
                      ✕ Xóa ngày
                    </button>
                  )}
                </div>

                {/* ── Nổi bật (Course.is_featured — BooleanField) ── */}
                <div className="cm-field cm-field--checkbox">
                  <label className="cm-checkbox-label">
                    <input
                      type="checkbox"
                      className="cm-checkbox"
                      checked={courseForm.is_featured}
                      onChange={(e) =>
                        setCourseForm((f) => ({
                          ...f,
                          is_featured: e.target.checked,
                        }))
                      }
                    />
                    <span>
                      Khóa học <strong>nổi bật</strong>
                      <span className="cm-hint">
                        {" "}
                        — hiển thị trên trang chủ
                      </span>
                    </span>
                  </label>
                </div>

                {/* ── Yêu cầu đầu vào ── */}
                <div className="cm-field">
                  <label className="cm-label">Yêu cầu đầu vào</label>
                  <textarea
                    className="cm-textarea"
                    rows={2}
                    placeholder="Ví dụ: Biết đọc bảng chữ cái tiếng Anh…"
                    value={courseForm.requirements}
                    onChange={(e) =>
                      setCourseForm((f) => ({
                        ...f,
                        requirements: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* ── Học được gì ── */}
                <div className="cm-field">
                  <label className="cm-label">Học được gì</label>
                  <textarea
                    className="cm-textarea"
                    rows={2}
                    placeholder="Ví dụ: Giao tiếp tự tin trong các tình huống hàng ngày…"
                    value={courseForm.what_you_learn}
                    onChange={(e) =>
                      setCourseForm((f) => ({
                        ...f,
                        what_you_learn: e.target.value,
                      }))
                    }
                  />
                </div>

                {formError && <p className="cm-error">{formError}</p>}
              </>
            )}
          </div>

          <div className="cm-footer">
            <button
              className="cm-btn cm-btn--save"
              onClick={handleSave}
              disabled={saving || editLoading}
            >
              {saving ? " Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo khóa học"}
            </button>
            <button
              className="cm-btn cm-btn--cancel"
              onClick={closeModal}
              disabled={saving}
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    );
  };
  // ── Section modals ────────────────────────────────────────────────────────────
  const renderSectionModal = () => {
    if (!sectionModal) return null;
    if (sectionModal === "delete") {
      return (
        <div
          className="cm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSectionModal();
          }}
        >
          <div className="cm-box cm-box--sm">
            <div className="cm-header">
              <h2 className="cm-title">
                <span className="cm-title-icon cm-title-icon--del">🗑</span>Xác
                nhận xóa chương
              </h2>
              <button className="cm-close" onClick={closeSectionModal}>
                ✕
              </button>
            </div>
            <div className="cm-body">
              <p className="cm-delete-desc">Bạn có chắc muốn xóa chương:</p>
              <p className="cm-delete-name">"{selectedSection?.title}"</p>
              <p className="cm-delete-warn">
                Tất cả bài học trong chương này cũng sẽ bị xóa.
              </p>
              {sectionError && <p className="cm-error">{sectionError}</p>}
            </div>
            <div className="cm-footer">
              <button
                className="cm-btn cm-btn--danger"
                onClick={handleDeleteSection}
                disabled={savingSection}
              >
                {savingSection ? " Đang xóa…" : "Xóa chương"}
              </button>
              <button
                className="cm-btn cm-btn--cancel"
                onClick={closeSectionModal}
                disabled={savingSection}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      );
    }
    const isEdit = sectionModal === "edit";
    return (
      <div
        className="cm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeSectionModal();
        }}
      >
        <div className="cm-box cm-box--sm">
          <div className="cm-header">
            <h2 className="cm-title">
              <span
                className={`cm-title-icon cm-title-icon--${isEdit ? "edit" : "add"}`}
              >
                {isEdit ? "✏" : "＋"}
              </span>
              {isEdit ? "Chỉnh sửa chương" : "Thêm chương mới"}
            </h2>
            <button className="cm-close" onClick={closeSectionModal}>
              ✕
            </button>
          </div>
          <div className="cm-body">
            <div className="cm-field">
              <label className="cm-label">
                Khóa học <span className="cm-required">*</span>
              </label>
              <select
                className="cm-select"
                value={sectionForm.course}
                onChange={(e) =>
                  setSectionForm((f) => ({ ...f, course: e.target.value }))
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
                type="text"
                placeholder="Ví dụ: Chương 1 - Giới thiệu"
                value={sectionForm.title}
                onChange={(e) =>
                  setSectionForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="cm-field">
              <label className="cm-label">Mô tả</label>
              <textarea
                className="cm-textarea"
                rows={2}
                placeholder="Mô tả nội dung chương…"
                value={sectionForm.description}
                onChange={(e) =>
                  setSectionForm((f) => ({ ...f, description: e.target.value }))
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
                onChange={(e) =>
                  setSectionForm((f) => ({ ...f, order_index: e.target.value }))
                }
              />
            </div>
            {sectionError && <p className="cm-error">{sectionError}</p>}
          </div>
          <div className="cm-footer">
            <button
              className="cm-btn cm-btn--save"
              onClick={handleSaveSection}
              disabled={savingSection}
            >
              {savingSection
                ? " Đang lưu…"
                : isEdit
                  ? "Lưu thay đổi"
                  : "Tạo chương"}
            </button>
            <button
              className="cm-btn cm-btn--cancel"
              onClick={closeSectionModal}
              disabled={savingSection}
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmModal = () => {
    if (!confirmModal) return null;
    const isApprove = confirmModal.type === "approve-refund";
    return (
      <div
        className="ad-confirm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && !confirmLoading)
            setConfirmModal(null);
        }}
      >
        <div className="ad-confirm-box">
          <div className="ad-confirm-header">
            <div
              className={`ad-confirm-icon ${isApprove ? "ad-confirm-icon--approve" : "ad-confirm-icon--reject"}`}
            >
              {isApprove ? "✓" : "✕"}
            </div>
            <p className="ad-confirm-title">
              {isApprove ? "Duyệt hoàn tiền" : "Từ chối hoàn tiền"}
            </p>
            <p className="ad-confirm-subtitle">
              {isApprove
                ? "Xác nhận duyệt yêu cầu hoàn tiền cho giao dịch này?"
                : "Xác nhận từ chối yêu cầu hoàn tiền? Học viên sẽ không được hoàn tiền."}
            </p>
          </div>
          <div className="ad-confirm-body">
            <div className="ad-confirm-detail">
              <strong>{confirmModal.studentName}</strong>
              {confirmModal.courseName} ·{" "}
              {formatPrice(confirmModal.amount, "VND")}
            </div>
          </div>
          <div className="ad-confirm-footer">
            <button
              className={`ad-confirm-btn ${isApprove ? "ad-confirm-btn--approve" : "ad-confirm-btn--reject"}`}
              onClick={handleConfirmAction}
              disabled={confirmLoading}
            >
              {confirmLoading
                ? "Đang xử lý…"
                : isApprove
                  ? "Duyệt hoàn tiền"
                  : "Từ chối"}
            </button>
            <button
              className="ad-confirm-btn ad-confirm-btn--cancel"
              onClick={() => setConfirmModal(null)}
              disabled={confirmLoading}
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    );
  };
  const renderEditAlert = () => {
    if (courseEditAlerts.length === 0) return null;

    const isCollapsible = courseEditAlerts.length > PREVIEW_COUNT;
    const visibleAlerts =
      isCollapsible && !alertExpanded
        ? courseEditAlerts.slice(0, PREVIEW_COUNT)
        : courseEditAlerts;
    //adminEditAlerts
    return (
      <div className="ad-edit-alert">
        <div className="ad-edit-alert__header">
          <span className="ad-edit-alert__icon">⚠</span>
          <span className="ad-edit-alert__title">
            Khóa học vừa được chỉnh sửa sau khi xuất bản
          </span>
          <span className="ad-edit-alert__count">
            {courseEditAlerts.length} khóa
          </span>
          {isCollapsible && (
            <button
              className="ad-edit-alert__toggle"
              onClick={() => setAlertExpanded((v) => !v)}
            >
              {alertExpanded ? "Thu gọn ▲" : `Xem tất cả ▼`}
            </button>
          )}
        </div>

        <div className="ad-edit-alert__list">
          {visibleAlerts.map((c) => (
            <div key={c.id} className="ad-edit-alert__row">
              <span className="ad-edit-alert__course-name">{c.title}</span>
              <div className="ad-edit-alert__meta">
                {c.instructor_name && (
                  <span className="ad-edit-alert__instructor">
                    {c.instructor_name}
                  </span>
                )}
                <span className="ad-edit-alert__time">
                  {new Date(c.updated_at).toLocaleString("vi-VN")}
                </span>
                <button
                  className="ad-edit-alert__btn"
                  onClick={() => {
                    setActiveTab("courses");
                    setSearchCourse(c.title);
                  }}
                >
                  Xem
                </button>
                <button
                  className="ad-edit-alert__dismiss-single"
                  onClick={() => dismissCourse(c.id, c.updated_at)}
                  title="Bỏ qua"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {/* Collapsed preview footer */}
          {isCollapsible && !alertExpanded && (
            <div className="ad-edit-alert__more-hint">
              +{courseEditAlerts.length - PREVIEW_COUNT} khóa khác —{" "}
              <button
                className="ad-edit-alert__more-btn"
                onClick={() => setAlertExpanded(true)}
              >
                Xem tất cả
              </button>
            </div>
          )}
        </div>

        <div className="ad-edit-alert__dismiss">
          <button className="ad-edit-alert__dismiss-btn" onClick={dismissAll}>
            Bỏ qua tất cả ({courseEditAlerts.length})
          </button>
        </div>
      </div>
    );
  };

  const renderLessonModal = () => {
    if (!lessonModal) return null;
    if (lessonModal === "delete") {
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
                <span className="cm-title-icon cm-title-icon--del">🗑</span>Xác
                nhận xóa bài học
              </h2>
              <button className="cm-close" onClick={closeLessonModal}>
                ✕
              </button>
            </div>
            <div className="cm-body">
              <p className="cm-delete-desc">Bạn có chắc muốn xóa bài học:</p>
              <p className="cm-delete-name">"{selectedLesson?.title}"</p>
              <p className="cm-delete-warn">
                Hành động này không thể hoàn tác.
              </p>
              {lessonError && <p className="cm-error">{lessonError}</p>}
            </div>
            <div className="cm-footer">
              <button
                className="cm-btn cm-btn--danger"
                onClick={handleDeleteLesson}
                disabled={savingLesson}
              >
                {savingLesson ? " Đang xóa…" : "Xóa bài học"}
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
    }

    const isEdit = lessonModal === "edit";
    const filteredSectionsForModal = modalFilterCourse
      ? sections.filter(
          (s) => String(s.course?.id ?? s.course) === modalFilterCourse,
        )
      : sections;

    // Có video không? (file mới HOẶC URL HOẶC file cũ trên server)
    const hasVideo =
      !!lessonForm.video_url.trim() ||
      !!lessonForm.video_file ||
      !!lessonForm.existing_video_url;

    // Có tài liệu không?
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
            <button className="cm-close" onClick={closeLessonModal}>
              ✕
            </button>
          </div>

          <div className="cm-body cm-body--scroll">
            {/* Chọn khóa học → lọc chương */}
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
                  <option value="">-- Tất cả khóa học --</option>
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
                    setLessonForm((f) => ({ ...f, section: e.target.value }))
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

            {/* Tên + Thứ tự */}
            <div className="cm-row">
              <div className="cm-field">
                <label className="cm-label">
                  Tên bài học <span className="cm-required">*</span>
                </label>
                <input
                  className="cm-input"
                  type="text"
                  placeholder="Ví dụ: Bài 1 – Giới thiệu"
                  value={lessonForm.title}
                  onChange={(e) =>
                    setLessonForm((f) => ({ ...f, title: e.target.value }))
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
                  onChange={(e) =>
                    setLessonForm((f) => ({
                      ...f,
                      order_index: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* ── VIDEO ── */}
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
                <label className="cm-label">URL Video (YouTube / stream)</label>
                <input
                  className="cm-input"
                  type="url"
                  placeholder="https://..."
                  value={lessonForm.video_url}
                  onChange={(e) =>
                    setLessonForm((f) => ({ ...f, video_url: e.target.value }))
                  }
                />
              </div>
              <div className="cm-field">
                <label className="cm-label">Hoặc upload file video</label>
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
                {/*  Hiện file mới nếu vừa chọn */}
                {lessonForm.video_file && (
                  <span className="cm-hint">
                    📎 {lessonForm.video_file.name}
                  </span>
                )}
                {/*  Hiện file cũ nếu chưa chọn file mới */}
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
                        {lessonForm.existing_video_url.split("/").pop()}
                      </a>
                      <span className="cm-existing-file__hint"></span>
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
                        title="Xóa video"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
              </div>
            </div>

            {/* ── MARKDOWN ── */}
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
                  setLessonForm((f) => ({ ...f, content: e.target.value }))
                }
              />
            </div>

            {/* ── TÀI LIỆU ── */}
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
                  {/*  Hiện file mới nếu vừa chọn */}
                  {lessonForm.attachment && (
                    <span className="cm-hint">
                      📎 {lessonForm.attachment.name}
                    </span>
                  )}
                  {/*  Hiện file cũ nếu chưa chọn file mới */}
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
                            lessonForm.existing_attachment.split("/").pop()}
                        </a>
                        <span className="cm-existing-file__hint"></span>
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
                          title="Xóa tài liệu"
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {lessonError && <p className="cm-error">{lessonError}</p>}
          </div>

          <div className="cm-footer">
            <button
              className="cm-btn cm-btn--save"
              onClick={handleSaveLesson}
              disabled={savingLesson}
            >
              {savingLesson
                ? " Đang lưu…"
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
  };

  const renderQuizModal = () => {
    if (!quizModal) return null;
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
                <span className="cm-title-icon cm-title-icon--del">🗑</span>Xác
                nhận xóa bài kiểm tra
              </h2>
              <button className="cm-close" onClick={closeQuizModal}>
                ✕
              </button>
            </div>
            <div className="cm-body">
              <p className="cm-delete-desc">Bạn có chắc muốn xóa:</p>
              <p className="cm-delete-name">"{selectedQuiz?.title}"</p>
              <p className="cm-delete-warn">
                Tất cả câu hỏi và lịch sử làm bài sẽ bị xóa.
              </p>
              {quizError && <p className="cm-error">{quizError}</p>}
            </div>
            <div className="cm-footer">
              <button
                className="cm-btn cm-btn--danger"
                onClick={handleDeleteQuiz}
                disabled={savingQuiz}
              >
                {savingQuiz ? " Đang xóa…" : "Xóa"}
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
              {isEdit ? "Chỉnh sửa bài kiểm tra" : "Tạo bài kiểm tra"}
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
                onChange={(e) =>
                  setQuizForm((f) => ({ ...f, lesson: e.target.value }))
                }
              >
                <option value="">-- Chọn bài học --</option>
                {lessons.map((l) => {
                  const sec = sections.find(
                    (s) => s.id === (l.section?.id ?? l.section),
                  );
                  const course = courses.find(
                    (c) => c.id === (sec?.course?.id ?? sec?.course),
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
                Tên bài kiểm tra <span className="cm-required">*</span>
              </label>
              <input
                className="cm-input"
                type="text"
                placeholder="Ví dụ: Kiểm tra chương 1"
                value={quizForm.title}
                onChange={(e) =>
                  setQuizForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="cm-field">
              <label className="cm-label">Hướng dẫn</label>
              <textarea
                className="cm-textarea"
                rows={2}
                placeholder="Mô tả hoặc hướng dẫn làm bài…"
                value={quizForm.description}
                onChange={(e) =>
                  setQuizForm((f) => ({ ...f, description: e.target.value }))
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
                  onChange={(e) =>
                    setQuizForm((f) => ({ ...f, pass_score: e.target.value }))
                  }
                />
              </div>
              <div className="cm-field">
                <label className="cm-label">
                  Thời gian (phút){" "}
                  <span className="cm-hint">— 0 = không giới hạn</span>
                </label>
                <input
                  className="cm-input"
                  type="number"
                  min={0}
                  value={quizForm.time_limit}
                  onChange={(e) =>
                    setQuizForm((f) => ({ ...f, time_limit: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="cm-field">
              <label className="cm-label">
                Số lần làm tối đa{" "}
                <span className="cm-hint">— 0 = không giới hạn</span>
              </label>
              <input
                className="cm-input"
                type="number"
                min={0}
                value={quizForm.max_attempts}
                onChange={(e) =>
                  setQuizForm((f) => ({ ...f, max_attempts: e.target.value }))
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
                ? " Đang lưu…"
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
  };

  const renderQuestionModal = () => {
    if (!questionModal) return null;
    if (questionModal === "delete")
      return (
        <div
          className="cm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeQuestionModal();
          }}
        >
          <div className="cm-box cm-box--sm">
            <div className="cm-header">
              <h2 className="cm-title">
                <span className="cm-title-icon cm-title-icon--del">🗑</span>Xóa
                câu hỏi
              </h2>
              <button className="cm-close" onClick={closeQuestionModal}>
                ✕
              </button>
            </div>
            <div className="cm-body">
              <p className="cm-delete-desc">Xóa câu hỏi:</p>
              <p className="cm-delete-name">
                "{selectedQ?.content?.slice(0, 80)}"
              </p>
              {questionError && <p className="cm-error">{questionError}</p>}
            </div>
            <div className="cm-footer">
              <button
                className="cm-btn cm-btn--danger"
                onClick={handleDeleteQuestion}
                disabled={savingQ}
              >
                {savingQ ? "…" : "Xóa"}
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
            <button className="cm-close" onClick={closeQuestionModal}>
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
                  <option value="multiple">Chọn nhiều đáp án</option>
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
                    setQuestionForm((f) => ({ ...f, points: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="cm-field">Thứ tự câu hỏi</label>
                <input
                  className="cm-input"
                  type="number"
                  min={1}
                  value={questionForm.order_index}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      order_index: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="cm-field">
              <label className="cm-label">
                Nội dung câu hỏi <span className="cm-required">*</span>
              </label>
              <textarea
                className="cm-textarea"
                rows={3}
                placeholder="Nhập câu hỏi…"
                value={questionForm.content}
                onChange={(e) =>
                  setQuestionForm((f) => ({ ...f, content: e.target.value }))
                }
              />
            </div>
            <div className="cm-field">
              <label className="cm-label">Giải thích đáp án</label>
              <textarea
                className="cm-textarea"
                rows={2}
                placeholder="Giải thích tại sao đáp án đúng…"
                value={questionForm.explanation}
                onChange={(e) =>
                  setQuestionForm((f) => ({
                    ...f,
                    explanation: e.target.value,
                  }))
                }
              />
            </div>
            {/* Đáp án */}
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
                      if (questionForm.question_type !== "multiple") {
                        next.forEach((a, i) => {
                          next[i] = { ...a, is_correct: false };
                        });
                      }
                      next[idx] = {
                        ...next[idx],
                        is_correct: e.target.checked,
                      };
                      setQuestionForm((f) => ({ ...f, answers: next }));
                    }}
                    style={{ flexShrink: 0, accentColor: "#4caf82" }}
                  />
                  <input
                    className="cm-input"
                    type="text"
                    placeholder={`Đáp án ${idx + 1}`}
                    value={ans.content}
                    onChange={(e) => {
                      const next = [...questionForm.answers];
                      next[idx] = { ...next[idx], content: e.target.value };
                      setQuestionForm((f) => ({ ...f, answers: next }));
                    }}
                    style={{ flex: 1 }}
                  />
                  {questionForm.answers.length > 2 && (
                    <button
                      onClick={() => {
                        setQuestionForm((f) => ({
                          ...f,
                          answers: f.answers.filter((_, i) => i !== idx),
                        }));
                      }}
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
            {questionError && <p className="cm-error">{questionError}</p>}
          </div>
          <div className="cm-footer">
            <button
              className="cm-btn cm-btn--save"
              onClick={handleSaveQuestion}
              disabled={savingQ}
            >
              {savingQ
                ? " Đang lưu…"
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
  };

  const renderCategoryModal = () => {
    if (!categoryModal) return null;
    if (categoryModal === "delete")
      return (
        <div
          className="cm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCategoryModal();
          }}
        >
          <div className="cm-box cm-box--sm">
            <div className="cm-header">
              <h2 className="cm-title">
                <span className="cm-title-icon cm-title-icon--del">🗑</span>Xóa
                danh mục
              </h2>
              <button className="cm-close" onClick={closeCategoryModal}>
                ✕
              </button>
            </div>
            <div className="cm-body">
              <p className="cm-delete-desc">Bạn có chắc muốn xóa danh mục:</p>
              <p className="cm-delete-name">"{selectedCategory?.name}"</p>
              <p className="cm-delete-warn">
                Các khóa học thuộc danh mục này sẽ bị mất liên kết.
              </p>
              {categoryError && <p className="cm-error">{categoryError}</p>}
            </div>
            <div className="cm-footer">
              <button
                className="cm-btn cm-btn--danger"
                onClick={handleDeleteCategory}
                disabled={savingCategory}
              >
                {savingCategory ? " Đang xóa…" : "Xóa"}
              </button>
              <button
                className="cm-btn cm-btn--cancel"
                onClick={closeCategoryModal}
                disabled={savingCategory}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      );
    const isEdit = categoryModal === "edit";
    return (
      <div
        className="cm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeCategoryModal();
        }}
      >
        <div className="cm-box cm-box--sm">
          <div className="cm-header">
            <h2 className="cm-title">
              <span
                className={`cm-title-icon cm-title-icon--${isEdit ? "edit" : "add"}`}
              >
                {isEdit ? "✏" : "＋"}
              </span>
              {isEdit ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
            </h2>
            <button className="cm-close" onClick={closeCategoryModal}>
              ✕
            </button>
          </div>
          <div className="cm-body">
            <div className="cm-field">
              <label className="cm-label">
                Tên danh mục <span className="cm-required">*</span>
              </label>
              <input
                className="cm-input"
                type="text"
                placeholder="Ví dụ: A1, A2, B1…"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="cm-field">
              <label className="cm-label">Mô tả</label>
              <textarea
                className="cm-textarea"
                rows={3}
                placeholder="Mô tả ngắn về danh mục…"
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="cm-row" style={{ alignItems: "center", gap: 16 }}>
              <div className="cm-field" style={{ flex: "none" }}>
                <label
                  className="cm-label"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={categoryForm.is_pinned}
                    onChange={(e) =>
                      setCategoryForm((f) => ({
                        ...f,
                        is_pinned: e.target.checked,
                      }))
                    }
                    style={{
                      width: 16,
                      height: 16,
                      accentColor: "#4caf82",
                      cursor: "pointer",
                    }}
                  />
                  Ghim ra trang chủ
                </label>
              </div>
              {categoryForm.is_pinned && (
                <div className="cm-field" style={{ flex: 1 }}>
                  <label className="cm-label">
                    Thứ tự ghim{" "}
                    <span
                      style={{
                        color: "rgba(224,225,221,0.4)",
                        fontWeight: 400,
                      }}
                    >
                      (1 – 6)
                    </span>
                  </label>
                  <input
                    className="cm-input"
                    type="number"
                    min={1}
                    max={6}
                    value={categoryForm.pin_order}
                    onChange={(e) =>
                      setCategoryForm((f) => ({
                        ...f,
                        pin_order: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              )}
            </div>
            {categoryError && <p className="cm-error">{categoryError}</p>}
          </div>
          <div className="cm-footer">
            <button
              className="cm-btn cm-btn--save"
              onClick={handleSaveCategory}
              disabled={savingCategory}
            >
              {savingCategory
                ? " Đang lưu…"
                : isEdit
                  ? "Lưu thay đổi"
                  : "Tạo danh mục"}
            </button>
            <button
              className="cm-btn cm-btn--cancel"
              onClick={closeCategoryModal}
              disabled={savingCategory}
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    );
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
  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="ad-page">
      {renderModal()}
      {renderSectionModal()}
      {renderLessonModal()}
      {renderQuizModal()}
      {renderQuestionModal()}
      {renderAttemptModal()}
      {renderCategoryModal()}
      {renderConfirmModal()}
      {userViewModal && selectedUser && (
        <div className="ad-modal-overlay" onClick={closeViewUser}>
          <div
            className="ad-modal ad-modal--user"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ad-modal__header">
              <h2 className="ad-modal__title">Thông tin người dùng</h2>
              <button className="ad-modal__close" onClick={closeViewUser}>
                ✕
              </button>
            </div>
            <div className="ad-modal__body">
              <div className="ad-modal__user-hero">
                <div className="ad-modal__avatar-placeholder">
                  {(selectedUser.full_name ??
                    selectedUser.username ??
                    "?")[0].toUpperCase()}
                </div>
                <div className="ad-modal__user-hero-info">
                  <span className="ad-modal__user-fullname">
                    {selectedUser.full_name ??
                      selectedUser.name ??
                      selectedUser.username}
                  </span>
                  <span
                    className={`ad-badge ad-badge--role-${selectedUser.role}`}
                  >
                    {ROLE_LABEL[selectedUser.role] ?? selectedUser.role}
                  </span>
                </div>
              </div>
              {/* ── Thông tin chung ── */}
              <div className="ad-modal__field">
                <span className="ad-modal__field-label">Email</span>
                <span className="ad-modal__field-value">
                  {selectedUser.email ?? "—"}
                </span>
              </div>
              <div className="ad-modal__field">
                <span className="ad-modal__field-label">Tên đăng nhập</span>
                <span className="ad-modal__field-value">
                  {selectedUser.username ?? "—"}
                </span>
              </div>
              <div className="ad-modal__field">
                <span className="ad-modal__field-label">Ngày tham gia</span>
                <span className="ad-modal__field-value">
                  {selectedUser.date_joined
                    ? new Date(selectedUser.date_joined).toLocaleString("vi-VN")
                    : "—"}
                </span>
              </div>
              <div className="ad-modal__field">
                <span className="ad-modal__field-label">Trạng thái</span>
                <span
                  className={`ad-badge ad-badge--${getUserStatus(selectedUser)}`}
                >
                  {STATUS_LABEL[getUserStatus(selectedUser)] ??
                    getUserStatus(selectedUser)}
                </span>
              </div>
              {selectedUser.bio && (
                <div className="ad-modal__field">
                  <span className="ad-modal__field-label">Giới thiệu</span>
                  <p className="ad-modal__field-value--comment">
                    {selectedUser.bio}
                  </p>
                </div>
              )}

              {/* ── Học viên ── */}
              {selectedUser.role === "student" &&
                (() => {
                  const sp = selectedUser.student_profile ?? selectedUser;
                  return (
                    <>
                      <div className="ad-modal__section-title">
                        Hồ sơ học viên
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Số điện thoại
                        </span>
                        <span className="ad-modal__field-value">
                          {sp.phone_number ?? sp.phone ?? "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Ngày sinh</span>
                        <span className="ad-modal__field-value">
                          {sp.date_of_birth
                            ? new Date(sp.date_of_birth).toLocaleDateString(
                                "vi-VN",
                              )
                            : "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Giới tính</span>
                        <span className="ad-modal__field-value">
                          {sp.gender === "male"
                            ? "Nam"
                            : sp.gender === "female"
                              ? "Nữ"
                              : sp.gender === "other"
                                ? "Khác"
                                : "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Quốc gia</span>
                        <span className="ad-modal__field-value">
                          {sp.country ?? "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Thành phố</span>
                        <span className="ad-modal__field-value">
                          {sp.city ?? "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Nghề nghiệp
                        </span>
                        <span className="ad-modal__field-value">
                          {sp.occupation ?? "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Học vấn</span>
                        <span className="ad-modal__field-value">
                          {(
                            {
                              high_school: "THPT",
                              college: "Cao đẳng",
                              bachelor: "Đại học",
                              master: "Thạc sĩ",
                              doctor: "Tiến sĩ",
                              other: "Khác",
                            } as any
                          )[sp.education] ??
                            sp.education ??
                            "—"}
                        </span>
                      </div>
                      <div className="ad-modal__section-title">
                        Chứng chỉ hoàn thành
                      </div>
                      {loadingCerts ? (
                        <p
                          className="ad-modal__field-value"
                          style={{ opacity: 0.5 }}
                        >
                          Đang tải...
                        </p>
                      ) : certificates.length === 0 ? (
                        <p
                          className="ad-modal__field-value"
                          style={{ opacity: 0.5 }}
                        >
                          Chưa có chứng chỉ nào
                        </p>
                      ) : (
                        certificates.map((cert, i) => (
                          <div className="ad-modal__cert-item" key={i}>
                            <div className="ad-modal__cert-name">
                              {cert.course_title}
                            </div>
                            <div className="ad-modal__cert-meta">
                              <span>🎓 {cert.cert_number}</span>
                              <span>
                                📅{" "}
                                {cert.issued_at
                                  ? new Date(cert.issued_at).toLocaleDateString(
                                      "vi-VN",
                                    )
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  );
                })()}

              {/* ── Giảng viên ── */}
              {selectedUser.role === "instructor" &&
                (() => {
                  const ip = selectedUser.instructor_profile ?? selectedUser;
                  return (
                    <>
                      <div className="ad-modal__section-title">
                        Hồ sơ giảng viên
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Số điện thoại
                        </span>
                        <span className="ad-modal__field-value">
                          {ip.phone_number ?? ip.phone ?? "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Chức danh</span>
                        <span className="ad-modal__field-value">
                          {ip.title ?? "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Chuyên môn
                        </span>
                        <span className="ad-modal__field-value">
                          {ip.specializations ?? "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Kinh nghiệm
                        </span>
                        <span className="ad-modal__field-value">
                          {ip.years_experience != null
                            ? `${ip.years_experience} năm`
                            : "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Chứng chỉ</span>
                        <span className="ad-modal__field-value">
                          {ip.certifications ?? "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Tổng học viên
                        </span>
                        <span className="ad-modal__field-value">
                          {ip.total_students ?? "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Tổng khóa học
                        </span>
                        <span className="ad-modal__field-value">
                          {ip.total_courses ?? "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Đánh giá TB
                        </span>
                        <span className="ad-modal__field-value">
                          {ip.avg_rating != null
                            ? `${Number(ip.avg_rating).toFixed(1)} ★`
                            : "—"}
                        </span>
                      </div>
                    </>
                  );
                })()}
            </div>
            <div className="ad-modal__footer">
              {selectedUser.role !== "admin" && (
                <button
                  className={`ad-btn-sm${getUserStatus(selectedUser) === "banned" ? " ad-btn-sm--restore" : " ad-btn-sm--ban"}`}
                  onClick={() => {
                    toggleUserStatus(selectedUser);
                    closeViewUser();
                  }}
                >
                  {getUserStatus(selectedUser) === "banned"
                    ? "Mở khóa"
                    : "Khóa tài khoản"}
                </button>
              )}
              <button className="ad-modal__cancel" onClick={closeViewUser}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddUserModal && (
        <div
          className="cm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddUserModal(false);
          }}
        >
          <div className="cm-box cm-box--sm">
            <div className="cm-header">
              <h2 className="cm-title">＋ Thêm người dùng</h2>
              <button
                className="cm-close"
                onClick={() => setShowAddUserModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="cm-body">
              <div className="cm-field">
                <label className="cm-label">Họ và tên</label>
                <input
                  className="cm-input"
                  placeholder="Nguyễn Văn A"
                  value={addUserForm.full_name}
                  onChange={(e) =>
                    setAddUserForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                />
              </div>
              <div className="cm-field">
                <label className="cm-label">
                  Email <span className="cm-required">*</span>
                </label>
                <input
                  className="cm-input"
                  type="email"
                  placeholder="email@example.com"
                  value={addUserForm.email}
                  onChange={(e) =>
                    setAddUserForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="cm-field">
                <label className="cm-label">
                  Tên đăng nhập <span className="cm-required">*</span>
                </label>
                <input
                  className="cm-input"
                  placeholder="username"
                  value={addUserForm.username}
                  onChange={(e) =>
                    setAddUserForm((f) => ({ ...f, username: e.target.value }))
                  }
                />
              </div>
              <div className="cm-field">
                <label className="cm-label">
                  Mật khẩu <span className="cm-required">*</span>
                </label>
                <input
                  className="cm-input"
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={addUserForm.password}
                  onChange={(e) =>
                    setAddUserForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
              </div>
              <div className="cm-field">
                <label className="cm-label">Vai trò</label>
                <select
                  className="cm-select"
                  value={addUserForm.role}
                  onChange={(e) =>
                    setAddUserForm((f) => ({ ...f, role: e.target.value }))
                  }
                >
                  <option value="student">Học viên</option>
                  <option value="instructor">Giảng viên</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {addUserError && <p className="cm-error">{addUserError}</p>}
            </div>
            <div className="cm-footer">
              <button
                className="cm-btn cm-btn--save"
                onClick={handleAddUser}
                disabled={savingUser}
              >
                {savingUser ? "Đang tạo…" : "Tạo người dùng"}
              </button>
              <button
                className="cm-btn cm-btn--cancel"
                onClick={() => setShowAddUserModal(false)}
                disabled={savingUser}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="container ad-layout">
        {/* ── Sidebar ── */}
        <aside className="ad-sidebar">
          <div className="ad-brand">
            <span className="ad-brand__logo">E</span>
            <div>
              <strong className="ad-brand__name">EnglishHub</strong>
              <span className="ad-brand__role">Admin</span>
            </div>
          </div>
          <nav className="ad-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`ad-nav__item${activeTab === tab.id ? " ad-nav__item--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <button
            className="ad-nav__item ad-nav__item--back"
            onClick={() => onNavigate("home")}
          >
            Về trang chủ
          </button>
          <button
            className="ad-nav__item ad-nav__item--danger"
            onClick={onLogout}
          >
            Đăng xuất
          </button>
        </aside>

        <main className="ad-main">
          {renderEditAlert()}
          {activeTab === "overview" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Tổng quan hệ thống</h1>
                <p className="ad-page-sub">
                  Thống kê tổng hợp của nền tảng EnglishHub.
                </p>
              </div>

              {/* ── Row 1: stats chính ── */}
              <div className="ad-stats-grid">
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {loadingUsers
                      ? "…"
                      : users
                          .filter((u) => u.role === "student")
                          .length.toLocaleString()}
                  </span>
                  <span className="ad-stat-card__label">Học viên</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {loadingUsers
                      ? "…"
                      : users
                          .filter((u) => u.role === "instructor")
                          .length.toLocaleString()}
                  </span>
                  <span className="ad-stat-card__label">Giảng viên</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {loadingCourses ? "…" : approvedCourses.length}
                  </span>
                  <span className="ad-stat-card__label">Khóa đã duyệt</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {loadingStats ? "…" : formatPrice(totalRevenue, "VND")}
                  </span>
                  <span className="ad-stat-card__label">Doanh thu</span>
                </div>
              </div>

              {/* ── Row 2: card hoàn tiền ── */}
              <div
                className="ad-stats-grid"
                style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
              >
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {loadingPayments
                      ? "…"
                      : payments.filter((p) => p.status === "refund_requested")
                          .length}
                  </span>
                  <span className="ad-stat-card__label">Yêu cầu hoàn tiền</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {loadingPayments
                      ? "…"
                      : payments.filter((p) => p.status === "refunded").length}
                  </span>
                  <span className="ad-stat-card__label">Đã hoàn tiền</span>
                </div>
                <div className="ad-stat-card">
                  <span className="ad-stat-card__value">
                    {loadingCourses ? "…" : pendingCourses.length}
                  </span>
                  <span className="ad-stat-card__label">Khóa chờ duyệt</span>
                </div>
              </div>

              {/* ── Row 3: danh sách ── */}
              <div className="ad-overview-grid">
                <div>
                  <h2 className="ad-section-title">
                    Khóa học chờ duyệt ({pendingCourses.length})
                  </h2>
                  <div className="ad-pending-list">
                    {loadingCourses ? (
                      <p className="ad-empty">Đang tải…</p>
                    ) : pendingCourses.length === 0 ? (
                      <p className="ad-empty">Không có khóa học chờ duyệt.</p>
                    ) : (
                      pendingCourses.map((c) => (
                        <div key={c.id} className="ad-pending-row">
                          <span className="ad-pending-row__title">
                            {c.title}
                          </span>
                          <button
                            className="ad-btn-approve"
                            onClick={() => approveCourse(c.id)}
                          >
                            Duyệt
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="ad-section-title">
                    Yêu cầu hoàn tiền (
                    {
                      payments.filter((p) => p.status === "refund_requested")
                        .length
                    }
                    )
                  </h2>
                  <div className="ad-recent-users">
                    {loadingPayments ? (
                      <p className="ad-empty">Đang tải…</p>
                    ) : payments.filter((p) => p.status === "refund_requested")
                        .length === 0 ? (
                      <p className="ad-empty">Không có yêu cầu hoàn tiền.</p>
                    ) : (
                      payments
                        .filter((p) => p.status === "refund_requested")
                        .slice(0, 5)
                        .map((p) => (
                          <div key={p.id} className="ad-recent-user">
                            <div>
                              <span className="ad-recent-user__name">
                                {p.student_name ?? "—"}
                              </span>
                              <span className="ad-recent-user__email">
                                {p.course_title ?? "—"} ·{" "}
                                {formatPrice(p.amount ?? 0, "VND")}
                              </span>
                            </div>
                            <div
                              style={{ display: "flex", gap: 6, flexShrink: 0 }}
                            >
                              <button
                                className="ad-btn-sm ad-btn-sm--approve"
                                onClick={() => openApproveRefund(p)}
                              >
                                Duyệt
                              </button>
                              <button
                                className="ad-btn-sm ad-btn-sm--ban"
                                onClick={() => openRejectRefund(p)}
                              >
                                Từ chối
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* ── Biểu đồ doanh thu theo danh mục ── */}
              <div className="ad-stats-breakdown">
                <h2 className="ad-section-title">Doanh thu theo danh mục</h2>
                {catRevenueEntries.length === 0 || maxCatRevenue === 0 ? (
                  <p className="ad-empty">Chưa có dữ liệu doanh thu.</p>
                ) : (
                  <div className="ad-col-chart">
                    {catRevenueEntries.map(([label, revenue]) => {
                      const heightPct = Math.round(
                        (revenue / maxCatRevenue) * 100,
                      );
                      const color = CAT_COLORS[label] ?? "#778DA9";
                      return (
                        <div key={label} className="ad-col-chart__item">
                          <span className="ad-col-chart__pct">
                            {revenue === 0 ? "0đ" : formatPrice(revenue, "VND")}
                          </span>
                          <div className="ad-col-chart__bar-wrap">
                            <div
                              className="ad-col-chart__bar"
                              style={{
                                height: `${heightPct}%`,
                                background: color,
                              }}
                            />
                          </div>
                          <span className="ad-col-chart__label">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {toast && (
            <div
              style={{
                position: "fixed",
                bottom: 24,
                right: 24,
                zIndex: 9999,
                padding: "12px 20px",
                borderRadius: 10,
                background:
                  toast.type === "success"
                    ? "rgba(76,175,130,0.95)"
                    : "rgba(224,92,92,0.95)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                animation: "cm-slide-up 0.2s ease",
              }}
            >
              {toast.msg}
            </div>
          )}

          {/* ══ Users ═════════════════════════════════════════════════════════ */}
          {activeTab === "users" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý người dùng</h1>
                <p className="ad-page-sub">
                  {loadingUsers ? "Đang tải…" : `${users.length} người dùng`}
                </p>
              </div>
              <div className="ad-toolbar">
                <div className="ad-filters">
                  <input
                    className="ad-search"
                    type="search"
                    placeholder="Tìm theo tên hoặc email..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                  />
                </div>
                <button
                  className="ad-btn-add-course"
                  onClick={() => {
                    setAddUserForm({
                      full_name: "",
                      email: "",
                      username: "",
                      password: "",
                      role: "student",
                    });
                    setAddUserError("");
                    setShowAddUserModal(true);
                  }}
                >
                  ＋ Thêm người dùng
                </button>
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table ad-table--users">
                  <thead>
                    <tr>
                      <th>Người dùng</th>
                      <th>Vai trò</th>
                      <th>Ngày tham gia</th>
                      <th>Trạng thái</th>
                      <th>thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center" }}>
                          Đang tải…
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          Không tìm thấy người dùng phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const status = getUserStatus(u);
                        return (
                          <tr key={u.id}>
                            <td>
                              <div className="ad-user-cell">
                                <span className="ad-user-cell__name">
                                  {u.full_name ?? u.name ?? u.username}
                                </span>
                                <span className="ad-user-cell__email">
                                  {u.email}
                                </span>
                              </div>
                            </td>
                            <td>
                              <select
                                className="ad-role-select"
                                value={u.role}
                                disabled={u.role === "admin"}
                                onChange={(e) =>
                                  changeUserRole(u, e.target.value)
                                }
                              >
                                <option value="student">Học viên</option>
                                <option value="instructor">Giảng viên</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="ad-table__muted">
                              {u.date_joined
                                ? new Date(u.date_joined).toLocaleDateString(
                                    "vi-VN",
                                  )
                                : "—"}
                            </td>
                            <td>
                              <span className={`ad-badge ad-badge--${status}`}>
                                {STATUS_LABEL[status] ?? status}
                              </span>
                            </td>
                            <td>
                              <div className="ad-action-group">
                                <button
                                  className="ad-btn-sm ad-btn-sm--view"
                                  onClick={() => openViewUser(u)}
                                >
                                  Xem
                                </button>
                                {u.role !== "admin" && (
                                  <button
                                    className={`ad-btn-sm${status === "banned" ? " ad-btn-sm--restore" : " ad-btn-sm--ban"}`}
                                    onClick={() => toggleUserStatus(u)}
                                  >
                                    {status === "banned"
                                      ? "Mở khóa"
                                      : "Khóa TK"}
                                  </button>
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
            </div>
          )}

          {/* ══ Courses ═══════════════════════════════════════════════════════ */}
          {activeTab === "courses" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý khóa học</h1>
                <p className="ad-page-sub">
                  {loadingCourses
                    ? "Đang tải…"
                    : `${filteredCourses.length} / ${courses.length} khóa học`}
                </p>
              </div>

              {/* Toolbar */}
              <div className="ad-toolbar">
                <div className="ad-filters">
                  <input
                    className="ad-search"
                    type="search"
                    placeholder="Tìm theo tên khóa học, giảng viên..."
                    value={searchCourse}
                    onChange={(e) => setSearchCourse(e.target.value)}
                  />
                  <select
                    className="ad-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="draft">Nháp</option>
                    <option value="review">Chờ duyệt</option>
                    <option value="published">Đã xuất bản</option>
                    <option value="archived">Đã lưu trữ</option>
                  </select>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{ fontSize: 13, color: "rgba(224,225,221,0.4)" }}
                    >
                      Học phí:
                    </span>
                    {[
                      { value: "", label: "Tất cả" },
                      { value: "asc", label: "Thấp → Cao" },
                      { value: "desc", label: "Cao → Thấp" },
                    ].map((s) => (
                      <button
                        key={s.value}
                        className={`sort-btn${sortPrice === s.value ? " sort-btn--active" : ""}`}
                        onClick={() => setSortPrice(s.value)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {(searchCourse || filterStatus || sortPrice) && (
                    <button
                      className="filter-clear"
                      onClick={() => {
                        setSearchCourse("");
                        setFilterStatus("");
                        setSortPrice("");
                      }}
                    >
                      ✕ Xoá lọc
                    </button>
                  )}
                </div>
                <button className="ad-btn-add-course" onClick={openAdd}>
                  ＋ Thêm khóa học
                </button>
              </div>

              <div className="ad-table-wrap">
                <table className="ad-table ad-table--courses">
                  <thead>
                    <tr>
                      <th>Khóa học</th>
                      <th>Giảng viên</th>
                      <th>Học viên</th>
                      <th>Học phí</th>
                      <th>Trạng thái</th>
                      <th>thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCourses ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center" }}>
                          Đang tải…
                        </td>
                      </tr>
                    ) : filteredCourses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          Không tìm thấy khóa học phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredCourses.map((c) => {
                        const price = c.sale_price ?? c.price ?? 0;
                        const students =
                          c.total_students ?? c.enrolled_count ?? 0;
                        return (
                          <tr key={c.id}>
                            <td>
                              <span className="ad-table__title">{c.title}</span>
                            </td>
                            <td>
                              {c.instructor_name ?? c.instructor?.name ?? "—"}
                            </td>
                            <td>{students.toLocaleString()}</td>
                            <td>
                              {price === 0
                                ? "Miễn phí"
                                : formatPrice(price, "VND")}
                            </td>
                            <td>
                              <span
                                className={`ad-badge ad-badge--${c.status}`}
                              >
                                {STATUS_LABEL[c.status] ?? c.status}
                              </span>
                            </td>
                            <td>
                              <div className="ad-actions">
                                <button
                                  className="ad-btn-sm ad-btn-sm--edit"
                                  onClick={() => openEdit(c)}
                                >
                                  Sửa
                                </button>
                                {c.status === "review" && (
                                  <>
                                    <button
                                      className="ad-btn-sm ad-btn-sm--approve"
                                      onClick={() => approveCourse(c.id)}
                                    >
                                      Duyệt
                                    </button>
                                    <button
                                      className="ad-btn-sm ad-btn-sm--ban"
                                      onClick={() => rejectCourse(c.id)}
                                    >
                                      Từ chối
                                    </button>
                                  </>
                                )}
                                {c.status === "published" && (
                                  <button
                                    className="ad-btn-sm ad-btn-sm--ban"
                                    onClick={() => archiveCourse(c.id)}
                                  >
                                    Ẩn
                                  </button>
                                )}
                                {c.status === "archived" && (
                                  <button
                                    className="ad-btn-sm ad-btn-sm--restore"
                                    onClick={() => unarchiveCourse(c.id)}
                                  >
                                    Hiện
                                  </button>
                                )}
                                <button
                                  className="ad-btn-sm ad-btn-sm--delete"
                                  onClick={() => openDelete(c)}
                                >
                                  Xóa
                                </button>
                              </div>
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

          {/* ══ Sections ════════════════════════════════════════════════════════ */}
          {activeTab === "sections" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý chương học</h1>
                <p className="ad-page-sub">
                  {loadingSections ? "Đang tải…" : `${sections.length} chương`}
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
                <table className="ad-table ad-table--sections">
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
                          Đang tải…
                        </td>
                      </tr>
                    ) : sections.filter(
                        (s) =>
                          !filterSectionCourse ||
                          String(s.course?.id ?? s.course) ===
                            filterSectionCourse,
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
                          Không có chương nào.
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
                                    setActiveTab("lessons");
                                  }}
                                >
                                  Bài học
                                </button>
                                <button
                                  className="ad-btn-sm ad-btn-sm--delete"
                                  onClick={() => openDeleteSection(s)}
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
            </div>
          )}

          {/* ══ Lessons ══════════════════════════════════════════════════════════ */}
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
                  {/* Lọc theo khóa học */}
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
                  {/* Lọc theo chương */}
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
                <table className="ad-table ad-table--lessons">
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
                        <td colSpan={7} style={{ textAlign: "center" }}>
                          Đang tải…
                        </td>
                      </tr>
                    ) : lessons.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          Không có bài học nào.
                        </td>
                      </tr>
                    ) : (
                      lessons.map((l) => {
                        return (
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
                                  onClick={() => openDeleteLesson(l)}
                                >
                                  Xóa
                                </button>
                              </div>
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

          {/* ══ Quizzes ══════════════════════════════════════════════════════════ */}
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
                <table className="ad-table ad-table--quizzes">
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
                          Đang tải…
                        </td>
                      </tr>
                    ) : quizzes.filter(
                        (q) =>
                          !filterQuizLesson ||
                          String(q.lesson?.id ?? q.lesson) === filterQuizLesson,
                      ).length === 0 ? (
                      <tr>
                        <td>Không có bài kiểm tra nào.</td>
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
                                    className="viewhid-btn"
                                    onClick={() => {
                                      if (isExpanded) {
                                        setExpandedQuizId(null);
                                      } else {
                                        setExpandedQuizId(q.id);
                                        fetchQuestions(q.id);
                                      }
                                    }}
                                  >
                                    {isExpanded ? "Ẩn" : "Xem"}
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
                                        setExpandedQuizId(q.id);
                                        fetchQuestions(q.id);
                                        openAddQuestion(q.id);
                                      }}
                                    >
                                      ＋ Câu hỏi
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
                                          Chưa có câu hỏi nào. Nhấn "＋ Câu hỏi"
                                          để thêm.
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
            </div>
          )}

          {/* ══ Enrollments ══════════════════════════════════════════════════ */}
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
                <table className="ad-table ad-table--enrollments">
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
                          Đang tải…
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
                          Không tìm thấy lượt đăng ký phù hợp.
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
                                    e.user?.full_name ??
                                    e.user?.username ??
                                    "—"}
                                </span>
                                <span className="ad-user-cell__email">
                                  {e.student_email ?? e.user?.email ?? ""}
                                </span>
                              </div>
                            </td>
                            <td className="ad-table__title">
                              {e.course_title ?? e.course?.title ?? "—"}
                            </td>
                            <td className="ad-table__muted">
                              {(e.enrolled_at ?? e.created_at)
                                ? new Date(
                                    e.enrolled_at ?? e.created_at,
                                  ).toLocaleDateString("vi-VN")
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

          {/* ══ Categories ════════════════════════════════════════════════════ */}
          {activeTab === "categories" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý danh mục</h1>
                <p className="ad-page-sub">
                  {loadingCategories
                    ? "Đang tải…"
                    : `${filteredCategories.length} / ${categories.length} danh mục`}
                </p>
              </div>
              <div className="ad-toolbar">
                <div className="ad-filters">
                  <input
                    className="ad-search"
                    type="search"
                    placeholder="Tìm theo tên danh mục..."
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                  />
                  {searchCategory && (
                    <button
                      className="filter-clear"
                      onClick={() => setSearchCategory("")}
                    >
                      ✕ Xoá lọc
                    </button>
                  )}
                </div>
                <button className="ad-btn-add-course" onClick={openAddCategory}>
                  ＋ Thêm danh mục
                </button>
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table ad-table--categories">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Tên danh mục</th>
                      <th>Mô tả</th>
                      <th>Số khóa học</th>
                      <th>Ghim</th>
                      <th>Thứ tự</th>
                      <th>thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCategories ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center" }}>
                          Đang tải…
                        </td>
                      </tr>
                    ) : filteredCategories.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          Không tìm thấy danh mục phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredCategories.map((cat, idx) => (
                        <tr key={cat.id}>
                          <td className="ad-table__muted">{idx + 1}</td>
                          <td>
                            <strong>{cat.name}</strong>
                          </td>
                          <td className="ad-table__muted">
                            {cat.description || "—"}
                          </td>
                          <td className="ad-table__muted">
                            {
                              courses.filter((c) => {
                                const cid =
                                  typeof c.category === "object"
                                    ? c.category?.id
                                    : c.category;
                                return String(cid) === String(cat.id);
                              }).length
                            }
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {cat.is_pinned ? "📌" : "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {cat.is_pinned ? cat.pin_order : "—"}
                          </td>
                          <td>
                            <div className="ad-actions">
                              <button
                                className="ad-btn-sm ad-btn-sm--edit"
                                onClick={() => openEditCategory(cat)}
                              >
                                Sửa
                              </button>
                              <button
                                className="ad-btn-sm ad-btn-sm--ban"
                                onClick={() => openDeleteCategory(cat)}
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
            </div>
          )}

          {/* ══ Payments ══════════════════════════════════════════════════════ */}
          {activeTab === "payments" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý thanh toán</h1>
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
                  placeholder="Tìm theo tên người dùng, khóa học..."
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
                <table className="ad-table ad-table--payments">
                  <thead>
                    <tr>
                      <th>Người dùng</th>
                      <th>Khóa học</th>
                      <th>Số tiền</th>
                      <th>Ngày trả</th>
                      <th>Trạng thái</th>
                      <th>thao tác</th>
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
                          Không tìm thấy giao dịch phù hợp.
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
                              {p.course_title ?? p.course?.title ?? "—"}
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
                                {PAYMENT_STATUS_LABEL[status] ?? status}
                              </span>
                            </td>
                            <td>
                              <div className="ad-actions">
                                <button
                                  className="ad-btn-sm ad-btn-sm--view"
                                  onClick={() => openPaymentDetail(p.id)}
                                >
                                  Xem
                                </button>

                                {status === "refund_requested" && (
                                  <>
                                    <button
                                      className="ad-btn-sm ad-btn-sm--approve"
                                      onClick={() => openApproveRefund(p)}
                                    >
                                      Duyệt
                                    </button>
                                    <button
                                      className="ad-btn-sm ad-btn-sm--ban"
                                      onClick={() => openRejectRefund(p)}
                                    >
                                      Từ chối
                                    </button>
                                  </>
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
                              value: paymentDetail.method ?? "—",
                            },
                            {
                              label: "Mã GD",
                              value:
                                paymentDetail.ref_code ??
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

                          {/* LÝ DO HOÀN TIỀN — chỉ hiện khi refund_requested hoặc có refund_reason */}
                          {(paymentDetail.status === "refund_requested" ||
                            paymentDetail.refund_reason) && (
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
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "#f5c842",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                Lý do hoàn tiền từ học viên
                              </span>
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
                              {paymentDetail.refund_requested_at && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--color-text-secondary)",
                                  }}
                                >
                                  Gửi lúc:{" "}
                                  {new Date(
                                    paymentDetail.refund_requested_at,
                                  ).toLocaleString("vi-VN")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="cm-footer">
                      {paymentDetail?.status === "refund_requested" && (
                        <>
                          <button
                            className="cm-btn cm-btn--primary"
                            style={{
                              background: "#4caf82",
                              borderColor: "#4caf82",
                              marginRight: "auto",
                            }}
                            onClick={() => {
                              closePaymentDetail();
                              openApproveRefund(paymentDetail);
                            }}
                          >
                            Duyệt hoàn tiền
                          </button>
                          <button
                            className="cm-btn cm-btn--danger"
                            onClick={() => {
                              closePaymentDetail();
                              openRejectRefund(paymentDetail);
                            }}
                          >
                            ✘ Từ chối
                          </button>
                        </>
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

          {/* ══ Reviews ═══════════════════════════════════════════════════════ */}
          {activeTab === "reviews" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý đánh giá</h1>
                <p className="ad-page-sub">
                  {loadingReviews
                    ? "Đang tải…"
                    : `${filteredReviews.length} / ${reviews.length} đánh giá`}
                </p>
              </div>

              {/* ── Filters ── */}
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
                  {Array.from(
                    new Set(
                      reviews.map(
                        (r) => r.course_title ?? r.course?.title ?? "",
                      ),
                    ),
                  )
                    .filter(Boolean)
                    .map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                </select>
                <select
                  className="ad-select"
                  value={filterReported}
                  onChange={(e) => setFilterReported(e.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="reported">Báo cáo</option>
                  <option value="hidden">Đã ẩn</option>
                  <option value="visible">Hiển thị</option>
                </select>
                {(searchReview || filterReviewRating || filterReviewCourse) && (
                  <button
                    className="filter-clear"
                    onClick={() => {
                      setSearchReview("");
                      setFilterReviewRating("");
                      setFilterReviewCourse("");
                      setFilterReported("");
                    }}
                  >
                    ✕ Xoá lọc
                  </button>
                )}
              </div>

              {/* ── Table ── */}
              <div className="ad-table-wrap">
                <table className="ad-table ad-table--reviews">
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Khóa học</th>
                      <th>Số sao</th>
                      <th>Nhận xét</th>
                      <th>Trạng thái</th>
                      <th>thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingReviews ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ textAlign: "center", padding: "2rem" }}
                        >
                          Đang tải…
                        </td>
                      </tr>
                    ) : filteredReviews.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="ad-empty"
                          style={{ textAlign: "center", padding: "2rem" }}
                        >
                          Không tìm thấy đánh giá phù hợp.
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
                                {r.student_name ??
                                  r.student?.full_name ??
                                  r.student?.username ??
                                  "—"}
                              </span>
                              <span className="ad-user-cell__email">
                                {r.student_email ?? r.student?.email ?? ""}
                              </span>
                            </div>
                          </td>
                          <td className="ad-table__title">
                            {r.course_title ?? r.course?.title ?? "—"}
                          </td>
                          <td>
                            <div className="ad-star">
                              <span className="ad-star__icons">
                                {"★".repeat(r.rating)}
                                {"☆".repeat(5 - r.rating)}
                              </span>
                            </div>
                          </td>
                          <td className="ad-table__muted" title={r.comment}>
                            {r.comment ? r.comment : <em>Không có nhận xét</em>}
                          </td>
                          <td>
                            {r.is_hidden ? (
                              <span className="ad-badge ad-review-badge--hidden">
                                Đã ẩn
                              </span>
                            ) : r.is_reported ? (
                              <span className="ad-badge ad-badge--danger">
                                Báo cáo
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
                              <button
                                className={`ad-btn-sm ${r.is_hidden ? "ad-btn-sm--restore" : "ad-btn-sm--refund"}`}
                                onClick={() => handleToggleHide(r)}
                                disabled={togglingReview}
                              >
                                {r.is_hidden ? "Hiện" : "Ẩn"}
                              </button>
                              <button
                                className="ad-btn-sm ad-btn-sm--ban"
                                onClick={() => openDeleteReview(r)}
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

              {/* ── Modal xem chi tiết ── */}
              {reviewModal === "view" && selectedReview && (
                <div className="ad-modal-overlay" onClick={closeReviewModal}>
                  <div
                    className="ad-modal"
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxWidth: 500 }}
                  >
                    <h2 className="ad-modal__title">Chi tiết đánh giá</h2>
                    <div className="ad-modal__body">
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Học viên</span>
                        <span className="ad-modal__field-value">
                          {selectedReview.student_name ??
                            selectedReview.student?.full_name ??
                            "—"}
                          {(selectedReview.student_email ??
                            selectedReview.student?.email) && (
                            <span
                              style={{
                                fontWeight: 400,
                                marginLeft: 6,
                                fontSize: 12,
                                opacity: 0.5,
                              }}
                            >
                              (
                              {selectedReview.student_email ??
                                selectedReview.student?.email}
                              )
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Khóa học</span>
                        <span className="ad-modal__field-value">
                          {selectedReview.course_title ??
                            selectedReview.course?.title ??
                            "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Số sao</span>
                        <div className="ad-modal__field-value--stars">
                          <span className="ad-modal__stars">
                            {"★".repeat(selectedReview.rating)}
                          </span>
                          <span className="ad-modal__stars-dim">
                            {"☆".repeat(5 - selectedReview.rating)}
                          </span>
                          <span className="ad-modal__rating-num">
                            {selectedReview.rating} / 5
                          </span>
                        </div>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Nhận xét</span>
                        {selectedReview.comment ? (
                          <p className="ad-modal__field-value--comment">
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
                          Trạng thái hiển thị
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginTop: 4,
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
                          {selectedReview.is_hidden &&
                            selectedReview.hidden_at && (
                              <span className="ad-modal__rating-num">
                                từ{" "}
                                {new Date(
                                  selectedReview.hidden_at,
                                ).toLocaleDateString("vi-VN")}
                              </span>
                            )}
                          <button
                            className={`ad-btn-sm ${selectedReview.is_hidden ? "ad-btn-sm--restore" : "ad-btn-sm--refund"}`}
                            onClick={() => handleToggleHide(selectedReview)}
                            disabled={togglingReview}
                          >
                            {togglingReview
                              ? "…"
                              : selectedReview.is_hidden
                                ? "Hiện lại"
                                : "Ẩn đi"}
                          </button>
                        </div>
                      </div>
                      {selectedReview.is_reported && (
                        <div
                          className="ad-modal__field"
                          style={{ borderRadius: 8, padding: "10px 14px" }}
                        >
                          <span className="ad-modal__field-label">
                            Báo cáo vi phạm
                          </span>
                          <div
                            style={{
                              marginTop: 6,
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                            }}
                          >
                            <span className="ad-modal__field-value">
                              <strong>Lý do:</strong>{" "}
                              {selectedReview.report_reason ||
                                "(không có lý do)"}
                            </span>
                            {selectedReview.reported_by_name && (
                              <span className="ad-modal__field-value">
                                <strong>Người báo cáo:</strong>{" "}
                                {selectedReview.reported_by_name}
                              </span>
                            )}
                            <button
                              className="ad-btn-sm"
                              onClick={() =>
                                handleDismissReport(selectedReview)
                              }
                            >
                              Bỏ qua báo cáo
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="ad-modal__meta">
                        <div className="ad-modal__field">
                          <span className="ad-modal__field-label">
                            Ngày đánh giá
                          </span>
                          <span className="ad-modal__field-value">
                            {selectedReview.created_at
                              ? new Date(
                                  selectedReview.created_at,
                                ).toLocaleString("vi-VN")
                              : "—"}
                          </span>
                        </div>
                        {selectedReview.edit_count > 0 && (
                          <div className="ad-modal__field">
                            <span className="ad-modal__field-label">
                              Số lần chỉnh sửa
                            </span>
                            <span className="ad-modal__field-value">
                              {selectedReview.edit_count} lần
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ad-modal__footer">
                      <button
                        className="ad-btn-sm ad-btn-sm--ban"
                        onClick={() => {
                          closeReviewModal();
                          openDeleteReview(selectedReview);
                        }}
                      >
                        Xóa đánh giá
                      </button>
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

              {/* ── Modal xác nhận xóa ── */}
              {reviewModal === "delete" && selectedReview && (
                <div className="ad-modal-overlay" onClick={closeReviewModal}>
                  <div
                    className="ad-modal"
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxWidth: 420 }}
                  >
                    <h2 className="ad-modal__title">Xóa đánh giá</h2>
                    <p className="ad-modal__delete-desc">
                      Bạn có chắc muốn xóa đánh giá{" "}
                      <strong>{selectedReview.rating} sao</strong> của{" "}
                      <strong>
                        {selectedReview.student_name ??
                          selectedReview.student?.full_name ??
                          "—"}
                      </strong>{" "}
                      về khóa học{" "}
                      <strong>
                        {selectedReview.course_title ??
                          selectedReview.course?.title ??
                          "—"}
                      </strong>
                      ?
                    </p>
                    <p className="ad-modal__warn" style={{ margin: "0 22px" }}>
                      Hành động này không thể hoàn tác.
                    </p>
                    <div className="ad-modal__footer">
                      <button
                        className="ad-btn-sm ad-btn-sm--ban"
                        onClick={handleDeleteReview}
                        disabled={deletingReview}
                      >
                        {deletingReview ? "Đang xóa…" : "Xác nhận xóa"}
                      </button>
                      <button
                        className="ad-modal__cancel"
                        onClick={closeReviewModal}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {showPaymentModal && (
            <div className="ad-modal-overlay" onClick={closePaymentDetail}>
              <div
                className="ad-modal ad-modal--payment"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="ad-modal__header">
                  <h2 className="ad-modal__title">Chi tiết giao dịch</h2>
                  <button
                    className="ad-modal__close"
                    onClick={closePaymentDetail}
                  >
                    ✕
                  </button>
                </div>

                <div className="ad-modal__body">
                  {loadingDetail ? (
                    <p style={{ textAlign: "center" }}> Đang tải…</p>
                  ) : !paymentDetail ? (
                    <p style={{ textAlign: "center", color: "red" }}>
                      Không tải được dữ liệu.
                    </p>
                  ) : (
                    <>
                      {/* ── Trạng thái nổi bật ── */}
                      <div
                        style={{ textAlign: "center", marginBottom: "1rem" }}
                      >
                        <span
                          className={`ad-badge ad-badge--pay-${paymentDetail.status}`}
                        >
                          {PAYMENT_STATUS_LABEL[paymentDetail.status] ??
                            paymentDetail.status}
                        </span>
                      </div>

                      {/* ── Mã giao dịch ── */}
                      <div className="ad-modal__section-title">
                        Thông tin giao dịch
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Mã tham chiếu
                        </span>
                        <span
                          className="ad-modal__field-value"
                          style={{ fontFamily: "monospace" }}
                        >
                          {paymentDetail.ref_code ?? "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Mã gateway
                        </span>
                        <span
                          className="ad-modal__field-value"
                          style={{ fontFamily: "monospace" }}
                        >
                          {paymentDetail.gateway_ref || "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Phương thức
                        </span>
                        <span className="ad-modal__field-value">
                          {paymentDetail.method?.toUpperCase() ?? "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Số tiền</span>
                        <span
                          className="ad-modal__field-value"
                          style={{ color: "#4caf82", fontWeight: 600 }}
                        >
                          {formatPrice(paymentDetail.amount ?? 0, "VND")}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Ngày tạo</span>
                        <span className="ad-modal__field-value">
                          {paymentDetail.created_at
                            ? new Date(paymentDetail.created_at).toLocaleString(
                                "vi-VN",
                              )
                            : "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Ngày thanh toán
                        </span>
                        <span className="ad-modal__field-value">
                          {paymentDetail.paid_at
                            ? new Date(paymentDetail.paid_at).toLocaleString(
                                "vi-VN",
                              )
                            : "—"}
                        </span>
                      </div>

                      {/* ── Học viên ── */}
                      <div className="ad-modal__section-title">Học viên</div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Họ tên</span>
                        <span className="ad-modal__field-value">
                          {paymentDetail.student_name || "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Email</span>
                        <span className="ad-modal__field-value">
                          {paymentDetail.student_email || "—"}
                        </span>
                      </div>

                      {/* ── Khóa học ── */}
                      <div className="ad-modal__section-title">Khóa học</div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Tên khóa học
                        </span>
                        <span className="ad-modal__field-value">
                          {paymentDetail.course_title || "—"}
                        </span>
                      </div>

                      {/* ── Ghi chú / lý do hoàn tiền ── */}
                      {paymentDetail.note && (
                        <>
                          <div className="ad-modal__section-title">Ghi chú</div>
                          <p className="ad-modal__field-value--comment">
                            {paymentDetail.note}
                          </p>
                        </>
                      )}
                      {paymentDetail.refund_reason && (
                        <>
                          <div className="ad-modal__section-title">
                            Lý do hoàn tiền
                          </div>
                          <p className="ad-modal__field-value--comment">
                            {paymentDetail.refund_reason}
                          </p>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="ad-modal__footer">
                  <button
                    className="ad-modal__cancel"
                    onClick={closePaymentDetail}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
