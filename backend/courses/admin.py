"""
courses/admin.py
"""
from django.contrib import admin
from django.utils.html import format_html
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
    list_display    = ['title', 'instructor', 'status', 'price', 'discount_percent', 'get_sale_price', 'avg_rating', 'total_students', 'created_at']
    list_filter     = ['status', 'level', 'category']
    list_editable   = ['discount_percent']
    search_fields   = ['title', 'instructor__username']
    readonly_fields = ['avg_rating', 'total_students', 'get_sale_price', 'created_at', 'updated_at']
    prepopulated_fields = {'slug': ('title',)}
    inlines         = [SectionInline]

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


# ── Inline dùng trong SectionAdmin ───────────────────────────────
class LessonInline(admin.StackedInline):
    model  = Lesson
    extra  = 1
    fields = [
        'title', 'lesson_type', 'order_index', 'is_preview',
        'video_url', 'video_file', 'duration_seconds',
        'content',
        'attachment', 'attachment_name',
    ]


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order_index']
    inlines      = [LessonInline]


# ── Trang riêng cho Lesson ────────────────────────────────────────
@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display  = ['title', 'section', 'lesson_type', 'order_index', 'is_preview', 'has_video', 'has_attachment']
    list_filter   = ['lesson_type', 'is_preview', 'section__course']
    search_fields = ['title', 'section__title', 'section__course__title']

    fieldsets = (
        ('Thông tin bài học', {
            'fields': ('section', 'title', 'lesson_type', 'order_index', 'is_preview'),
        }),
        ('🎬 Video', {
            'fields': ('video_url', 'video_file', 'duration_seconds'),
            'description': 'Upload file video HOẶC nhập URL stream (YouTube, Vimeo, CDN...)',
        }),
        ('📝 Bài viết (Markdown)', {
            'fields': ('content',),
            'classes': ('collapse',),
        }),
        ('📎 Tài liệu đính kèm (Word, Excel, PDF...)', {
            'fields': ('attachment', 'attachment_name'),
            'description': 'Hỗ trợ .pdf .docx .xlsx .pptx .zip và các định dạng khác',
        }),
    )

    readonly_fields = ('created_at', 'updated_at')

    def has_video(self, obj):
        return bool(obj.video_file or obj.video_url)
    has_video.boolean = True
    has_video.short_description = 'Video'

    def has_attachment(self, obj):
        return bool(obj.attachment)
    has_attachment.boolean = True
    has_attachment.short_description = 'Tài liệu'


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display  = ['course', 'student', 'rating', 'created_at']
    list_filter   = ['rating']
    search_fields = ['course__title', 'student__username']