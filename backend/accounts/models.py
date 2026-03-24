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