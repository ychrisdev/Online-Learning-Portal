from django.urls import path
from rest_framework_simplejwt.views import (
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
    CustomTokenObtainPairView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path('register/',        RegisterView.as_view(),         name='register'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token'),
    path('logout/',          TokenBlacklistView.as_view(),   name='logout'),
    path('token/refresh/',   TokenRefreshView.as_view(),     name='token-refresh'),

    path('me/', ProfileView.as_view(), name='me'),  # ✅ chuẩn
    path('profile/',             ProfileView.as_view(),          name='profile'),
    path('change-password/',     ChangePasswordView.as_view(),   name='change-password'),
    
    path('password-reset/',         PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    path('profile/student/',     StudentProfileView.as_view(),    name='profile-student'),
    path('profile/instructor/',  InstructorProfileView.as_view(), name='profile-instructor'),

    path('users/',           UserListView.as_view(),         name='user-list'),
    path('users/<uuid:id>/', UserDetailAdminView.as_view(),  name='user-detail'),
]