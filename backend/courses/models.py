"""
courses/models.py
=================
Chức năng liên quan:
  - 5.1.2  Xem danh sách, tìm kiếm, xem chi tiết khoá học (Student)
  - 5.1.3  Xem video, tài liệu (Student)
  - 5.2.1  Tạo / chỉnh sửa / xoá khoá học (Instructor)
  - 5.2.2  Thêm bài học, upload video, tài liệu (Instructor)
  - 5.3.2  Quản lý & duyệt khoá học (Admin)
"""
import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings


# ─────────────────────────────────────────────────────────────────
# CATEGORY
# ─────────────────────────────────────────────────────────────────
class Category(models.Model):
    """
    Danh mục khoá học, hỗ trợ cây cha–con (parent).
    Ví dụ: Lập trình → Python → Django
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField('Tên danh mục', max_length=120)
    slug        = models.SlugField('Slug', unique=True, max_length=140)
    description = models.TextField('Mô tả', blank=True)
    parent      = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='children',
        verbose_name='Danh mục cha',
    )

    class Meta:
        db_table            = 'categories'
        verbose_name        = 'Danh mục'
        verbose_name_plural = 'Danh mục'
        ordering            = ['name']

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────────────────────────
# COURSE
# ─────────────────────────────────────────────────────────────────
class Course(models.Model):
    """
    Khoá học — đơn vị trung tâm của hệ thống.
    Vòng đời status:
      draft → review → published
                     → archived  (xoá mềm)
    """
    class Level(models.TextChoices):
        BEGINNER     = 'beginner',     'Cơ bản'
        INTERMEDIATE = 'intermediate', 'Trung cấp'
        ADVANCED     = 'advanced',     'Nâng cao'

    class Status(models.TextChoices):
        DRAFT     = 'draft',     'Nháp'
        REVIEW    = 'review',    'Chờ duyệt'     # Giảng viên gửi duyệt
        PUBLISHED = 'published', 'Đã xuất bản'   # Admin duyệt (5.3.2)
        ARCHIVED  = 'archived',  'Đã lưu trữ'    # Xoá mềm (5.2.1)

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    instructor    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='courses_taught',
        verbose_name='Giảng viên',
        limit_choices_to={'role': 'instructor'},
    )
    category      = models.ForeignKey(
        Category, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='courses',
        verbose_name='Danh mục',
    )
    title         = models.CharField('Tên khoá học', max_length=255)
    slug          = models.SlugField('Slug', unique=True, max_length=300)
    description   = models.TextField('Mô tả chi tiết')
    thumbnail     = models.ImageField('Ảnh bìa', upload_to='thumbnails/', blank=True)
    price            = models.DecimalField('Học phí gốc (VNĐ)', max_digits=12, decimal_places=0, default=0)
    discount_percent = models.PositiveSmallIntegerField(
        'Phần trăm giảm giá (%)',
        default=0,
        help_text='0 = không giảm. Ví dụ: 47 → hiển thị badge -47%, giá gốc gạch chân.',
    )
    level         = models.CharField('Trình độ', max_length=20, choices=Level.choices, default=Level.BEGINNER)
    status        = models.CharField('Trạng thái', max_length=20, choices=Status.choices, default=Status.DRAFT)
    avg_rating    = models.FloatField('Điểm đánh giá TB', default=0.0)
    total_students = models.PositiveIntegerField('Tổng học viên', default=0)
    requirements  = models.TextField('Yêu cầu đầu vào', blank=True)
    what_you_learn = models.TextField('Học được gì', blank=True)
    published_at  = models.DateTimeField('Ngày xuất bản', null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)
    is_featured = models.BooleanField(default=False)

    class Meta:
        db_table            = 'courses'
        verbose_name        = 'Khoá học'
        verbose_name_plural = 'Khoá học'
        ordering            = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'published_at']),
            models.Index(fields=['instructor', 'status']),
            models.Index(fields=['category', 'status']),
        ]

    def __str__(self):
        return self.title

    @property
    def sale_price(self) -> int:
        """
        Giá sau khi áp dụng discount_percent.
        Ví dụ: price=149000, discount_percent=47 → sale_price=79030
        Frontend dùng 3 giá trị: price (gạch chân), discount_percent (badge -47%), sale_price (giá bán).
        Nếu discount_percent=0 thì sale_price == price (không giảm).
        """
        if not self.discount_percent:
            return int(self.price)
        return int(self.price * (1 - Decimal(str(self.discount_percent)) / Decimal('100')))


# ─────────────────────────────────────────────────────────────────
# SECTION
# ─────────────────────────────────────────────────────────────────
class Section(models.Model):
    """
    Chương / phần của khoá học.
    Ví dụ: Chương 1 – Giới thiệu Python
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course      = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='sections')
    title       = models.CharField('Tên chương', max_length=255)
    description = models.TextField('Mô tả', blank=True)
    order_index = models.PositiveSmallIntegerField('Thứ tự', default=0)

    class Meta:
        db_table            = 'sections'
        ordering            = ['order_index']
        verbose_name        = 'Chương học'
        verbose_name_plural = 'Chương học'

    def __str__(self):
        return f"[{self.course.title}] {self.title}"


