"""
accounts/views.py
"""
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

from .models import StudentProfile, InstructorProfile
from .permissions import IsAdminUser, IsStudent, IsInstructor
from .serializers import (
    ChangePasswordSerializer,
    RegisterSerializer,
    StudentProfileDetailSerializer,
    StudentProfileSerializer,
    InstructorProfileDetailSerializer,
    InstructorProfileSerializer,
    UserAdminSerializer,
    UserProfileSerializer,
)

User = get_user_model()


# ── 5.1.1 Xác thực ────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """
    POST /api/accounts/register/
    Đăng ký tài khoản mới (role mặc định: student).
    Tự động tạo StudentProfile sau khi tạo user.
    """
    queryset           = User.objects.all()
    serializer_class   = RegisterSerializer
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
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        user = self.request.user
        if user.is_student:
            return StudentProfileDetailSerializer
        if user.is_instructor:
            return InstructorProfileDetailSerializer
        return UserProfileSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        user = request.user

        # 1. Cập nhật các trường User (email, full_name, avatar, bio)
        user_serializer = UserProfileSerializer(
            user, data=request.data, partial=partial
        )
        user_serializer.is_valid(raise_exception=True)
        user_serializer.save()

        # 2. Cập nhật profile mở rộng theo role
        profile_data = request.data.get('student_profile') or request.data.get('instructor_profile')

        if profile_data:
            if user.is_student:
                profile, _ = StudentProfile.objects.get_or_create(user=user)
                profile_serializer = StudentProfileSerializer(
                    profile, data=profile_data, partial=partial
                )
            elif user.is_instructor:
                profile, _ = InstructorProfile.objects.get_or_create(user=user)
                profile_serializer = InstructorProfileSerializer(
                    profile, data=profile_data, partial=partial
                )
            else:
                profile_serializer = None

            if profile_serializer:
                profile_serializer.is_valid(raise_exception=True)
                profile_serializer.save()

        # 3. Trả về full detail theo role
        detail_serializer = self.get_serializer(user)
        return Response(detail_serializer.data)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

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


# ── 5.1.1 Hồ sơ mở rộng: Student ─────────────────────────────────────────────

class StudentProfileView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/accounts/profile/student/
    PATCH /api/accounts/profile/student/

    Học viên xem và cập nhật hồ sơ mở rộng của mình:
    trình độ tiếng Anh, mục tiêu học tập, thông tin cá nhân, v.v.
    """
    serializer_class   = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_object(self):
        # get_or_create phòng trường hợp profile chưa tồn tại
        profile, _ = StudentProfile.objects.get_or_create(user=self.request.user)
        return profile


# ── Hồ sơ mở rộng: Instructor ─────────────────────────────────────────────────

class InstructorProfileView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/accounts/profile/instructor/
    PATCH /api/accounts/profile/instructor/

    Giảng viên xem và cập nhật hồ sơ chuyên môn của mình.
    Các trường thống kê (total_students, avg_rating…) là read-only.
    """
    serializer_class   = InstructorProfileSerializer
    permission_classes = [IsAuthenticated, IsInstructor]

    def get_object(self):
        profile, _ = InstructorProfile.objects.get_or_create(user=self.request.user)
        return profile


# ── 5.3.1 Admin quản lý người dùng ────────────────────────────────────────────

class UserListView(generics.ListAPIView):
    """
    GET /api/accounts/users/
    Admin xem danh sách toàn bộ người dùng, lọc theo role & is_active.
    """
    serializer_class   = UserAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs     = User.objects.all().order_by('-date_joined')
        role   = self.request.query_params.get('role')
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