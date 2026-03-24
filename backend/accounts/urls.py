"""
accounts/urls.py
"""
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenBlacklistView,
)

from .views import (
    ChangePasswordView,
    InstructorProfileView,
    ProfileView,
    RegisterView,
    StudentProfileView,
    UserDetailAdminView,
    UserListView,
)

urlpatterns = [
    # ── Xác thực ──────────────────────────────────────────────────
    path('register/',        RegisterView.as_view(),         name='register'),
    path('login/',           TokenObtainPairView.as_view(),  name='login'),
    path('logout/',          TokenBlacklistView.as_view(),   name='logout'),
    path('token/refresh/',   TokenRefreshView.as_view(),     name='token-refresh'),

    # ── Hồ sơ ─────────────────────────────────────────────────────
    # Trả về User + nested profile theo role (student/instructor/admin)
    path('profile/',             ProfileView.as_view(),          name='profile'),
    path('change-password/',     ChangePasswordView.as_view(),   name='change-password'),

    # Hồ sơ mở rộng — chỉ role tương ứng mới truy cập được
    path('profile/student/',     StudentProfileView.as_view(),    name='profile-student'),
    path('profile/instructor/',  InstructorProfileView.as_view(), name='profile-instructor'),

    # ── Admin ──────────────────────────────────────────────────────
    path('users/',           UserListView.as_view(),         name='user-list'),
    path('users/<uuid:id>/', UserDetailAdminView.as_view(),  name='user-detail'),
]