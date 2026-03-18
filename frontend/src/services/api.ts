// src/services/api.ts
// ============================================================
// API Service Layer — connects to Django REST Framework backend
// Base URL is read from environment variable (Vite convention)
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ── Generic fetch wrapper ─────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('access_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json();
}

// ── Auth ──────────────────────────────────────────────────────

export const authService = {
  /**
   * POST /auth/token/
   * Django Simple JWT — returns { access, refresh }
   */
  login: (email: string, password: string) =>
    request<{ access: string; refresh: string }>('/auth/token/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  /**
   * POST /auth/register/
   */
  register: (data: { name: string; email: string; password: string }) =>
    request<{ id: string; email: string }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * POST /auth/token/refresh/
   */
  refreshToken: (refresh: string) =>
    request<{ access: string }>('/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    }),

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

// ── Courses ───────────────────────────────────────────────────

export const courseService = {
  /**
   * GET /courses/?category=X&level=Y&search=Z
   */
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ results: unknown[]; count: number }>(`/courses/${qs}`);
  },

  /**
   * GET /courses/:slug/
   */
  get: (slug: string) => request<unknown>(`/courses/${slug}/`),

  /**
   * POST /courses/:id/enroll/
   */
  enroll: (courseId: string) =>
    request<{ message: string }>(`/courses/${courseId}/enroll/`, {
      method: 'POST',
    }),
};

// ── User / Dashboard ─────────────────────────────────────────

export const userService = {
  /**
   * GET /users/me/
   */
  getMe: () => request<unknown>('/users/me/'),

  /**
   * GET /users/me/courses/ — enrolled courses with progress
   */
  getEnrolledCourses: () => request<unknown[]>('/users/me/courses/'),

  /**
   * PATCH /users/me/
   */
  updateProfile: (data: Partial<{ name: string; avatar: string }>) =>
    request<unknown>('/users/me/', { method: 'PATCH', body: JSON.stringify(data) }),
};

// ── Progress ─────────────────────────────────────────────────

export const progressService = {
  /**
   * POST /progress/
   * body: { lesson_id, completed }
   */
  markLesson: (lessonId: string, completed: boolean) =>
    request<{ progress: number }>('/progress/', {
      method: 'POST',
      body: JSON.stringify({ lesson_id: lessonId, completed }),
    }),
};

/*
 * ── Django REST Framework URL patterns (reference) ────────────
 *
 * urlpatterns = [
 *   path('api/auth/token/',         TokenObtainPairView.as_view()),
 *   path('api/auth/token/refresh/', TokenRefreshView.as_view()),
 *   path('api/auth/register/',      RegisterView.as_view()),
 *   path('api/courses/',            CourseListView.as_view()),
 *   path('api/courses/<slug>/',     CourseDetailView.as_view()),
 *   path('api/courses/<id>/enroll/',EnrollView.as_view()),
 *   path('api/users/me/',           UserMeView.as_view()),
 *   path('api/users/me/courses/',   UserCoursesView.as_view()),
 *   path('api/progress/',           ProgressView.as_view()),
 * ]
 *
 * CORS: django-cors-headers → CORS_ALLOWED_ORIGINS = ['http://localhost:5173']
 */
