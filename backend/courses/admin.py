"""
courses/admin.py
"""
from django.contrib import admin
from .models import Category, Course, Section, Lesson, Review


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display  = ['name', 'slug', 'parent']
    prepopulated_fields = {'slug': ('name',)}


class SectionInline(admin.TabularInline):
    model  = Section
    extra  = 0
    fields = ['title', 'order_index']


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display   = ['title', 'instructor', 'status', 'price', 'discount_percent', 'get_sale_price', 'avg_rating', 'total_students', 'created_at']
    list_filter    = ['status', 'level', 'category']
    list_editable  = ['discount_percent']   # chỉnh % giảm ngay trên danh sách
    search_fields  = ['title', 'instructor__username']
    readonly_fields = ['avg_rating', 'total_students', 'get_sale_price', 'created_at', 'updated_at']
    prepopulated_fields = {'slug': ('title',)}
    inlines        = [SectionInline]

    @admin.display(description='Giá sau giảm')
    def get_sale_price(self, obj):
        if obj.discount_percent:
            return f'{obj.sale_price:,}đ'
        return '—'

    @admin.action(description='Duyệt khoá học đã chọn')
    def approve_courses(self, request, queryset):
        from django.utils import timezone
        queryset.filter(status=Course.Status.REVIEW).update(
            status=Course.Status.PUBLISHED,
            published_at=timezone.now(),
        )

    actions = ['approve_courses']


class LessonInline(admin.TabularInline):
    model  = Lesson
    extra  = 0
    fields = ['title', 'lesson_type', 'order_index', 'is_preview']


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order_index']
    inlines      = [LessonInline]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display  = ['course', 'student', 'rating', 'created_at']
    list_filter   = ['rating']
    search_fields = ['course__title', 'student__username']