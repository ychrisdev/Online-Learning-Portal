"""
accounts/models.py
==================
Chức năng liên quan:
  - 5.1.1  Đăng ký, đăng nhập, cập nhật hồ sơ (Student)
  - 5.3.1  Quản lý người dùng, khoá tài khoản, phân quyền (Admin)
"""

import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class User(AbstractUser):
    """
    Custom user model dùng chung cho Student, Instructor, Admin.
    Đặt AUTH_USER_MODEL = 'accounts.User' trong settings.py TRƯỚC
    khi chạy migrate lần đầu.
    """

    class Role(models.TextChoices):
        STUDENT    = 'student',    'Học viên'
        INSTRUCTOR = 'instructor', 'Giảng viên'
        ADMIN      = 'admin',      'Quản trị viên'

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name  = models.CharField('Họ và tên', max_length=255, blank=True)
    avatar     = models.ImageField('Ảnh đại diện', upload_to='avatars/', blank=True)
    bio        = models.TextField('Giới thiệu', blank=True)
    role       = models.CharField(
        'Vai trò', max_length=20,
        choices=Role.choices, default=Role.STUDENT,
        db_index=True,
    )
    # is_active kế thừa từ AbstractUser → dùng để khoá tài khoản (5.3.1)
    # date_joined kế thừa từ AbstractUser

    class Meta:
        db_table    = 'users'
        verbose_name        = 'Người dùng'
        verbose_name_plural = 'Người dùng'
        indexes = [models.Index(fields=['role', 'is_active'])]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def is_instructor(self):
        return self.role == self.Role.INSTRUCTOR

    @property
    def is_admin_user(self):
        return self.role == self.Role.ADMIN


class StudentProfile(models.Model):
    """
    Hồ sơ mở rộng dành riêng cho Học viên (Student).
    Tách biệt với User để giữ model gốc gọn gàng.
    Liên quan: 5.1.1 Cập nhật hồ sơ cá nhân
    """

    class EnglishLevel(models.TextChoices):
        BEGINNER     = 'beginner',     'Mới bắt đầu (A1)'
        ELEMENTARY   = 'elementary',   'Sơ cấp (A2)'
        INTERMEDIATE = 'intermediate', 'Trung cấp (B1)'
        UPPER_INT    = 'upper_intermediate', 'Trên trung cấp (B2)'
        ADVANCED     = 'advanced',     'Nâng cao (C1)'
        PROFICIENT   = 'proficient',   'Thành thạo (C2)'

    class LearningGoal(models.TextChoices):
        COMMUNICATION  = 'communication',  'Giao tiếp hàng ngày'
        BUSINESS       = 'business',       'Tiếng Anh thương mại'
        EXAM           = 'exam',           'Luyện thi (IELTS/TOEIC/…)'
        ACADEMIC       = 'academic',       'Tiếng Anh học thuật'
        TRAVEL         = 'travel',         'Du lịch'
        OTHER          = 'other',          'Mục tiêu khác'

    user = models.OneToOneField(
        'User',
        on_delete=models.CASCADE,
        related_name='student_profile',
        verbose_name='Người dùng',
        limit_choices_to={'role': 'student'},
    )

    # ── Thông tin cá nhân bổ sung ────────────────────────────────
    phone_number = models.CharField(
        'Số điện thoại', max_length=20, blank=True,
        help_text='Dùng để liên hệ hỗ trợ hoặc xác minh tài khoản.',
    )
    date_of_birth = models.DateField('Ngày sinh', null=True, blank=True)
    gender = models.CharField(
        'Giới tính', max_length=10, blank=True,
        choices=[('male', 'Nam'), ('female', 'Nữ'), ('other', 'Khác')],
    )
    country = models.CharField('Quốc gia', max_length=100, blank=True, default='Vietnam')
    city    = models.CharField('Thành phố / Tỉnh', max_length=100, blank=True)

    # ── Trình độ & mục tiêu học tiếng Anh ───────────────────────
    current_level = models.CharField(
        'Trình độ hiện tại', max_length=30,
        choices=EnglishLevel.choices, default=EnglishLevel.BEGINNER,
    )
    learning_goal = models.CharField(
        'Mục tiêu học tập', max_length=30,
        choices=LearningGoal.choices, default=LearningGoal.COMMUNICATION,
    )
    target_exam = models.CharField(
        'Kỳ thi mục tiêu', max_length=50, blank=True,
        help_text='Ví dụ: IELTS 7.0, TOEIC 900, TOEFL iBT 100',
    )
    study_hours_per_week = models.PositiveSmallIntegerField(
        'Số giờ học/tuần', default=0,
        validators=[MaxValueValidator(168)],
        help_text='Học viên tự khai khi onboarding.',
    )

    # ── Thông tin nghề nghiệp / học vấn ─────────────────────────
    occupation  = models.CharField('Nghề nghiệp', max_length=100, blank=True)
    education   = models.CharField(
        'Trình độ học vấn', max_length=50, blank=True,
        choices=[
            ('high_school', 'THPT'),
            ('college',     'Cao đẳng'),
            ('bachelor',    'Đại học'),
            ('master',      'Thạc sĩ'),
            ('doctor',      'Tiến sĩ'),
            ('other',       'Khác'),
        ],
    )

    # ── Cài đặt giao diện / thông báo ───────────────────────────
    preferred_language = models.CharField(
        'Ngôn ngữ giao diện', max_length=10,
        choices=[('vi', 'Tiếng Việt'), ('en', 'English')],
        default='vi',
    )
    receive_email_notifications = models.BooleanField(
        'Nhận thông báo email', default=True,
    )
    receive_sms_notifications = models.BooleanField(
        'Nhận thông báo SMS', default=False,
    )

    # ── Liên kết mạng xã hội (tuỳ chọn) ────────────────────────
    facebook_url  = models.URLField('Facebook', blank=True)
    linkedin_url  = models.URLField('LinkedIn', blank=True)

    # ── Timestamps ───────────────────────────────────────────────
    updated_at = models.DateTimeField('Cập nhật lần cuối', auto_now=True)

    class Meta:
        db_table     = 'student_profiles'
        verbose_name = 'Hồ sơ học viên'
        verbose_name_plural = 'Hồ sơ học viên'

    def __str__(self):
        return f"Profile of {self.user.username}"


