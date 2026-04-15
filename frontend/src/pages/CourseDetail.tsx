import React, { useState, useEffect, useRef } from "react";
import { formatPrice } from "../utils/format";
import { getVideoEmbed } from '../utils/youtube';
import PaymentModal from "./PaymentPage";

const API = "http://127.0.0.1:8000";
const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem("access");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const MAX_REVIEW_EDITS = 5;
const refreshAndRetry = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let res = await fetch(url, { ...options, headers: { ...authHeader(), ...(options.headers as any) } });
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
          res = await fetch(url, { ...options, headers: { ...authHeader(), ...(options.headers as any) } });
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
interface CourseDetailProps {
  courseId: string;
  onNavigate: (page: string, courseId?: string) => void;
  isLoggedIn: boolean;
}
const renderMarkdown = (content: string) => {
  if (!content) return null;
  return content.trim().split("\n").map((line, i) => {
    if (line.startsWith("## "))  return <h2 key={i} className="cd-md-h2">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} className="cd-md-h3">{line.slice(4)}</h3>;
    if (line.startsWith("> "))   return <blockquote key={i} className="cd-md-quote">{line.slice(2)}</blockquote>;
    if (line.startsWith("- "))   return <li key={i} className="cd-md-li">{line.slice(2)}</li>;
    if (line.startsWith("| "))   return <div key={i} className="cd-md-table-row">{line}</div>;
    if (line.trim() === "")      return <div key={i} className="cd-md-spacer" />;
    const html = line
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>");
    return <p key={i} className="cd-md-p" dangerouslySetInnerHTML={{ __html: html }} />;
  });
};
const getFileIcon = (filename: string) => {
  const ext = filename?.split(".").pop()?.toLowerCase();
  const icons: Record<string, string> = {
    pdf: "📄", docx: "📝", doc: "📝", xlsx: "📊", xls: "📊", csv: "📊",
    pptx: "📋", ppt: "📋", zip: "🗜️", rar: "🗜️", mp4: "🎬", mp3: "🎵",
  };
  return icons[ext ?? ""] ?? "📎";
};
type Tab = "overview" | "curriculum" | "lesson" | "quiz" | "reviews";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview",   label: "Tổng quan" },
  { id: "curriculum", label: "Chương trình" },
  { id: "lesson",     label: "Bài học" },
  { id: "quiz",       label: "Luyện tập" },
  { id: "reviews",    label: "Đánh giá" },
];
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};
const isMultipleType = (qt: string) => qt === "multiple" || qt === "multiple_choice";
const CourseDetail: React.FC<CourseDetailProps> = ({ courseId, onNavigate, isLoggedIn }) => {
  const [course,        setCourse]        = useState<any>(null);
  const [sections,      setSections]      = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [isEnrolled,    setIsEnrolled]    = useState(false);
  const [enrolling,     setEnrolling]     = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [activeTab,       setActiveTab]       = useState<Tab>("overview");
  const [activeLessonId,  setActiveLessonId]  = useState<string | null>(null);
  const [activeLesson,    setActiveLesson]    = useState<any>(null);
  const [lessonLoading,   setLessonLoading]   = useState(false);
  const [lessonError,     setLessonError]     = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [returnTab,       setReturnTab]       = useState<Tab>("lesson");
  const [lessonTargetTab, setLessonTargetTab] = useState<"lesson" | "quiz">("lesson");

  const [currentQuizId,    setCurrentQuizId]    = useState<string | null>(null);
  const [apiQuiz,          setApiQuiz]          = useState<any | null>(null);
  const [quizLoading,      setQuizLoading]      = useState(false);
  const [quizStarted,      setQuizStarted]      = useState(false);
  const [quizSubmitting,   setQuizSubmitting]   = useState(false);
  const [currentQ,         setCurrentQ]         = useState(0);
  const [selected,         setSelected]         = useState<Set<string>>(new Set());
  const [answered,         setAnswered]         = useState(false);
  const [quizResult,       setQuizResult]       = useState<any | null>(null);
  const [quizError,        setQuizError]        = useState<string | null>(null);
  const [quizExplanations, setQuizExplanations] = useState<Record<string, string>>({});
  const [allAnswers,       setAllAnswers]       = useState<Record<string, Set<string>>>({});
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [quizBlocked, setQuizBlocked] = useState(false);

  const [myReviewIds, setMyReviewIds] = useState<Set<string>>(new Set());
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText,   setReviewText]   = useState("");
  const [reviewSent,   setReviewSent]   = useState(false);
  const [hoverRating,  setHoverRating]  = useState(0);
  const [myReviewId, setMyReviewId] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating,      setEditRating]      = useState(0);
  const [editText,        setEditText]        = useState("");
  const [editHoverRating, setEditHoverRating] = useState(0);
  const [editSaving,      setEditSaving]      = useState(false);

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const allAnswersRef      = useRef<Record<string, Set<string>>>({});
  const selectedRef        = useRef<Set<string>>(new Set());
  const currentQRef        = useRef<number>(0);
  const handleSubmitQuizRef = useRef<() => void>(() => {});
  const [progressMap,   setProgressMap]   = useState<Record<string, boolean>>({});
  const [progressPct,   setProgressPct]   = useState<number>(0);
  
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };
  useEffect(() => { allAnswersRef.current = allAnswers; }, [allAnswers]);
  useEffect(() => { selectedRef.current   = selected;   }, [selected]);
  useEffect(() => { currentQRef.current   = currentQ;   }, [currentQ]);
  useEffect(() => {
    if (!courseId){
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
          if (data.sections?.length > 0) setExpandedSection(data.sections[0].id);
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
          `${API}/api/courses/${course.slug}/reviews/me/`
        );
        if (res.ok) {
          const data = await res.json();
          const list: any[] = Array.isArray(data) ? data : [];
          setMyReviewIds(new Set(list.map((r) => r.id)));
          // lấy attempt_number từ review mới nhất
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

  const handleEnroll = async () => {
    if (!isLoggedIn) { onNavigate("auth"); return; }
    const role = localStorage.getItem("role");
    if (role !== "student") {
      alert("Chỉ học viên mới có thể đăng ký khóa học.");
      return;
    }
    if (isEnrolled) { setActiveTab("lesson"); return; }
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
          alert(data.detail ?? "Đăng ký thất bại.");
        }
      } catch {
        alert("Lỗi kết nối. Vui lòng thử lại.");
      } finally {
        setEnrolling(false);
      }
      return;
    }
    setShowPayment(true);
  };

  const fetchLessonContent = async (lessonId: string, isPreview: boolean) => {
    console.log("🔵 fetchLessonContent", lessonId, "isEnrolled:", isEnrolled);
   
    if (!isPreview && !isEnrolled) {
      if (!isLoggedIn) {
        onNavigate("auth");
        return;
      }
      await handleEnroll();
      return;
    }
    setLessonLoading(true);
    setLessonError(null);
    setActiveLesson(null);
    try {
      const res = await refreshAndRetry(`${API}/api/courses/lessons/${lessonId}/content/`);
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
          console.log("✅ markLessonComplete");
          await markLessonComplete(lessonId);
        }
      } else if (res.status === 403) {
        const err = await res.json();
        setLessonError(err.detail ?? "Bạn chưa có quyền xem bài học này.");
        setActiveTab(returnTab === "quiz" ? "quiz" : "lesson");
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
      const res = await refreshAndRetry(`${API}/api/enrollments/${enrollmentId}/progress/`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results ?? [];
        const map: Record<string, boolean> = {};
        list.forEach((p: any) => {
          map[p.lesson] = p.is_completed;
          // quiz_passed: true = đã pass, false = chưa pass, null = không có quiz
          if (p.quiz_passed === true) {
            map[`quiz_${p.lesson}`] = true;
          }
        });
        setProgressMap(map);
      }
        const enrollRes = await refreshAndRetry(`${API}/api/enrollments/`);
        if (enrollRes.ok) {
            const data = await enrollRes.json();
            const list = Array.isArray(data) ? data : data.results ?? [];
            const enrollment = list.find(
                (e: any) => e.id === enrollmentId
            );
            if (enrollment && typeof enrollment.progress_pct === 'number') {
                setProgressPct(enrollment.progress_pct);
            }
        }
    } catch {}
  };

  const markLessonComplete = async (lessonId: string) => {
    console.log("🟡 markLessonComplete called", lessonId);
    try {
        const patchRes = await refreshAndRetry(`${API}/api/enrollments/progress/${lessonId}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_completed: true }),
        });
        console.log("🟡 PATCH status:", patchRes.status);
        const patchData = await patchRes.json();
        console.log("🟡 PATCH response:", patchData);
        setProgressMap(prev => ({ ...prev, [lessonId]: true }));
        const enrollRes = await refreshAndRetry(`${API}/api/enrollments/`);
        console.log("🟡 enrollments fetch status:", enrollRes.status);
        const data = await enrollRes.json();
        const list = Array.isArray(data) ? data : data.results ?? [];
        console.log("🟡 enrollments list:", list);
        console.log("🟡 course.id:", course?.id);
        const enrolled = list.find(
            (e: any) => e.course === course.id || e.course_id === course.id
        );
        console.log("🟡 found enrollment:", enrolled);
        console.log("🟡 progress_pct:", enrolled?.progress_pct);
        if (enrolled && typeof enrolled.progress_pct === 'number') {
            setProgressPct(enrolled.progress_pct);
            console.log("✅ setProgressPct called with:", enrolled.progress_pct);
        } else {
            console.log("❌ progress_pct not found or not a number");
        }
    } catch (err) {
        console.error("❌ markLessonComplete error:", err);
    }
  };

  const fetchQuizFromLesson = async (lessonId: string) => {
    if (!localStorage.getItem("access")) {
      setQuizLoading(false);
      setQuizBlocked(false);
      setQuizError("Vui lòng đăng nhập để làm bài kiểm tra");
      setApiQuiz(null);
      return;
    }
    setQuizLoading(true);
    setQuizError(null);
    setApiQuiz(null);
    setCurrentQuizId(null);
    setQuizBlocked(false);
    try {
      const res = await refreshAndRetry(`${API}/api/quizzes/lesson/${lessonId}/take/`);
      const data = await res.json();
      if (!res.ok) {
        console.log("Quiz 400 detail:", data);
        if (res.status === 400) {
          setQuizBlocked(true);
        }
        const detail = Array.isArray(data) ? data[0] : (data.detail || "Không thể tải bài kiểm tra");
        setQuizError(detail);
        return;
      }
      setApiQuiz(data);
      setCurrentQuizId(data.id);
      const startRes = await refreshAndRetry(`${API}/api/quizzes/${data.id}/start/`, {
        method: 'POST',
      });
      if (startRes.ok) {
        const { attempt_id } = await startRes.json();
        setCurrentAttemptId(attempt_id);
      }
    } catch (err: any) {
      setQuizError(`Lỗi kết nối: ${err.message}`);
    } finally {
      setQuizLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "quiz" && activeLessonId && !apiQuiz && !quizError && !quizBlocked) {
      fetchQuizFromLesson(activeLessonId);
    }
  }, [activeTab, activeLessonId]);

  const submitReview = async (rating: number, comment: string) => {
    try {
      const res = await refreshAndRetry(`${API}/api/courses/${course.slug}/reviews/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      if (res.ok) {
        setReviewSent(true);
        const updated = await refreshAndRetry(`${API}/api/courses/${course.slug}/`);
        if (updated.ok) setCourse(await updated.json());
        const rv = await refreshAndRetry(`${API}/api/courses/${course.slug}/reviews/`);
        if (rv.ok) setReviews(await rv.json());
        const mine = await refreshAndRetry(`${API}/api/courses/${course.slug}/reviews/me/`);
        if (mine.ok) {
          const data = await mine.json();
          setMyReviewId(data?.id ?? null);
          setAttemptCount(data?.attempt_number ?? 0);
        }
      } else {
        const err = await res.json();
        alert(err.detail ?? "Gửi đánh giá thất bại.");
      }
    } catch { alert("Lỗi kết nối."); }
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
      const res = await refreshAndRetry(`${API}/api/courses/${course.slug}/reviews/${reviewId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: editRating, comment: editText }),
      });
      if (res.ok) {
        const updated = await refreshAndRetry(`${API}/api/courses/${course.slug}/`);
        if (updated.ok) setCourse(await updated.json());
        handleCancelEdit();
      } else {
        const err = await res.json();
        alert(err.detail ?? "Cập nhật đánh giá thất bại.");
      }
    } catch { alert("Lỗi kết nối."); }
    setEditSaving(false);
  };
  // ── Quiz handlers ───────────────────────────────────────────────
  const handleSelectAnswer = (answerId: string, questionType: string) => {
    if (answered) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (isMultipleType(questionType)) {
        next.has(answerId) ? next.delete(answerId) : next.add(answerId);
      } else {
        next.clear();
        next.add(answerId);
      }
      setAllAnswers(a => ({ ...a, [currentQuestion.id]: next }));
      return next;
    });
  };
  const handleAnswerQuestion = () => {
    if (selected.size === 0) { alert("Vui lòng chọn một đáp án."); return; }
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
      const res = await refreshAndRetry(`${API}/api/quizzes/${currentQuizId}/submit/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, attempt_id: currentAttemptId }),
      });
      if (res.ok) {
        const result = await res.json();
        const explanationsMap: Record<string, string> = {};
        result.questions?.forEach((q: any) => { explanationsMap[q.id] = q.explanation; });
        setQuizExplanations(explanationsMap);
        setQuizResult(result);
        setQuizStarted(false);
        if (result.passed && isEnrolled) {
            setProgressMap(prev => ({ ...prev, [`quiz_${activeLessonId}`]: true }));
            try {
                const enrollRes = await refreshAndRetry(`${API}/api/enrollments/`);
                if (enrollRes.ok) {
                    const data = await enrollRes.json();
                    const list = Array.isArray(data) ? data : data.results ?? [];
                    const enrolled = list.find(
                        (e: any) => e.course === course.id || e.course_id === course.id
                    );
                    if (enrolled) {
                        await fetchProgress(enrolled.id);
                    }
                }
            } catch {}
        }
      } else {
        const err = await res.json();
        setQuizError(err.detail ?? "Nộp bài thất bại.");
      }
    } catch (err: any) { setQuizError(`Lỗi: ${err.message}`); }
    setQuizSubmitting(false);
  };
  handleSubmitQuizRef.current = handleSubmitQuiz;
  const handleNextQuestion = () => {
    const snap = new Set(selectedRef.current);
    setAllAnswers(a => ({ ...a, [currentQuestion.id]: snap }));
    if (currentQ + 1 < (apiQuiz?.questions?.length ?? 0)) {
      setCurrentQ(q => q + 1);
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
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); handleSubmitQuizRef.current(); return 0; }
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
          const list = Array.isArray(data) ? data : data.results ?? [];
          const enrolled = list.find((e: any) => e.course === course.id || e.course_id === course.id);
          if (enrolled) {
            const isActive = enrolled.status !== 'refunded' && enrolled.status !== 'cancelled';
            setIsEnrolled(isActive);
            if (isActive) {
              fetchProgress(enrolled.id);
              if (typeof enrolled.progress_pct === 'number') setProgressPct(enrolled.progress_pct);
            }
          }
        }
      } catch {}
    };
    checkEnrollment();
  }, [isLoggedIn, course]);
  const handleRestartQuiz = () => {
    setCurrentAttemptId(null);  
    setCurrentQ(0); setSelected(new Set()); setAnswered(false);
    setQuizStarted(true); setQuizResult(null);
    setAllAnswers({}); setQuizExplanations({});
    clearInterval(timerRef.current!); setTimeLeft(0);
  };
  if (loading || !course) return (
    <div className="cd-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <span>Đang tải khóa học…</span>
    </div>
  );
  const discount       = course.discount_percent ?? 0;
  const whatYouLearn   = course.what_you_learn ? course.what_you_learn.split("\n").filter(Boolean) : [];
  const reviews        = course.reviews ?? [];
  const visibleReviews = reviews.filter((r: any) => !r.is_hidden);
  const quizQuestions  = apiQuiz?.questions ?? [];
  const currentQuestion = quizQuestions[currentQ];
  const passScore      = apiQuiz?.pass_score ?? 70;
  return (
    <>
    <div className="cd-page">
      <div className="container cd-layout">
        <div className="cd-main">
          <button className="cd-back" onClick={() => onNavigate("courses")}>← Quay lại</button>
          <h1 className="cd-hero__title">{course.title}</h1>
          
          <div className="cd-tabs">
            {TABS.map((tab) => (
              <button key={tab.id} className={`cd-tab${activeTab === tab.id ? " cd-tab--active" : ""}`} onClick={() => setActiveTab(tab.id)}>
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
                    <li key={i} className="cd-learn-item"><span className="cd-learn-item__icon">✓</span>{item}</li>
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
              <p className="cd-curriculum__summary">
                {sections.reduce((a, s) => a + (s.lessons?.length ?? 0), 0) > 0
                  ? `${sections.reduce((a, s) => a + (s.lessons?.length ?? 0), 0)} bài học · ${sections.length} chương`
                  : "Hiện tại chưa có nội dung bài học"}
              </p>
              {sections.map((section) => (
                <div key={section.id} className="cd-chapter">
                  <button className="cd-chapter__header" onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}>
                    <span className="cd-chapter__icon">{expandedSection === section.id ? "▾" : "▸"}</span>
                    <span className="cd-chapter__title">{section.title}</span>
                    {isEnrolled ? (
                      <span className="cd-chapter__count">
                        {section.lessons?.reduce((done: number, l: any) => {
                          const lessonDone = progressMap[l.id] ?? false;
                          const quizDone = l.quiz ? (progressMap[`quiz_${l.id}`] ?? false) : true;
                          return done + (lessonDone && quizDone ? 1 : 0);
                        }, 0) ?? 0}
                        /
                        {section.lessons?.length ?? 0}
                      </span>
                    ) : (
                      <span className="cd-chapter__count">{section.lessons?.length ?? 0} bài</span>
                    )}
                  </button>
                  {expandedSection === section.id && (
                    <div className="cd-chapter__lessons">
                      {section.lessons?.map((lesson: any, idx: number) => {
                        const lessonIsPreview = lesson.is_preview_video || lesson.is_preview_article || lesson.is_preview_resource;
                        return (
                        <>
                          <button key={lesson.id}
                            className={`cd-lesson-row${activeLessonId === lesson.id ? " cd-lesson-row--active" : ""}`}
                            onClick={() => {
                              setLessonTargetTab("lesson");
                              fetchLessonContent(lesson.id, lessonIsPreview);
                            }}
                          >
                            <span className="cd-lesson-row__num">{idx + 1}</span>
                            <span className="cd-lesson-row__type-icon">
                              {lesson.video_url || lesson.video_file ? "▶" : lesson.content ? "📘" : "📎"}
                            </span>
                            <span className="cd-lesson-row__title">{lesson.title}</span>
                            {lesson.quiz && <span className="cd-lesson-row__quiz">📝</span>}
                            {isEnrolled ? (
                              <span className={`cd-lesson-row__done${
                                progressMap[lesson.id] && (!lesson.quiz || progressMap[`quiz_${lesson.id}`])
                                  ? " cd-lesson-row__done--completed"
                                  : ""
                              }`}>
                                {(progressMap[lesson.id] ? 1 : 0) + (lesson.quiz && progressMap[`quiz_${lesson.id}`] ? 1 : 0)}
                                /
                                {lesson.quiz ? 2 : 1}
                              </span>
                            ) : (
                              <>
                                {lessonIsPreview && <span className="cd-lesson-row__preview">Xem thử</span>}
                                {!lessonIsPreview && <span className="cd-lesson-row__lock">🔒</span>}
                              </>
                            )}
                          </button>            
                        </>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* ── Lesson ── */}
          {activeTab === "lesson" && (
            <div className="cd-tab-content cd-lesson">
              {lessonLoading ? (
                <div className="cd-lesson__loading"><div className="cd-spinner" /><p>Đang tải bài học…</p></div>
              ) : lessonError ? (
                <div className="cd-lesson__error">
                  <p> {lessonError}</p>
                  {!isEnrolled && (
                    <button className="cd-btn-enroll" onClick={handleEnroll} disabled={enrolling}>
                    {enrolling
                      ? "Đang đăng ký…"
                      : !isLoggedIn
                      ? "Đăng nhập để học"
                      : localStorage.getItem("role") !== "student"
                      ? "Chỉ học viên mới đăng ký được"
                      : "Đăng ký học ngay"}
                  </button>
                  )}
                </div>
              ) : !activeLesson ? (
                <div className="cd-lesson__pick">
                  <h3>Chọn bài học để bắt đầu</h3>
                  <p>Chọn một bài từ danh sách chương trình.</p>
                  <button className="cd-btn-secondary" onClick={() => setActiveTab("curriculum")}>Xem chương trình học</button>
                </div>
              ) : (
                <div className="cd-lesson__content">
                  <div className="cd-lesson__header">
                    <h2 className="cd-lesson__title">{activeLesson.title}</h2>
                  </div>
                  {(activeLesson.video_file || activeLesson.video_url) && (
                    <div className="cd-lesson__video-wrap">
                      {activeLesson.video_url && (() => {
                        const { type, embedUrl } = getVideoEmbed(activeLesson.video_url);
                        if (type === "youtube" || type === "vimeo") {
                          return (
                            <>
                              {activeLesson.video_file && (
                                <p className="cd-lesson__video-label">🔗 Video từ URL</p>
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
                              <p className="cd-lesson__video-label">🔗 Video từ URL</p>
                            )}
                            <video className="cd-lesson__video" controls src={embedUrl} />
                          </>
                        );
                      })()}
                      {activeLesson.video_file && (
                        <>
                          {activeLesson.video_url && (
                            <p className="cd-lesson__video-label">📁 Video tải lên</p>
                          )}
                          <video
                            className="cd-lesson__video"
                            controls
                            src={activeLesson.video_file.startsWith("http")
                              ? activeLesson.video_file
                              : `${API}${activeLesson.video_file}`}
                          />
                        </>
                      )}
                    </div>
                  )}
                  {activeLesson.content && <div className="cd-lesson__body">{renderMarkdown(activeLesson.content)}</div>}
                  {activeLesson.attachment && (
                    <div className="cd-lesson__attachments">
                      <h4 className="cd-lesson__attachments-title">📎 Tài liệu đính kèm</h4>
                      <a href={activeLesson.attachment.startsWith("http") ? activeLesson.attachment : `${API}${activeLesson.attachment}`}
                        target="_blank" rel="noopener noreferrer" className="cd-lesson__attach-item">
                        <span className="cd-lesson__attach-icon">{getFileIcon(activeLesson.attachment_name ?? activeLesson.attachment)}</span>
                        <span className="cd-lesson__attach-link">{activeLesson.attachment_name ?? "Tải tài liệu"}</span>
                        <span className="cd-lesson__attach-dl">⬇</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* ── Quiz ── */}
          {activeTab === "quiz" && (
            <div className="cd-tab-content cd-quiz">
              {quizLoading ? (
                <div className="cd-lesson__loading"><div className="cd-spinner" /><p>Đang tải bài kiểm tra…</p></div>
              ) : quizError ? (
                <div className="cd-quiz__intro">
                  <h2 className="cd-quiz__intro-title">Bài kiểm tra</h2>
                  <div className="cd-quiz__blocked"> {quizError}</div>
                  <button
                    className="cd-btn-secondary"
                    onClick={() => setActiveTab("lesson")}
                  >
                    ← Quay lại bài học
                  </button>
                </div>
              ) : !apiQuiz ? (
                <div className="cd-quiz__intro">
                  <h2>Bài kiểm tra</h2>
                  <p>Hiện chưa có bài kiểm tra cho bài học này.</p>
                  <button
                    className="cd-btn-secondary"
                    onClick={() => {
                      setLessonTargetTab("quiz");
                      setActiveTab("curriculum");
                    }}
                  >
                    Chọn bài học khác
                  </button>
                </div>
              ) : quizResult ? (
                <div className="cd-quiz__result">
                  <div className={`cd-quiz__result-circle ${quizResult.passed ? "cd-quiz__result-circle--pass" : "cd-quiz__result-circle--fail"}`}>
                    <span className="cd-quiz__result-score">{quizResult.score}%</span>
                    <span className="cd-quiz__result-label">{quizResult.passed ? "✓ Đạt" : "✗ Chưa đạt"}</span>
                  </div>
                  <div className="cd-quiz__result-info">
                    <p>Điểm cần đạt: <strong>{passScore}%</strong></p>
                    <p>Điểm bạn đạt được: <strong>{quizResult.score}%</strong></p>
                  </div>
                  <div className="cd-quiz__review">
                    <h3 className="cd-quiz__review-title">Xem lại bài làm</h3>
                    {quizResult.questions?.map((q: any, idx: number) => {
                      const myAnswers = quizResult.answers_snapshot?.[q.id] || [];
                      return (
                        <div key={q.id} className="cd-quiz__review-item">
                          <div className="cd-quiz__review-q"><strong>Câu {idx + 1}: {q.content}</strong></div>
                          {q.answers.map((a: any) => {
                            const isChosen = myAnswers.includes(a.id);
                            let css = "cd-quiz__review-ans";
                            if (a.is_correct) css += " cd-quiz__review-ans--correct";
                            if (isChosen && !a.is_correct) css += " cd-quiz__review-ans--wrong";
                            return (
                              <div key={a.id} className={css}>
                                <span className="cd-quiz__review-marker">{a.is_correct ? "✓" : isChosen ? "✗" : ""}</span>
                                {a.content}
                              </div>
                            );
                          })}
                          <p className="cd-quiz__review-explain"><strong>Giải thích:</strong> {q.explanation}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="cd-quiz__result-actions">
                    <button className="cd-btn-enroll" onClick={handleRestartQuiz}>Làm lại</button>
                    <button className="cd-btn-secondary" onClick={() => setActiveTab("lesson")}>Xem bài học</button>
                  </div>
                </div>
              ) : !quizStarted ? (
                <div className="cd-quiz__intro">
                  <h2 className="cd-quiz__intro-title">{apiQuiz.title || "Bài kiểm tra"}</h2>
                  {apiQuiz.description && <p className="cd-quiz__intro-sub">{apiQuiz.description}</p>}
                  <p className="cd-quiz__intro-sub">
                    {quizQuestions.length} câu hỏi
                    {apiQuiz.time_limit > 0 ? ` · Thời gian: ${apiQuiz.time_limit} phút` : " · Không giới hạn thời gian"}
                  </p>
                  <ul className="cd-quiz__intro-info">
                    <li>Điểm cần đạt: {passScore}%</li>
                    {apiQuiz.max_attempts > 0 && <li>Số lần làm tối đa: {apiQuiz.max_attempts}</li>}
                    <li>Có thể xem lại bài làm sau khi nộp</li>
                  </ul>
                  {quizBlocked ? (
                    <button className="cd-btn-enroll cd-btn-enroll--disabled" disabled>Đã hết lượt làm bài</button>
                  ) : (
                    <button className="cd-btn-enroll" onClick={() => setQuizStarted(true)}>Bắt đầu làm bài</button>
                  )}
                </div>
              ) : (
                <div className="cd-quiz__question">
                  <div className="cd-quiz__progress">
                    <div className="cd-quiz__progress-bar">
                      <div className="cd-quiz__progress-fill" style={{ width: `${((currentQ + 1) / quizQuestions.length) * 100}%` }} />
                    </div>
                    <span className="cd-quiz__progress-text">Câu {currentQ + 1} / {quizQuestions.length}</span>
                    {apiQuiz?.time_limit > 0 && (
                      <span className={`cd-quiz__timer${timeLeft <= 60 ? " cd-quiz__timer--warning" : ""}`}>
                        ⏱ {formatTime(timeLeft)}
                      </span>
                    )}
                  </div>
                  {currentQuestion && (
                    <>
                      <h3 className="cd-quiz__q-text">{currentQuestion.content}</h3>
                      {isMultipleType(currentQuestion.question_type) && (
                        <p className="cd-quiz__hint">Chọn tất cả đáp án đúng</p>
                      )}
                      <div className="cd-quiz__options">
                        {currentQuestion.answers?.map((ans: any) => {
                          const isSelected = selected.has(ans.id);
                          let cls = "cd-quiz__option";
                          if (answered) {
                            if (ans.is_correct)  cls += " cd-quiz__option--correct";
                            else if (isSelected) cls += " cd-quiz__option--wrong";
                            cls += " cd-quiz__option--disabled";
                          } else {
                            if (isSelected)      cls += " cd-quiz__option--selected";
                          }
                          return (
                            <button key={ans.id} className={cls}
                              onClick={() => handleSelectAnswer(ans.id, currentQuestion.question_type)}
                              disabled={answered}
                            >
                              <span className="cd-quiz__option-checkbox">
                                {isMultipleType(currentQuestion.question_type)
                                  ? (isSelected ? "☑" : "☐")
                                  : (isSelected ? "◉" : "○")}
                              </span>
                              {ans.content}
                            </button>
                          );
                        })}
                      </div>
                      {!answered && (
                        <button className="cd-btn-enroll cd-quiz__next-btn" onClick={handleAnswerQuestion}>
                          Xác nhận đáp án
                        </button>
                      )}
                      {answered && (
                        <button className="cd-btn-enroll cd-quiz__next-btn" onClick={handleNextQuestion} disabled={quizSubmitting}>
                          {currentQ + 1 < quizQuestions.length ? "Câu tiếp theo" : quizSubmitting ? "Đang nộp…" : "Nộp bài"}
                        </button>
                      )}
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
                      ? (visibleReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / visibleReviews.length).toFixed(1)
                      : "0.0"}
                  </span>
                  <div className="cd-rv-big-stars">
                    {(() => {
                      const avg = visibleReviews.length > 0
                        ? visibleReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / visibleReviews.length
                        : 0;
                      return <>{"★".repeat(Math.round(avg))}{"☆".repeat(5 - Math.round(avg))}</>;
                    })()}
                  </div>
                  <span className="cd-rv-big-sub">{visibleReviews.length.toLocaleString()} đánh giá</span>
                </div>
                <div className="cd-rv-bars">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = visibleReviews.filter((r: any) => r.rating === star).length;
                    const pct   = visibleReviews.length > 0 ? Math.round((count / visibleReviews.length) * 100) : 0;
                    return (
                      <div key={star} className="cd-rv-bar-row">
                        <span className="cd-rv-bar-label">{star} ★</span>
                        <div className="cd-rv-bar-track"><div className="cd-rv-bar-fill" style={{ width: `${pct}%` }} /></div>
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
                            <button className="cd-rv-cancel-btn" onClick={handleCancelEdit}>✕</button>
                          </div>
                          <div className="cd-rv-star-input">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <button key={i}
                                className={`cd-rv-star-btn${i <= (editHoverRating || editRating) ? " cd-rv-star-btn--active" : ""}`}
                                onClick={() => setEditRating(i)}
                                onMouseEnter={() => setEditHoverRating(i)}
                                onMouseLeave={() => setEditHoverRating(0)}
                              >★</button>
                            ))}
                          </div>
                          <textarea className="cd-rv-textarea" rows={3}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Nội dung đánh giá..."
                          />
                          <div className="cd-rv-edit-actions">
                            <button className="cd-btn-enroll cd-rv-submit"
                              disabled={!editRating || !editText.trim() || editSaving}
                              onClick={() => handleSaveEdit(r.id)}
                            >
                              {editSaving ? "Đang lưu…" : "Lưu thay đổi"}
                            </button>
                            <button className="cd-btn-secondary" onClick={handleCancelEdit}>Hủy</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="cd-rv-card-top">
                            <div className="cd-rv-avatar-placeholder">{(r.student_name ?? "?")[0]}</div>
                            <div>
                              <div className="cd-rv-name">{r.student_name ?? "—"}</div>
                              <div className="cd-rv-date">{r.created_at ? new Date(r.created_at).toLocaleDateString("vi-VN") : ""}</div>
                            </div>
                            <div className="cd-rv-stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                            {myReviewIds.has(r.id) && (
                              <button className="cd-rv-edit-btn" onClick={() => handleStartEdit(r)} title="Chỉnh sửa">
                                ✏️
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
                  <button className="cd-btn-secondary" onClick={() => setShowAllReviews(!showAllReviews)}>
                    {showAllReviews
                      ? "Thu gọn"
                      : `Xem thêm (${reviews.filter((r: any) => !r.is_hidden).length - 5})`}
                  </button>
                )}
              </div>
              <div className="cd-rv-form">
                  <h3 className="cd-rv-form-title">Viết đánh giá của bạn</h3>
                  {reviewSent ? (
                    <div className="cd-rv-success">✓ Cảm ơn bạn đã đánh giá!</div>
                  ) : myReviewId ? (
                    <p className="cd-rv-note">Bạn đang có đánh giá hiển thị. Hãy chỉnh sửa đánh giá đó.</p>
                  ) : attemptCount >= 5 ? (
                    <p className="cd-rv-note">Bạn đã dùng hết 5 lượt đánh giá cho khoá học này.</p>
                  ) : (
                    <>
                    <div className="cd-rv-star-input">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button key={i}
                          className={`cd-rv-star-btn${i <= (hoverRating || reviewRating) ? " cd-rv-star-btn--active" : ""}`}
                          onClick={() => setReviewRating(i)}
                          onMouseEnter={() => setHoverRating(i)}
                          onMouseLeave={() => setHoverRating(0)}
                        >★</button>
                      ))}
                    </div>
                    <textarea className="cd-rv-textarea" rows={3} placeholder="Chia sẻ trải nghiệm học của bạn..."
                      value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
                    <button className="cd-btn-enroll cd-rv-submit"
                      disabled={!reviewRating || !reviewText.trim()}
                      onClick={() => { if (!isLoggedIn) { onNavigate("auth"); return; } submitReview(reviewRating, reviewText); }}
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
              <div className="cd-rv-avatar-placeholder">{(course.instructor_name ?? "?")[0]}</div>
              <div>
                <strong>{course.instructor_name ?? "—"}</strong>
                <span>Giảng viên</span>
              </div>
            </div>
            <div className="cd-price-card__instructor-stats">
              <span>{(course.avg_rating ?? 0).toFixed(1)} ★</span>
              <span>{course.total_students?.toLocaleString() ?? 0} học viên</span>
            </div>
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
            {isEnrolled ? (
              <button className="cd-btn-enroll" onClick={() => setActiveTab("lesson")}>▶ Tiếp tục học</button>
            ) : (
              <button className="cd-btn-enroll" onClick={handleEnroll} disabled={enrolling}>
                {enrolling ? "Đang đăng ký…" : isLoggedIn ? "Đăng ký học ngay" : "Đăng nhập để học"}
              </button>
            )}
            {isEnrolled && <div className="cd-price-card__enrolled-badge">✓ Đã đăng ký</div>}
            {isEnrolled && (
              <div className="cd-progress-bar-wrap">
                <div className="cd-progress-bar-track">
                  <div className="cd-progress-bar-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="cd-progress-bar-label">Tiến độ: {progressPct}%</span>
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
    {showPayment && course && (
      <PaymentModal
        course={course}
        onClose={() => setShowPayment(false)}
        onSuccess={async () => {
          console.log("course data:", course);
          setIsEnrolled(true);
          setShowPayment(false);
          setActiveTab("lesson");
          try {
            const res = await refreshAndRetry(`${API}/api/enrollments/`);
            if (res.ok) {
              const data = await res.json();
              const list = Array.isArray(data) ? data : data.results ?? [];
              const enrolled = list.find((e: any) => e.course === course.id || e.course_id === course.id);
              if (enrolled) {
                fetchProgress(enrolled.id);
                if (typeof enrolled.progress_pct === 'number') setProgressPct(enrolled.progress_pct);
              }
            }
          } catch {}
        }}
      />
    )}
    {toast && (
      <div className="cd-toast">
        {toast}
      </div>
    )}
    </>
  );
};
export default CourseDetail;