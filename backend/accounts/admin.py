"""
accounts/admin.py
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, StudentProfile, InstructorProfile


class StudentProfileInline(admin.StackedInline):
    model  = StudentProfile
    can_delete = False
    verbose_name_plural = 'Hồ sơ học viên'
    fields = [
        'phone_number', 'date_of_birth', 'gender', 'country', 'city',
        'occupation', 'education',
    ]


class InstructorProfileInline(admin.StackedInline):
    model  = InstructorProfile
    can_delete = False
    verbose_name_plural = 'Hồ sơ giảng viên'
    fields = [
        'title', 'specializations', 'years_experience', 'certifications',
        'phone_number',
        'total_students', 'total_courses', 'avg_rating',
    ]
    readonly_fields = ['total_students', 'total_courses', 'avg_rating']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ['username', 'email', 'full_name', 'role', 'is_active', 'date_joined']
    list_filter   = ['role', 'is_active']
    search_fields = ['username', 'email', 'full_name']
    ordering      = ['-date_joined']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Thông tin bổ sung', {
            'fields': ('full_name', 'avatar', 'bio', 'role'),
        }),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Thông tin bổ sung', {
            'fields': ('full_name', 'email', 'role'),
        }),
    )

    def get_inline_instances(self, request, obj=None):
        """Hiển thị inline tương ứng theo role của user."""
        if obj is None:
            return []
        if obj.role == User.Role.STUDENT:
            return [StudentProfileInline(self.model, self.admin_site)]
        if obj.role == User.Role.INSTRUCTOR:
            return [InstructorProfileInline(self.model, self.admin_site)]
        return []


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display  = ['user', 'country']
    list_filter   = ['gender']
    search_fields = ['user__username', 'user__email', 'user__full_name']


@admin.register(InstructorProfile)
class InstructorProfileAdmin(admin.ModelAdmin):
    list_display  = ['user', 'title', 'years_experience', 'avg_rating']
    list_filter   = []
    search_fields = ['user__username', 'user__email', 'user__full_name']
    readonly_fields = ['total_students', 'total_courses', 'avg_rating']