import React, { useState, useEffect } from "react";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import HomePage from "./pages/HomePage";
import PolicyPage from "./pages/PolicyPage";
import CoursesPage from "./pages/CoursesPage";
import CourseDetail from "./pages/CourseDetail";
import StudentDashboard from "./pages/StudentDashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AuthPage from "./pages/AuthPage";
import PaymentReturn from "./pages/PaymentReturn";
import "./styles/index.css";

type Page =
  | "home"
  | "courses"
  | "course-detail"
  | "learning"
  | "dashboard"
  | "auth"
  | "policy"
  | "payment"
  | "payment-result"
  | "payment-return";
type Role = "student" | "instructor" | "admin";

const NO_CHROME: Page[] = ["learning", "auth"];

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("access"),
  );
  const [userRole, setUserRole] = useState<Role>(
    (localStorage.getItem("role") as Role) || "admin",
  );
  const [returnPage, setReturnPage] = useState<Page>("home");
  const [navSearchQuery, setNavSearchQuery] = useState("");

  const getInitialState = () => {
    const hash = window.location.hash.replace("#", "");
    const slashIdx = hash.indexOf("/");
    const page  = slashIdx === -1 ? hash : hash.slice(0, slashIdx);
    const param = slashIdx === -1 ? ""   : hash.slice(slashIdx + 1);

    const valid: Page[] = ["home", "courses", "course-detail", "dashboard", "auth", "policy","payment-result","payment-return"];
    const isLoggedIn = !!localStorage.getItem("access");
    let resolvedPage = valid.includes(page as Page) ? (page as Page) : "home";

    if (resolvedPage === "auth" && isLoggedIn) resolvedPage = "dashboard";
    if (resolvedPage === "dashboard" && !isLoggedIn) resolvedPage = "home";


    return {
      page: resolvedPage,
      courseId: page === "course-detail" ? param : "",
      authMode: page === "auth" && param === "register" ? "register" : "login" as "login" | "register",
    };
  };

  const initial = getInitialState();
  const [currentPage, setCurrentPage] = useState<Page>(initial.page);
  const [activeCourseId, setActiveCourseId] = useState<string>(initial.courseId);
  const [authMode, setAuthMode] = useState<"login" | "register">(initial.authMode);

  const navigate = (page: string, courseId?: string, searchQuery?: string) => {
    if (page === "learning" && !isLoggedIn) {
      setReturnPage(currentPage);
      setAuthMode("login");
      setCurrentPage("auth");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (courseId) {
      setActiveCourseId(courseId);
      window.location.hash = `${page}/${courseId}`;
    } else {
      window.location.hash = page;
    }
    if (searchQuery !== undefined) {
      setNavSearchQuery(searchQuery);
    }
    setCurrentPage(page as Page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultCode = params.get("resultCode");
    const orderId    = params.get("orderId");
    // Tab này được MoMo redirect về → render PaymentReturn
    if (resultCode !== null && orderId) {
      setCurrentPage("payment-return");
    }
  }, []);

  const handleAuthOpen = (mode: "login" | "register") => {
    setReturnPage(currentPage);
    setAuthMode(mode);
    setCurrentPage("auth");
    window.location.hash = `auth/${mode}`; // ← thêm dòng này
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAuthSuccess = () => {
    setIsLoggedIn(true);

    const role = localStorage.getItem("role") as Role;
    if (role) setUserRole(role);

    setCurrentPage("dashboard");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCoursesSearchChange = (query: string) => setNavSearchQuery(query);

  const hideChrome = NO_CHROME.includes(currentPage);

  const handleLogout = () => {
    ["access", "refresh", "role", "user"].forEach((k) =>
      localStorage.removeItem(k),
    );
    setIsLoggedIn(false);
    setUserRole("student");
    navigate("home");
  };

  // Sửa renderDashboard
  const renderDashboard = () => {
    if (userRole === "admin")
      return <AdminDashboard onNavigate={navigate} onLogout={handleLogout} />;
    if (userRole === "instructor")
      return (
        <InstructorDashboard onNavigate={navigate} onLogout={handleLogout} />
      );
    return <StudentDashboard onNavigate={navigate} onLogout={handleLogout} />;
  };

  return (
    <div className="app">
      {!hideChrome && (
        <Navbar
          currentPage={currentPage}
          onNavigate={navigate}
          isLoggedIn={isLoggedIn}
          onAuthOpen={handleAuthOpen}
          onSearch={handleCoursesSearchChange}
          searchValue={
            currentPage === "courses" && !navSearchQuery.startsWith('cat:') && !navSearchQuery.startsWith('level:')
              ? navSearchQuery
              : undefined
          }
        />
      )}

      <main
        style={{
          minHeight: hideChrome
            ? "100vh"
            : `calc(100vh - var(--navbar-height))`,
        }}
      >
        {currentPage === "auth" && (
          <AuthPage
            initialMode={authMode}
            onSuccess={handleAuthSuccess}
            onNavigate={navigate}
          />
        )}
        {currentPage === "home" && <HomePage onNavigate={navigate} />}
        {currentPage === "courses" && (
          <CoursesPage
            onNavigate={navigate}
            initialSearch={navSearchQuery}
            onSearchChange={handleCoursesSearchChange}
          />
        )}
        {currentPage === "course-detail" && (
          <CourseDetail
            courseId={activeCourseId}
            onNavigate={navigate}
            isLoggedIn={isLoggedIn}
          />
        )}
        {currentPage === "dashboard" && renderDashboard()}
        {currentPage === "policy" && <PolicyPage onNavigate={navigate} />}
        {currentPage === "payment-return" && <PaymentReturn />}
      </main>

      {!hideChrome && <Footer onNavigate={navigate} />}
    </div>
  );
};

export default App;
