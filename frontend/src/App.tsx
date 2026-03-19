// src/App.tsx
import React, { useState } from 'react';
import Navbar   from './components/layout/Navbar';
import Footer   from './components/layout/Footer';

import HomePage     from './pages/HomePage';
import CoursesPage  from './pages/CoursesPage';
import AuthPage     from './pages/AuthPage';

import './styles/global.css';

type Page =
  | 'home'
  | 'courses'
  | 'course-detail'
  | 'learning'
  | 'dashboard'
  | 'auth';

const NO_CHROME: Page[] = ['learning', 'auth'];

const App: React.FC = () => {
  const [currentPage, setCurrentPage]       = useState<Page>('home');
  const [activeCourseId, setActiveCourseId] = useState<string>('c1');
  const [isLoggedIn, setIsLoggedIn]         = useState(false);
  const [authMode, setAuthMode]             = useState<'login' | 'register'>('login');
  const [returnPage, setReturnPage]         = useState<Page>('home');

  const navigate = (page: string, courseId?: string) => {
    if (page === 'learning' && !isLoggedIn) {
      setReturnPage(currentPage);
      setAuthMode('login');
      setCurrentPage('auth');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (courseId) setActiveCourseId(courseId);
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
    setCurrentPage(returnPage === 'auth' ? 'home' : returnPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hideChrome = NO_CHROME.includes(currentPage);

  return (
    <div className="app">
      {!hideChrome && (
        <Navbar
          currentPage={currentPage}
          onNavigate={navigate}
          isLoggedIn={isLoggedIn}
          onAuthOpen={handleAuthOpen}
        />
      )}

      <main style={{ minHeight: hideChrome ? '100vh' : `calc(100vh - var(--navbar-height))` }}>
        {currentPage === 'auth' && (
          <AuthPage
            initialMode={authMode}
            onSuccess={handleAuthSuccess}
            onNavigate={navigate}
          />
        )}
        {currentPage === 'home'    && <HomePage    onNavigate={navigate} />}
        {currentPage === 'courses' && <CoursesPage onNavigate={navigate} />}
        {/* course-detail, learning, dashboard — thêm sau */}
      </main>

      {!hideChrome && <Footer onNavigate={navigate} />}
    </div>
  );
};

export default App;