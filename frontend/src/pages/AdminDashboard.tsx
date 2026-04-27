import React, { useState, useEffect, useCallback } from "react";
import { formatPrice } from "../utils/format";
import { getUserId } from "../utils/auth";
import { usePagination } from "../../src/hooks/usePagination";
import Pagination from "../components/ui/Pagination";

interface AdminDashboardProps {
  onNavigate: (page: string, courseId?: string) => void;
  onLogout: () => void;
}

const API = "http://127.0.0.1:8000";
const PAGE_SIZE = 10;

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
  | "payments"
  | "refunds";

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
  { id: "refunds", label: "Hoàn tiền" },
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
  archive_requested: "Yêu cầu lưu trữ",
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  success: "Thành công",
  pending: "Chờ xử lý",
  refunded: "Đã hoàn tiền",
  failed: "Thất bại",
  refund_approved: "Đã duyệt",
  refund_requested: "Yêu cầu",
};

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

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

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

  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [searchEnrollment, setSearchEnrollment] = useState("");
  const [filterEnrollStatus, setFilterEnrollStatus] = useState("");
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);

  const [searchUser, setSearchUser] = useState("");
  const [searchCourse, setSearchCourse] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortPrice, setSortPrice] = useState("");
  const [searchPayment, setSearchPayment] = useState("");
  const [filterPayStatus, setFilterPayStatus] = useState("");
  const [filterRefundStatus, setFilterRefundStatus] = useState("");
  const [filterReported, setFilterReported] = useState("");

  const [courseModal, setCourseModal] = useState<CourseModalType>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courseForm, setCourseForm] = useState<CourseForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [modalFilterCourse, setModalFilterCourse] = useState("");
  const [courseViewModal, setCourseViewModal] = useState(false);
  const [viewingCourse, setViewingCourse] = useState<any>(null);

  const openViewCourse = async (c: any) => {
    console.log("OPEN COURSE", c);
    setViewingCourse(c);
    setCourseViewModal(true);
    try {
      const res = await fetch(`${API}/api/courses/admin/${c.id}/`, {
        headers: authHeader(),
      });
      if (res.ok) setViewingCourse(await res.json());
    } catch {}
  };

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
  const [lessonViewModal, setLessonViewModal] = useState(false);
  const [viewingLesson, setViewingLesson] = useState<any>(null);

  const openViewLesson = (l: any) => {
    setViewingLesson(l);
    setLessonViewModal(true);
  };

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

  const [paymentDetail, setPaymentDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalContext, setPaymentModalContext] = useState<
    "payment" | "refund"
  >("payment");

  const openRefundDetail = async (id: string) => {
    setPaymentModalContext("refund");
    setShowPaymentModal(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API}/api/payments/admin/${id}/`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        console.log("REFUND DETAIL FIELDS:", Object.keys(data));
        console.log("REFUND DETAIL DATA:", data);
        setPaymentDetail(data);
      } else setPaymentDetail(null);
    } catch {
      setPaymentDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const openPaymentDetail = async (id: string) => {
    setPaymentModalContext("payment");
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
    setLoadingAttemptDetail(true);
    try {
      const quizId = selectedQuizForAttempt?.id ?? attempt.quiz_id;
      const [detailRes, questionsRes] = await Promise.all([
        fetch(`${API}/api/quizzes/attempts/${attempt.id}/`, {
          headers: authHeader(),
        }),
        fetch(`${API}/api/quizzes/${quizId}/questions/`, {
          headers: authHeader(),
        }),
      ]);
      const detail = detailRes.ok ? await detailRes.json() : null;
      const qs = questionsRes.ok ? toList(await questionsRes.json()) : [];
      setSelectedAttempt((prev: any) => ({
        ...prev,
        ...(detail ?? {}),
        _questions: qs,
      }));
    } catch {}
    setLoadingAttemptDetail(false);
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

  const approveCourse = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/courses/admin/${id}/approve/`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (res.ok) {
        fetchCourses();
        showToast("Đã duyệt khóa học thành công.", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err?.detail ?? "Duyệt thất bại.", "error");
      }
    } catch {
      showToast("Lỗi kết nối.", "error");
    }
  };

  const rejectCourse = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/courses/admin/${id}/reject/`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (res.ok) {
        fetchCourses();
        showToast("Đã từ chối khóa học.", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err?.detail ?? "Từ chối thất bại.", "error");
      }
    } catch {
      showToast("Lỗi kết nối.", "error");
    }
  };

  const archiveCourse = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/courses/admin/${id}/archive/`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (res.ok) {
        fetchCourses();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err?.detail ?? "Không thể ẩn khóa học.", "error");
      }
    } catch {
      showToast("Lỗi kết nối.", "error");
    }
  };

  const unarchiveCourse = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/courses/admin/${id}/unarchive/`, {
        method: "PATCH",
        headers: authHeader(),
      });
      if (res.ok) {
        fetchCourses();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err?.detail ?? "Khôi phục thất bại.", "error");
      }
    } catch {
      showToast("Lỗi kết nối.", "error");
    }
  };

  const rejectArchiveCourse = async (id: string) => {
    try {
      const res = await fetch(
        `${API}/api/courses/admin/${id}/reject-archive/`,
        {
          method: "PATCH",
          headers: authHeader(),
        },
      );
      if (res.ok) {
        fetchCourses();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err?.detail ?? "Từ chối thất bại.", "error");
      }
    } catch {
      showToast("Lỗi kết nối.", "error");
    }
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
        setSelectedReview(updated);
      }
    } catch {}
  };

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
      normalize(p.student_name ?? p.student_email ?? "").includes(q) ||
      normalize(p.course_title ?? p.course?.title ?? "").includes(q);

    const isRefundFlow = [
      "refund_requested",
      "refund_approved",
      "refunded",
    ].includes(p.status);

    const matchStatus = !filterPayStatus || p.status === filterPayStatus;
    return matchSearch && matchStatus && !isRefundFlow;
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

  const pendingCourses = courses.filter(
    (c) => c.status === "review" || c.status === "archive_requested",
  );
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

  const pgUsers = usePagination(filteredUsers, PAGE_SIZE);
  const pgCourses = usePagination(filteredCourses, PAGE_SIZE);
  const pgSections = usePagination(
    sections
      .filter(
        (s) =>
          !filterSectionCourse ||
          String(s.course?.id ?? s.course) === filterSectionCourse,
      )
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    PAGE_SIZE,
  );
  const pgLessons = usePagination(lessons, PAGE_SIZE);
  const pgQuizzes = usePagination(
    quizzes.filter(
      (q) =>
        !filterQuizLesson ||
        String(q.lesson?.id ?? q.lesson) === filterQuizLesson,
    ),
    PAGE_SIZE,
  );
  const pgEnrollments = usePagination(filteredEnrollments, PAGE_SIZE);
  const pgCategories = usePagination(filteredCategories, PAGE_SIZE);
  const pgReviews = usePagination(filteredReviews, PAGE_SIZE);
  const pgPayments = usePagination(filteredPayments, PAGE_SIZE);
  const pgRefunds = usePagination(
    payments.filter((p) => {
      const inFlow = [
        "refund_requested",
        "refund_approved",
        "refunded",
      ].includes(p.status);
      const match = !filterRefundStatus || p.status === filterRefundStatus;
      return inFlow && match;
    }),
    PAGE_SIZE,
  );

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

    const prevLoginAt = localStorage.getItem("prev_login_at");

    const edited = courses.filter((c) => {
      if (c.status !== "published") return false;
      if (!c.updated_at || !c.published_at) return false;

      const diff =
        new Date(c.updated_at).getTime() - new Date(c.published_at).getTime();
      if (diff <= 5000) return false;

      if (sessionDismissed.has(c.id)) return false;

      if (prevLoginAt) {
        const prevTime = new Date(prevLoginAt).getTime();
        const updatedTime = new Date(c.updated_at).getTime();
        if (updatedTime <= prevTime) return false;
      }

      return true;
    });

    setCourseEditAlerts(edited);
  }, [courses, sessionDismissed]);

  useEffect(() => {
    const currentLoginAt = localStorage.getItem("login_at");
    if (currentLoginAt) {
      localStorage.setItem("prev_login_at", currentLoginAt);
    }
    localStorage.setItem("login_at", new Date().toISOString());
  }, []);

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
              <h2 className="cm-title">Xác nhận xóa khóa học</h2>
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
              <h2 className="cm-title">Xác nhận xóa chương</h2>
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

  const renderLessonViewModal = () => {
    if (!lessonViewModal || !viewingLesson) return null;

    return (
      <div
        className="cm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setLessonViewModal(false);
            setViewingLesson(null);
          }
        }}
      >
        <div className="cm-box">
          <div className="cm-header">
            <h2 className="cm-title">Chi tiết bài học</h2>
            <button
              className="cm-close"
              onClick={() => {
                setLessonViewModal(false);
                setViewingLesson(null);
              }}
            >
              ✕
            </button>
          </div>
          <div className="cm-body cm-body--scroll">
            {[
              { label: "Tên bài học", value: viewingLesson.title ?? "—" },
              { label: "Thứ tự", value: viewingLesson.order_index ?? "—" },
              {
                label: "Chương",
                value:
                  sections.find(
                    (s) =>
                      s.id ===
                      (viewingLesson.section?.id ?? viewingLesson.section),
                  )?.title ?? "—",
              },
              { label: "URL Video", value: viewingLesson.video_url || "—" },
              {
                label: "Xem thử video",
                value: viewingLesson.is_preview_video ? "Có" : "Không",
              },
              {
                label: "Xem thử bài viết",
                value: viewingLesson.is_preview_article ? "Có" : "Không",
              },
              {
                label: "Xem thử tài liệu",
                value: viewingLesson.is_preview_resource ? "Có" : "Không",
              },
            ].map((item) => (
              <div key={item.label} className="cm-detail-row">
                <span className="cm-detail-row__label">{item.label}</span>
                <span className="cm-detail-row__value">{item.value}</span>
              </div>
            ))}
            {viewingLesson.content && (
              <div className="cm-markdown-block">
                <p className="cm-markdown-block__label">Nội dung Markdown</p>
                <pre className="cm-markdown-block__pre">
                  {viewingLesson.content}
                </pre>
              </div>
            )}
          </div>
          <div className="cm-footer">
            <button
              className="cm-btn cm-btn--cancel"
              onClick={() => {
                setLessonViewModal(false);
                setViewingLesson(null);
              }}
            >
              Đóng
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
    return (
      <div className="ad-edit-alert">
        <div className="ad-edit-alert__header">
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
                  onClick={() => dismissCourse(c.id)}
                  title="Bỏ qua"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

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
              <h2 className="cm-title">Xác nhận xóa bài học</h2>
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
            <button className="cm-close" onClick={closeLessonModal}>
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

            <div className="cm-section-block">
              <div className="cm-section-block__header">
                <span>Video</span>
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
                {lessonForm.video_file && (
                  <span className="cm-hint">{lessonForm.video_file.name}</span>
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

            <div className="cm-section-block">
              <div className="cm-section-block__header">
                <span>Bài viết (Markdown)</span>
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

            <div className="cm-section-block">
              <div className="cm-section-block__header">
                <span>Tài liệu đính kèm</span>
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
                      {lessonForm.attachment.name}
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
              <h2 className="cm-title">Xác nhận xóa bài kiểm tra</h2>
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
              <h2 className="cm-title">Xóa câu hỏi</h2>
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
            <div className="cm-field">
              <label className="cm-label">
                Đáp án <span className="cm-required">*</span>
              </label>
              {questionForm.answers.map((ans, idx) => (
                <div key={idx} className="cm-answer-row">
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
                    className="cm-answer-row__radio"
                  />
                  <input
                    className="cm-input cm-answer-row__input"
                    type="text"
                    placeholder={`Đáp án ${idx + 1}`}
                    value={ans.content}
                    onChange={(e) => {
                      const next = [...questionForm.answers];
                      next[idx] = { ...next[idx], content: e.target.value };
                      setQuestionForm((f) => ({ ...f, answers: next }));
                    }}
                  />
                  {questionForm.answers.length > 2 && (
                    <button
                      onClick={() => {
                        setQuestionForm((f) => ({
                          ...f,
                          answers: f.answers.filter((_, i) => i !== idx),
                        }));
                      }}
                      className="cm-answer-row__delete"
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
                className="cm-add-answer-btn"
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
              <h2 className="cm-title">Xóa danh mục</h2>
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
            <div className="cm-row cm-row--center">
              <div className="cm-field cm-field--shrink">
                <label className="cm-label cm-label--checkbox">
                  <input
                    type="checkbox"
                    checked={categoryForm.is_pinned}
                    onChange={(e) =>
                      setCategoryForm((f) => ({
                        ...f,
                        is_pinned: e.target.checked,
                      }))
                    }
                    className="cm-checkbox cm-checkbox--green"
                  />
                  Ghim ra trang chủ
                </label>
              </div>
              {categoryForm.is_pinned && (
                <div className="cm-field cm-field--grow">
                  <label className="cm-label">
                    Thứ tự ghim <span className="cm-hint-muted">(1 – 6)</span>
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

    if (attemptModal === "list") {
      return (
        <div
          className="cm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAttemptModal();
          }}
        >
          <div className="cm-box cm-box--xl">
            <div className="cm-header">
              <h2 className="cm-title">
                Lịch sử làm bài
                {selectedQuizForAttempt?.title && (
                  <span className="cm-title-sub">
                    — {selectedQuizForAttempt.title}
                  </span>
                )}
              </h2>
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
                <p className="cm-empty-state">
                  Chưa có học viên nào làm bài kiểm tra này.
                </p>
              ) : (
                <>
                  <div className="cm-attempt-summary">
                    <div className="cm-attempt-summary__item">
                      <span className="cm-attempt-summary__val">
                        {attempts.length}
                      </span>
                      <span className="cm-attempt-summary__lbl">Lượt làm</span>
                    </div>
                    <div className="cm-attempt-summary__item">
                      <span className="cm-attempt-summary__val summary__valG">
                        {attempts.filter((a) => a.passed).length}
                      </span>
                      <span className="cm-attempt-summary__lbl">Đạt</span>
                    </div>
                    <div className="cm-attempt-summary__item">
                      <span className="cm-attempt-summary__val summary__valR">
                        {attempts.filter((a) => !a.passed).length}
                      </span>
                      <span className="cm-attempt-summary__lbl">Chưa đạt</span>
                    </div>
                    <div className="cm-attempt-summary__item">
                      <span className="cm-attempt-summary__val">
                        {attempts.length > 0
                          ? (
                              attempts.reduce(
                                (s, a) => s + Number(a.score),
                                0,
                              ) / attempts.length
                            ).toFixed(1)
                          : "—"}
                        %
                      </span>
                      <span className="cm-attempt-summary__lbl">Điểm TB</span>
                    </div>
                  </div>

                  <div className="cm-attempt-list">
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
                        <div
                          key={a.id}
                          className={`cm-attempt-row ${a.passed ? "cm-attempt-row--pass" : "cm-attempt-row--fail"}`}
                          onClick={() => openAttemptDetail(a)}
                        >
                          <div className="cm-attempt-row__index">{idx + 1}</div>
                          <div className="cm-attempt-row__user">
                            <span className="cm-attempt-row__name">
                              {a.student_name ??
                                a.student?.full_name ??
                                a.student?.username ??
                                "—"}
                            </span>
                            <span className="cm-attempt-row__email">
                              {a.student_email ?? a.student?.email ?? ""}
                            </span>
                          </div>
                          <div className="cm-attempt-row__score-wrap">
                            <span
                              className="cm-attempt-row__score"
                              style={{
                                color: a.passed ? "#4caf82" : "#e07a5f",
                              }}
                            >
                              {Number(a.score).toFixed(1)}%
                            </span>
                            <span
                              className="cm-attempt-row__badge"
                              style={{
                                background: a.passed
                                  ? "rgba(76,175,130,0.12)"
                                  : "rgba(224,122,95,0.12)",
                                color: a.passed ? "#4caf82" : "#e07a5f",
                                border: `0.5px solid ${a.passed ? "rgba(76,175,130,0.3)" : "rgba(224,122,95,0.3)"}`,
                              }}
                            >
                              {a.passed ? "Đạt" : "Chưa đạt"}
                            </span>
                          </div>
                          <div className="cm-attempt-row__meta">
                            <span>
                              {start ? start.toLocaleString("vi-VN") : "—"}
                            </span>
                            {duration !== null && (
                              <span className="cm-attempt-row__duration">
                                {mm}p {ss}s
                              </span>
                            )}
                          </div>
                          <div className="cm-attempt-row__action">
                            <span className="cm-attempt-row__cta">
                              Xem chi tiết
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
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
      const rawSnapshot = selectedAttempt.answers_snapshot ?? {};
      const snapshot: Record<string, string[]> = {};
      Object.entries(rawSnapshot).forEach(([k, v]) => {
        const vals = Array.isArray(v) ? v.map(String) : [String(v)];
        snapshot[String(k)] = vals;
        snapshot[Number(k).toString()] = vals;
      });

      const attemptQuestions: any[] =
        selectedAttempt.questions ?? selectedAttempt._questions ?? [];

      // Log sau khi khai báo xong
      console.log("RAW SNAPSHOT:", JSON.stringify(rawSnapshot, null, 2));
      console.log(
        "ATTEMPT QUESTIONS:",
        JSON.stringify(
          attemptQuestions.map((q: any) => ({
            id: q.id,
            content: q.content?.slice(0, 30),
            answers: q.answers?.map((a: any) => ({
              id: a.id,
              is_correct: a.is_correct,
              content: a.content?.slice(0, 20),
            })),
          })),
          null,
          2,
        ),
      );
      const correctCount = attemptQuestions.filter((q) => {
        const chosen = snapshot[q.id] ?? [];
        const correctIds =
          q.answers
            ?.filter((a: any) => a.is_correct)
            .map((a: any) => String(a.id)) ?? [];
        return (
          chosen.length > 0 &&
          chosen.every((id: string) => correctIds.includes(id)) &&
          correctIds.every((id: string) => chosen.includes(id))
        );
      }).length;

      return (
        <div
          className="cm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAttemptModal();
          }}
        >
          <div className="cm-box cm-box--xl">
            <div className="cm-header">
              <div className="cm-attempt-row__score-wrap">
                <div>
                  <h2 className="cm-title">Chi tiết bài làm</h2>
                  <p className="cm-text">
                    {selectedAttempt.student_name ??
                      selectedAttempt.student?.full_name ??
                      ""}
                    {selectedAttempt.student_email
                      ? ` · ${selectedAttempt.student_email}`
                      : ""}
                  </p>
                </div>
              </div>
              <button className="cm-close" onClick={closeAttemptModal}>
                ✕
              </button>
            </div>

            <div className="cm-body cm-body--scroll">
              {/* Stats bar */}
              <div className="cm-detail-statsbar">
                {[
                  {
                    label: "Điểm",
                    value: `${Number(selectedAttempt.score).toFixed(1)}%`,
                    color: selectedAttempt.passed ? "#4caf82" : "#e07a5f",
                  },
                  {
                    label: "Kết quả",
                    value: selectedAttempt.passed ? "Đạt" : "Chưa đạt",
                    color: selectedAttempt.passed ? "#4caf82" : "#e07a5f",
                  },
                  {
                    label: "Câu đúng",
                    value:
                      attemptQuestions.length > 0
                        ? `${correctCount}/${attemptQuestions.length}`
                        : "—",
                    color: undefined,
                  },
                  {
                    label: "Bắt đầu",
                    value: start ? start.toLocaleString("vi-VN") : "—",
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
                  <div key={item.label} className="cm-detail-stat">
                    <div className="cm-detail-stat__label">{item.label}</div>
                    <div
                      className="cm-detail-stat__val"
                      style={item.color ? { color: item.color } : undefined}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {attemptQuestions.length > 0 && (
                <div className="cm-answer-legend">
                  <span className="cm-legend-item cm-legend-item--correct">
                    Đúng · đã chọn
                  </span>
                  <span className="cm-legend-item cm-legend-item--wrong">
                    Sai · đã chọn
                  </span>
                  <span className="cm-legend-item cm-legend-item--correct">
                    Đáp án đúng
                  </span>
                </div>
              )}
              {/* Questions */}
              {loadingAttemptDetail ? (
                <div className="cm-loading">
                  <span className="cm-loading__spinner" />
                  <span>Đang tải chi tiết câu hỏi…</span>
                </div>
              ) : attemptQuestions.length === 0 ? (
                <div className="cm-snapshot-fallback">
                  <p className="cm-snapshot-text">Đáp án theo ID:</p>
                  {Object.entries(snapshot).map(([qId, aIds]) => (
                    <div key={qId} className="cm-entries">
                      <span className="cm-entries__s1">
                        Câu {qId.slice(0, 8)}…:
                      </span>{" "}
                      <span className="cm-entries__s2">{aIds.join(", ")}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cm-questions-list">
                  {attemptQuestions.map((q: any, idx: number) => {
                    const chosenIds: string[] =
                      snapshot[String(q.id)] ?? snapshot[q.id] ?? [];
                    const correctIds =
                      q.answers
                        ?.filter((a: any) => a.is_correct)
                        .map((a: any) => String(a.id)) ?? [];
                    const isQuestionCorrect =
                      chosenIds.length > 0 &&
                      chosenIds.every((id: string) =>
                        correctIds.includes(id),
                      ) &&
                      correctIds.every((id: string) => chosenIds.includes(id));

                    return (
                      <div
                        key={q.id}
                        className={`cm-question-block ${isQuestionCorrect ? "cm-question-block--correct" : chosenIds.length > 0 ? "cm-question-block--wrong" : "cm-question-block--unanswered"}`}
                      >
                        <div className="cm-question-block__header">
                          <span className="cm-question-block__num">
                            Câu {idx + 1}
                          </span>
                          <span className="cm-question-block__type">
                            {{
                              single: "Chọn 1",
                              multiple: "Chọn nhiều",
                              true_false: "Đúng/Sai",
                            }[q.question_type as string] ?? q.question_type}
                          </span>
                          <span className="cm-question-block__pts">
                            {q.points} điểm
                          </span>
                          <span
                            className="cm-question-block__result"
                            style={{
                              color: isQuestionCorrect
                                ? "#4caf82"
                                : chosenIds.length > 0
                                  ? "#e07a5f"
                                  : "rgba(229,232,240,0.35)",
                            }}
                          >
                            {isQuestionCorrect
                              ? "✓ Đúng"
                              : chosenIds.length > 0
                                ? "✗ Sai"
                                : "Bỏ qua"}
                          </span>
                        </div>

                        <p className="cm-question-block__content">
                          {q.content}
                        </p>

                        <div className="cm-answers-grid">
                          {q.answers?.map((ans: any) => {
                            const ansId = String(ans.id);
                            const chosen = snapshot[String(q.id)] ?? [];
                            const isChosen = chosen.some(
                              (id) => String(id) === ansId,
                            );
                            const isCorrect = Boolean(ans.is_correct);

                            // 4 trạng thái rõ ràng
                            let cls = "cm-ans";
                            let prefix = "";
                            let marker = "";

                            if (isCorrect && isChosen) {
                              // Chọn đúng — xanh lá đậm
                              cls += " cm-ans--correct-chosen";
                              prefix = "✓";
                              marker = "Đúng · đã chọn";
                            } else if (!isCorrect && isChosen) {
                              // Chọn sai — đỏ
                              cls += " cm-ans--wrong-chosen";
                              prefix = "✗";
                              marker = "Sai · đã chọn";
                            } else if (isCorrect && !isChosen) {
                              // Đúng nhưng bỏ qua — vàng cam, nổi bật
                              cls += " cm-ans--correct-missed";
                              prefix = "→";
                              marker = "Đáp án đúng";
                            } else {
                              // Sai, không chọn — mờ
                              cls += " cm-ans--neutral";
                            }

                            return (
                              <div key={ans.id} className={cls}>
                                <span className="cm-ans__prefix">{prefix}</span>
                                <span className="cm-ans__text">
                                  {ans.content}
                                </span>
                                {marker && (
                                  <span className="cm-ans__marker">
                                    {marker}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="cm-question-block__explain">
                            {q.explanation}
                          </div>
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
      {renderLessonViewModal()}
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
                        <p className="ad-modal__field-value ad-modal__field-value--dim">
                          Đang tải...
                        </p>
                      ) : certificates.length === 0 ? (
                        <p className="ad-modal__field-value ad-modal__field-value--dim">
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
                                {" "}
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
            className="ad-nav__item ad-nav__item--danger"
            onClick={onLogout}
          >
            Đăng xuất
          </button>
        </aside>

        <main className="ad-main">
          {activeTab === "overview" && (
            <div className="ad-content">
              {renderEditAlert()}
              <div className="ad-page-header">
                <h1 className="ad-page-title">Tổng quan hệ thống</h1>
                <p className="ad-page-sub">
                  Thống kê tổng hợp của nền tảng EnglishHub.
                </p>
              </div>

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

              <div className="ad-stats-grid ad-stats-grid--3col">
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
                          <div className="ad-pending-column">
                            <span className="ad-pending-row__title">
                              {c.title}
                            </span>
                            {c.status === "archive_requested" && (
                              <span className="ad-pending-archive">
                                Yêu cầu lưu trữ
                              </span>
                            )}
                            {c.status === "review" && (
                              <span
                                className="ad-pending-archive"
                                style={{ color: "#5ba4de" }}
                              >
                                Chờ duyệt xuất bản
                              </span>
                            )}
                          </div>
                          {c.status === "review" ? (
                            <div className="ad-refund-actions">
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
                            </div>
                          ) : c.status === "archive_requested" ? (
                            <div className="ad-refund-actions">
                              <button
                                className="ad-btn-sm ad-btn-sm--approve"
                                onClick={() => archiveCourse(c.id)}
                              >
                                Duyệt ẩn
                              </button>
                              <button
                                className="ad-btn-sm ad-btn-sm--ban"
                                onClick={() => rejectArchiveCourse(c.id)}
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : null}
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
                            <div className="ad-refund-actions">
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
            <div className={`ad-toast ad-toast--${toast.type}`}>
              {toast.msg}
            </div>
          )}

          {activeTab === "users" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý người dùng</h1>
                <p className="ad-page-sub">
                  {loadingUsers ? "Đang tải…" : `${pgUsers.total} người dùng`}
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
                        <td colSpan={5} className="ad-table__center">
                          Đang tải…
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="ad-empty ad-table__empty-cell"
                        >
                          Không tìm thấy người dùng phù hợp.
                        </td>
                      </tr>
                    ) : (
                      pgUsers.pageItems.map((u) => {
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
                              <div className="tbl-actions">
                                <button
                                  className="tbl-btn tbl-btn--view"
                                  onClick={() => openViewUser(u)}
                                >
                                  Xem
                                </button>
                                {u.role !== "admin" && (
                                  <button
                                    className={`tbl-btn ${status === "banned" ? "tbl-btn--restore" : "tbl-btn--ban"}`}
                                    onClick={() => toggleUserStatus(u)}
                                  >
                                    {status === "banned" ? "Mở khóa" : "Khóa"}
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
                <Pagination
                  page={pgUsers.page}
                  totalPages={pgUsers.totalPages}
                  total={pgUsers.total}
                  pageSize={PAGE_SIZE}
                  onPage={pgUsers.goTo}
                />
              </div>
            </div>
          )}

          {activeTab === "courses" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý khóa học</h1>
                <p className="ad-page-sub">
                  {loadingCourses
                    ? "Đang tải…"
                    : `${pgCourses.total} / ${courses.length} khóa học`}
                </p>
              </div>

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
                  <div className="ad-sort-row">
                    <span className="ad-sort-row__label">Học phí:</span>
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
                        <td colSpan={6} className="ad-table__center">
                          Đang tải…
                        </td>
                      </tr>
                    ) : filteredCourses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="ad-empty ad-table__empty-cell"
                        >
                          Không tìm thấy khóa học phù hợp.
                        </td>
                      </tr>
                    ) : (
                      pgCourses.pageItems.map((c) => {
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
                              <div className="tbl-actions">
                                <button
                                  className="tbl-btn tbl-btn--view"
                                  onClick={() => openViewCourse(c)}
                                >
                                  Xem
                                </button>
                                {c.status === "published" &&
                                  (c.total_students ?? 0) === 0 && (
                                    <button
                                      className="tbl-btn tbl-btn--ban"
                                      onClick={() => archiveCourse(c.id)}
                                    >
                                      Ẩn
                                    </button>
                                  )}

                                {c.status === "archive_requested" && (
                                  <>
                                    <button
                                      className="tbl-btn tbl-btn--restore"
                                      onClick={() => archiveCourse(c.id)}
                                    >
                                      Duyệt ẩn
                                    </button>
                                    <button
                                      className="tbl-btn tbl-btn--ban"
                                      onClick={() => rejectArchiveCourse(c.id)}
                                    >
                                      Từ chối
                                    </button>
                                  </>
                                )}
                                {c.status === "archived" && (
                                  <button
                                    className="tbl-btn tbl-btn--restore"
                                    onClick={() => unarchiveCourse(c.id)}
                                  >
                                    Hiện
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
                <Pagination
                  page={pgCourses.page}
                  totalPages={pgCourses.totalPages}
                  total={pgCourses.total}
                  pageSize={PAGE_SIZE}
                  onPage={pgCourses.goTo}
                />
              </div>
            </div>
          )}

          {activeTab === "sections" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý chương học</h1>
                <p className="ad-page-sub">
                  {loadingSections ? "Đang tải…" : `${pgSections.total} chương`}
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
                        <td colSpan={5} className="ad-table__center">
                          Đang tải…
                        </td>
                      </tr>
                    ) : pgSections.total === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="ad-empty ad-table__empty-cell"
                        >
                          Không có chương nào.
                        </td>
                      </tr>
                    ) : (
                      pgSections.pageItems.map((s) => (
                        <tr key={s.id}>
                          <td className="ad-table__center">
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
                            <button
                              className="ad-btn-sm ad-btn-sm--view"
                              onClick={() => {
                                setFilterLessonSection(s.id);
                                setActiveTab("lessons");
                              }}
                            >
                              Xem bài học
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <Pagination
                  page={pgSections.page}
                  totalPages={pgSections.totalPages}
                  total={pgSections.total}
                  pageSize={PAGE_SIZE}
                  onPage={pgSections.goTo}
                />
              </div>
            </div>
          )}

          {activeTab === "lessons" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý bài học</h1>
                <p className="ad-page-sub">
                  {loadingLessons ? "Đang tải…" : `${pgLessons.total} bài học`}
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
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table ad-table--lessons">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Tên bài học</th>
                      <th>Chương</th>
                      <th>thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLessons ? (
                      <tr>
                        <td colSpan={4} className="ad-table__center">
                          Đang tải…
                        </td>
                      </tr>
                    ) : lessons.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="ad-empty ad-table__empty-cell"
                        >
                          Không có bài học nào.
                        </td>
                      </tr>
                    ) : (
                      pgLessons.pageItems.map((l) => {
                        return (
                          <tr key={l.id}>
                            <td className="ad-table__center">
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
                            <td>
                              <button
                                className="ad-btn-sm ad-btn-sm--view"
                                onClick={() => openViewLesson(l)}
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
                <Pagination
                  page={pgLessons.page}
                  totalPages={pgLessons.totalPages}
                  total={pgLessons.total}
                  pageSize={PAGE_SIZE}
                  onPage={pgLessons.goTo}
                />
              </div>
            </div>
          )}

          {activeTab === "quizzes" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý bài kiểm tra</h1>
                <p className="ad-page-sub">
                  {loadingQuizzes
                    ? "Đang tải…"
                    : `${pgQuizzes.total} bài kiểm tra`}
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
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table ad-table--quizzes">
                  <thead>
                    <tr>
                      <th>Tên bài kiểm tra</th>
                      <th>Bài học</th>
                      <th>Điểm đạt</th>
                      <th>Thời gian</th>
                      <th>thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingQuizzes ? (
                      <tr>
                        <td colSpan={6}>Đang tải…</td>
                      </tr>
                    ) : pgQuizzes.total === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="ad-empty ad-table__empty-cell"
                        >
                          Không có bài kiểm tra nào.
                        </td>
                      </tr>
                    ) : (
                      pgQuizzes.pageItems.map((q) => {
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
                                <div className="tbl-actions">
                                  <button
                                    className="tbl-btn tbl-btn--view"
                                    onClick={() => {
                                      if (isExpanded) {
                                        setExpandedQuizId(null);
                                      } else {
                                        setExpandedQuizId(q.id);
                                        fetchQuestions(q.id);
                                      }
                                    }}
                                  >
                                    {isExpanded ? "Ẩn" : "Câu hỏi"}
                                  </button>
                                  <button
                                    className="tbl-btn tbl-btn--neutral"
                                    onClick={() => openAttemptList(q)}
                                  >
                                    Lịch sử
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={6} className="ad-quiz-expand-cell">
                                  <div className="ad-quiz-expand">
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
                                          className="ad-quiz-question"
                                        >
                                          <div className="ad-quiz-question__inner">
                                            <div className="ad-quiz-question__body">
                                              <span className="ad-quiz-question__meta">
                                                Câu {idx + 1} ·{" "}
                                                {
                                                  (
                                                    {
                                                      single: "Chọn 1",
                                                      multiple: "Chọn nhiều",
                                                      true_false: "Đúng/Sai",
                                                    } as Record<string, string>
                                                  )[ques.question_type]
                                                }{" "}
                                                · {ques.points} điểm
                                              </span>
                                              <p className="ad-quiz-question__text">
                                                {ques.content}
                                              </p>
                                              <div className="ad-quiz-answers">
                                                {ques.answers?.map((a: any) => (
                                                  <span
                                                    key={a.id}
                                                    className={`ad-quiz-answer${a.is_correct ? " ad-quiz-answer--correct" : ""}`}
                                                  >
                                                    {a.is_correct ? "✓ " : ""}
                                                    {a.content}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    )}
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
                <Pagination
                  page={pgQuizzes.page}
                  totalPages={pgQuizzes.totalPages}
                  total={pgQuizzes.total}
                  pageSize={PAGE_SIZE}
                  onPage={pgQuizzes.goTo}
                />
              </div>
            </div>
          )}

          {activeTab === "enrollments" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Đăng ký học</h1>
                <p className="ad-page-sub">
                  {loadingEnrollments
                    ? "Đang tải…"
                    : `${pgEnrollments.total} / ${enrollments.length} lượt đăng ký`}
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
                        <td colSpan={5} className="ad-table__center">
                          Đang tải…
                        </td>
                      </tr>
                    ) : filteredEnrollments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="ad-empty ad-table__empty-cell"
                        >
                          Không tìm thấy lượt đăng ký phù hợp.
                        </td>
                      </tr>
                    ) : (
                      pgEnrollments.pageItems.map((e) => {
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
                          active: "ad-badge--active",
                          completed: "ad-badge--pay-success",
                          cancelled: "ad-badge--banned",
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
                            <td>{e.course_title ?? e.course?.title ?? "—"}</td>
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
                                <span className="ad-table__muted ad-table__sm">
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
                <Pagination
                  page={pgEnrollments.page}
                  totalPages={pgEnrollments.totalPages}
                  total={pgEnrollments.total}
                  pageSize={PAGE_SIZE}
                  onPage={pgEnrollments.goTo}
                />
              </div>
            </div>
          )}

          {activeTab === "categories" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý danh mục</h1>
                <p className="ad-page-sub">
                  {loadingCategories
                    ? "Đang tải…"
                    : `${pgCategories.total} / ${categories.length} danh mục`}
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
                      <th>Thứ tự</th>
                      <th>thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCategories ? (
                      <tr>
                        <td colSpan={5} className="ad-table__center">
                          Đang tải…
                        </td>
                      </tr>
                    ) : filteredCategories.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="ad-empty ad-table__empty-cell"
                        >
                          Không tìm thấy danh mục phù hợp.
                        </td>
                      </tr>
                    ) : (
                      pgCategories.pageItems.map((cat, idx) => (
                        <tr key={cat.id}>
                          <td className="ad-table__muted">
                            {(pgCategories.page - 1) * PAGE_SIZE + idx + 1}
                          </td>
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
                          <td className="ad-table__center">
                            {cat.is_pinned ? cat.pin_order : "—"}
                          </td>
                          <td>
                            <div className="tbl-actions">
                              <button
                                className="tbl-btn tbl-btn--edit"
                                onClick={() => openEditCategory(cat)}
                              >
                                Sửa
                              </button>
                              <button
                                className="tbl-btn tbl-btn--ban"
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
                <Pagination
                  page={pgCategories.page}
                  totalPages={pgCategories.totalPages}
                  total={pgCategories.total}
                  pageSize={PAGE_SIZE}
                  onPage={pgCategories.goTo}
                />
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý thanh toán</h1>
                <p className="ad-page-sub">
                  {loadingPayments
                    ? "Đang tải…"
                    : `${pgPayments.total} / ${
                        payments.filter(
                          (p) =>
                            ![
                              "refund_requested",
                              "refund_approved",
                              "refunded",
                            ].includes(p.status),
                        ).length
                      } giao dịch`}
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
                        <td colSpan={6} className="ad-table__center">
                          Đang tải…
                        </td>
                      </tr>
                    ) : filteredPayments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="ad-empty ad-table__empty-cell"
                        >
                          Không tìm thấy giao dịch phù hợp.
                        </td>
                      </tr>
                    ) : (
                      pgPayments.pageItems.map((p) => {
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
                            <td>{p.course_title ?? p.course?.title ?? "—"}</td>
                            <td className="ad-amount--positive">
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
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                <Pagination
                  page={pgPayments.page}
                  totalPages={pgPayments.totalPages}
                  total={pgPayments.total}
                  pageSize={PAGE_SIZE}
                  onPage={pgPayments.goTo}
                />
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý đánh giá</h1>
                <p className="ad-page-sub">
                  {loadingReviews
                    ? "Đang tải…"
                    : `${pgReviews.total} / ${reviews.length} đánh giá`}
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
                        <td colSpan={6} className="ad-table__center">
                          Đang tải…
                        </td>
                      </tr>
                    ) : filteredReviews.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="ad-table__empty-cell">
                          Không tìm thấy đánh giá phù hợp.
                        </td>
                      </tr>
                    ) : (
                      pgReviews.pageItems.map((r) => (
                        <tr
                          key={r.id}
                          className={r.is_hidden ? "ad-row--hidden" : ""}
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
                          <td>{r.course_title ?? r.course?.title ?? "—"}</td>
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
                            <div className="tbl-actions tbl-actions--col">
                              <div className="tbl-actions tbl-actions--row">
                                <button
                                  className="tbl-btn tbl-btn--view"
                                  onClick={() => openViewReview(r)}
                                >
                                  Xem
                                </button>
                                <button
                                  className={`tbl-btn ${r.is_hidden ? "tbl-btn--restore" : "tbl-btn--warn"}`}
                                  onClick={() => handleToggleHide(r)}
                                  disabled={togglingReview}
                                >
                                  {r.is_hidden ? "Hiện" : "Ẩn"}
                                </button>
                                <button
                                  className="tbl-btn tbl-btn--ban"
                                  onClick={() => openDeleteReview(r)}
                                >
                                  Xóa
                                </button>
                              </div>
                              {r.is_reported && !r.is_hidden && (
                                <span className="tbl-reported-badge">
                                  Báo cáo
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <Pagination
                  page={pgReviews.page}
                  totalPages={pgReviews.totalPages}
                  total={pgReviews.total}
                  pageSize={PAGE_SIZE}
                  onPage={pgReviews.goTo}
                />
              </div>

              {reviewModal === "view" && selectedReview && (
                <div className="ad-modal-overlay" onClick={closeReviewModal}>
                  <div
                    className="ad-modal ad-modal--review"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="ad-modal__header">
                      <h2 className="ad-modal__title">Chi tiết đánh giá</h2>
                      <button
                        className="ad-modal__close"
                        onClick={closeReviewModal}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="ad-modal__body">
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Học viên</span>
                        <div>
                          <span className="ad-modal__field-value">
                            {selectedReview.student_name ??
                              selectedReview.student?.full_name ??
                              "—"}
                          </span>
                        </div>
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
                        <div className="ad-modal__toggle-row">
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
                        </div>
                      </div>
                      {selectedReview.is_reported && (
                        <div className="ad-modal__field ad-modal__field--report">
                          <span className="ad-modal__field-label">
                            Báo cáo vi phạm
                          </span>
                          <div className="ad-modal__report-body">
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

              {reviewModal === "delete" && selectedReview && (
                <div className="ad-modal-overlay" onClick={closeReviewModal}>
                  <div
                    className="ad-modal ad-modal--review-delete"
                    onClick={(e) => e.stopPropagation()}
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
                    <p className="ad-modal__warn ad-modal__warn--indented">
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

          {courseViewModal && viewingCourse && (
            <div
              className="ad-modal-overlay"
              onClick={() => setCourseViewModal(false)}
            >
              <div
                className="ad-modal ad-modal--payment"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="ad-modal__header">
                  <h2 className="ad-modal__title">Chi tiết khóa học</h2>
                  <button
                    className="ad-modal__close"
                    onClick={() => setCourseViewModal(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="ad-modal__body">
                  {viewingCourse.thumbnail && (
                    <img
                      src={viewingCourse.thumbnail}
                      alt=""
                      className="ad-modal__course-thumb"
                    />
                  )}

                  <h3 className="ad-modal__course-title">
                    {viewingCourse.title || "—"}
                  </h3>

                  <div className="ad-modal__field">
                    <span className="ad-modal__field-label">Giảng viên</span>
                    <span className="ad-modal__field-value">
                      {viewingCourse.instructor_name ||
                        viewingCourse.instructor?.name ||
                        "—"}
                    </span>
                  </div>

                  <div className="ad-modal__field">
                    <span className="ad-modal__field-label">Học phí</span>
                    <span className="ad-modal__field-value ad-modal__field-value--price">
                      {viewingCourse.sale_price || viewingCourse.price
                        ? formatPrice(
                            viewingCourse.sale_price ?? viewingCourse.price,
                            "VND",
                          )
                        : "Miễn phí"}
                    </span>
                  </div>

                  <div className="ad-modal__field">
                    <span className="ad-modal__field-label">Học viên</span>
                    <span className="ad-modal__field-value">
                      {(viewingCourse.total_students ?? 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="ad-modal__field">
                    <span className="ad-modal__field-label">Trạng thái</span>
                    <span
                      className={`ad-badge ad-badge--${viewingCourse.status}`}
                    >
                      {STATUS_LABEL[viewingCourse.status] ??
                        viewingCourse.status}
                    </span>
                  </div>

                  {viewingCourse.description && (
                    <>
                      <div className="ad-modal__section-title">Mô tả</div>
                      <p className="ad-modal__field-value--comment">
                        {viewingCourse.description}
                      </p>
                    </>
                  )}
                </div>

                <div className="ad-modal__footer">
                  <button
                    className="ad-modal__cancel"
                    onClick={() => setCourseViewModal(false)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPaymentModal && (
            <div className="ad-modal-overlay" onClick={closePaymentDetail}>
              <div
                className="ad-modal ad-modal--payment"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="ad-modal__header">
                  <h2 className="ad-modal__title">
                    {paymentModalContext === "refund"
                      ? "Chi tiết hoàn tiền"
                      : "Chi tiết giao dịch"}
                  </h2>
                  <button
                    className="ad-modal__close"
                    onClick={closePaymentDetail}
                  >
                    ✕
                  </button>
                </div>

                <div className="ad-modal__body">
                  {loadingDetail ? (
                    <p className="ad-modal__loading-text">Đang tải…</p>
                  ) : !paymentDetail ? (
                    <p className="ad-modal__error-text">
                      Không tải được dữ liệu.
                    </p>
                  ) : paymentModalContext === "refund" ? (
                    <>
                      <div className="ad-modal__section-title">
                        Thông tin hoàn tiền
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Học viên</span>
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
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Khóa học</span>
                        <span className="ad-modal__field-value">
                          {paymentDetail.course_title || "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Số tiền hoàn
                        </span>
                        <span className="ad-modal__field-value ad-modal__field-value--refund">
                          {formatPrice(paymentDetail.amount ?? 0, "VND")}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Ngày yêu cầu
                        </span>
                        <span className="ad-modal__field-value">
                          {paymentDetail.refund_requested_at
                            ? new Date(
                                paymentDetail.refund_requested_at,
                              ).toLocaleString("vi-VN")
                            : paymentDetail.created_at
                              ? new Date(
                                  paymentDetail.created_at,
                                ).toLocaleString("vi-VN")
                              : "—"}
                        </span>
                      </div>

                      {paymentDetail.refund_approved_at && (
                        <div className="ad-modal__field">
                          <span className="ad-modal__field-label">
                            Ngày duyệt
                          </span>
                          <span className="ad-modal__field-value">
                            {new Date(
                              paymentDetail.refund_approved_at,
                            ).toLocaleString("vi-VN")}
                          </span>
                        </div>
                      )}

                      {["refunded", "refund_approved"].includes(
                        paymentDetail.status,
                      ) &&
                        paymentDetail.refund_approved_at && (
                          <div className="ad-modal__field">
                            <span className="ad-modal__field-label">
                              Ngày hoàn tiền
                            </span>
                            <span className="ad-modal__field-value">
                              {new Date(
                                paymentDetail.refund_approved_at,
                              ).toLocaleString("vi-VN")}
                            </span>
                          </div>
                        )}

                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">
                          Trạng thái
                        </span>
                        <span
                          className={`ad-badge ad-badge--pay-${paymentDetail.status}`}
                        >
                          {PAYMENT_STATUS_LABEL[paymentDetail.status] ??
                            paymentDetail.status}
                        </span>
                      </div>

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
                  ) : (
                    <>
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
                      <div className="ad-modal__section-title">Giao dịch</div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Khóa học</span>
                        <span className="ad-modal__field-value">
                          {paymentDetail.course_title || "—"}
                        </span>
                      </div>
                      <div className="ad-modal__field">
                        <span className="ad-modal__field-label">Số tiền</span>
                        <span className="ad-modal__field-value ad-modal__field-value--price">
                          {formatPrice(paymentDetail.amount ?? 0, "VND")}
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
                      {paymentDetail.note && (
                        <>
                          <div className="ad-modal__section-title">Ghi chú</div>
                          <p className="ad-modal__field-value--comment">
                            {paymentDetail.note}
                          </p>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="ad-modal__footer">
                  {paymentModalContext === "refund" &&
                    paymentDetail?.status === "refund_requested" && (
                      <>
                        <button
                          className="cm-btn cm-btn--save cm-btn--push-right"
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
                          Từ chối
                        </button>
                      </>
                    )}

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
          {activeTab === "refunds" && (
            <div className="ad-content">
              <div className="ad-page-header">
                <h1 className="ad-page-title">Quản lý hoàn tiền</h1>
                <p className="ad-page-sub">
                  {loadingPayments ? "Đang tải…" : `${pgRefunds.total} yêu cầu`}
                </p>
              </div>

              <div className="ad-filters">
                <select
                  className="ad-select"
                  value={filterRefundStatus}
                  onChange={(e) => setFilterRefundStatus(e.target.value)}
                >
                  <option value="">Tất cả</option>
                  <option value="refund_requested">Chờ duyệt</option>
                  <option value="refund_approved">Đã duyệt</option>
                  <option value="refunded">Đã hoàn tiền</option>
                </select>
                {filterRefundStatus && (
                  <button
                    className="filter-clear"
                    onClick={() => setFilterRefundStatus("")}
                  >
                    ✕ Xoá lọc
                  </button>
                )}
              </div>

              <div className="ad-table-wrap">
                <table className="ad-table ad-table--payments ad-table--refunds">
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Khóa học</th>
                      <th>Số tiền</th>
                      <th>Ngày yêu cầu</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const refunds = payments.filter((p) => {
                        const inRefundFlow = [
                          "refund_requested",
                          "refund_approved",
                          "refunded",
                        ].includes(p.status);
                        const matchStatus =
                          !filterRefundStatus ||
                          p.status === filterRefundStatus;
                        return inRefundFlow && matchStatus;
                      });

                      if (loadingPayments) {
                        return (
                          <tr>
                            <td colSpan={6} className="ad-table__center">
                              Đang tải…
                            </td>
                          </tr>
                        );
                      }
                      if (pgRefunds.total === 0) {
                        return (
                          <tr>
                            <td
                              colSpan={6}
                              className="ad-empty ad-table__empty-cell"
                            >
                              Không tìm thấy yêu cầu hoàn tiền phù hợp.
                            </td>
                          </tr>
                        );
                      }

                      return pgRefunds.pageItems.map((p) => (
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
                          <td>{p.course_title ?? "—"}</td>
                          <td className="ad-amount--positive">
                            {formatPrice(p.amount ?? 0, "VND")}
                          </td>
                          <td className="ad-table__muted">
                            {p.refund_requested_at
                              ? new Date(
                                  p.refund_requested_at,
                                ).toLocaleDateString("vi-VN")
                              : p.created_at
                                ? new Date(p.created_at).toLocaleDateString(
                                    "vi-VN",
                                  )
                                : "—"}
                          </td>
                          <td>
                            <span
                              className={`ad-badge ad-badge--pay-${p.status}`}
                            >
                              {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                            </span>
                          </td>
                          <td>
                            <div className="tbl-actions">
                              <button
                                className="tbl-btn tbl-btn--view"
                                onClick={() => openRefundDetail(p.id)}
                              >
                                Xem
                              </button>
                              {p.status === "refund_requested" && (
                                <>
                                  <button
                                    className="tbl-btn tbl-btn--restore"
                                    onClick={() => openApproveRefund(p)}
                                  >
                                    Duyệt
                                  </button>
                                  <button
                                    className="tbl-btn tbl-btn--ban"
                                    onClick={() => openRejectRefund(p)}
                                  >
                                    Từ chối
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
                <Pagination
                  page={pgRefunds.page}
                  totalPages={pgRefunds.totalPages}
                  total={pgRefunds.total}
                  pageSize={PAGE_SIZE}
                  onPage={pgRefunds.goTo}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
