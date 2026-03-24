"""
accounts/urls.py
"""
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,   # đăng nhập → trả về access + refresh token
    TokenRefreshView,      # refresh token
    TokenBlacklistView,    # đăng xuất (vô hiệu hoá refresh token)
)

from .views import (
    ChangePasswordView,
    ProfileView,
    RegisterView,
    UserDetailAdminView,
    UserListView,
)

urlpatterns = [
    # Auth
    path('register/',        RegisterView.as_view(),        name='register'),
    path('login/',           TokenObtainPairView.as_view(),  name='login'),
    path('logout/',          TokenBlacklistView.as_view(),   name='logout'),
    path('token/refresh/',   TokenRefreshView.as_view(),     name='token-refresh'),

    # Profile
    path('profile/',         ProfileView.as_view(),          name='profile'),
    path('change-password/', ChangePasswordView.as_view(),   name='change-password'),

    # Admin
    path('users/',           UserListView.as_view(),         name='user-list'),
    path('users/<uuid:id>/', UserDetailAdminView.as_view(),  name='user-detail'),
]