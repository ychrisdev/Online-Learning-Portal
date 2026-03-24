"""
accounts/views.py
"""
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminUser
from .serializers import (
    ChangePasswordSerializer,
    RegisterSerializer,
    UserAdminSerializer,
    UserProfileSerializer,
)

User = get_user_model()


# ── 5.1.1 Xác thực ────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """
    POST /api/accounts/register/
    Đăng ký tài khoản mới (role mặc định: student).
    """
    queryset         = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'message': 'Đăng ký thành công.',
                'user': UserProfileSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/accounts/profile/   — xem hồ sơ
    PUT  /api/accounts/profile/   — cập nhật toàn bộ
    PATCH /api/accounts/profile/  — cập nhật một phần
    """
    serializer_class   = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """
    POST /api/accounts/change-password/
    Đổi mật khẩu cho user đang đăng nhập.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Đổi mật khẩu thành công.'})


# ── 5.3.1 Admin quản lý người dùng ────────────────────────────────────────────

class UserListView(generics.ListAPIView):
    """
    GET /api/accounts/users/
    Admin xem danh sách toàn bộ người dùng, lọc theo role & is_active.
    """
    serializer_class   = UserAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs   = User.objects.all().order_by('-date_joined')
        role = self.request.query_params.get('role')
        active = self.request.query_params.get('is_active')
        if role:
            qs = qs.filter(role=role)
        if active is not None:
            qs = qs.filter(is_active=active.lower() == 'true')
        return qs


class UserDetailAdminView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/accounts/users/<id>/  — xem chi tiết
    PATCH /api/accounts/users/<id>/  — phân quyền (role), khoá tài khoản (is_active)
    """
    queryset           = User.objects.all()
    serializer_class   = UserAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field       = 'id'