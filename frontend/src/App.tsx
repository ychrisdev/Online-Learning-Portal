import React, { useState } from 'react';
import Navbar              from './components/layout/Navbar';
import Footer              from './components/layout/Footer';
import HomePage            from './pages/HomePage';
import CoursesPage         from './pages/CoursesPage';
import CourseDetail        from './pages/CourseDetail';
import StudentDashboard    from './pages/StudentDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import AdminDashboard      from './pages/AdminDashboard';
import AuthPage            from './pages/AuthPage';
import './styles/index.css';

type Page = 'home' | 'courses' | 'course-detail' | 'learning' | 'dashboard' | 'auth';
type Role = 'student' | 'instructor' | 'admin';

const NO_CHROME: Page[] = ['learning', 'auth'];

const App: React.FC = () => {
  const [currentPage, setCurrentPage]       = useState<Page>('dashboard');
  const [activeCourseId, setActiveCourseId] = useState<string>('c1');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('access'));
  const [userRole, setUserRole] = useState<Role>(
    (localStorage.getItem('role') as Role) || 'student'
  );
  const [authMode, setAuthMode]             = useState<'login' | 'register'>('login');
  const [returnPage, setReturnPage]         = useState<Page>('home');
  const [navSearchQuery, setNavSearchQuery] = useState('');

  const navigate = (page: string, courseId?: string, searchQuery?: string) => {
    if (page === 'learning' && !isLoggedIn) {
      setReturnPage(currentPage);
      setAuthMode('login');
      setCurrentPage('auth');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (courseId) setActiveCourseId(courseId);
    if (searchQuery !== undefined) setNavSearchQuery(searchQuery);
    setCurrentPage(page as Page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthOpen = (mode: 'login' | 'register') => {
    setReturnPage(currentPage);
    setAuthMode(mode);
    setCurrentPage('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = () => {
    setIsLoggedIn(true);

    const role = localStorage.getItem('role') as Role;
    if (role) setUserRole(role);

    setCurrentPage('dashboard');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCoursesSearchChange = (query: string) => setNavSearchQuery(query);

  const hideChrome = NO_CHROME.includes(currentPage);

  const handleLogout = () => {
    ['access', 'refresh', 'role', 'user'].forEach(k => localStorage.removeItem(k));
    setIsLoggedIn(false);
    setUserRole('student');
    navigate('home');
  };

  // Sửa renderDashboard
  const renderDashboard = () => {
    if (userRole === 'admin')      return <AdminDashboard onNavigate={navigate} onLogout={handleLogout} />;
    if (userRole === 'instructor') return <InstructorDashboard onNavigate={navigate} onLogout={handleLogout} />;
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
          searchValue={currentPage === 'courses' ? navSearchQuery : undefined}
        />
      )}


      <main style={{ minHeight: hideChrome ? '100vh' : `calc(100vh - var(--navbar-height))` }}>
        {currentPage === 'auth' && (
          <AuthPage initialMode={authMode} onSuccess={handleAuthSuccess} onNavigate={navigate} />
        )}
        {currentPage === 'home' && <HomePage onNavigate={navigate} />}
        {currentPage === 'courses' && (
          <CoursesPage onNavigate={navigate} initialSearch={navSearchQuery} onSearchChange={handleCoursesSearchChange} />
        )}
        {currentPage === 'course-detail' && (
          <CourseDetail courseId={activeCourseId} onNavigate={navigate} isLoggedIn={isLoggedIn} />
        )}
        {currentPage === 'dashboard' && renderDashboard()}
      </main>

      {!hideChrome && <Footer onNavigate={navigate} />}
    </div>
  );
};

export default App;