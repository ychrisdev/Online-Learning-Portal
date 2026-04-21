
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models



class User(AbstractUser):
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
    user = models.OneToOneField(
        'User',
        on_delete=models.CASCADE,
        related_name='student_profile',
        verbose_name='Người dùng',
        limit_choices_to={'role': 'student'},
    )

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

    class Meta:
        db_table     = 'student_profiles'
        verbose_name = 'Hồ sơ học viên'
        verbose_name_plural = 'Hồ sơ học viên'

    def __str__(self):
        return f"Profile of {self.user.username}"


class InstructorProfile(models.Model):
    user = models.OneToOneField(
        'User',
        on_delete=models.CASCADE,
        related_name='instructor_profile',
        verbose_name='Người dùng',
        limit_choices_to={'role': 'instructor'},
    )

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

    phone_number  = models.CharField('Số điện thoại', max_length=20, blank=True)

    total_students = models.PositiveIntegerField('Tổng học viên', default=0)
    total_courses  = models.PositiveIntegerField('Tổng khoá học', default=0)
    avg_rating     = models.FloatField('Điểm đánh giá TB', default=0.0)

    class Meta:
        db_table     = 'instructor_profiles'
        verbose_name = 'Hồ sơ giảng viên'
        verbose_name_plural = 'Hồ sơ giảng viên'

    def __str__(self):
        return f"Instructor Profile of {self.user.username}"