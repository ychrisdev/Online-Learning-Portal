"""
accounts/serializers.py
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import StudentProfile, InstructorProfile

User = get_user_model()


# ── Đăng ký ───────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    """Đăng ký tài khoản — 5.1.1"""
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Xác nhận mật khẩu')

    class Meta:
        model  = User
        fields = ['username', 'email', 'full_name', 'password', 'password2']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email này đã được sử dụng.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password2': 'Mật khẩu xác nhận không khớp.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            role=User.Role.STUDENT,
            **validated_data,
        )
        # Tự động tạo StudentProfile khi đăng ký
        StudentProfile.objects.create(user=user)
        return user


# ── Hồ sơ cơ bản (User) ───────────────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    """Xem & cập nhật các trường trên model User — 5.1.1"""
    role        = serializers.CharField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)

    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'full_name', 'avatar', 'bio', 'role', 'date_joined']
        read_only_fields = ['id', 'username', 'role', 'date_joined']


# ── Hồ sơ mở rộng: Student ───────────────────────────────────────────────────

class StudentProfileSerializer(serializers.ModelSerializer):
    """
    Xem & cập nhật hồ sơ mở rộng của học viên — 5.1.1
    GET/PATCH /api/accounts/profile/student/
    """
    class Meta:
        model  = StudentProfile
        exclude = ['id', 'user', 'updated_at']

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class StudentProfileDetailSerializer(serializers.ModelSerializer):
    """
    Trả về toàn bộ thông tin User + StudentProfile trong một response.
    Dùng ở GET /api/accounts/profile/ khi user là student.
    """
    student_profile = StudentProfileSerializer( read_only=True)

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'email', 'full_name', 'avatar', 'bio',
            'role', 'date_joined', 'student_profile',
        ]
        read_only_fields = ['id', 'username', 'role', 'date_joined']


# ── Hồ sơ mở rộng: Instructor ────────────────────────────────────────────────

class InstructorProfileSerializer(serializers.ModelSerializer):
    """
    Xem & cập nhật hồ sơ mở rộng của giảng viên.
    GET/PATCH /api/accounts/profile/instructor/
    Các trường thống kê (total_students, total_courses, avg_rating) là read-only,
    được cập nhật tự động qua signal.
    """
    total_students = serializers.IntegerField(read_only=True)
    total_courses  = serializers.IntegerField(read_only=True)
    avg_rating     = serializers.FloatField(read_only=True)
    is_verified    = serializers.BooleanField(read_only=True)
    verified_at    = serializers.DateTimeField(read_only=True)

    class Meta:
        model   = InstructorProfile
        exclude = ['id', 'user', 'updated_at']

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class InstructorProfileDetailSerializer(serializers.ModelSerializer):
    """
    Trả về toàn bộ thông tin User + InstructorProfile trong một response.
    Dùng ở GET /api/accounts/profile/ khi user là instructor.
    """
    instructor_profile = InstructorProfileSerializer(read_only=True)

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'email', 'full_name', 'avatar', 'bio',
            'role', 'date_joined', 'instructor_profile',
        ]
        read_only_fields = ['id', 'username', 'role', 'date_joined']


# ── Đổi mật khẩu ─────────────────────────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    """Đổi mật khẩu"""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Mật khẩu hiện tại không đúng.')
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


# ── Admin ────────────────────────────────────────────────────────────────────

class UserAdminSerializer(serializers.ModelSerializer):
    """Dành cho Admin xem danh sách, phân quyền, khoá tài khoản — 5.3.1"""
    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'full_name', 'role', 'is_active', 'date_joined']
        read_only_fields = ['id', 'username', 'email', 'date_joined']