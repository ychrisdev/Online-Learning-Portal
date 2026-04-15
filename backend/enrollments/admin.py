# enrollments/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import Enrollment, Progress, Certificate


# ─────────────────────────────────────────────────────────────────
# INLINE
# ─────────────────────────────────────────────────────────────────

class ProgressInline(admin.TabularInline):
    model = Progress
    extra = 0
    readonly_fields = ('lesson', 'is_completed')
    fields = ('lesson', 'is_completed')
    can_delete = False
    show_change_link = False

    def has_add_permission(self, request, obj=None):
        return False


class CertificateInline(admin.StackedInline):
    model = Certificate
    extra = 0
    readonly_fields = ('cert_number', 'issued_at')
    fields = ('cert_number', 'issued_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


# ─────────────────────────────────────────────────────────────────
# ENROLLMENT ADMIN
# ─────────────────────────────────────────────────────────────────

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display  = (
        'student', 'course', 'status',
        'paid_amount', 'progress_summary',
        'enrolled_at', 'completed_at',
    )
    list_filter   = ('status', 'enrolled_at', 'completed_at')
    search_fields = ('student__username', 'student__full_name', 'course__title')
    readonly_fields = (
        'student', 'course', 'paid_amount',
        'enrolled_at', 'completed_at', 'progress_summary',
    )
    fields = (
        ('student', 'course'),
        ('status', 'paid_amount'),
        ('enrolled_at', 'completed_at'),
        'progress_summary',
    )
    inlines = [ProgressInline, CertificateInline]
    ordering = ('-enrolled_at',)

    @admin.display(description='Tiến độ')
    def progress_summary(self, obj):
        total     = obj.progress_records.count()
        completed = obj.progress_records.filter(is_completed=True).count()
        if total == 0:
            return '—'
        percent = int(completed / total * 100)
        color = 'green' if percent == 100 else 'orange' if percent >= 50 else 'red'
        return format_html(
            '<span style="color:{}">{}/{} bài ({}%)</span>',
            color, completed, total, percent,
        )


# ─────────────────────────────────────────────────────────────────
# PROGRESS ADMIN  (xem độc lập, lọc theo enrollment / lesson)
# ─────────────────────────────────────────────────────────────────

@admin.register(Progress)
class ProgressAdmin(admin.ModelAdmin):
    list_display  = ('enrollment', 'lesson', 'is_completed')
    list_filter   = ('is_completed',)
    search_fields = (
        'enrollment__student__username',
        'enrollment__course__title',
        'lesson__title',
    )
    readonly_fields = ('enrollment', 'lesson')
    ordering = ('enrollment', 'lesson__order_index')


# ─────────────────────────────────────────────────────────────────
# CERTIFICATE ADMIN
# ─────────────────────────────────────────────────────────────────

@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display  = ('cert_number', 'get_student', 'get_course', 'issued_at')
    search_fields = (
        'cert_number',
        'enrollment__student__username',
        'enrollment__course__title',
    )
    readonly_fields = ('cert_number', 'enrollment', 'issued_at')
    ordering = ('-issued_at',)

    @admin.display(description='Học viên')
    def get_student(self, obj):
        return obj.enrollment.student.username

    @admin.display(description='Khoá học')
    def get_course(self, obj):
        return obj.enrollment.course.title