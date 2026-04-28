"""
accounts/serializers.py
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
import random, string
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings as django_settings

from .models import StudentProfile, InstructorProfile

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    """Đăng ký tài khoản — 5.1.1"""
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Xác nhận mật khẩu')
    role      = serializers.ChoiceField(choices=['student', 'instructor'], default='student')

    class Meta:
        model  = User
        fields = ['username', 'email', 'full_name', 'password', 'password2', 'role']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email này đã được sử dụng.')
        return value
    
    def validate_username(self, value):
        if not value:
            raise serializers.ValidationError("Username không được để trống")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username đã tồn tại")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password2': 'Mật khẩu xác nhận không khớp.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        role = validated_data.pop('role', User.Role.STUDENT)
        user = User.objects.create_user(
            role=role,
            **validated_data,
        )
        if role == User.Role.STUDENT:
            StudentProfile.objects.create(user=user)
        elif role == User.Role.INSTRUCTOR:
            InstructorProfile.objects.create(user=user)
        return user


# ── Hồ sơ cơ bản (User) ───────────────────────────────────────────────────────
class UserProfileSerializer(serializers.ModelSerializer):
    role        = serializers.CharField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)

    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'full_name', 'avatar', 'bio', 'role', 'date_joined']
        read_only_fields = ['id', 'username', 'role', 'date_joined']

    def validate_email(self, value):
        user = self.instance
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('Email này đã được sử dụng.')
        return value

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        try:
            return super().validate(attrs)
        except Exception:
            raise AuthenticationFailed(
                'Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng thử lại.'
            )

# ── Hồ sơ mở rộng: Student ───────────────────────────────────────────────────

class StudentProfileSerializer(serializers.ModelSerializer):
    """
    Xem & cập nhật hồ sơ mở rộng của học viên — 5.1.1
    GET/PATCH /api/accounts/profile/student/
    """
    class Meta:
        model  = StudentProfile
        exclude = ['id', 'user']

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
    student_profile = StudentProfileSerializer(read_only=True)

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

    class Meta:
        model   = InstructorProfile
        exclude = ['id', 'user']

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
    student_profile    = StudentProfileSerializer(read_only=True)
    instructor_profile = InstructorProfileSerializer(read_only=True)
    bio                = serializers.CharField(read_only=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'email', 'full_name', 'avatar', 'bio', 'password',
            'role', 'is_active', 'date_joined',
            'student_profile', 'instructor_profile',
        ]
        read_only_fields = ['id', 'avatar', 'bio', 'date_joined']
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        
        return user

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value, is_active=True).exists():
            raise serializers.ValidationError('Email không tồn tại trong hệ thống.')
        return value

    def save(self):
        email = self.validated_data['email']
        otp = ''.join(random.choices(string.digits, k=6))
        cache.set(f'pwd_reset_otp:{email}', otp, timeout=120)
        from django.template.loader import render_to_string
        from django.utils.html import strip_tags
        from django.utils import timezone
        user = User.objects.get(email=email)
        context = {
            'student_name': user.full_name or user.username,
            'otp': otp,
            'sent_at': timezone.now().strftime('%d/%m/%Y %H:%M'),
        }
        html_message  = render_to_string('emails/otp_reset.html', context)
        plain_message = strip_tags(html_message)
        send_mail(
            subject='[EnglishHub] Mã OTP đặt lại mật khẩu',
            message=plain_message,
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
        )


class PasswordResetConfirmSerializer(serializers.Serializer):
    email        = serializers.EmailField()
    otp          = serializers.CharField(min_length=6, max_length=6)
    new_password = serializers.CharField(validators=[validate_password])

    def validate(self, attrs):
        email  = attrs['email']
        otp    = attrs['otp']
        cached = cache.get(f'pwd_reset_otp:{email}')

        if not cached or cached != otp:
            raise serializers.ValidationError({'otp': 'Mã OTP không hợp lệ hoặc đã hết hạn.'})

        try:
            attrs['user'] = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError({'email': 'Email không hợp lệ.'})
        # Check mật khẩu mới không trùng mật khẩu cũ
        user = attrs['user']
        if user.check_password(attrs['new_password']):
            raise serializers.ValidationError({'new_password': 'Mật khẩu mới không được trùng với mật khẩu hiện tại.'})
        return attrs

    def save(self):
        user = self.validated_data['user']
        user.set_password(self.validated_data['new_password'])
        user.save()
        cache.delete(f'pwd_reset_otp:{self.validated_data["email"]}')