# ─────────────────────────────────────────────────────────────────
# LESSON  (5.2.2 — thêm bài học, upload video, tài liệu)
# ─────────────────────────────────────────────────────────────────
class Lesson(models.Model):
    """
    Bài học trong một chương.
    Hỗ trợ 3 loại nội dung: video, bài viết, tài liệu tải về.
    is_preview = True → học viên chưa đăng ký vẫn xem được (demo miễn phí).
    """
    class LessonType(models.TextChoices):
        VIDEO    = 'video',    'Video bài giảng'   # 5.1.3 Xem video
        ARTICLE  = 'article',  'Bài viết'           # 5.1.3 Xem tài liệu
        RESOURCE = 'resource', 'Tài nguyên tải về'  # 5.1.3 Xem tài liệu

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section          = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='lessons')
    title            = models.CharField('Tên bài học', max_length=255)
    lesson_type      = models.CharField('Loại', max_length=20, choices=LessonType.choices, default=LessonType.VIDEO)
    # --- Video (5.2.2 upload video) ---
    video_url        = models.URLField('URL video (stream)', blank=True)
    video_file       = models.FileField('File video', upload_to='lessons/videos/', blank=True)
    duration_seconds = models.PositiveIntegerField('Thời lượng (giây)', default=0)
    # --- Bài viết / tài liệu ---
    content          = models.TextField('Nội dung bài viết (Markdown)', blank=True)
    # --- Tài liệu đính kèm (5.2.2 upload tài liệu) ---
    attachment       = models.FileField('File tài liệu', upload_to='lessons/attachments/', blank=True)
    attachment_name  = models.CharField('Tên tài liệu', max_length=255, blank=True)

    order_index      = models.PositiveSmallIntegerField('Thứ tự', default=0)
    is_preview       = models.BooleanField('Cho xem thử miễn phí', default=False)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table            = 'lessons'
        ordering            = ['order_index']
        verbose_name        = 'Bài học'
        verbose_name_plural = 'Bài học'

    def __str__(self):
        return self.title



# ─────────────────────────────────────────────────────────────────
# REVIEW  (học viên đánh giá sau khi học)
# ─────────────────────────────────────────────────────────────────
class Review(models.Model):
    """
    Đánh giá khoá học — 1 học viên chỉ đánh giá 1 lần mỗi khoá.
    Dùng để cập nhật avg_rating trên Course qua signal hoặc service.
    Chỉ học viên đã enrolled mới được phép đánh giá (kiểm tra ở view/serializer).
    """
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course  = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='reviews')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews',
        limit_choices_to={'role': 'student'},   # FIX: thêm ràng buộc role
    )
    rating  = models.PositiveSmallIntegerField(
        'Số sao',
        choices=[(i, f'{i} sao') for i in range(1, 6)],
    )
    comment    = models.TextField('Nhận xét', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    edit_count = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table        = 'reviews'
        unique_together = ('course', 'student')
        verbose_name        = 'Đánh giá'
        verbose_name_plural = 'Đánh giá'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.username} ★{self.rating} — {self.course.title}"