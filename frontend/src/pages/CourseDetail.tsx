import React, { useState, useEffect, useRef } from "react";
import { formatPrice } from "../utils/format";
import { getVideoEmbed } from "../utils/youtube";
import PaymentModal from "./PaymentPage";
import CertificateModal from "./CertificateModal";

const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem("access");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const MAX_REVIEW_EDITS = 5;
const refreshAndRetry = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  let res = await fetch(url, {
    ...options,
    headers: { ...authHeader(), ...(options.headers as any) },
  });
  if (res.status === 401) {
    const refresh = localStorage.getItem("refresh");
    if (refresh) {
      try {
        const r = await fetch(`${API}/api/auth/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (r.ok) {
          const data = await r.json();
          localStorage.setItem("access", data.access);
          res = await fetch(url, {
            ...options,
            headers: { ...authHeader(), ...(options.headers as any) },
          });
        } else {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          window.location.href = "/login";
        }
      } catch {}
    }
  }
  return res;
};

// ── Toast System ─────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "warning" | "info";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastCounter = 0;

interface CourseDetailProps {
  courseId: string;
  onNavigate: (page: string, courseId?: string) => void;
  isLoggedIn: boolean;
}
const renderMarkdown = (content: string) => {
  if (!content) return null;
  return content
    .trim()
    .split("\n")
    .map((line, i) => {
      if (line.startsWith("## "))
        return (
          <h2 key={i} className="cd-md-h2">
            {line.slice(3)}
          </h2>
        );
      if (line.startsWith("### "))
        return (
          <h3 key={i} className="cd-md-h3">
            {line.slice(4)}
          </h3>
        );
      if (line.startsWith("> "))
        return (
          <blockquote key={i} className="cd-md-quote">
            {line.slice(2)}
          </blockquote>
        );
      if (line.startsWith("- "))
        return (
          <li key={i} className="cd-md-li">
            {line.slice(2)}
          </li>
        );
      if (line.startsWith("| "))
        return (
          <div key={i} className="cd-md-table-row">
            {line}
          </div>
        );
      if (line.trim() === "") return <div key={i} className="cd-md-spacer" />;
      const html = line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, "<code>$1</code>");
      return (
        <p
          key={i}
          className="cd-md-p"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    });
};
const getFileIcon = (filename: string) => {
  const ext = filename?.split(".").pop()?.toLowerCase();
  const icons: Record<string, string> = {
    pdf: "📄",
    docx: "📝",
    doc: "📝",
    xlsx: "📊",
    xls: "📊",
    csv: "📊",
    pptx: "📋",
    ppt: "📋",
    zip: "🗜️",
    rar: "🗜️",
    mp4: "🎬",
    mp3: "🎵",
  };
  return icons[ext ?? ""] ?? "📎";
};
type Tab = "overview" | "curriculum" | "lesson" | "quiz" | "reviews";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "curriculum", label: "Chương trình" },
  { id: "lesson", label: "Bài học" },
  { id: "quiz", label: "Luyện tập" },
  { id: "reviews", label: "Đánh giá" },
];
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};
const isMultipleType = (qt: string) =>
  qt === "multiple" || qt === "multiple_choice";

// ── Empty State Component ─────────────────────────────────────────────────────
const EmptyState: React.FC<{
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="cd-empty-state">
    <h3 className="cd-empty-state__title">{title}</h3>
    <p className="cd-empty-state__sub">{subtitle}</p>
    {actions && <div className="cd-empty-state__actions">{actions}</div>}
  </div>
);

// ── Toast Component ───────────────────────────────────────────────────────────
const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onRemove: (id: number) => void;
}> = ({ toasts, onRemove }) => {
  const icons: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };
  return (
    <div className="cd-toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`cd-toast-item cd-toast-item--${t.type}`}>
          <span className="cd-toast-icon">{icons[t.type]}</span>
          <span className="cd-toast-msg">{t.message}</span>
          <button className="cd-toast-close" onClick={() => onRemove(t.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

const CourseDetail: React.FC<CourseDetailProps> = ({
  courseId,
  onNavigate,
  isLoggedIn,
}) => {
  const [course, setCourse] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [activeLessonHasQuiz, setActiveLessonHasQuiz] = useState(false);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [returnTab, setReturnTab] = useState<Tab>("lesson");
  const [lessonTargetTab, setLessonTargetTab] = useState<"lesson" | "quiz">(
    "lesson",
  );

  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);
  const [apiQuiz, setApiQuiz] = useState<any | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [answered, setAnswered] = useState(false);
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizExplanations, setQuizExplanations] = useState<
    Record<string, string>
  >({});
  const [allAnswers, setAllAnswers] = useState<Record<string, Set<string>>>({});
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [quizBlocked, setQuizBlocked] = useState(false);
  const [quizAttemptCount, setQuizAttemptCount] = useState<number>(0);
  const [quizMaxAttempts, setQuizMaxAttempts] = useState<number>(0);

  // ── KEY: mỗi lần chuyển bài học quiz sẽ được reset hoàn toàn bằng key này ──
  const [quizFetchKey, setQuizFetchKey] = useState(0);

  const [myReviewIds, setMyReviewIds] = useState<Set<string>>(new Set());
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [myReviewId, setMyReviewId] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editText, setEditText] = useState("");
  const [editHoverRating, setEditHoverRating] = useState(0);
  const [editSaving, setEditSaving] = useState(false);

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRefundStatusRef = useRef<string>("");
  const allAnswersRef = useRef<Record<string, Set<string>>>({});
  const selectedRef = useRef<Set<string>>(new Set());
  const currentQRef = useRef<number>(0);
  const handleSubmitQuizRef = useRef<() => void>(() => {});
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
  const [progressPct, setProgressPct] = useState<number>(0);
  // Thêm vào sau progressPct state:
  const [showCertificate, setShowCertificate]       = useState(false);
  const [certificateCode, setCertificateCode]       = useState<string | undefined>(undefined);
  const [certificateShownFor, setCertificateShownFor] = useState<string | null>(null);

  // ── Refund cancelled alert ───────────────────────────────────────────────────
  const [showRefundCancelledAlert, setShowRefundCancelledAlert] = useState(false);
  // ── Toast state ──────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (message: string, type: ToastType = "info") => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = (msg: string) => addToast(msg, "success");
  const showError = (msg: string) => addToast(msg, "error");
  const showWarning = (msg: string) => addToast(msg, "warning");
  const showInfo = (msg: string) => addToast(msg, "info");
  const fetchCertificate = async () => {
    try {
      const res = await refreshAndRetry(
        `${API}/api/enrollments/certificate/?course_id=${courseId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setCertificateCode(data.certificate_code ?? data.code ?? undefined);
      }
    } catch {}
  };

  // ── Reset toàn bộ quiz state ─────────────────────────────────────────────────
  const resetQuizState = () => {
    setApiQuiz(null);
    setCurrentQuizId(null);
    setQuizError(null);
    setQuizBlocked(false);
    setQuizResult(null);
    setQuizStarted(false);
    setCurrentQ(0);
    setSelected(new Set());
    setAnswered(false);
    setAllAnswers({});
    setQuizExplanations({});
    setCurrentAttemptId(null);
    setTimeLeft(0);
    setQuizAttemptCount(0);
    setQuizMaxAttempts(0);
    clearInterval(timerRef.current!);
  };

  useEffect(() => {
    allAnswersRef.current = allAnswers;
  }, [allAnswers]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    currentQRef.current = currentQ;
  }, [currentQ]);
  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    const fetchCourse = async () => {
      setLoading(true);
      try {
        const res = await refreshAndRetry(`${API}/api/courses/${courseId}/`);
        if (res.ok) {
          const data = await res.json();
          setCourse(data);
          setSections(data.sections ?? []);
          if (data.sections?.length > 0)
            setExpandedSection(data.sections[0].id);
        }
      } catch {}
      setLoading(false);
    };
    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    if (!isLoggedIn || !course?.slug) return;
    const fetchMyReviews = async () => {
      try {
        const res = await refreshAndRetry(
          `${API}/api/courses/${course.slug}/reviews/me/`,
        );
        if (res.ok) {
          const data = await res.json();
          const list: any[] = Array.isArray(data) ? data : [];
          setMyReviewIds(new Set(list.map((r) => r.id)));
          const latest = list[0];
          if (latest) {
            setMyReviewId(latest.id);
            setAttemptCount(latest.attempt_number ?? list.length);
          }
        }
      } catch {}
    };
    fetchMyReviews();
    }, [isLoggedIn, course?.slug]);

  useEffect(() => {
    if (!progressPct || progressPct < 100 || !isEnrolled || !courseId) return;

    const key = `cert_shown_${courseId}`;
    if (localStorage.getItem(key)) return;

    const fetchAndShow = async () => {
      try {
        const res = await refreshAndRetry(
          `${API}/api/enrollments/certificate/?course_id=${courseId}`
        );
        if (res.ok) {
          const data = await res.json();
          setCertificateCode(data.certificate_code ?? undefined);
        }
      } catch {}
      localStorage.setItem(key, '1');
      setTimeout(() => setShowCertificate(true), 600);
    };

    fetchAndShow();
  }, [progressPct, isEnrolled, courseId]);

  const handleEnroll = async () => {
    if (!isLoggedIn) {
      onNavigate("auth");
      return;
    }
    const role = localStorage.getItem("role");
    if (role !== "student") {
      showError("Chỉ học viên mới có thể đăng ký khóa học.");
      return;
    }
    if (isEnrolled) {
      setActiveTab("lesson");
      return;
    }
    const price = course.sale_price ?? course.price ?? 0;
    if (price === 0) {
      setEnrolling(true);
      try {
        const res = await refreshAndRetry(`${API}/api/enrollments/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course_id: course.id }),
        });
        const data = await res.json();
        if (res.ok) {
          setIsEnrolled(true);
          showToast("🎉 Đăng ký thành công! Chúc bạn học tốt.");
        } else {
          showError(data.detail ?? "Đăng ký thất bại.");
        }
      } catch {
        showError("Lỗi kết nối. Vui lòng thử lại.");
      } finally {
        setEnrolling(false);
      }
      return;
    }
    setShowPayment(true);
  };

  const fetchLessonContent = async (lessonId: string, isPreview: boolean, lessonHasQuiz?: boolean) => {
    if (!isPreview && !isEnrolled) {
      if (!isLoggedIn) {
        onNavigate("auth");
        return;
      }
      // Show toast thay vì error trong lesson tab
      showInfo("Vui lòng đăng ký khóa học để xem bài học này.");
      return;
    }
    setActiveLessonHasQuiz(!!lessonHasQuiz);
    setLessonLoading(true);
    setLessonError(null);
    setActiveLesson(null);
    try {
      const res = await refreshAndRetry(
        `${API}/api/courses/lessons/${lessonId}/content/`,
      );
      if (res.ok) {
        const data = await res.json();
        setActiveLesson(data);
        if (returnTab === "quiz") {
          setActiveLessonId(lessonId);
          await fetchQuizFromLesson(lessonId);
          setActiveTab("quiz");
        } else {
          setActiveLessonId(lessonId);
          setActiveTab("lesson");
        }
        if (isEnrolled) {
          await markLessonComplete(lessonId);
        }
      } else if (res.status === 403) {
        // Lesson locked — show toast and go to lesson tab cleanly
        showInfo("Vui lòng đăng ký khóa học để xem bài học này.");
        setActiveTab("lesson");
      } else {
        setLessonError("Không thể tải bài học. Vui lòng thử lại.");
        setActiveTab(returnTab === "quiz" ? "quiz" : "lesson");
      }
    } catch {
      setLessonError("Lỗi kết nối máy chủ.");
      setActiveTab(returnTab === "quiz" ? "quiz" : "lesson");
    } finally {
      setLessonLoading(false);
    }
  };

  const fetchProgress = async (enrollmentId: string) => {
    try {
      const res = await refreshAndRetry(
        `${API}/api/enrollments/${enrollmentId}/progress/`,
      );
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.results ?? []);
        const map: Record<string, boolean> = {};
        list.forEach((p: any) => {
          map[p.lesson] = p.is_completed;
          if (p.quiz_passed === true) {
            map[`quiz_${p.lesson}`] = true;
          }
        });
        setProgressMap(map);
      }
      const enrollRes = await refreshAndRetry(`${API}/api/enrollments/`);
      if (enrollRes.ok) {
        const data = await enrollRes.json();
        const list = Array.isArray(data) ? data : (data.results ?? []);
        const enrollment = list.find((e: any) => e.id === enrollmentId);
        if (enrollment && typeof enrollment.progress_pct === "number") {
          setProgressPct(enrollment.progress_pct);
        }
      }
    } catch {}
  };

  const markLessonComplete = async (lessonId: string) => {
    try {
      const patchRes = await refreshAndRetry(
        `${API}/api/enrollments/progress/${lessonId}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_completed: true }),
        },
      );
      const patchData = await patchRes.json();
      setProgressMap((prev) => ({ ...prev, [lessonId]: true }));
      const enrollRes = await refreshAndRetry(`${API}/api/enrollments/`);
      const data = await enrollRes.json();
      const list = Array.isArray(data) ? data : (data.results ?? []);
      const enrolled = list.find(
        (e: any) => e.course === course.id || e.course_id === course.id,
      );
      if (enrolled && typeof enrolled.progress_pct === "number") {
        setProgressPct(enrolled.progress_pct);
      }

      // ── Check ngay sau khi cập nhật tiến độ ──
      if (lastRefundStatusRef.current === "refund_requested") {
        const refundRes = await refreshAndRetry(`${API}/api/payments/history/`);
        if (refundRes.ok) {
          const refundData = await refundRes.json();
          const refundList = Array.isArray(refundData) ? refundData : (refundData.results ?? []);
          const tx = refundList.find(
            (t: any) =>
              (t.course === course.id || t.course_id === course.id) &&
              t.status === "refund_requested"
          );
          if (!tx) {
            lastRefundStatusRef.current = "";
            setTimeout(() => setShowRefundCancelledAlert(true), 2000);
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const fetchQuizFromLesson = async (lessonId: string) => {
    if (!localStorage.getItem("access")) {
      setQuizError("Vui lòng đăng nhập để làm bài kiểm tra");
      setApiQuiz(null);
      return;
    }

    setApiQuiz(null);
    setCurrentQuizId(null);
    setQuizError(null);
    setQuizBlocked(false);
    setQuizResult(null);
    setQuizStarted(false);
    setCurrentQ(0);
    setSelected(new Set());
    setAnswered(false);
    setAllAnswers({});
    setQuizExplanations({});
    setCurrentAttemptId(null);
    setTimeLeft(0);
    setQuizAttemptCount(0);
    setQuizMaxAttempts(0);
    clearInterval(timerRef.current!);

    setQuizLoading(true);
    try {
      const res = await refreshAndRetry(
        `${API}/api/quizzes/lesson/${lessonId}/take/`,
      );
      const data = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(data)
          ? data[0]
          : data.detail || "Không thể tải bài kiểm tra";
        setQuizError(detail);
        return;
      }

      setApiQuiz(data);
      setCurrentQuizId(data.id);
      setQuizMaxAttempts(data.max_attempts ?? 0);

      try {
        const attemptRes = await refreshAndRetry(
          `${API}/api/quizzes/${data.id}/attempts/`
        );
        if (attemptRes.ok) {
          const attemptData = await attemptRes.json();
          const list = Array.isArray(attemptData)
            ? attemptData
            : (attemptData.results ?? []);
          const count = list.length;
          setQuizAttemptCount(count);
          // Tự kiểm tra hết lượt ở frontend
          if (data.max_attempts > 0 && count >= data.max_attempts) {
            setQuizBlocked(true);
          }
        }
      } catch {}
    } catch (err: any) {
      setQuizError(`Lỗi kết nối: ${err.message}`);
    } finally {
      setQuizLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "quiz" && activeLessonId && quizFetchKey > 0) {
      fetchQuizFromLesson(activeLessonId);
    }
  }, [quizFetchKey]);

  useEffect(() => {
    if (activeTab === "quiz" && activeLessonId) {
      setQuizFetchKey((k) => k + 1);
    }
  }, [activeTab, activeLessonId]);

  const submitReview = async (rating: number, comment: string) => {
    try {
      const res = await refreshAndRetry(
        `${API}/api/courses/${course.slug}/reviews/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, comment }),
        },
      );
      if (res.ok) {
        setReviewSent(true);
        const updated = await refreshAndRetry(
          `${API}/api/courses/${course.slug}/`,
        );
        if (updated.ok) setCourse(await updated.json());
        const mine = await refreshAndRetry(
          `${API}/api/courses/${course.slug}/reviews/me/`,
        );
        if (mine.ok) {
          const data = await mine.json();
          setMyReviewId(data?.id ?? null);
          setAttemptCount(data?.attempt_number ?? 0);
        }
      } else {
        const err = await res.json();
        showError(err.detail ?? "Gửi đánh giá thất bại.");
      }
    } catch {
      showError("Lỗi kết nối.");
    }
  };

  const handleStartEdit = (review: any) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditText(review.comment);
    setEditHoverRating(0);
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setEditRating(0);
    setEditText("");
    setEditHoverRating(0);
  };

  const handleSaveEdit = async (reviewId: string) => {
    if (!editRating || !editText.trim()) return;
    setEditSaving(true);
    try {
      const res = await refreshAndRetry(
        `${API}/api/courses/${course.slug}/reviews/${reviewId}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: editRating, comment: editText }),
        },
      );
      if (res.ok) {
        const updated = await refreshAndRetry(
          `${API}/api/courses/${course.slug}/`,
        );
        if (updated.ok) setCourse(await updated.json());
        handleCancelEdit();
        showToast("Đã cập nhật đánh giá.");
      } else {
        const err = await res.json();
        showError(err.detail ?? "Cập nhật đánh giá thất bại.");
      }
    } catch {
      showError("Lỗi kết nối.");
    }
    setEditSaving(false);
  };

  // ── Quiz handlers ───────────────────────────────────────────────
  const handleSelectAnswer = (answerId: string, questionType: string) => {
    if (answered) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (isMultipleType(questionType)) {
        next.has(answerId) ? next.delete(answerId) : next.add(answerId);
      } else {
        next.clear();
        next.add(answerId);
      }
      setAllAnswers((a) => ({ ...a, [currentQuestion.id]: next }));
      return next;
    });
  };
  const handleAnswerQuestion = () => {
    if (selected.size === 0) {
      showWarning("Vui lòng chọn một đáp án.");
      return;
    }
    setAnswered(true);
  };
  const handleSubmitQuiz = async () => {
    clearInterval(timerRef.current!);
    if (!currentQuizId || !apiQuiz?.questions) return;
    setQuizSubmitting(true);
    try {
      const finalAnswers = { ...allAnswersRef.current };
      if (selectedRef.current.size > 0) {
        const qId = apiQuiz.questions[currentQRef.current]?.id;
        if (qId) finalAnswers[qId] = selectedRef.current;
      }
      const answers: Record<string, string[]> = {};
      Object.entries(finalAnswers).forEach(([qId, answerSet]) => {
        answers[qId] = Array.from(answerSet);
      });
      const res = await refreshAndRetry(
        `${API}/api/quizzes/${currentQuizId}/submit/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, attempt_id: currentAttemptId }),
        },
      );
      if (res.ok) {
        const result = await res.json();
        const explanationsMap: Record<string, string> = {};
        result.questions?.forEach((q: any) => {
          explanationsMap[q.id] = q.explanation;
        });
        setQuizExplanations(explanationsMap);
        setQuizResult(result);
        setQuizAttemptCount((c) => c + 1);
        setQuizStarted(false);
        if (result.passed && isEnrolled) {
          setProgressMap((prev) => ({
            ...prev,
            [`quiz_${activeLessonId}`]: true,
          }));
          try {
            const enrollRes = await refreshAndRetry(`${API}/api/enrollments/`);
            if (enrollRes.ok) {
              const data = await enrollRes.json();
              const list = Array.isArray(data) ? data : (data.results ?? []);
              const enrolled = list.find(
                (e: any) => e.course === course.id || e.course_id === course.id,
              );
              if (enrolled) {
                await fetchProgress(enrolled.id);
              }
            }
          } catch {}
        }
      } else {
        const err = await res.json();
        showError(err.detail ?? "Nộp bài thất bại.");
      }
    } catch (err: any) {
      showError(`Lỗi: ${err.message}`);
    }
    setQuizSubmitting(false);
  };
  handleSubmitQuizRef.current = handleSubmitQuiz;
  const handleNextQuestion = () => {
    const snap = new Set(selectedRef.current);
    setAllAnswers((a) => ({ ...a, [currentQuestion.id]: snap }));
    if (currentQ + 1 < (apiQuiz?.questions?.length ?? 0)) {
      setCurrentQ((q) => q + 1);
      setSelected(new Set());
      setAnswered(false);
    } else {
      handleSubmitQuiz();
    }
  };
  useEffect(() => {
    if (!quizStarted || !apiQuiz?.time_limit) return;
    setTimeLeft(apiQuiz.time_limit * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmitQuizRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [quizStarted]);

  useEffect(() => {
    if (!isLoggedIn || !course) return;
    const checkEnrollment = async () => {
      try {
        const res = await refreshAndRetry(`${API}/api/enrollments/`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.results ?? []);
          const enrolled = list.find(
            (e: any) => e.course === course.id || e.course_id === course.id,
          );
          if (enrolled) {
            const isActive =
              enrolled.status !== "refunded" && enrolled.status !== "cancelled";
            setIsEnrolled(isActive);
            if (isActive) {
              fetchProgress(enrolled.id);
              if (typeof enrolled.progress_pct === "number")
                setProgressPct(enrolled.progress_pct);
            }
          }
          // Lưu trạng thái refund ban đầu
          const refundRes = await refreshAndRetry(`${API}/api/payments/history/`);
          if (refundRes.ok) {
            const refundData = await refundRes.json();
            const refundList = Array.isArray(refundData) ? refundData : (refundData.results ?? []);
            const tx = refundList.find(
              (t: any) =>
                (t.course === course.id || t.course_id === course.id) &&
                t.status === "refund_requested"
            );
            lastRefundStatusRef.current = tx ? "refund_requested" : "";
          }
        }
      } catch {}
    };
    checkEnrollment();
  }, [isLoggedIn, course]);
  const handleRestartQuiz = async () => {
    setQuizResult(null);
    setQuizStarted(false);
    setCurrentQ(0);
    setSelected(new Set());
    setAnswered(false);
    setAllAnswers({});
    setQuizExplanations({});
    clearInterval(timerRef.current!);
    setTimeLeft(0);

    if (currentQuizId) {
      const startRes = await refreshAndRetry(
        `${API}/api/quizzes/${currentQuizId}/start/`,
        { method: "POST" },
      );
      if (startRes.ok) {
        const { attempt_id } = await startRes.json();
        setCurrentAttemptId(attempt_id);
        setQuizStarted(true);
      } else {
        const err = await startRes.json().catch(() => ({}));
        const detail = Array.isArray(err)
          ? err[0]
          : (err.detail ?? "Không thể làm lại bài kiểm tra.");
        setQuizBlocked(true);
        setQuizError(detail);
      }
    }
  };
  if (loading || !course)
    return (
      <div
        className="cd-page"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
        }}
      >
        <span>Đang tải khóa học…</span>
      </div>
    );
  const discount = course.discount_percent ?? 0;
  const whatYouLearn = course.what_you_learn
    ? course.what_you_learn.split("\n").filter(Boolean)
    : [];
  const reviews = course.reviews ?? [];
  const visibleReviews = reviews.filter((r: any) => !r.is_hidden);
  const quizQuestions = apiQuiz?.questions ?? [];
  const currentQuestion = quizQuestions[currentQ];
  const passScore = apiQuiz?.pass_score ?? 70;

  return (
    <>
      <div className="cd-page">
        <div className="container cd-layout">
          <div className="cd-main">            
            <h1 className="cd-hero__title">{course.title}</h1>

            <div className="cd-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`cd-tab${activeTab === tab.id ? " cd-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* ── Overview ── */}
            {activeTab === "overview" && (
              <div className="cd-tab-content">
                <section className="cd-section">
                  <h2 className="cd-section__title">Bạn sẽ học được gì?</h2>
                  <ul className="cd-learn-list">
                    {whatYouLearn.map((item: string, i: number) => (
                      <li key={i} className="cd-learn-item">
                        <span className="cd-learn-item__icon">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="cd-section">
                  <h2 className="cd-section__title">Mô tả khóa học</h2>
                  <p className="cd-description">{course.description}</p>
                </section>
                {course.requirements && (
                  <section className="cd-section">
                    <h2 className="cd-section__title">Yêu cầu đầu vào</h2>
                    <p className="cd-description">{course.requirements}</p>
                  </section>
                )}
              </div>
            )}
            {/* ── Curriculum ── */}
            {activeTab === "curriculum" && (
              <div className="cd-tab-content cd-curriculum">
                {sections.length === 0 ? (
                  <EmptyState
                    title="Chưa có chương trình học"
                    subtitle="Nội dung khóa học đang được cập nhật. Vui lòng quay lại sau."
                  />
                ) : (
                  <>
                    
                    {sections.map((section) => (
                      <div key={section.id} className="cd-chapter">
                        <button
                          className="cd-chapter__header"
                          onClick={() =>
                            setExpandedSection(
                              expandedSection === section.id ? null : section.id,
                            )
                          }
                        >
                          <span className="cd-chapter__icon">
                            {expandedSection === section.id ? "▾" : "▸"}
                          </span>
                          <span className="cd-chapter__title">{section.title}</span>
                          {isEnrolled ? (
                            <span className="cd-chapter__count">
                              {section.lessons?.reduce((done: number, l: any) => {
                                const lessonDone = progressMap[l.id] ?? false;
                                const quizDone = l.quiz
                                  ? (progressMap[`quiz_${l.id}`] ?? false)
                                  : true;
                                return done + (lessonDone && quizDone ? 1 : 0);
                              }, 0) ?? 0}
                              /{section.lessons?.length ?? 0}
                            </span>
                          ) : (
                            <span className="cd-chapter__count">
                              {section.lessons?.length ?? 0} bài
                            </span>
                          )}
                        </button>
                        {expandedSection === section.id && (
                          <div className="cd-chapter__lessons">
                            {section.lessons?.map((lesson: any, idx: number) => {
                              const lessonIsPreview =
                                lesson.is_preview_video ||
                                lesson.is_preview_article ||
                                lesson.is_preview_resource;
                              return (
                                <button
                                  key={lesson.id}
                                  className={`cd-lesson-row${
                                    activeLessonId === lesson.id
                                      ? " cd-lesson-row--active"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    setLessonTargetTab("lesson");
                                    setReturnTab("lesson");
                                    fetchLessonContent(lesson.id, lessonIsPreview, !!lesson.quiz);
                                  }}
                                >
                                  <span className="cd-lesson-row__num">
                                    {idx + 1}
                                  </span>                                  
                                  <span className="cd-lesson-row__title">
                                    {lesson.title}
                                  </span>
                                  {lesson.quiz && isEnrolled && (
                                    <span
                                      role="button"
                                      className="cd-lesson-row__quiz-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        resetQuizState();
                                        setReturnTab("quiz");
                                        setActiveLessonId(lesson.id);
                                        setActiveTab("quiz");
                                        setQuizFetchKey((k) => k + 1);
                                      }}
                                      title="Làm bài kiểm tra"
                                      style={{ cursor: "pointer" }}
                                    >
                                    </span>
                                  )}
                                  {lesson.quiz && !isEnrolled && (
                                    <span className="cd-lesson-row__quiz">📝</span>
                                  )}
                                  {isEnrolled ? (
                                    <span
                                      className={`cd-lesson-row__done${
                                        progressMap[lesson.id] &&
                                        (!lesson.quiz ||
                                          progressMap[`quiz_${lesson.id}`])
                                          ? " cd-lesson-row__done--completed"
                                          : ""
                                      }`}
                                    >
                                      {(progressMap[lesson.id] ? 1 : 0) +
                                        (lesson.quiz &&
                                        progressMap[`quiz_${lesson.id}`]
                                          ? 1
                                          : 0)}
                                      /{lesson.quiz ? 2 : 1}
                                    </span>
                                  ) : (
                                    <>
                                      {lessonIsPreview && (
                                        <span className="cd-lesson-row__preview">
                                          Xem thử
                                        </span>
                                      )}
                                      {!lessonIsPreview && (
                                        <span className="cd-lesson-row__lock">
                                          🔒
                                        </span>
                                      )}
                                    </>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
            {/* ── Lesson ── */}
            {activeTab === "lesson" && (
              <div className="cd-tab-content cd-lesson">
                {lessonLoading ? (
                  <div className="cd-lesson__loading">
                    <div className="cd-spinner" />
                    <p>Đang tải bài học…</p>
                  </div>
                ) : lessonError ? (
                  <div className="cd-lesson__error">
                    <p>{lessonError}</p>
                  </div>
                ) : !activeLesson ? (
                  <EmptyState
                    title="Chọn bài học để bắt đầu"
                    subtitle="Chọn một bài từ danh sách chương trình để xem nội dung."
                    actions={
                      <button
                        className="cd-btn-secondary"
                        onClick={() => setActiveTab("curriculum")}
                      >
                        Xem chương trình học
                      </button>
                    }
                  />
                ) : (
                  <div className="cd-lesson__content">
                    <div className="cd-lesson__header">
                      <h2 className="cd-lesson__title">{activeLesson.title}</h2>
                      {/* Nút làm bài tập nếu bài có quiz */}
                      {activeLessonHasQuiz && isEnrolled && (
                        <button
                          className="cd-lesson__quiz-cta"
                          onClick={() => {
                            resetQuizState();
                            setReturnTab("quiz");
                            setActiveTab("quiz");
                            setQuizFetchKey((k) => k + 1);
                          }}
                        >
                          Làm bài tập
                        </button>
                      )}
                    </div>
                    {(activeLesson.video_file || activeLesson.video_url) && (
                      <div className="cd-lesson__video-wrap">
                        {activeLesson.video_url &&
                          (() => {
                            const { type, embedUrl } = getVideoEmbed(
                              activeLesson.video_url,
                            );
                            if (type === "youtube" || type === "vimeo") {
                              return (
                                <>
                                  {activeLesson.video_file && (
                                    <p className="cd-lesson__video-label"></p>
                                  )}
                                  <iframe
                                    className="cd-lesson__iframe"
                                    src={embedUrl}
                                    allowFullScreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    title={activeLesson.title}
                                  />
                                </>
                              );
                            }
                            return (
                              <>
                                {activeLesson.video_file && (
                                  <p className="cd-lesson__video-label"></p>
                                )}
                                <video
                                  className="cd-lesson__video"
                                  controls
                                  src={embedUrl}
                                />
                              </>
                            );
                          })()}
                        {activeLesson.video_file && (
                          <>
                            {activeLesson.video_url && (
                              <p className="cd-lesson__video-label"></p>
                            )}
                            <video
                              className="cd-lesson__video"
                              controls
                              src={
                                activeLesson.video_file.startsWith("http")
                                  ? activeLesson.video_file
                                  : `${API}${activeLesson.video_file}`
                              }
                            />
                          </>
                        )}
                      </div>
                    )}
                    {activeLesson.content && (
                      <div className="cd-lesson__body">
                        {renderMarkdown(activeLesson.content)}
                      </div>
                    )}
                    {activeLesson.attachment && (
                      <div className="cd-lesson__attachments">
                        <h4 className="cd-lesson__attachments-title">
                          File tài liệu
                        </h4>
                        <a
                          href={
                            activeLesson.attachment.startsWith("http")
                              ? activeLesson.attachment
                              : `${API}${activeLesson.attachment}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cd-lesson__attach-item"
                        >
                          <span className="cd-lesson__attach-link">
                            {activeLesson.attachment_name ?? "Tải tài liệu"}
                          </span>
                          <span className="cd-lesson__attach-dl"></span>
                        </a>
                      </div>
                    )}
                    {/* Nút làm bài tập ở cuối bài nếu có quiz */}
                    {activeLessonHasQuiz && isEnrolled && (
                      <div className="cd-lesson__footer">
                        <button
                          className="cd-lesson__quiz-cta cd-lesson__quiz-cta--footer"
                          onClick={() => {
                            resetQuizState();
                            setReturnTab("quiz");
                            setActiveTab("quiz");
                            setQuizFetchKey((k) => k + 1);
                          }}
                        >
                          Làm bài tập ngay
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* ── Quiz ── */}
            {activeTab === "quiz" && (
              <div className="cd-tab-content cd-quiz">
                {!activeLessonId ? (
                  /* ── Chưa chọn bài học ── */
                  <EmptyState
                    title="Chọn bài học để luyện tập"
                    subtitle="Chọn một bài học có bài kiểm tra từ chương trình học để bắt đầu."
                    actions={
                      <button
                        className="cd-btn-secondary"
                        onClick={() => setActiveTab("curriculum")}
                      >
                        Xem chương trình học
                      </button>
                    }
                  />
                ) : quizLoading ? (
                  /* ── Loading ── */
                  <div className="cd-lesson__loading">
                    <div className="cd-spinner" />
                    <p>Đang tải bài kiểm tra…</p>
                  </div>
                ) : quizError ? (
                  /* ── Error / Không có quiz ── */
                  <EmptyState
                    title={
                      quizError === "No Quiz matches the given query." || quizError.includes("No Quiz")
                        ? "Bài học này không có bài kiểm tra"
                        : "Không thể tải bài kiểm tra"
                    }
                    subtitle={
                      quizError === "No Quiz matches the given query." || quizError.includes("No Quiz")
                        ? "Hãy chọn một bài học khác có bài kiểm tra."
                        : quizError
                    }
                    actions={
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                        <button
                          className="cd-btn-secondary"
                          onClick={() => setActiveTab("lesson")}
                        >
                          Quay lại bài học
                        </button>
                        <button
                          className="cd-btn-secondary"
                          onClick={() => setActiveTab("curriculum")}
                        >
                          Xem chương trình học
                        </button>
                      </div>
                    }
                  />
                ) : !apiQuiz ? (
                  /* ── Không có quiz (chưa load) ── */
                  <EmptyState
                    title="Bài học này chưa có bài kiểm tra"
                    subtitle="Hãy chọn một bài học khác."
                    actions={
                      <button
                        className="cd-btn-secondary"
                        onClick={() => setActiveTab("curriculum")}
                      >
                        Chọn bài học khác
                      </button>
                    }
                  />
                ) : quizResult ? (
                  /* ════ KẾT QUẢ ════ */
                  <div className="cd-quiz__result">
                    {/* Circle score */}
                    <div
                      className={`cd-quiz__result-circle ${
                        quizResult.passed
                          ? "cd-quiz__result-circle--pass"
                          : "cd-quiz__result-circle--fail"
                      }`}
                    >
                      <span className="cd-quiz__result-score">
                        {quizResult.score}%
                      </span>
                      <span className="cd-quiz__result-label">
                        {quizResult.passed ? "Đạt" : "Chưa đạt"}
                      </span>
                    </div>

                    {/* Info rows */}
                    <div className="cd-quiz__result-info">
                      <div className="cd-quiz__result-info-row">
                        <span>Điểm cần đạt</span>
                        <span>{passScore}%</span>
                      </div>
                      <div className="cd-quiz__result-info-row">
                        <span>Điểm của bạn</span>
                        <span
                          style={{
                            color: quizResult.passed ? "#4caf82" : "#e05c5c",
                          }}
                        >
                          {quizResult.score/10}/10
                        </span>
                      </div>
                      <div className="cd-quiz__result-info-row">
                        <span>Số câu</span>
                        <span>
                          {quizResult.questions?.length ?? quizQuestions.length}{" "}
                          câu
                        </span>
                      </div>
                      {quizAttemptCount > 0 && (
                        <div className="cd-quiz__result-info-row">
                          <span>Lần làm bài</span>
                          <span>
                            {quizAttemptCount}
                            {quizMaxAttempts > 0 ? `/${quizMaxAttempts}` : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Review */}
                    <div className="cd-quiz__review">
                      <p className="cd-quiz__review-title">Xem lại bài làm</p>
                      {quizResult.questions?.map((q: any, idx: number) => {
                        const myAnswers =
                          quizResult.answers_snapshot?.[q.id] || [];
                        return (
                          <div key={q.id} className="cd-quiz__review-item">
                            <div className="cd-quiz__review-q">
                              <strong>Câu {idx + 1}:</strong> {q.content}
                            </div>
                            {q.answers.map((a: any) => {
                              const isChosen = myAnswers.includes(a.id);
                              let css = "cd-quiz__review-ans";
                              if (a.is_correct)
                                css += " cd-quiz__review-ans--correct";
                              if (isChosen && !a.is_correct)
                                css += " cd-quiz__review-ans--wrong";
                              return (
                                <div key={a.id} className={css}>
                                  <span className="cd-quiz__review-marker">
                                    {a.is_correct ? "✓" : isChosen ? "✗" : ""}
                                  </span>
                                  {a.content}
                                </div>
                              );
                            })}
                            {q.explanation && (
                              <p className="cd-quiz__review-explain">
                                <strong>Giải thích:</strong> {q.explanation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div className="cd-quiz__result-actions">
                      {quizBlocked || (quizMaxAttempts > 0 && quizAttemptCount >= quizMaxAttempts) ? (
                        <button className="cd-btn-enroll cd-btn-enroll--disabled" disabled>
                          Hết lượt
                        </button>
                      ) : (
                        <button className="cd-btn-enroll" onClick={handleRestartQuiz}>
                          Làm lại
                        </button>
                      )}
                      <button
                        className="cd-btn-secondary"
                        onClick={() => setActiveTab("lesson")}
                      >
                        Xem bài học
                      </button>
                    </div>
                  </div>
                ) : !quizStarted ? (
                  /* ════ MÀN HÌNH GIỚI THIỆU ════ */
                  <div className="cd-quiz__intro">
                    <h2 className="cd-quiz__intro-title">
                      {apiQuiz.title || "Bài kiểm tra"}
                    </h2>
                    {apiQuiz.description && (
                      <p className="cd-quiz__intro-sub">
                        {apiQuiz.description}
                      </p>
                    )}

                    {/* Info list */}
                    <ul className="cd-quiz__intro-info">
                      <li>
                        <div className="quiz__info">
                          <span>Số câu hỏi: </span>
                          <span>{quizQuestions.length} câu</span>
                        </div>
                      </li>
                      <li>
                        <div className="quiz__info">
                          <span>Thời gian: </span>
                          <span>
                            {apiQuiz.time_limit > 0
                              ? `${apiQuiz.time_limit} phút`
                              : "Không giới hạn"}
                          </span>
                        </div>
                      </li>
                      <li>
                        <div className="quiz__info">
                          <span>Điểm đạt: </span>
                          <span style={{ color: "#4caf82", fontWeight: 600 }}>
                            {passScore}%
                          </span>
                        </div>
                      </li>
                      {apiQuiz.max_attempts > 0 && (
                        <li>
                          <div className="quiz__info">
                            <span>Số lần làm: </span>
                            <span>
                              {quizAttemptCount}/{apiQuiz.max_attempts}                              
                            </span>
                          </div>
                        </li>
                      )}
                      {quizAttemptCount > 0 && apiQuiz.max_attempts === 0 && (
                        <li>
                          <div className="quiz__info">
                            <span>Đã làm: </span>
                            <span>{quizAttemptCount} lần</span>
                          </div>
                        </li>
                      )}
                    </ul>

                    {quizBlocked || (quizMaxAttempts > 0 && quizAttemptCount >= quizMaxAttempts) ? (
                      <p className="cd-btn-enroll">
                        Hết lượt làm bài
                      </p>
                    ) : (
                      <button
                        className="cd-btn-enroll"
                        onClick={async () => {
                          if (!currentQuizId) return;
                          try {
                            const startRes = await refreshAndRetry(
                              `${API}/api/quizzes/${currentQuizId}/start/`,
                              { method: "POST" },
                            );
                            if (startRes.ok) {
                              const { attempt_id } = await startRes.json();
                              setCurrentAttemptId(attempt_id);
                              setQuizStarted(true);
                            } else {
                              const err = await startRes.json().catch(() => ({}));
                              const detail = Array.isArray(err)
                                ? err[0]
                                : (err.detail ?? "Không thể bắt đầu làm bài.");
                              setQuizBlocked(true);
                              setQuizError(detail);
                            }
                          } catch (err: any) {
                            showError(`Lỗi kết nối: ${err.message}`);
                          }
                        }}
                      >
                        {quizAttemptCount > 0 ? "Làm lại" : "Bắt đầu làm bài"}
                      </button>
                    )}
                  </div>
                ) : (
                  /* ════ ĐANG LÀM BÀI ════ */
                  <div className="cd-quiz__question">
                    {/* Progress bar */}
                    <div className="cd-quiz__progress">
                      <div className="cd-quiz__progress-bar">
                        <div
                          className="cd-quiz__progress-fill"
                          style={{
                            width: `${((currentQ + 1) / quizQuestions.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="cd-quiz__progress-text">
                        {currentQ + 1} / {quizQuestions.length}
                      </span>
                      {apiQuiz?.time_limit > 0 && (
                        <span
                          className={`cd-quiz__timer${timeLeft <= 60 ? " cd-quiz__timer--warning" : ""}`}
                        >
                          {formatTime(timeLeft)}
                        </span>
                      )}
                    </div>

                    {currentQuestion && (
                      <>
                        {/* Question number label */}
                        <div className="cd-quiz__q-num">
                          Question {currentQ + 1}
                        </div>

                        {/* Question text */}
                        <h3 className="cd-quiz__q-text">
                          {currentQuestion.content}
                        </h3>

                        {/* Hint for multiple choice */}
                        {isMultipleType(currentQuestion.question_type) && (
                          <p className="cd-quiz__hint">
                            Chọn nhiều đáp án
                          </p>
                        )}

                        {/* Options */}
                        <div className="cd-quiz__options">
                          {currentQuestion.answers?.map(
                            (ans: any, ansIdx: number) => {
                              const label = String.fromCharCode(65 + ansIdx);
                              const isSelected = selected.has(ans.id);
                              const isMultiple = isMultipleType(
                                currentQuestion.question_type,
                              );

                              let cls = "cd-quiz__option";
                              let feedbackLabel = null;

                              if (answered) {
                                if (ans.is_correct === true) {
                                  cls += " cd-quiz__option--correct";                                  
                                } else if (isSelected) {
                                  cls += " cd-quiz__option--wrong";                                  
                                }
                                cls += " cd-quiz__option--disabled";
                              } else if (isSelected) {
                                cls += " cd-quiz__option--selected";
                              }

                              const icon = answered
                                ? ans.is_correct
                                  ? isMultiple
                                    ? "☑"
                                    : "◉"
                                  : isSelected
                                    ? isMultiple
                                      ? "☒"
                                      : "◎"
                                    : isMultiple
                                      ? "☐"
                                      : "○"
                                : isSelected
                                  ? isMultiple
                                    ? "☑"
                                    : "◉"
                                  : isMultiple
                                    ? "☐"
                                    : "○";

                              return (
                                <button
                                  key={ans.id}
                                  className={cls}
                                  onClick={() =>
                                    handleSelectAnswer(
                                      ans.id,
                                      currentQuestion.question_type,
                                    )
                                  }
                                  disabled={answered}
                                >
                                  <span className="cd-quiz__option-label">
                                    {label}
                                  </span>
                                  <span className="cd-quiz__option-text">
                                    {ans.content}
                                  </span>
                                  {feedbackLabel}
                                </button>
                              );
                            },
                          )}
                        </div>

                        {answered && (
                          <div className="cd-quiz__feedback">
                            {(() => {
                              const correctIds =
                                currentQuestion.answers
                                  ?.filter((a: any) => a.is_correct)
                                  .map((a: any) => a.id) ?? [];
                              const selectedArr = Array.from(selected);
                              const allCorrect =
                                correctIds.length === selectedArr.length &&
                                selectedArr.every((id) =>
                                  correctIds.includes(id),
                                );

                              return (
                                <>
                                  <span className="cd-quiz__feedback-label">
                                    {allCorrect ? "Đúng" : "Sai"}
                                  </span>

                                  <p className="cd-quiz__explanation">
                                    Giải thích: 
                                    {quizExplanations[currentQuestion.id] ||
                                      currentQuestion.explanation ||
                                      "Không có giải thích."}
                                  </p>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* Action row */}
                        <div className="cd-quiz__actions">
                          {!answered ? (
                            <button
                              className="cd-btn-enroll cd-quiz__next-btn"
                              onClick={handleAnswerQuestion}
                            >
                              Xác nhận
                            </button>
                          ) : (
                            <button
                              className="cd-btn-enroll cd-quiz__next-btn"
                              onClick={handleNextQuestion}
                              disabled={quizSubmitting}
                            >
                              {currentQ + 1 < quizQuestions.length
                                ? "Câu tiếp theo"
                                : quizSubmitting
                                  ? "Đang nộp…"
                                  : "Nộp bài"}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Reviews ── */}
            {activeTab === "reviews" && (
              <div className="cd-tab-content cd-reviews">
                <div className="cd-rv-summary">
                  <div className="cd-rv-big-score">
                    <span className="cd-rv-big-num">
                      {visibleReviews.length > 0
                        ? (
                            visibleReviews.reduce(
                              (sum: number, r: any) => sum + r.rating,
                              0,
                            ) / visibleReviews.length
                          ).toFixed(1)
                        : "0.0"}
                    </span>
                    <div className="cd-rv-big-stars">
                      {(() => {
                        const avg =
                          visibleReviews.length > 0
                            ? visibleReviews.reduce(
                                (sum: number, r: any) => sum + r.rating,
                                0,
                              ) / visibleReviews.length
                            : 0;
                        return (
                          <>
                            {"★".repeat(Math.round(avg))}
                            {"☆".repeat(5 - Math.round(avg))}
                          </>
                        );
                      })()}
                    </div>
                    <span className="cd-rv-big-sub">
                      {visibleReviews.length.toLocaleString()} đánh giá
                    </span>
                  </div>
                  <div className="cd-rv-bars">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = visibleReviews.filter(
                        (r: any) => r.rating === star,
                      ).length;
                      const pct =
                        visibleReviews.length > 0
                          ? Math.round((count / visibleReviews.length) * 100)
                          : 0;
                      return (
                        <div key={star} className="cd-rv-bar-row">
                          <span className="cd-rv-bar-label">{star} ★</span>
                          <div className="cd-rv-bar-track">
                            <div
                              className="cd-rv-bar-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="cd-rv-bar-pct">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="cd-rv-list">
                  {reviews
                    .filter((r: any) => !r.is_hidden)
                    .slice(0, showAllReviews ? undefined : 5)
                    .map((r: any) => {
                      return (
                        <div key={r.id} className="cd-rv-card">
                          {editingReviewId === r.id ? (
                            <div className="cd-rv-edit-form">
                              <div className="cd-rv-edit-header">
                                <strong>Chỉnh sửa đánh giá</strong>
                                <button
                                  className="cd-rv-cancel-btn"
                                  onClick={handleCancelEdit}
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="cd-rv-star-input">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <button
                                    key={i}
                                    className={`cd-rv-star-btn${i <= (editHoverRating || editRating) ? " cd-rv-star-btn--active" : ""}`}
                                    onClick={() => setEditRating(i)}
                                    onMouseEnter={() => setEditHoverRating(i)}
                                    onMouseLeave={() => setEditHoverRating(0)}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                              <textarea
                                className="cd-rv-textarea"
                                rows={3}
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                placeholder="Nội dung đánh giá..."
                              />
                              <div className="cd-rv-edit-actions">
                                <button
                                  className="cd-btn-enroll cd-rv-submit"
                                  disabled={
                                    !editRating ||
                                    !editText.trim() ||
                                    editSaving
                                  }
                                  onClick={() => handleSaveEdit(r.id)}
                                >
                                  {editSaving ? "Đang lưu…" : "Lưu thay đổi"}
                                </button>
                                <button
                                  className="cd-btn-secondary"
                                  onClick={handleCancelEdit}
                                >
                                  Hủy
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="cd-rv-card-top">
                                <div className="cd-rv-avatar-placeholder">
                                  {(r.student_name ?? "?")[0]}
                                </div>
                                <div>
                                  <div className="cd-rv-name">
                                    {r.student_name ?? "—"}
                                  </div>
                                  <div className="cd-rv-date">
                                    {r.created_at
                                      ? new Date(
                                          r.created_at,
                                        ).toLocaleDateString("vi-VN")
                                      : ""}
                                  </div>
                                </div>
                                <div className="cd-rv-stars">
                                  {"★".repeat(r.rating)}
                                  {"☆".repeat(5 - r.rating)}
                                </div>
                                {myReviewIds.has(r.id) && (
                                  <button
                                    className="cd-rv-edit-btn"
                                    onClick={() => handleStartEdit(r)}
                                    title="Chỉnh sửa"
                                  >
                                    Chỉnh sửa
                                  </button>
                                )}
                              </div>
                              <p className="cd-rv-comment">{r.comment}</p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  {reviews.filter((r: any) => !r.is_hidden).length > 5 && (
                    <button
                      className="cd-btn-secondary"
                      onClick={() => setShowAllReviews(!showAllReviews)}
                    >
                      {showAllReviews
                        ? "Thu gọn"
                        : `Xem thêm (${reviews.filter((r: any) => !r.is_hidden).length - 5})`}
                    </button>
                  )}
                </div>
                <div className="cd-rv-form">
                  <h3 className="cd-rv-form-title">Viết đánh giá của bạn</h3>
                  {reviewSent ? (
                    <div className="cd-rv-success">
                      Cảm ơn bạn đã đánh giá!
                    </div>
                  ) : myReviewId ? (
                    <p className="cd-rv-note">
                      Bạn đang có đánh giá hiển thị. Hãy chỉnh sửa đánh giá đó.
                    </p>
                  ) : attemptCount >= 5 ? (
                    <p className="cd-rv-note">
                      Bạn đã dùng hết 5 lượt đánh giá cho khoá học này.
                    </p>
                  ) : (
                    <>
                      <div className="cd-rv-star-input">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <button
                            key={i}
                            className={`cd-rv-star-btn${i <= (hoverRating || reviewRating) ? " cd-rv-star-btn--active" : ""}`}
                            onClick={() => setReviewRating(i)}
                            onMouseEnter={() => setHoverRating(i)}
                            onMouseLeave={() => setHoverRating(0)}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="cd-rv-textarea"
                        rows={3}
                        placeholder="Chia sẻ trải nghiệm học của bạn..."
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                      />
                      <button
                        className="cd-btn-enroll cd-rv-submit"
                        disabled={!reviewRating || !reviewText.trim()}
                        onClick={() => {
                          if (!isLoggedIn) {
                            onNavigate("auth");
                            return;
                          }

                          const role = localStorage.getItem("role");

                          if (role !== "student") {
                            showError("Chỉ học viên mới được đánh giá.");
                            return;
                          }

                          if (!isEnrolled) {
                            showError(
                              "Bạn cần đăng ký khóa học trước khi đánh giá.",
                            );
                            return;
                          }

                          submitReview(reviewRating, reviewText);
                        }}
                      >
                        {isLoggedIn ? "Gửi đánh giá" : "Đăng nhập để đánh giá"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="cd-sidebar">
            <div className="cd-price-card">
              <div className="cd-price-card__instructor">
                <div className="cd-rv-avatar-placeholder">
                  {(course.instructor_name ?? "?")[0]}
                </div>
                <div>
                  <strong>{course.instructor_name ?? "—"}</strong>
                  <span>Giảng viên</span>
                </div>
              </div>
              <div className="cd-price-card__instructor-stats">
                <span>{(course.avg_rating ?? 0).toFixed(1)} ★</span>
                <span>
                  {course.total_students?.toLocaleString() ?? 0} học viên
                </span>
              </div>

              {!isEnrolled && (
                <>
                  <div className="cd-price-card__price-row">
                    <span className="cd-price-card__price">
                      {(course.sale_price ?? course.price ?? 0) > 0
                        ? formatPrice(course.sale_price ?? course.price ?? 0, "VND")
                        : "Miễn phí"}
                    </span>
                    {discount > 0 && course.price > 0 && (
                      <>
                        <span className="cd-price-card__original">
                          {formatPrice(course.price, "VND")}
                        </span>
                        <span className="cd-price-card__discount">-{discount}%</span>
                      </>
                    )}
                  </div>

                  <button
                    className="cd-btn-enroll"
                    onClick={handleEnroll}
                    disabled={enrolling}
                  >
                    {enrolling
                      ? "Đang đăng ký…"
                      : isLoggedIn
                        ? "Đăng ký học ngay"
                        : "Đăng nhập để học"}
                  </button>
                </>
              )}

              {isEnrolled && (
                <button
                  className="cd-btn-enroll"
                  onClick={() => setActiveTab("overview")}
                >
                  Đã đăng ký
                </button>
              )}
              {isEnrolled && (
                <div className="cd-progress-bar-wrap">
                  <div className="cd-progress-bar-track">
                    <div
                      className="cd-progress-bar-fill"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="cd-progress-bar-row">
                    <span className="cd-progress-bar-label">Tiến độ: {progressPct}%</span>
                    {progressPct === 100 && (
                      <button
                        className="cd-progress-cert-btn"
                        onClick={async () => {
                          try {
                            const res = await refreshAndRetry(
                              `${API}/api/enrollments/certificate/?course_id=${courseId}`
                            );
                            if (res.ok) {
                              const data = await res.json();
                              setCertificateCode(data.certificate_code ?? undefined);
                            }
                          } catch {}
                          setShowCertificate(true);
                        }}
                      >
                        🏆 Chứng nhận
                      </button>
                    )}
                  </div>
                </div>
              )}
              {course.category_name && (
                <div className="cd-price-card__tags">
                  <span className="cd-tag">{course.category_name}</span>
                  <span className="cd-tag">{course.level}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showCertificate && (
        <CertificateModal
          courseName={course?.title ?? ''}
          studentName={
            localStorage.getItem('full_name') ||
            localStorage.getItem('username') ||
            ''
          }
          certificateCode={certificateCode}
          onClose={() => setShowCertificate(false)}
        />
      )}
      {showPayment && course && (
        <PaymentModal
          course={course}
          onClose={() => setShowPayment(false)}
          onSuccess={async () => {
            setIsEnrolled(true);
            setShowPayment(false);
            setActiveTab("lesson");
            try {
              const res = await refreshAndRetry(`${API}/api/enrollments/`);
              if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.results ?? []);
                const enrolled = list.find(
                  (e: any) =>
                    e.course === course.id || e.course_id === course.id,
                );
                if (enrolled) {
                  fetchProgress(enrolled.id);
                  if (typeof enrolled.progress_pct === "number")
                    setProgressPct(enrolled.progress_pct);
                }
              }
            } catch {}
          }}
        />
      )}

      {/* Refund cancelled alert */}
      {showRefundCancelledAlert && (
        <div className="cd-alert-overlay">
          <div className="cd-alert-box">
            <div className="cd-alert-box__icon">⚠️</div>
            <h3 className="cd-alert-box__title">Yêu cầu hoàn tiền đã bị hủy</h3>
            <p className="cd-alert-box__msg">
              Yêu cầu hoàn tiền của bạn đã bị tự động hủy do bạn đã học quá 20% khóa học.
            </p>
            <button
              className="cd-alert-box__btn"
              onClick={() => setShowRefundCancelledAlert(false)}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
};
export default CourseDetail;