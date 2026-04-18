const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) return null;
    try {
      const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('access', data.access);
        return data.access as string;
      }
    } catch {}
    return null;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const token = localStorage.getItem('access');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !isRetry) {
      const newToken = await refreshAccessToken();
      if (newToken) return request<T>(endpoint, options, true);
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      window.location.href = '/login';
      return undefined as T;
    }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const authService = {
  login: (username: string, password: string) =>
  request<{ access: string; refresh: string }>('/auth/token/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),

  register: (data: {username: string; full_name: string; email: string; password: string;}) =>
    request<{ id: string; email: string }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refreshToken: (refresh: string) =>
    request<{ access: string }>('/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    }),

  logout: () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
  },
};

export const courseService = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ results: unknown[]; count: number }>(`/courses/${qs}`);
  },

  get: (slug: string) =>
    request<unknown>(`/courses/${slug}/`),

  enroll: (courseId: string) =>
    request<{ message: string }>(`/courses/${courseId}/enroll/`, {
      method: 'POST',
    }),
};

export const userService = {
  getMe: () =>
    request<unknown>('/users/me/'),

  getEnrolledCourses: () =>
    request<unknown[]>('/users/me/courses/'),

  updateProfile: (data: Partial<{ name: string; avatar: string }>) =>
    request<unknown>('/users/me/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ── Progress ─────────────────────────────────────────────────

export const progressService = {
  markLesson: (lessonId: string, completed: boolean) =>
    request(`/enrollments/progress/${lessonId}/`, {
      method: 'POST',
      body: JSON.stringify({ completed }),
    }),
};

/*
 * Django REST Framework URL patterns
 *
 * urlpatterns = [
 *   path('api/auth/token/',          TokenObtainPairView.as_view()),
 *   path('api/auth/token/refresh/',  TokenRefreshView.as_view()),
 *   path('api/auth/register/',       RegisterView.as_view()),
 *   path('api/courses/',             CourseListView.as_view()),
 *   path('api/courses/<slug>/',      CourseDetailView.as_view()),
 *   path('api/courses/<id>/enroll/', EnrollView.as_view()),
 *   path('api/users/me/',            UserMeView.as_view()),
 *   path('api/users/me/courses/',    UserCoursesView.as_view()),
 *   path('api/progress/',            ProgressView.as_view()),
 * ]
 *
 * CORS: django-cors-headers
 * CORS_ALLOWED_ORIGINS = ['http://localhost:5173']
 */