class InstructorProfile(models.Model):
    """
    Hồ sơ mở rộng dành riêng cho Giảng viên (Instructor).
    Liên quan: Instructor cần giới thiệu chuyên môn để học viên tin tưởng đăng ký khoá học.
    """

    user = models.OneToOneField(
        'User',
        on_delete=models.CASCADE,
        related_name='instructor_profile',
        verbose_name='Người dùng',
        limit_choices_to={'role': 'instructor'},
    )

    # ── Thông tin nghề nghiệp ────────────────────────────────────
    title           = models.CharField(
        'Danh hiệu / Chức danh', max_length=150, blank=True,
        help_text='Ví dụ: "Thạc sĩ ngôn ngữ Anh - 10 năm kinh nghiệm giảng dạy"',
    )
    specializations = models.TextField(
        'Chuyên môn', blank=True,
        help_text='Comma-separated. Ví dụ: IELTS, Business English, Phonetics',
    )
    years_experience = models.PositiveSmallIntegerField(
        'Số năm kinh nghiệm', default=0,
    )
    certifications  = models.TextField(
        'Chứng chỉ giảng dạy', blank=True,
        help_text='Ví dụ: CELTA, DELTA, TESOL, TEFL',
    )

    # ── Thông tin liên hệ ────────────────────────────────────────
    phone_number  = models.CharField('Số điện thoại', max_length=20, blank=True)
    website_url   = models.URLField('Website cá nhân', blank=True)
    linkedin_url  = models.URLField('LinkedIn', blank=True)
    youtube_url   = models.URLField('Kênh YouTube', blank=True)

    # ── Thống kê (denormalized, cập nhật qua signal) ─────────────
    total_students = models.PositiveIntegerField('Tổng học viên', default=0)
    total_courses  = models.PositiveIntegerField('Tổng khoá học', default=0)
    avg_rating     = models.FloatField('Điểm đánh giá TB', default=0.0)

    # ── Trạng thái duyệt giảng viên (Admin phê duyệt — 5.3.1) ────
    is_verified = models.BooleanField('Đã xác minh', default=False)
    verified_at = models.DateTimeField('Ngày xác minh', null=True, blank=True)

    updated_at = models.DateTimeField('Cập nhật lần cuối', auto_now=True)

    class Meta:
        db_table     = 'instructor_profiles'
        verbose_name = 'Hồ sơ giảng viên'
        verbose_name_plural = 'Hồ sơ giảng viên'

    def __str__(self):
        return f"Instructor Profile of {self.user.username}"